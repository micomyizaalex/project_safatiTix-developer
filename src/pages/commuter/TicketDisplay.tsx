import React, { useRef, useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Ticket as TicketIcon, XCircle, Loader2, Ban } from 'lucide-react';
import { useAuth } from '../../components/AuthContext';
import { API_URL } from '../../config';

interface TicketDisplayProps {
  ticket: any;
  onClose?: () => void;
}

export function TicketDisplay({ ticket: initialTicket, onClose }: TicketDisplayProps) {
  const { accessToken } = useAuth();
  const [ticket, setTicket] = useState<any>(initialTicket);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const qrRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch full ticket details if we only have an ID
  useEffect(() => {
    if (!initialTicket) return;
    
    // If ticket has all required fields, use it directly
    if (initialTicket.passengerName && initialTicket.arrivalTime && initialTicket.busPlateNumber) {
      setTicket(initialTicket);
      return;
    }

    // Otherwise, fetch full details
    if (initialTicket.id && accessToken) {
      setLoading(true);
      fetch(`${API_URL}/tickets/${initialTicket.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.ticket) {
            setTicket(data.ticket);
          } else {
            setError('Failed to load ticket details');
          }
        })
        .catch(err => {
          console.error('Error fetching ticket:', err);
          setError('Failed to load ticket details');
        })
        .finally(() => setLoading(false));
    }
  }, [initialTicket?.id, accessToken]);

  if (!ticket && !loading) return null;

  // Format date helper
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
      });
    } catch {
      return 'N/A';
    }
  };

  // Format time helper
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return 'N/A';
    try {
      const date = new Date(timeStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  // Format datetime helper
  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return 'N/A';
    }
  };

  // Get payment method display name
  const getPaymentMethodName = (method: string | null | undefined) => {
    if (!method) return 'N/A';
    const methods: { [key: string]: string } = {
      'mobile_money': 'MTN Mobile Money',
      'airtel_money': 'Airtel Money',
      'card_payment': 'Card Payment'
    };
    return methods[method] || method;
  };

  // Check if ticket can be cancelled
  const canCancelTicket = (): { canCancel: boolean; reason?: string } => {
    // Already cancelled or checked in
    if (ticket?.status === 'cancelled' || ticket?.status === 'CANCELLED') {
      return { canCancel: false, reason: 'Ticket already cancelled' };
    }
    if (ticket?.status === 'checked_in' || ticket?.status === 'CHECKED_IN') {
      return { canCancel: false, reason: 'Cannot cancel checked-in ticket' };
    }

    // Check departure time
    if (!ticket?.departureTime || !ticket?.scheduleDate) {
      return { canCancel: true }; // Allow if time not set
    }

    // Combine date and time
    const departureDateTimeStr = `${ticket.scheduleDate}T${ticket.departureTime}`;
    const departureTime = new Date(departureDateTimeStr);
    const now = new Date();
    const timeDiffMinutes = (departureTime.getTime() - now.getTime()) / (1000 * 60);

    if (timeDiffMinutes < 10) {
      const minutesRemaining = Math.max(0, Math.round(timeDiffMinutes));
      return { 
        canCancel: false, 
        reason: `Cannot cancel: departure in ${minutesRemaining} minute(s). Must be at least 10 minutes before departure.` 
      };
    }

    return { canCancel: true };
  };

  // Handle ticket cancellation
  const handleCancelTicket = async () => {
    const cancelCheck = canCancelTicket();
    if (!cancelCheck.canCancel) {
      alert(cancelCheck.reason || 'Cannot cancel this ticket');
      return;
    }

    if (!confirm('Are you sure you want to cancel this ticket? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    try {
      const response = await fetch(`${API_URL}/tickets/${ticket.id}/cancel`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        alert(data.message || 'Ticket cancelled successfully');
        // Update ticket status in state
        setTicket({ ...ticket, status: 'CANCELLED' });
      } else {
        alert(data.error || data.message || 'Failed to cancel ticket');
      }
    } catch (error) {
      console.error('Failed to cancel ticket:', error);
      alert('Failed to cancel ticket. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // QR code data - encode ticket ID for scanning
  const qrData = ticket?.id || ticket?.ticketId || '';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-xl">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#0077B6]" />
            <p className="text-muted-foreground">Loading ticket details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-xl">
          <CardContent className="p-6 text-center">
            <XCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
            <p className="text-red-600 mb-4">{error}</p>
            {onClose && (
              <Button onClick={onClose}>Close</Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 print:bg-transparent overflow-y-auto">
      <Card className="w-full max-w-4xl shadow-2xl border-2 border-[#0077B6] print:shadow-none print:border-0 bg-white dark:bg-neutral-900 max-h-[90vh] overflow-hidden flex flex-col">
        <CardContent className="p-3 md:p-4 space-y-2 overflow-y-auto">
          {/* Header with Close Button */}
          <div className="flex justify-between items-center gap-2 print:hidden sticky top-0 bg-white dark:bg-neutral-900 z-10 pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <TicketIcon className="w-6 h-6 text-[#0077B6] flex-shrink-0" />
              <h2 className="text-lg font-bold text-[#0077B6]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                SafariTix
              </h2>
            </div>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose} className="print:hidden flex-shrink-0">
                Close
              </Button>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              className={
                ticket?.status === 'booked' ? 'bg-[#0077B6] text-white text-xs py-0.5' :
                ticket?.status === 'checked_in' ? 'bg-[#27AE60] text-white text-xs py-0.5' :
                ticket?.status === 'cancelled' ? 'bg-red-500 text-white text-xs py-0.5' :
                'bg-gray-500 text-white text-xs py-0.5'
              }
            >
              {ticket?.status === 'booked' ? '✓ BOOKED' :
               ticket?.status === 'checked_in' ? '✓ CHECKED IN' :
               ticket?.status === 'cancelled' ? '✗ CANCELLED' :
               ticket?.status?.toUpperCase() || 'UNKNOWN'}
            </Badge>
            {ticket?.paymentStatus && (
              <Badge 
                className={
                  ticket.paymentStatus === 'SUCCESS' ? 'bg-[#27AE60] text-white text-xs py-0.5' :
                  ticket.paymentStatus === 'PENDING' ? 'bg-orange-500 text-white text-xs py-0.5' :
                  'bg-red-500 text-white text-xs py-0.5'
                }
              >
                {ticket.paymentStatus}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground font-mono">
              ID: {ticket?.id?.slice(0, 8) || ticket?.ticketId?.slice(0, 8) || 'N/A'}
            </span>
          </div>

          {/* Main Content Grid - 4 columns */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {/* Passenger */}
            <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
              <p className="text-xs text-muted-foreground font-semibold">Passenger</p>
              <p className="text-sm font-semibold leading-tight">{ticket?.passengerName || 'N/A'}</p>
              {ticket?.seatNumber && (
                <p className="text-xs text-muted-foreground">Seat: {ticket.seatNumber}</p>
              )}
            </div>

            {/* Route */}
            <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
              <p className="text-xs text-muted-foreground font-semibold">Route</p>
              <p className="text-sm font-semibold leading-tight">{ticket?.routeFrom || 'N/A'}</p>
              <p className="text-xs">→ {ticket?.routeTo || 'N/A'}</p>
            </div>

            {/* Date */}
            <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
              <p className="text-xs text-muted-foreground font-semibold">Date</p>
              <p className="text-sm font-semibold leading-tight">
                {formatDate(ticket?.scheduleDate || ticket?.travelDate)?.split(',')[0] || 'N/A'}
              </p>
            </div>

            {/* Price */}
            <div className="bg-gradient-to-r from-[#0077B6] to-[#005a8c] text-white p-2 rounded">
              <p className="text-xs opacity-90 font-semibold">Price</p>
              <p className="text-sm font-bold" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                RWF {ticket?.price ? ticket.price.toLocaleString() : '0'}
              </p>
            </div>

            {/* Bus Plate */}
            <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
              <p className="text-xs text-muted-foreground font-semibold">Bus Plate</p>
              <p className="text-sm font-mono font-semibold">{ticket?.busPlate || ticket?.busPlateNumber || 'N/A'}</p>
            </div>

            {/* Departure */}
            <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
              <p className="text-xs text-muted-foreground font-semibold">Departure</p>
              <p className="text-sm font-semibold">{formatTime(ticket?.departureTime)}</p>
            </div>

            {/* Arrival */}
            <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
              <p className="text-xs text-muted-foreground font-semibold">Arrival</p>
              <p className="text-sm font-semibold">{formatTime(ticket?.arrivalTime)}</p>
            </div>

            {/* QR Code Container */}
            <div className="bg-white dark:bg-[#1a1a1a] p-2 rounded border-2 border-[#0077B6] flex flex-col items-center justify-center row-span-3 md:row-span-1">
              <QRCodeCanvas 
                id="ticket-qr" 
                value={qrData} 
                size={100} 
                bgColor="#fff" 
                fgColor="#000" 
                level="M" 
                includeMargin={true} 
                ref={qrRef}
              />
              <p className="text-xs text-muted-foreground mt-1 font-mono text-center">
                {ticket?.id?.slice(0, 6) || ticket?.ticketId?.slice(0, 6) || ''}
              </p>
            </div>

            {/* Company */}
            {ticket?.companyName && (
              <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
                <p className="text-xs text-muted-foreground font-semibold">Company</p>
                <p className="text-sm font-semibold leading-tight">{ticket.companyName}</p>
              </div>
            )}

            {/* Bus Model */}
            {ticket?.busModel && (
              <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
                <p className="text-xs text-muted-foreground font-semibold">Bus Model</p>
                <p className="text-sm font-semibold leading-tight">{ticket.busModel}</p>
              </div>
            )}

            {/* Payment Method */}
            {ticket?.paymentMethod && (
              <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
                <p className="text-xs text-muted-foreground font-semibold">Payment</p>
                <p className="text-sm font-semibold leading-tight">{getPaymentMethodName(ticket.paymentMethod)}</p>
              </div>
            )}

            {/* Booking Date */}
            <div className="bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
              <p className="text-xs text-muted-foreground font-semibold">Booked</p>
              <p className="text-xs font-semibold leading-tight">{formatDate(ticket?.bookedAt || ticket?.createdAt)?.split(',')[0] || 'N/A'}</p>
            </div>
          </div>

          {/* Additional Info - Compact */}
          <div className="text-xs text-muted-foreground space-y-1 bg-[#F5F7FA] dark:bg-[#2B2D42] p-2 rounded">
            {ticket?.passengerEmail && (
              <p>Email: <span className="font-semibold">{ticket.passengerEmail}</span></p>
            )}
            {ticket?.transactionRef && (
              <p>Ref: <span className="font-mono">{ticket.transactionRef}</span></p>
            )}
            {ticket?.bookingRef && (
              <p>Booking: <span className="font-mono">{ticket.bookingRef}</span></p>
            )}
            {ticket?.checkedInAt && (
              <p className="text-green-600">✓ Checked in: {formatDateTime(ticket.checkedInAt)}</p>
            )}
            <p className="mt-1">⚠️ Present QR code when boarding.</p>
          </div>

          {/* Action Buttons - Compact */}
          <div className="flex gap-2 print:hidden pt-1">
            <Button 
              onClick={() => window.print()} 
              className="flex-1 bg-[#0077B6] hover:bg-[#005a8c] text-sm h-8"
            >
              Print PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const canvas = document.getElementById('ticket-qr') as HTMLCanvasElement | null;
                if (canvas) {
                  const link = document.createElement('a');
                  link.href = canvas.toDataURL('image/png');
                  link.download = `ticket-${ticket?.id || ticket?.ticketId || 'qr'}.png`;
                  link.click();
                }
              }}
              className="text-sm h-8"
            >
              Download QR
            </Button>
            {(() => {
              const cancelCheck = canCancelTicket();
              return (
                <Button
                  variant="outline"
                  onClick={handleCancelTicket}
                  disabled={!cancelCheck.canCancel || cancelling}
                  className={`text-sm h-8 ${
                    cancelCheck.canCancel && !cancelling
                      ? 'text-[#E63946] hover:text-red-700 hover:bg-red-50 border-[#E63946]'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                  title={cancelCheck.reason || 'Cancel Ticket'}
                >
                  {cancelling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-1" />
                      Cancel
                    </>
                  )}
                </Button>
              );
            })()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
