/**
 * Socket.IO Real-Time Ticket Scanning Integration
 * ==============================================
 * 
 * This component provides real-time ticket scan updates for:
 * - Admin Dashboard: See all ticket scans as they happen
 * - Commuter App: Get instant ticket status updates
 * 
 * Installation:
 * npm install socket.io-client
 */

import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../components/AuthContext';
import { SOCKET_ORIGIN, socketOptions } from '../utils/network';

interface ScanEvent {
  ticketId: string;
  scheduleId: string;
  busId: string;
  passengerName: string;
  seatNumber: string;
  driverName: string;
  scannedAt: string;
  busPlate: string;
}

interface TicketStatusUpdate {
  ticketId: string;
  status: string;
  scannedAt: string;
  driverName: string;
  busPlate: string;
  message: string;
}

/**
 * Hook for Admin Dashboard - Real-time scan monitoring
 */
export function useAdminTicketScans(companyId?: string) {
  const { accessToken } = useAuth();
  const [recentScans, setRecentScans] = useState<ScanEvent[]>([]);
  const [totalScansToday, setTotalScansToday] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !companyId) return;

    // Connect to Socket.IO server
    const socket = io(SOCKET_ORIGIN, {
      ...socketOptions,
      auth: { token: accessToken },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Admin dashboard connected to Socket.IO');
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    // Listen for ticket scan events
    socket.on('ticket:scanned', (data: ScanEvent) => {
      console.log('🎫 New ticket scanned:', data);
      
      // Add to recent scans (keep last 20)
      setRecentScans(prev => [data, ...prev].slice(0, 20));
      setTotalScansToday(prev => prev + 1);
      
      // Optional: Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Ticket Scanned', {
          body: `${data.passengerName} checked in to ${data.busPlate}`,
          icon: '/images/SafariTix-Logo.png',
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, companyId]);

  return { recentScans, totalScansToday };
}

/**
 * Hook for Commuter App - Ticket status updates
 */
export function useCommuterTicketUpdates() {
  const { accessToken, user } = useAuth();
  const [ticketUpdates, setTicketUpdates] = useState<Map<string, TicketStatusUpdate>>(new Map());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !user) return;

    // Connect to Socket.IO server
    const socket = io(SOCKET_ORIGIN, {
      ...socketOptions,
      auth: { token: accessToken },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Commuter app connected to Socket.IO');
    });

    // Listen for ticket status updates
    socket.on('ticket:statusUpdate', (data: TicketStatusUpdate) => {
      console.log('🎫 Ticket status updated:', data);
      
      setTicketUpdates(prev => {
        const updated = new Map(prev);
        updated.set(data.ticketId, data);
        return updated;
      });
      
      // Optional: Show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Ticket Updated', {
          body: data.message,
          icon: '/images/SafariTix-Logo.png',
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, user]);

  return { ticketUpdates };
}

/**
 * Example: Admin Dashboard Component
 */
export function AdminDashboardScans({ companyId }: { companyId: string }) {
  const { recentScans, totalScansToday } = useAdminTicketScans(companyId);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Real-Time Ticket Scans</h3>
        <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          {totalScansToday} scans today
        </div>
      </div>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {recentScans.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No scans yet today</p>
        ) : (
          recentScans.map((scan, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{scan.passengerName}</div>
                <div className="text-sm text-slate-600">
                  Seat {scan.seatNumber} • {scan.busPlate}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(scan.scannedAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Example: Commuter Ticket Component with Real-Time Updates
 */
export function CommuterTicket({ ticket }: { ticket: any }) {
  const { ticketUpdates } = useCommuterTicketUpdates();
  const update = ticketUpdates.get(ticket.id);
  
  // Use real-time update if available, otherwise fallback to ticket data
  const currentStatus = update?.status || ticket.status;
  const scannedAt = update?.scannedAt || ticket.checkedInAt;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-600">Seat {ticket.seatNumber}</span>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
          currentStatus === 'CHECKED_IN' ? 'bg-green-100 text-green-800' :
          currentStatus === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
          'bg-slate-100 text-slate-800'
        }`}>
          {currentStatus}
        </span>
      </div>
      
      {currentStatus === 'CHECKED_IN' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
          <div className="text-sm text-green-800 font-semibold mb-1">
            ✅ Checked In
          </div>
          <div className="text-xs text-green-700">
            {update?.driverName && `Driver: ${update.driverName}`}
            {update?.busPlate && ` • ${update.busPlate}`}
          </div>
          {scannedAt && (
            <div className="text-xs text-green-600 mt-1">
              {new Date(scannedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Example: LiveTracking Component with Passenger Check-ins
 */
export function LiveTrackingWithScans({ scheduleId }: { scheduleId: string }) {
  const { accessToken } = useAuth();
  const [checkedInPassengers, setCheckedInPassengers] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !scheduleId) return;

    const socket = io(SOCKET_ORIGIN, {
      ...socketOptions,
      auth: { token: accessToken },
    });

    socketRef.current = socket;

    // Join schedule room
    socket.emit('passenger:joinSchedule', { scheduleId });

    // Listen for passenger check-ins
    socket.on('passenger:checkedIn', (data) => {
      console.log('👤 Passenger checked in:', data);
      setCheckedInPassengers(prev => [...prev, data]);
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, scheduleId]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">Passenger Check-Ins</h3>
      <div className="space-y-2">
        {checkedInPassengers.map((passenger, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2 bg-green-50 rounded">
            <span className="text-green-600">✓</span>
            <span className="font-semibold">{passenger.passengerName}</span>
            <span className="text-sm text-slate-600">Seat {passenger.seatNumber}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default {
  useAdminTicketScans,
  useCommuterTicketUpdates,
  AdminDashboardScans,
  CommuterTicket,
  LiveTrackingWithScans,
};
