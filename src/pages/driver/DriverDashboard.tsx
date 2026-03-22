import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Home, Bus, Calendar, Users, MapPin, Bell, User, LogOut, Menu, X,
  Clock, DollarSign, CheckCircle, Navigation, Scan, QrCode, ChevronRight,
  Search, TrendingUp, AlertCircle, Package, Phone, Mail, Settings,
  ArrowRight, Star, Award, Activity,
} from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';
import DriverTracking from '../../components/DriverTracking';
import { useNavigate as _useNavigate } from 'react-router-dom';
import NotificationBell from '../../components/NotificationBell';

// ==================== MAIN COMPONENT ====================
import { useAuth } from '../../components/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export default function DriverDashboard() {
  const TRACKING_VIEW_KEY = 'driverDashboardActiveView';
  const TRACKING_SCHEDULE_KEY = 'driverTrackingScheduleId';
  const { accessToken, user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState(() => {
    if (location.pathname.endsWith('/my-trips')) return 'trips';
    const persistedView = window.localStorage.getItem(TRACKING_VIEW_KEY);
    return persistedView || 'dashboard';
  });
  const [showScanner, setShowScanner] = useState(false);
  const [driverName, setDriverName] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [driverContext, setDriverContext] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [assignedBus, setAssignedBus] = useState<any | null>(null);
  const [tripActionId, setTripActionId] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({ tripsCompleted: 0, activeTrips: 0, totalPassengers: 0, revenue: 0 });
  const [recentPassengersState, setRecentPassengersState] = useState<any[]>([]);
  const [activeManifest, setActiveManifest] = useState<any | null>(null);
  const [operationalStatuses, setOperationalStatuses] = useState<string[]>([]);
  const [dashboardDebugMessages, setDashboardDebugMessages] = useState<string[]>([]);
  const [tripStatusUpdating, setTripStatusUpdating] = useState<string | null>(null);
  const [selectedScheduleForTracking, setSelectedScheduleForTracking] = useState<any | null>(null);
  const [sessionScannedTickets, setSessionScannedTickets] = useState<Set<string>>(new Set());

  const refreshManifest = async (scheduleId: string) => {
    if (!accessToken || !scheduleId) return;
    const response = await fetch(`/api/driver/trips/${encodeURIComponent(scheduleId)}/passengers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      throw new Error('Failed to load passenger manifest');
    }
    const payload = await response.json();
    setActiveManifest(payload);
  };

  const refreshDashboard = async () => {
    if (!accessToken) return;
    const res = await fetch(`/api/driver/dashboard`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setDashboardDebugMessages([payload?.message || payload?.error || `Failed to load dashboard (${res.status})`]);
      return;
    }
    const j = await res.json();
    const statsPayload = j.stats || {};
    const completedTrips = Number(j.completedTrips ?? statsPayload.completed ?? 0);
    const activeTrips = Number(j.activeTrips ?? statsPayload.active ?? 0);
    const totalPassengers = Number(j.passengers ?? statsPayload.passengers ?? 0);
    const revenue = Number(j.revenue ?? statsPayload.revenue ?? 0);

    setDashboardStats({ tripsCompleted: completedTrips, activeTrips, totalPassengers, revenue });
    if (j.assignedBus && typeof j.assignedBus === 'object') {
      setAssignedBus({
        id: j.assignedBus.busId || j.assignedBus.id,
        plate_number: j.assignedBus.plateNumber || j.assignedBus.plate_number,
        model: j.assignedBus.model,
        capacity: j.assignedBus.capacity,
        status: j.assignedBus.status,
      });
    } else {
      setAssignedBus(null);
    }
    setUpcomingTrips(j.upcoming || []);
    setRecentPassengersState(j.recentCheckins || []);
    setOperationalStatuses(j.operationalStatuses || []);
    setDashboardDebugMessages(Array.isArray(j?.debug?.messages) ? j.debug.messages.filter(Boolean) : []);
    if (j.activeTrip) {
      setActiveTrip(j.activeTrip);
      setSelectedScheduleForTracking((currentSchedule: any | null) => currentSchedule || j.activeTrip);
    }
    setActiveManifest(j.manifest || null);
  };

  const loadTripsForBus = async (busId: string) => {
    const response = await fetch(`/api/schedules?bus_id=${encodeURIComponent(busId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const txt = await response.text().catch(() => null);
      throw new Error(txt || `Failed to load trips: ${response.status}`);
    }

    const payload = await response.json();
    return Array.isArray(payload) ? payload : (payload.schedules || payload.trips || payload.data || []);
  };

  useEffect(() => {
    if (location.pathname.endsWith('/my-trips')) {
      setActiveView('trips');
    } else if (location.pathname.endsWith('/driver')) {
      const persistedView = window.localStorage.getItem(TRACKING_VIEW_KEY);
      setActiveView(persistedView || 'dashboard');
    }
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(TRACKING_VIEW_KEY, activeView);
  }, [activeView]);

  useEffect(() => {
    if (selectedScheduleForTracking?.id) {
      window.localStorage.setItem(TRACKING_SCHEDULE_KEY, selectedScheduleForTracking.id);
      return;
    }

    window.localStorage.removeItem(TRACKING_SCHEDULE_KEY);
  }, [selectedScheduleForTracking]);

  useEffect(() => {
    if (!accessToken) return;
    let mounted = true;
    const fetchData = async () => {
      try {
        const [meRes, schedRes, ctxRes, compRes] = await Promise.all([
          fetch(`/api/driver/me`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`/api/driver/today-schedule`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`/api/driver/context`, { headers: { Authorization: `Bearer ${accessToken}` } }),
          fetch(`/api/company`, { headers: { Authorization: `Bearer ${accessToken}` } }),
        ]);

        if (meRes.ok) {
          const j = await meRes.json();
          if (mounted) setDriverName(j.user?.full_name || j.user?.name || j.driver?.name || j.name || null);
        }

        if (schedRes.ok) {
          const j2 = await schedRes.json();
          if (mounted) setSchedules(j2.schedules || j2.data || []);
        }

        if (ctxRes && ctxRes.ok) {
          const j3 = await ctxRes.json();
          if (mounted) setDriverContext(j3.driver || null);
        }

        if (compRes && compRes.ok) {
          const jc = await compRes.json();
          if (mounted) setCompanyName(jc.company?.name || jc.name || null);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchData();

    // Fetch driver's trips (My Trips)
    const loadTrips = async () => {
      setTripsLoading(true);
      setTripsError(null);
      try {
        const busRes = await fetch(`/api/driver/bus`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!mounted) return;
        if (!busRes.ok) {
          const txt = await busRes.text().catch(() => null);
          throw new Error(txt || `Failed to load assigned bus: ${busRes.status}`);
        }

        const busPayload = await busRes.json();
        if (!mounted) return;
        const bus = busPayload?.bus || null;
        setAssignedBus(bus);

        if (!bus?.id) {
          setTrips([]);
          setActiveTrip(null);
          setUpcomingTrips([]);
          return;
        }

        const res = await fetch('/api/driver/my-trips', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!mounted) return;

        let loaded: any[] = [];
        if (res.ok) {
          const j = await res.json();
          if (!mounted) return;
          loaded = Array.isArray(j) ? j : (j.schedules || j.trips || j.data || []);
        }

        if (!Array.isArray(loaded) || loaded.length === 0) {
          const dashboardRes = await fetch('/api/driver/dashboard', {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).catch(() => null);

          if (dashboardRes && dashboardRes.ok) {
            const dashboardJson = await dashboardRes.json().catch(() => ({}));
            const dashboardTrips = [dashboardJson.activeTrip, ...(dashboardJson.upcoming || [])]
              .filter(Boolean)
              .reduce((acc: any[], trip: any) => {
                if (!acc.some((item) => String(item.id) === String(trip.id))) {
                  acc.push(trip);
                }
                return acc;
              }, []);

            loaded = dashboardTrips;
          }
        }

        if ((!Array.isArray(loaded) || loaded.length === 0) && bus.id) {
          loaded = await loadTripsForBus(bus.id);
          if (!mounted) return;
        }

        setTrips(loaded);

        const act = loaded.find((t: any) => {
          const status = String(t.status || '').toUpperCase();
          const operationalStatus = String(t.operationalStatus || '').toUpperCase();
          return status === 'ACTIVE' || status === 'IN_PROGRESS' || ['BOARDING', 'DEPARTED', 'ON_ROUTE', 'ARRIVING'].includes(operationalStatus);
        }) || null;
        setActiveTrip((currentTrip: any | null) => currentTrip || act);
        setSelectedScheduleForTracking((currentSchedule: any | null) => {
          const persistedScheduleId = window.localStorage.getItem(TRACKING_SCHEDULE_KEY);
          const nextTrackedSchedule = loaded.find((trip: any) => trip.id === (currentSchedule?.id || persistedScheduleId))
            || act
            || null;
          return nextTrackedSchedule;
        });
        setUpcomingTrips((currentTrips: any[]) => currentTrips.length > 0 ? currentTrips : loaded.filter((t: any) => {
            const status = String(t.status || '').toUpperCase();
            const operationalStatus = String(t.operationalStatus || '').toUpperCase();
            return status !== 'ACTIVE' && status !== 'IN_PROGRESS' && !['BOARDING', 'DEPARTED', 'ON_ROUTE', 'ARRIVING'].includes(operationalStatus);
          }));
      } catch (err: any) {
        if (mounted) setTripsError(err.message || 'Failed to load trips');
      } finally {
        if (mounted) setTripsLoading(false);
      }
    };

    loadTrips();

    // Load dashboard aggregates (stats, upcoming trips, recent check-ins)
    const loadDashboard = async () => {
      try {
        await refreshDashboard();
      } catch (e) {
        // ignore
      }
    };
    loadDashboard();
    return () => { mounted = false; };
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || !activeTrip?.id) return;
    if (activeManifest?.scheduleId === activeTrip.id || activeManifest?.trip?.id === activeTrip.id) return;
    refreshManifest(activeTrip.id).catch(() => undefined);
  }, [accessToken, activeTrip?.id]);

  useEffect(() => {
    if (!accessToken) return;

    const pollId = window.setInterval(() => {
      refreshDashboard().catch(() => undefined);
      if (activeTrip?.id) {
        refreshManifest(activeTrip.id).catch(() => undefined);
      }
    }, 15000);

    return () => window.clearInterval(pollId);
  }, [accessToken, activeTrip?.id]);

  const handleTripStatusAction = async (trip: any, action: 'start' | 'end') => {
    if (!accessToken || !trip?.id) return;

    setTripActionId(trip.id);
    setTripsError(null);

    try {
      const response = await fetch(action === 'start' ? '/api/driver/start-trip' : '/api/driver/end-trip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ scheduleId: trip.id }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || `Failed to ${action} trip`);
      }

      const nextStatus = action === 'start' ? 'in_progress' : 'completed';
      const updatedTrips = trips.map((currentTrip) => (
        currentTrip.id === trip.id ? { ...currentTrip, status: nextStatus } : currentTrip
      ));
      const updatedTrip = updatedTrips.find((currentTrip) => currentTrip.id === trip.id) || { ...trip, status: nextStatus };

      setTrips(updatedTrips);
      setActiveTrip(updatedTrips.find((currentTrip) => String(currentTrip.status || '').toLowerCase() === 'in_progress') || null);
      setUpcomingTrips(updatedTrips.filter((currentTrip) => String(currentTrip.status || '').toLowerCase() !== 'in_progress'));

      if (action === 'start') {
        setSelectedScheduleForTracking(updatedTrip);
        navigate('/dashboard/driver');
        setActiveView('tracking');
      } else if (selectedScheduleForTracking?.id === trip.id) {
        setSelectedScheduleForTracking(null);
      }

      await refreshDashboard();
    } catch (error: any) {
      setTripsError(error.message || `Failed to ${action} trip`);
    } finally {
      setTripActionId(null);
    }
  };

  const handleOperationalStatusUpdate = async (trip: any, nextStatus: string) => {
    if (!accessToken || !trip?.id || !nextStatus) return;
    setTripStatusUpdating(nextStatus);
    try {
      const response = await fetch('/api/driver/trip-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ scheduleId: trip.id, operationalStatus: nextStatus }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to update trip status');
      }

      setActiveTrip((currentTrip: any) => currentTrip?.id === trip.id ? { ...currentTrip, operationalStatus: data.operationalStatus } : currentTrip);
      setUpcomingTrips((currentTrips: any[]) => currentTrips.map((currentTrip) => currentTrip.id === trip.id ? { ...currentTrip, operationalStatus: data.operationalStatus } : currentTrip));
      await refreshDashboard();
      await refreshManifest(trip.id);
    } catch (error: any) {
      setTripsError(error.message || 'Failed to update trip status');
    } finally {
      setTripStatusUpdating(null);
    }
  };

  // Handle Start Trip button click
  const handleStartTrip = (schedule: any) => {
    if (!schedule || !schedule.id) {
      console.error('Invalid schedule for starting trip');
      return;
    }
    console.log('🚀 Starting trip for schedule:', schedule.id);
    navigate('/dashboard/driver');
    setSelectedScheduleForTracking(schedule);
    setActiveView('tracking');
  };

  // Refresh data after trip starts/ends
  const handleTripStarted = () => {
    console.log('✅ Trip started, refreshing data...');
    setActiveView('tracking');
    // Reload schedules and trips
    window.location.reload(); // Simple refresh, or you can re-fetch data
  };

  const handleTripEnded = () => {
    console.log('✅ Trip ended, refreshing data...');
    setSelectedScheduleForTracking(null);
    window.localStorage.removeItem(TRACKING_SCHEDULE_KEY);
    window.localStorage.setItem(TRACKING_VIEW_KEY, 'dashboard');
    navigate('/dashboard/driver');
    setActiveView('dashboard');
    window.location.reload(); // Simple refresh, or you can re-fetch data
  };

  const handleMenuSelect = (viewId: string) => {
    if (viewId === 'dashboard') {
      navigate('/dashboard/driver');
    } else if (viewId === 'trips') {
      navigate('/dashboard/driver/my-trips');
    }

    if (viewId === 'tracking' && !selectedScheduleForTracking && activeTrip) {
      setSelectedScheduleForTracking(activeTrip);
    }

    setActiveView(viewId);
    setSidebarOpen(false);
  };

  const displayDriverName = (driverContext as any)?.name || driverName || (user as any)?.full_name || (user as any)?.name || 'Driver';
  const displayCompanyName = companyName || (user as any)?.companyName || 'No company assigned';
  const displayTripCount = trips.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      
      {/* ========== SIDEBAR ========== */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200
        transition-transform duration-300 ease-out z-50
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center shadow-lg">
              <Bus className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-black text-lg text-slate-900">SafariTix</div>
              <div className="text-[10px] text-slate-500 font-medium -mt-1">DRIVER PORTAL</div>
            </div>
          </div>
        </div>

        {/* Driver Profile Card */}
        <div className="p-4 border-b border-slate-200">
          <div className="bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white truncate">{displayDriverName}</div>
                <div className="text-xs text-white/70">{displayCompanyName}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                <span className="font-bold">--</span>
              </div>
              <div className="h-3 w-px bg-white/30"></div>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span className="font-bold">{displayTripCount} trips</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard', badge: null },
            { id: 'trips', icon: Calendar, label: 'My Trips', badge: trips.length || null },
            { id: 'passengers', icon: Users, label: 'Passengers', badge: null },
            { id: 'tracking', icon: MapPin, label: 'Live Tracking', badge: null },
            { id: 'profile', icon: User, label: 'Profile', badge: null },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => handleMenuSelect(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200 text-sm font-semibold
                ${activeView === item.id 
                  ? 'bg-[#0077B6] text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className={`
                  px-2 py-0.5 rounded-full text-[10px] font-bold
                  ${activeView === item.id ? 'bg-white/20 text-white' : 'bg-[#0077B6] text-white'}
                `}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Logout */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <button onClick={() => { signOut(); navigate('/app'); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-all text-sm font-semibold">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ========== MOBILE HEADER ========== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40">
        <div className="h-full px-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-slate-900">SafariTix</span>
          </div>
          <NotificationBell />
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ========== MAIN CONTENT ========== */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6 xl:p-8">
          {activeView === 'dashboard' && <DashboardView setShowScanner={setShowScanner} driverName={driverName} schedules={schedules} user={user} activeTrip={activeTrip} upcomingTrips={upcomingTrips} dashboardStats={dashboardStats} recentPassengers={recentPassengersState} manifest={activeManifest} onStartTrip={handleStartTrip} onUpdateOperationalStatus={handleOperationalStatusUpdate} operationalStatuses={operationalStatuses} tripStatusUpdating={tripStatusUpdating} debugMessages={dashboardDebugMessages} />}
          {activeView === 'trips' && <TripsView trips={trips} loading={tripsLoading} error={tripsError} onTripAction={handleTripStatusAction} assignedBus={assignedBus} actionTripId={tripActionId} />}
          {activeView === 'passengers' && <PassengersView setShowScanner={setShowScanner} manifest={activeManifest} activeTrip={activeTrip} />}
          {activeView === 'tracking' && <TrackingView schedule={selectedScheduleForTracking || activeTrip} onTripStarted={handleTripStarted} onTripEnded={handleTripEnded} />}
          {activeView === 'profile' && <ProfileView driverName={driverName} driverContext={driverContext} companyName={companyName} tripsCount={displayTripCount} />}
        </div>
      </main>

      {/* ========== SCANNER MODAL ========== */}
      {showScanner && (
        <ScannerModal 
          onClose={() => setShowScanner(false)} 
          scheduleId={activeTrip?.id || activeManifest?.scheduleId || activeManifest?.trip?.id || null}
          sessionScannedTickets={sessionScannedTickets}
          setSessionScannedTickets={setSessionScannedTickets}
          onScanSuccess={() => {
            refreshDashboard().catch(() => undefined);
            if (activeTrip?.id) {
              refreshManifest(activeTrip.id).catch(() => undefined);
            }
          }}
        />
      )}
    </div>
  );
}

// ==================== DASHBOARD VIEW ====================
function DashboardView({ setShowScanner, driverName, schedules, user, activeTrip, upcomingTrips, dashboardStats, recentPassengers, manifest, onStartTrip, onUpdateOperationalStatus, operationalStatuses, tripStatusUpdating, debugMessages }: { setShowScanner: any, driverName: any, schedules: any[], user: any, activeTrip: any, upcomingTrips: any[], dashboardStats: any, recentPassengers: any[], manifest: any, onStartTrip?: (schedule: any) => void, onUpdateOperationalStatus?: (schedule: any, nextStatus: string) => void, operationalStatuses?: string[], tripStatusUpdating?: string | null, debugMessages?: string[] }) {
  const navigate = _useNavigate();
  const toFiniteNumber = (value: any): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const resolveSeatStats = (trip: any) => {
    const totalSeats = toFiniteNumber(trip.totalSeats ?? trip.total ?? trip.seatCapacity ?? trip.capacity ?? trip.bus?.capacity);
    const availableSeats = toFiniteNumber(trip.seatsAvailable ?? trip.availableSeats ?? trip.available_seats);

    const bookedSeats = toFiniteNumber(
      trip.bookedSeats
      ?? trip.booked_seats
      ?? trip.passengers
      ?? trip.soldSeats
      ?? (totalSeats !== null && availableSeats !== null ? Math.max(totalSeats - availableSeats, 0) : null)
    );

    const leftSeats = totalSeats !== null && bookedSeats !== null
      ? Math.max(totalSeats - bookedSeats, 0)
      : null;

    return { totalSeats, bookedSeats, leftSeats };
  };
  const activePassengers = manifest?.stats?.total ?? activeTrip?.passengers ?? 0;
  const activeBoarded = manifest?.stats?.boarded ?? recentPassengers.filter((passenger) => passenger.checked).length;
  const availableStatuses = Array.isArray(operationalStatuses) && operationalStatuses.length > 0 ? operationalStatuses : ['ASSIGNED', 'BOARDING', 'DEPARTED', 'ON_ROUTE', 'ARRIVING', 'COMPLETED'];
  const currentOperationalStatus = String(activeTrip?.operationalStatus || activeTrip?.status || 'ASSIGNED').toUpperCase();
  const tripStatusLabel = currentOperationalStatus.replace(/_/g, ' ');
  const greetingName = ((driverName || user?.full_name || user?.name || 'Driver') + '').split(' ')[0];
  const manifestRecentPassengers = Array.isArray(manifest?.checkedInPassengers)
    ? manifest.checkedInPassengers.map((passenger: any) => ({
        id: passenger.id,
        bookingRef: passenger.bookingRef,
        name: passenger.name,
        seat: passenger.seatNumber,
        checked: true,
        status: passenger.bookingStatus || passenger.scanStatus || 'CHECKED_IN',
        routeFrom: passenger.routeFrom,
        routeTo: passenger.routeTo,
        checkedAt: passenger.boardingTime,
        busPlate: passenger.busPlate,
        time: passenger.time,
      }))
    : [];
  const recentCheckinList: any[] = manifestRecentPassengers.length > 0 ? manifestRecentPassengers : recentPassengers;
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {Array.isArray(debugMessages) && debugMessages.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="text-xs font-black text-amber-900 mb-1">Debug Metrics Messages</div>
          <div className="space-y-1 text-xs text-amber-800">
            {debugMessages.map((message, index) => (
              <div key={`${message}-${index}`}>- {message}</div>
            ))}
          </div>
        </div>
      )}
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 mb-1">
            Good morning, {greetingName}! 👋
          </h1>
          <p className="text-slate-600">Here's your schedule for today</p>
          {schedules && schedules.length > 0 && (
            <div className="mt-4 grid gap-3">
              {schedules.map((s, idx) => {
                const title = s.route || s.name || `${s.from || s.origin || s.start || ''} → ${s.to || s.destination || s.end || ''}`.replace(/(^\s+|\s+$|\s+→\s+$)/g, '')|| 'Schedule';
                const time = s.departure_time || s.time || s.start_time || (s.schedule_date ? new Date(s.schedule_date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '—');
                const busObj = s.bus;
                const bus = (busObj && typeof busObj === 'object') ? (busObj.plateNumber || busObj.plate_number || String(busObj.id || '')) : (s.bus_registration || s.bus_reg || s.bus || s.busId || '');
                return (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 border border-slate-100">
                    <div>
                      <div className="font-bold text-slate-900">{title}</div>
                      {bus && <div className="text-xs text-slate-500">{bus}</div>}
                    </div>
                    <div className="text-sm font-bold text-[#0077B6]">{time}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <button 
          onClick={() => navigate('/dashboard/driver/scanner')}
          className="w-full lg:w-auto bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <Scan className="w-5 h-5" />
          Scan Ticket
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle} label="Completed" value={dashboardStats.tripsCompleted} color="#27AE60" />
        <StatCard icon={Activity} label="Active Trips" value={dashboardStats.activeTrips} color="#0077B6" />
        <StatCard icon={Users} label="Passengers" value={dashboardStats.totalPassengers} color="#F4A261" />
        <StatCard icon={DollarSign} label="Revenue" value={`${(dashboardStats.revenue / 1000).toFixed(0)}K`} color="#2B2D42" />
      </div>

      {/* Active Trip - Hero Section */}
      {activeTrip && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0077B6] via-[#0088CC] to-[#00A8E8] rounded-2xl p-6 lg:p-8 text-white shadow-2xl">
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full"></div>
          <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full"></div>
          
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-3 py-1 rounded-full text-xs font-bold mb-3">
                  <Activity className="w-3 h-3 animate-pulse" />
                  {tripStatusLabel}
                </div>
                <h2 className="text-2xl lg:text-3xl font-black mb-2">{activeTrip.route || (activeTrip.routeFrom && activeTrip.routeTo ? `${activeTrip.routeFrom} → ${activeTrip.routeTo}` : '')}</h2>
                <p className="text-white/80 text-sm">{(activeTrip.bus && typeof activeTrip.bus === 'object') ? (activeTrip.bus.plateNumber || activeTrip.bus.plate_number || activeTrip.bus.id) : activeTrip.bus} • {activeTrip.departure || activeTrip.departureTime || '—'}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/70 mb-1">Boarded</div>
                <div className="text-3xl font-black">{activeBoarded}/{activePassengers}</div>
              </div>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="text-xs text-white/70 mb-1">Manifest</div>
                <div className="text-2xl font-black">{activePassengers}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="text-xs text-white/70 mb-1">Booked</div>
                <div className="text-2xl font-black">{manifest?.stats?.booked ?? Math.max(activePassengers - activeBoarded, 0)}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="text-xs text-white/70 mb-1">Departure</div>
                <div className="text-lg font-black">{activeTrip.departureTime || activeTrip.departure || '—'}</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="text-xs text-white/70 mb-1">Status</div>
                <div className="text-lg font-black">{tripStatusLabel}</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {availableStatuses.filter((status) => status !== 'COMPLETED').map((status) => (
                  <button
                    key={status}
                    onClick={() => onUpdateOperationalStatus?.(activeTrip, status)}
                    disabled={tripStatusUpdating === status || currentOperationalStatus === status}
                    className={`rounded-xl p-3 font-bold transition-all border ${currentOperationalStatus === status ? 'bg-white text-[#0077B6] border-white' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'} disabled:opacity-70`}
                  >
                    {tripStatusUpdating === status ? 'Updating...' : status.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowScanner(true)} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20 font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2">
                  <Scan className="w-5 h-5" />
                  Scan Ticket
                </button>
                <button onClick={() => navigate('/dashboard/driver/my-trips')} className="bg-white text-[#0077B6] rounded-xl p-4 font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Manage Trips
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        
        {/* Upcoming Trips */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black text-slate-900">Upcoming Trips</h3>
            <button onClick={() => navigate('/dashboard/driver/my-trips')} className="text-[#0077B6] font-bold text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {upcomingTrips.map(trip => (
              <div key={trip.id} className="group border-2 border-slate-100 hover:border-[#0077B6] rounded-xl p-4 transition-all cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold text-slate-900 group-hover:text-[#0077B6] transition-colors">{trip.route || (trip.routeFrom && trip.routeTo ? `${trip.routeFrom} → ${trip.routeTo}` : '')}</div>
                    <div className="text-sm text-slate-500">{(trip.bus && typeof trip.bus === 'object') ? (trip.bus.plateNumber || trip.bus.plate_number || trip.bus.id) : (trip.bus || '—')}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-[#0077B6]">{trip.departureTime || trip.time || '—'}</div>
                    <div className="text-[11px] text-slate-500 mt-1">{String(trip.operationalStatus || trip.status || 'ASSIGNED').replace(/_/g, ' ')}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                    {(() => {
                      const { totalSeats, bookedSeats, leftSeats } = resolveSeatStats(trip);

                      if (totalSeats === null || bookedSeats === null) {
                        return <span className="font-semibold">—/—</span>;
                      }

                      return (
                        <span className="font-semibold">
                          {bookedSeats}/{totalSeats} <span className="text-slate-500">({leftSeats} left)</span>
                        </span>
                      );
                    })()} seats
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => {
                      const { totalSeats, bookedSeats } = resolveSeatStats(trip);

                      const filled = (bookedSeats !== null && totalSeats && totalSeats > 0)
                        ? Math.floor((bookedSeats / totalSeats) * 5)
                        : 0;
                      return <div key={i} className={`w-1.5 h-4 rounded-full ${i < filled ? 'bg-[#0077B6]' : 'bg-slate-200'}`}></div>;
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Check-ins */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-black text-slate-900">Recent Check-ins</h3>
            <button 
              onClick={() => setShowScanner(true)}
              className="text-[#0077B6] font-bold text-sm hover:underline flex items-center gap-1"
            >
              Scan <QrCode className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {recentCheckinList.map((passenger: any) => (
              <div key={`${passenger.id}-${passenger.checkedAt || passenger.time || ''}`} className="rounded-xl border border-slate-100 p-4 hover:border-[#0077B6]/30 hover:bg-slate-50 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {String(passenger.name || 'P').split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-slate-900 truncate">{passenger.name}</div>
                        <div className="text-xs text-slate-500 mt-1">Ticket {passenger.bookingRef || passenger.id}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                        <CheckCircle className="w-4 h-4" />
                        {passenger.status || 'CHECKED_IN'}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div className="rounded-lg bg-slate-100 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Seat</div>
                        <div className="font-semibold text-slate-900">{passenger.seat || 'N/A'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-100 px-3 py-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Scanned</div>
                        <div className="font-semibold text-slate-900">{passenger.time || '—'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-100 px-3 py-2 col-span-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Route</div>
                        <div className="font-semibold text-slate-900">{passenger.routeFrom && passenger.routeTo ? `${passenger.routeFrom} → ${passenger.routeTo}` : 'Route unavailable'}</div>
                      </div>
                      <div className="rounded-lg bg-slate-100 px-3 py-2 col-span-2">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Bus</div>
                        <div className="font-semibold text-slate-900">{passenger.busPlate || 'Bus unavailable'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {recentCheckinList.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No scanned passengers yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== STAT CARD ====================
function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: any, color: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-lg transition-all group">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div className="text-2xl font-black text-slate-900">{value}</div>
      <div className="text-xs text-slate-600 font-medium mt-1">{label}</div>
    </div>
  );
}

// ==================== TRIPS VIEW ====================
function TripsView({ trips, loading, error, onTripAction, assignedBus, actionTripId }: { trips?: any[], loading?: boolean, error?: string | null, onTripAction?: (trip: any, action: 'start' | 'end') => void, assignedBus?: any | null, actionTripId?: string | null }) {
  const list = Array.isArray(trips) ? trips : [];

  const normalizeDateTime = (trip: any) => {
    const dateValue = trip.tripDate || trip.date || trip.scheduleDate;
    const timeValue = trip.departureTime || trip.time || null;
    if (!dateValue) return null;
    const dateString = String(dateValue).slice(0, 10);
    const timeString = timeValue ? String(timeValue).slice(0, 8) : '00:00:00';
    const parsed = new Date(`${dateString}T${timeString}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const getStatusMeta = (status: string | null | undefined) => {
    const normalized = String(status || 'scheduled').toLowerCase();
    if (normalized === 'in_progress') return { label: 'In Progress', badge: 'bg-blue-100 text-blue-700 border-blue-200' };
    if (normalized === 'completed') return { label: 'Completed', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    return { label: 'Scheduled', badge: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const sortedTrips = useMemo(() => {
    const now = new Date();
    return [...list].sort((left, right) => {
      const leftDate = normalizeDateTime(left);
      const rightDate = normalizeDateTime(right);
      const leftUpcoming = leftDate ? leftDate.getTime() >= now.getTime() : false;
      const rightUpcoming = rightDate ? rightDate.getTime() >= now.getTime() : false;

      if (leftUpcoming !== rightUpcoming) {
        return leftUpcoming ? -1 : 1;
      }

      if (leftDate && rightDate) {
        return leftDate.getTime() - rightDate.getTime();
      }

      if (leftDate) return -1;
      if (rightDate) return 1;
      return 0;
    });
  }, [list]);

  const formatDate = (value: string | null | undefined) => {
    if (!value) return '—';
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime())
      ? String(value)
      : parsed.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (value: string | null | undefined) => {
    if (!value) return '—';
    const base = String(value);
    const parsed = new Date(`1970-01-01T${base.slice(0, 8)}`);
    return Number.isNaN(parsed.getTime())
      ? base.slice(0, 5)
      : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900">My Trips</h1>
        <div className="text-sm text-slate-500 font-medium">Assigned schedules sorted by nearest upcoming trip</div>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 flex items-center justify-center gap-3 text-slate-600">
          <Activity className="w-5 h-5 animate-pulse text-[#0077B6]" />
          Loading assigned trips...
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 font-medium">
          {error}
        </div>
      )}

      {!loading && !error && !assignedBus && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Bus className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">No bus assigned to you yet.</h2>
          <p className="text-slate-500">Once a bus is assigned to your driver account, its scheduled trips will appear here.</p>
        </div>
      )}

      {!loading && !error && assignedBus && sortedTrips.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-900 mb-2">No trips scheduled for your bus yet.</h2>
          <p className="text-slate-500">Bus {assignedBus.plate_number || assignedBus.plateNumber || assignedBus.id} does not have any schedules yet.</p>
        </div>
      )}

      {!loading && !error && assignedBus && sortedTrips.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedTrips.map((trip) => {
            const status = getStatusMeta(trip.status);
            const routeName = trip.routeName || (trip.routeFrom && trip.routeTo ? `${trip.routeFrom} → ${trip.routeTo}` : 'Unknown Route');
            const busLabel = trip.busPlateNumber || trip.bus?.plateNumber || trip.busName || trip.bus?.model || '—';
            const capacity = trip.seatCapacity || trip.totalSeats || trip.bus?.capacity || '—';
            const normalizedStatus = String(trip.status || '').toLowerCase();
            const isActioning = actionTripId === trip.id;

            return (
              <div key={trip.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-lg font-black text-slate-900">{routeName}</div>
                    <div className="text-sm text-slate-500 mt-1">Bus: {busLabel}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${status.badge}`}>
                    {status.label}
                  </span>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <TripInfo label="Departure" value={trip.departureLocation || trip.routeFrom || '—'} />
                    <TripInfo label="Destination" value={trip.destination || trip.routeTo || '—'} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <TripInfo label="Departure Time" value={formatTime(trip.departureTime)} />
                    <TripInfo label="Trip Date" value={formatDate(trip.tripDate || trip.date)} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <TripInfo label="Seat Capacity" value={String(capacity)} />
                    <TripInfo label="Status" value={status.label} />
                  </div>
                </div>

                {normalizedStatus === 'scheduled' && (
                  <button
                    onClick={() => onTripAction?.(trip, 'start')}
                    disabled={isActioning}
                    className="mt-5 w-full bg-gradient-to-r from-[#0077B6] to-[#005F8E] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Navigation className="w-5 h-5" />
                    {isActioning ? 'Starting...' : 'Start Trip'}
                  </button>
                )}

                {normalizedStatus === 'in_progress' && (
                  <button
                    onClick={() => onTripAction?.(trip, 'end')}
                    disabled={isActioning}
                    className="mt-5 w-full bg-gradient-to-r from-[#27AE60] to-[#229954] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {isActioning ? 'Ending...' : 'End Trip'}
                  </button>
                )}

                {normalizedStatus === 'completed' && (
                  <button
                    disabled
                    className="mt-5 w-full bg-slate-200 text-slate-500 py-3 rounded-xl font-bold cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Trip Completed
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TripInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</div>
      <div className="font-bold text-slate-900">{value}</div>
    </div>
  );
}
// ==================== PASSENGERS VIEW ====================
function PassengersView({ setShowScanner, manifest, activeTrip }: { setShowScanner: (show: boolean) => void, manifest: any, activeTrip: any }) {
  const [search, setSearch] = useState('');
  const navigate = _useNavigate();
  const checkedInPassengers = Array.isArray(manifest?.checkedInPassengers) ? manifest.checkedInPassengers : [];
  const pendingPassengers = Array.isArray(manifest?.pendingPassengers) ? manifest.pendingPassengers : [];
  const passengers = Array.isArray(manifest?.passengers) ? manifest.passengers : [];

  const matchesSearch = (passenger: any) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [passenger.name, passenger.bookingRef, passenger.seatNumber, passenger.ticketStatus]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  };

  const filteredCheckedInPassengers = checkedInPassengers.filter(matchesSearch);
  const filteredPendingPassengers = pendingPassengers.filter(matchesSearch);
  const hasManifestSections = checkedInPassengers.length > 0 || pendingPassengers.length > 0;

  const formatBoardingTime = (value: string | null | undefined) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const PassengerCard = ({ passenger, boarded }: { passenger: any; boarded: boolean }) => (
    <div key={passenger.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center text-white font-bold">
          {String(passenger.name || 'P').split(' ').map((n: string) => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 truncate">{passenger.name}</div>
          <div className="text-sm text-slate-600 truncate">{passenger.bookingRef || passenger.ticketId}</div>
        </div>
        {boarded ? (
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Boarded
          </div>
        ) : (
          <button onClick={() => setShowScanner(true)} className="bg-[#0077B6] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#005F8E] transition-all">
            Check In
          </button>
        )}
      </div>
      <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Seat</div>
          <div className="font-bold text-slate-900">#{passenger.seatNumber || 'N/A'}</div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Status</div>
          <div className="font-bold text-slate-900">{passenger.ticketStatus || 'BOOKED'}</div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 sm:col-span-2 xl:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Scan Time</div>
          <div className="font-bold text-slate-900">{passenger.time || formatBoardingTime(passenger.boardingTime) || 'Not scanned'}</div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 sm:col-span-2 xl:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Bus</div>
          <div className="font-bold text-slate-900">{passenger.busPlate || manifest?.meta?.busPlate || 'Bus unavailable'}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900">Passengers</h1>
        <button 
          onClick={() => setShowScanner(true)}
          className="bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Scan className="w-5 h-5" />
          Scan
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-500">Assigned Trip</div>
          <div className="text-xl font-black text-slate-900">{activeTrip?.route || (activeTrip?.routeFrom && activeTrip?.routeTo ? `${activeTrip.routeFrom} → ${activeTrip.routeTo}` : 'No active trip')}</div>
          <div className="text-sm text-slate-500">{String(activeTrip?.operationalStatus || activeTrip?.status || 'ASSIGNED').replace(/_/g, ' ')} • {manifest?.stats?.boarded || 0}/{manifest?.stats?.total || 0} boarded</div>
        </div>
        <button onClick={() => navigate('/dashboard/driver/my-trips')} className="text-[#0077B6] font-bold text-sm hover:underline">View all trips</button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border-2 border-slate-200 focus-within:border-[#0077B6] transition-all p-3 flex items-center gap-3">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search passengers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 outline-none text-sm font-medium"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Checked-in Passengers</h2>
            <span className="text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
              {filteredCheckedInPassengers.length}
            </span>
          </div>
          {filteredCheckedInPassengers.map((passenger: any) => <PassengerCard key={passenger.id} passenger={passenger} boarded />)}
          {filteredCheckedInPassengers.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              No passengers have boarded for this trip yet.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900">Passengers Not Yet Boarded</h2>
            <span className="text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
              {filteredPendingPassengers.length}
            </span>
          </div>
          {filteredPendingPassengers.map((passenger: any) => <PassengerCard key={passenger.id} passenger={passenger} boarded={false} />)}
          {filteredPendingPassengers.length === 0 && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
              Everyone booked for this trip has already been scanned.
            </div>
          )}
        </div>
      </div>

      {!hasManifestSections && passengers.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
          No passengers found for this trip yet.
        </div>
      )}
    </div>
  );
}

// ==================== TRACKING VIEW ====================
function TrackingView({ schedule, onTripStarted, onTripEnded }: { schedule: any | null, onTripStarted?: () => void, onTripEnded?: () => void }) {
  if (!schedule || !schedule.id) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900">Live Tracking</h1>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-8 aspect-video flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-16 h-16 text-[#0077B6] mx-auto mb-4" />
            <div className="text-xl font-bold text-slate-900 mb-2">No Active Trip</div>
            <p className="text-slate-600">Click "Start Trip" on a schedule to begin GPS tracking</p>
          </div>
        </div>
      </div>
    );
  }

  // Get schedule status from backend (scheduled, in_progress, completed)
  const initialStatus = schedule.status || 'scheduled';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900">Live Tracking</h1>
        <p className="text-slate-600 mt-2">
          {schedule.routeFrom && schedule.routeTo ? `${schedule.routeFrom} → ${schedule.routeTo}` : 'Trip'}
          {schedule.bus?.plateNumber && ` • ${schedule.bus.plateNumber}`}
        </p>
      </div>
      
      <DriverTracking
        scheduleId={schedule.id}
        initialStatus={initialStatus}
        onTripStarted={onTripStarted}
        onTripEnded={onTripEnded}
      />
    </div>
  );
}

// ==================== PROFILE VIEW ====================
function ProfileView({ driverName, driverContext, companyName, tripsCount }: { driverName: string | null, driverContext: any, companyName: string | null, tripsCount: number }) {
  const { user, accessToken } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    location: '',
  });

  useEffect(() => {
    setForm({
      fullName: String(driverContext?.name || driverName || (user as any)?.full_name || (user as any)?.name || '').trim(),
      phoneNumber: String((user as any)?.phone_number || driverContext?.phone || '').trim(),
      email: String((user as any)?.email || driverContext?.email || '').trim(),
      location: String(driverContext?.location || '').trim(),
    });
  }, [driverContext, driverName, user]);

  const onChangeField = (field: 'fullName' | 'phoneNumber' | 'email' | 'location', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!accessToken) {
      setSaveError('Authentication required. Please log in again.');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const response = await fetch('/api/driver/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          fullName: form.fullName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          email: form.email.trim(),
          location: form.location.trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || payload?.error || 'Failed to save profile');
      }

      const profile = payload?.profile || {};
      setForm((prev) => ({
        ...prev,
        fullName: String(profile.fullName || prev.fullName || '').trim(),
        phoneNumber: String(profile.phoneNumber || prev.phoneNumber || '').trim(),
        email: String(profile.email || prev.email || '').trim(),
        location: String(profile.location || prev.location || '').trim(),
      }));

      if (Array.isArray(payload?.warnings) && payload.warnings.length > 0) {
        setSaveSuccess(`Profile updated with note: ${payload.warnings[0]}`);
      } else {
        setSaveSuccess('Profile updated successfully.');
      }
      setIsEditing(false);
    } catch (error: any) {
      setSaveError(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const onCancel = () => {
    setIsEditing(false);
    setSaveError(null);
    setSaveSuccess(null);
    setForm({
      fullName: String(driverContext?.name || driverName || (user as any)?.full_name || (user as any)?.name || '').trim(),
      phoneNumber: String((user as any)?.phone_number || driverContext?.phone || '').trim(),
      email: String((user as any)?.email || driverContext?.email || '').trim(),
      location: String(driverContext?.location || '').trim(),
    });
  };

  const displayName = form.fullName || driverContext?.name || driverName || (user as any)?.full_name || (user as any)?.name || 'Driver';

  const contactItems = [
    { icon: Phone, label: 'Phone', value: form.phoneNumber || 'Not available' },
    { icon: Mail, label: 'Email', value: form.email || 'Not available' },
    { icon: MapPin, label: 'Location', value: form.location || 'Not available' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl lg:text-3xl font-black text-slate-900">Profile</h1>
      
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-[#0077B6] to-[#00A8E8] rounded-2xl p-8 text-white">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border-4 border-white/30">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            {isEditing ? (
              <input
                value={form.fullName}
                onChange={(event) => onChangeField('fullName', event.target.value)}
                className="w-full max-w-md rounded-lg border border-white/40 bg-white/20 px-3 py-2 text-white placeholder:text-white/70 outline-none"
                placeholder="Full name"
              />
            ) : (
              <div className="text-2xl font-black mb-1">{displayName}</div>
            )}
            <div className="text-white/80 text-sm">{companyName || (user as any)?.companyName || 'No company assigned'}</div>
          </div>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)} className="bg-white/20 border-2 border-white/30 text-white px-6 py-2 rounded-lg font-bold hover:bg-white/30 transition-all">
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={onCancel} className="bg-transparent border-2 border-white/30 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/20 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="bg-white text-[#0077B6] px-4 py-2 rounded-lg font-bold hover:bg-white/90 transition-all disabled:opacity-60">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>

      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {saveSuccess}
        </div>
      )}

      {/* Stats */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-black text-slate-900">--</div>
          <div className="text-sm text-slate-600">Rating</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <Package className="w-8 h-8 text-[#0077B6] mx-auto mb-2" />
          <div className="text-2xl font-black text-slate-900">{tripsCount}</div>
          <div className="text-sm text-slate-600">Total Trips</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-black text-slate-900">--</div>
          <div className="text-sm text-slate-600">On-Time Rate</div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">Contact Information</h3>
        <div className="space-y-3">
          {contactItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-[#0077B6]/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[#0077B6]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                {!isEditing ? (
                  <div className="font-semibold text-slate-900">{item.value}</div>
                ) : (
                  <input
                    value={item.label === 'Phone' ? form.phoneNumber : item.label === 'Email' ? form.email : form.location}
                    onChange={(event) => onChangeField(item.label === 'Phone' ? 'phoneNumber' : item.label === 'Email' ? 'email' : 'location', event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#0077B6]"
                    placeholder={item.label}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== SCANNER MODAL ====================
function ScannerModal({ 
  onClose, 
  scheduleId,
  sessionScannedTickets, 
  setSessionScannedTickets,
  onScanSuccess,
}: { 
  onClose: () => void,
  scheduleId: string | null,
  sessionScannedTickets: Set<string>,
  setSessionScannedTickets: React.Dispatch<React.SetStateAction<Set<string>>>,
  onScanSuccess?: () => void,
}) {
  const { accessToken } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processingRef = useRef<boolean>(false); // Prevent concurrent scans
  const lastScannedCodeRef = useRef<string | null>(null); // Prevent duplicate scans
  
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null); // Backend response
  const [scanMessage, setScanMessage] = useState<string | null>(null); // UI display message
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Initialize QR code reader
    readerRef.current = new BrowserQRCodeReader();
    
    return () => {
      // Cleanup: stop scanning and release camera
      stopScanning();
    };
  }, []);

  const waitForVideoElement = async (maxWaitMs = 1200) => {
    const start = Date.now();
    while (!videoRef.current && Date.now() - start < maxWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return videoRef.current;
  };

  const startCamera = async () => {
    console.log('Starting camera...');
    console.log('Media devices:', navigator.mediaDevices);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported on this device/browser.');
    }

    const videoEl = await waitForVideoElement();
    if (!videoEl) {
      throw new Error('Video element is not ready.');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
      });

      streamRef.current = stream;
      videoEl.srcObject = stream;
      await videoEl.play();
      return;
    } catch (err) {
      console.error('Camera access failed:', err);
    }

    // Fallback to any available camera.
    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
    streamRef.current = fallbackStream;
    videoEl.srcObject = fallbackStream;
    await videoEl.play();
  };

  const startScanning = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    setScanMessage(null);
    processingRef.current = false;
    lastScannedCodeRef.current = null;

    try {
      // Allow modal/scanning view to render the video element before camera start.
      await new Promise((resolve) => setTimeout(resolve, 80));

      await startCamera();

      if (!readerRef.current || !videoRef.current) {
        throw new Error('Scanner is not ready');
      }

      // Start QR decoding only after camera stream is attached and video is playing.
      await readerRef.current.decodeFromVideoElement(
        videoRef.current,
        async (qrResult, err) => {
          if (qrResult) {
            const qrCode = qrResult.getText();

            // Prevent duplicate processing of the same code
            if (processingRef.current || lastScannedCodeRef.current === qrCode) {
              return;
            }

            lastScannedCodeRef.current = qrCode;
            await handleScan(qrCode);
          }
          const errMessage = (err as any)?.message;
          if (err && !(typeof errMessage === 'string' && errMessage.includes('NotFoundException'))) {
            console.error('QR scanning error:', err);
          }
        }
      );
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setError(err.message || 'Failed to access camera. Make sure camera permission is granted and no other app is using it.');
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      try {
        (readerRef.current as any).reset?.();
      } catch {
        // Reader may already be stopped.
      }
    }
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const handleScan = async (qrCode: string) => {
    // Prevent concurrent processing
    if (processingRef.current || processing) {
      console.log('⏳ Already processing a scan, ignoring...');
      return;
    }
    
    console.log('🎫 Scanning QR code:', qrCode);
    
    // STEP 1: Check session first (client-side check)
    if (sessionScannedTickets.has(qrCode)) {
      console.log('ℹ️ Ticket already scanned in this session');
      stopScanning();
      setScanMessage('Ticket already scanned in this trip');
      setScanResult({
        success: true,
        alreadyScannedInSession: true,
      });
      return;
    }
    
    // STEP 2: Lock processing and stop scanning immediately
    processingRef.current = true;
    setProcessing(true);
    stopScanning();

    try {
      console.log('📡 Calling backend to validate ticket...');
      const response = await fetch(`/api/tickets/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ qrCodeData: qrCode, tripId: scheduleId }),
      });

      const data = await response.json();
      console.log('📥 Backend response:', data);

      // STEP 3: Process backend response
      if (data.valid) {
        // SUCCESS: Valid ticket, first time scan
        console.log('✅ Valid ticket - adding to session');
        
        // Add to session immediately
        setSessionScannedTickets(prev => {
          const newSet = new Set(prev);
          newSet.add(qrCode);
          return newSet;
        });
        
        // Set stable success message
        setScanMessage(data.message || 'Ticket scanned successfully ✓');
        setScanResult({
          success: true,
          alreadyScannedInSession: false,
          ticket: data.ticket,
          passenger: data.passenger,
        });
        onScanSuccess?.();
      } else {
        // FAILURE: Invalid ticket from backend
        console.log('❌ Invalid ticket:', data.reason);
        
        // Differentiate already-used causes based on backend reason.
        if (data.reason === 'ALREADY_USED_SELF') {
          setScanMessage('Ticket already scanned in this trip ⚠️');
        } else if (data.reason === 'ALREADY_USED') {
          setScanMessage(data.message || 'Ticket already used ⚠️');
        } else if (data.reason === 'TRIP_MISMATCH') {
          setScanMessage('Ticket is for another trip ❌');
        } else if (data.reason === 'PENDING_PAYMENT') {
          setScanMessage('Payment is pending for this ticket ⏳');
        } else if (data.reason === 'TRIP_NOT_ACTIVE') {
          setScanMessage('Trip not active - start the trip first ⚠️');
        } else if (data.reason === 'TICKET_CANCELLED') {
          setScanMessage('Ticket has been cancelled ❌');
        } else {
          setScanMessage(data.message || 'Invalid ticket ❌');
        }
        
        setScanResult({
          success: false,
          reason: data.reason,
          ticket: data.ticket,
        });
      }
    } catch (err: any) {
      console.error('❌ Failed to scan ticket:', err);
      setError(err.message || 'Failed to validate ticket');
      setScanMessage(null);
      setScanResult(null);
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  };

  const handleScanAnother = () => {
    setScanResult(null);
    setScanMessage(null);
    setError(null);
    processingRef.current = false;
    lastScannedCodeRef.current = null;
    startScanning();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 relative shadow-2xl">
        <button onClick={() => { stopScanning(); onClose(); }} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all">
          <X className="w-5 h-5 text-slate-700" />
        </button>

        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Scan className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">
            {scanning ? 'Scanning...' : scanResult ? (scanResult.success ? 'Verified!' : 'Invalid Ticket') : 'Scan QR Code'}
          </h3>
          <p className="text-slate-600 text-sm">
            {scanning ? 'Hold the QR code steady in frame' : 
             scanMessage ? scanMessage : 
             'Click "Start Scanning" to begin'}
          </p>
        </div>

        {/* Video Preview or Result */}
        <div className={`rounded-2xl mb-6 border-4 overflow-hidden ${
          scanning ? 'bg-black border-blue-300' :
          scanResult?.success ? 'bg-green-50 border-green-300 p-8' :
          scanResult?.success === false ? 'bg-red-50 border-red-300 p-8' :
          error ? 'bg-red-50 border-red-300 p-8' :
          'bg-slate-50 border-slate-300 border-dashed p-8'
        }`}>
          {scanning ? (
            <div className="relative">
              <video 
                ref={videoRef} 
                className="w-full h-64 object-cover rounded-lg"
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%' }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-4 border-white/50 rounded-lg"></div>
              </div>
            </div>
          ) : scanResult ? (
            <div className="text-center">
              {scanResult.success ? (
                <>
                  <CheckCircle className="w-24 h-24 text-green-600 mx-auto mb-4" />
                  <div className="font-bold text-2xl text-slate-900 mb-3">
                    {scanResult.alreadyScannedInSession 
                      ? 'Already Checked In'
                      : (scanResult.passenger?.name || scanResult.ticket?.passengerName || scanResult.ticket?.commuter?.name || 'Passenger')
                    }
                  </div>
                  {scanResult.alreadyScannedInSession ? (
                    <div className="bg-blue-50 rounded-xl p-4 mb-3">
                      <div className="text-sm text-blue-800 font-semibold mb-1">
                        {scanMessage || 'This ticket was already scanned in this trip'}
                      </div>
                      <div className="text-xs text-blue-600">
                        Passenger is already checked in
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-white rounded-xl p-4 mb-3 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Seat Number</span>
                          <span className="font-bold text-slate-900">{scanResult.passenger?.seat || scanResult.ticket?.seatNumber || 'N/A'}</span>
                        </div>
                        {scanResult.passenger?.phone && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Phone</span>
                            <span className="font-semibold text-slate-900">{scanResult.passenger.phone}</span>
                          </div>
                        )}
                        {scanResult.passenger?.boardingStatus && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600">Boarding</span>
                            <span className="font-semibold text-green-700">{scanResult.passenger.boardingStatus}</span>
                          </div>
                        )}
                        {scanResult.ticket?.bookingRef && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Booking Ref</span>
                            <span className="font-mono text-slate-700">{scanResult.ticket.bookingRef}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-green-600 font-semibold">
                        {scanMessage || 'Ticket scanned successfully'}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="w-24 h-24 text-red-600 mx-auto mb-4" />
                  <div className="font-bold text-xl text-slate-900 mb-3">
                    {scanMessage || 'Invalid Ticket'}
                  </div>
                  {scanResult.reason && (
                    <div className="bg-red-50 rounded-lg p-3 mb-3">
                      <div className="text-xs text-red-700 font-semibold uppercase tracking-wide">
                        {scanResult.reason.replace(/_/g, ' ')}
                      </div>
                    </div>
                  )}
                  {scanResult.ticket && (
                    <div className="text-sm text-slate-600">
                      {scanResult.ticket.passengerName || scanResult.ticket.commuter?.name} • Seat {scanResult.ticket.seatNumber}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : error ? (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-3" />
              <div className="font-bold text-slate-900 mb-1">Error</div>
              <div className="text-sm text-slate-600">{error}</div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <QrCode className="w-20 h-20 text-slate-400" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {scanResult ? (
          <div className="space-y-3">
            {scanResult.success && (
              <button onClick={() => { stopScanning(); onClose(); }} className="w-full bg-gradient-to-r from-[#27AE60] to-[#229954] text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Done
              </button>
            )}
            <button onClick={handleScanAnother} className="w-full bg-slate-100 text-slate-900 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all">
              Scan Another Ticket
            </button>
          </div>
        ) : scanning ? (
          <button onClick={stopScanning} className="w-full bg-red-500 text-white py-4 rounded-xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2">
            <X className="w-5 h-5" />
            Stop Scanning
          </button>
        ) : (
          <button onClick={startScanning} disabled={processing} className="w-full bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <Scan className="w-5 h-5" />
            Start Scanning
          </button>
        )}
      </div>
    </div>
  );
}
