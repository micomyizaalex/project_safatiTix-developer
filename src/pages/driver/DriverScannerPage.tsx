import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { CheckCircle, XCircle, AlertTriangle, Camera, RotateCcw, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../components/AuthContext';

// ─── Types ──────────────────────────────────────────────────────────────────
type ScanState = 'idle' | 'scanning' | 'processing' | 'result';
type ResultType = 'VALID' | 'INVALID' | 'ALREADY_USED' | 'CANCELLED' | 'PENDING_PAYMENT' | 'ERROR';

interface ScanResult {
  type: ResultType;
  title: string;
  message: string;
  ticket?: {
    bookingRef?: string;
    passengerName?: string;
    seat?: number | string;
    route?: string;
    date?: string;
    time?: string;
    bus?: string;
    price?: number | string;
  };
}

// ─── Extract ticketId from QR value ─────────────────────────────────────────
function extractTicketId(raw: string): string | null {
  // Case 1: URL format https://safaritix.com/scan/SHR-xxxxx
  const urlMatch = raw.match(/\/scan\/([^/?#\s]+)/);
  if (urlMatch) return urlMatch[1];

  // Case 2: JSON payload {"ticketId":"..."}
  try {
    const parsed = JSON.parse(raw);
    if (parsed.ticketId) return parsed.ticketId;
    if (parsed.bookingRef) return parsed.bookingRef;
  } catch {}

  // Case 3: Plain booking ref / UUID
  if (raw.trim().length > 0) return raw.trim();
  return null;
}

// ─── Result colors ───────────────────────────────────────────────────────────
const resultConfig: Record<ResultType, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  VALID: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    text: 'text-emerald-700',
    icon: <CheckCircle className="w-16 h-16 text-emerald-500" />,
  },
  INVALID: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    text: 'text-red-700',
    icon: <XCircle className="w-16 h-16 text-red-500" />,
  },
  ALREADY_USED: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    text: 'text-yellow-700',
    icon: <AlertTriangle className="w-16 h-16 text-yellow-500" />,
  },
  CANCELLED: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-600',
    icon: <XCircle className="w-16 h-16 text-red-400" />,
  },
  PENDING_PAYMENT: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-600',
    icon: <AlertTriangle className="w-16 h-16 text-yellow-400" />,
  },
  ERROR: {
    bg: 'bg-gray-50',
    border: 'border-gray-300',
    text: 'text-gray-600',
    icon: <AlertTriangle className="w-16 h-16 text-gray-400" />,
  },
};

const SCANNER_ELEMENT_ID = 'html5qr-driver-scanner';

export default function DriverScannerPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const processingRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);

  // ── Start scanner ──────────────────────────────────────────────────────────
  const startScanner = async () => {
    setCameraError(null);
    setResult(null);
    processingRef.current = false;
    lastScannedRef.current = null;
    setState('scanning');

    // Give the DOM time to render the container element
    await new Promise(r => setTimeout(r, 100));

    try {
      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          // Prevent duplicate processing
          if (processingRef.current || lastScannedRef.current === decodedText) return;
          lastScannedRef.current = decodedText;
          await validateTicket(decodedText);
        },
        () => {} // QR not found yet — silently ignore
      );
    } catch (err: any) {
      console.error('[DriverScanner] Camera error:', err);
      setCameraError(err?.message || 'Could not access camera. Please allow camera permission.');
      setState('idle');
    }
  };

  // ── Stop scanner ──────────────────────────────────────────────────────────
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const running = scannerRef.current.isScanning;
        if (running) await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
  };

  // ── Validate ticket via /scan/:ticketId API ───────────────────────────────
  const validateTicket = async (rawQr: string) => {
    processingRef.current = true;
    setState('processing');
    await stopScanner();

    const ticketId = extractTicketId(rawQr);

    if (!ticketId) {
      setResult({ type: 'INVALID', title: 'Invalid QR Code', message: 'This QR code does not contain a valid ticket ID.' });
      setState('result');
      processingRef.current = false;
      return;
    }

    try {
      // Call our /scan/:ticketId endpoint (accepts JSON response)
      const res = await fetch(`/scan/${encodeURIComponent(ticketId)}`, {
        headers: {
          Accept: 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      const data = await res.json();

      if (data.valid) {
        setResult({
          type: 'VALID',
          title: 'Ticket Valid ✓',
          message: 'Passenger has been checked in successfully.',
          ticket: data.ticket,
        });
      } else {
        const statusMap: Record<string, ResultType> = {
          NOT_FOUND: 'INVALID',
          ALREADY_USED: 'ALREADY_USED',
          CHECKED_IN: 'ALREADY_USED',
          CANCELLED: 'CANCELLED',
          PENDING_PAYMENT: 'PENDING_PAYMENT',
          ERROR: 'ERROR',
        };
        const type: ResultType = statusMap[data.status] || 'INVALID';
        const titles: Record<ResultType, string> = {
          VALID: 'Ticket Valid',
          INVALID: 'Invalid Ticket',
          ALREADY_USED: 'Already Scanned',
          CANCELLED: 'Ticket Cancelled',
          PENDING_PAYMENT: 'Payment Pending',
          ERROR: 'System Error',
        };
        setResult({
          type,
          title: titles[type],
          message: data.message || 'This ticket could not be validated.',
          ticket: data.ticket,
        });
      }
    } catch (err: any) {
      console.error('[DriverScanner] API error:', err);
      setResult({ type: 'ERROR', title: 'Connection Error', message: 'Could not reach the server. Check your internet connection.' });
    }

    setState('result');
    processingRef.current = false;
  };

  // ── Scan another ──────────────────────────────────────────────────────────
  const scanAnother = async () => {
    await stopScanner();
    setResult(null);
    await startScanner();
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => { stopScanner(); navigate(-1); }}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-white font-black text-lg leading-tight">Ticket Scanner</h1>
          <p className="text-gray-400 text-xs">Point camera at passenger QR code</p>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 pb-8">

        {/* IDLE STATE */}
        {state === 'idle' && (
          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="w-28 h-28 bg-[#0077B6]/20 rounded-3xl flex items-center justify-center border-2 border-[#0077B6]/40">
              <Camera className="w-14 h-14 text-[#0077B6]" />
            </div>
            <div className="text-center">
              <h2 className="text-white text-xl font-black mb-2">Ready to Scan</h2>
              <p className="text-gray-400 text-sm max-w-xs">Tap the button below to open the camera and scan a passenger's QR code ticket.</p>
            </div>
            {cameraError && (
              <div className="bg-red-900/40 border border-red-500/40 rounded-2xl px-4 py-3 text-red-300 text-sm text-center max-w-xs">
                {cameraError}
              </div>
            )}
            <button onClick={startScanner}
              className="flex items-center gap-2 bg-[#0077B6] hover:bg-[#005F8E] text-white font-black px-8 py-4 rounded-2xl text-base transition-colors shadow-lg shadow-[#0077B6]/30">
              <Camera className="w-5 h-5" />
              Open Camera
            </button>
          </div>
        )}

        {/* SCANNING STATE */}
        {state === 'scanning' && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4 mt-4">
            {/* Viewfinder frame */}
            <div className="relative w-full">
              <div
                id={SCANNER_ELEMENT_ID}
                className="w-full rounded-2xl overflow-hidden"
                style={{ minHeight: '300px' }}
              />
              {/* Corner decorators */}
              <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-[#0077B6] rounded-tl-lg pointer-events-none" />
              <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-[#0077B6] rounded-tr-lg pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-[#0077B6] rounded-bl-lg pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-[#0077B6] rounded-br-lg pointer-events-none" />
            </div>

            <p className="text-gray-300 text-sm font-semibold text-center">
              Align the QR code within the frame
            </p>

            <button onClick={async () => { await stopScanner(); setState('idle'); }}
              className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-sm hover:bg-white/20 transition-colors">
              Cancel
            </button>
          </div>
        )}

        {/* PROCESSING STATE */}
        {state === 'processing' && (
          <div className="mt-16 flex flex-col items-center gap-5">
            <div className="w-20 h-20 border-4 border-[#0077B6] border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-bold text-lg">Validating ticket…</p>
            <p className="text-gray-400 text-sm">Checking with the server</p>
          </div>
        )}

        {/* RESULT STATE */}
        {state === 'result' && result && (() => {
          const cfg = resultConfig[result.type];
          return (
            <div className={`w-full max-w-sm mt-6 ${cfg.bg} border-2 ${cfg.border} rounded-3xl overflow-hidden shadow-xl`}>
              {/* Top */}
              <div className="flex flex-col items-center gap-2 pt-8 pb-5 px-6">
                {cfg.icon}
                <h2 className={`text-xl font-black mt-1 ${cfg.text}`}>{result.title}</h2>
                <p className="text-gray-500 text-sm text-center">{result.message}</p>
              </div>

              {/* Ticket details */}
              {result.ticket && (
                <>
                  <div className="mx-4 border-t border-gray-200" />
                  <div className="px-6 py-4 space-y-2">
                    {result.ticket.passengerName && (
                      <Row label="Passenger" value={result.ticket.passengerName} />
                    )}
                    {result.ticket.route && (
                      <Row label="Route" value={result.ticket.route} />
                    )}
                    {result.ticket.date && (
                      <Row label="Date" value={result.ticket.date} />
                    )}
                    {result.ticket.time && (
                      <Row label="Time" value={result.ticket.time} />
                    )}
                    {result.ticket.seat != null && (
                      <Row label="Seat" value={String(result.ticket.seat)} />
                    )}
                    {result.ticket.bus && (
                      <Row label="Bus" value={result.ticket.bus} />
                    )}
                    {result.ticket.price != null && (
                      <Row label="Price" value={`${Number(result.ticket.price).toLocaleString()} RWF`} />
                    )}
                    {result.ticket.bookingRef && (
                      <Row label="Ref" value={result.ticket.bookingRef} mono />
                    )}
                  </div>
                </>
              )}

              {/* Actions */}
              <div className="px-4 pb-6 pt-3 flex flex-col gap-2">
                <button onClick={scanAnother}
                  className="w-full flex items-center justify-center gap-2 bg-[#0077B6] text-white font-black py-4 rounded-2xl hover:bg-[#005F8E] transition-colors">
                  <RotateCcw className="w-5 h-5" />
                  Scan Another Ticket
                </button>
                <button onClick={() => { stopScanner(); navigate(-1); }}
                  className="w-full py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors">
                  Back to Dashboard
                </button>
              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
}

// ─── Row helper ──────────────────────────────────────────────────────────────
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-gray-400 text-xs font-semibold shrink-0">{label}</span>
      <span className={`text-gray-800 text-sm font-bold text-right ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
