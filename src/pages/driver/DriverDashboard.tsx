import React, { useState, useEffect, useRef } from 'react';
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

// ==================== SAMPLE DATA ====================
const driverData = {
  name: 'John Kamau',
  id: 'DRV-001',
  rating: 4.8,
  totalTrips: 156,
  photo: null,
};

const todayStats = {
  tripsCompleted: 2,
  activeTrips: 1,
  totalPassengers: 53,
  revenue: 397500,
};

// Trips will be fetched from backend; no hardcoded mock trips

const recentPassengers = [
  { id: 1, name: 'Alice Nzabonimana', seat: '5', ticket: 'TKT-1245', checked: true, time: '07:45 AM' },
  { id: 2, name: 'Peter Mugabe', seat: '8', ticket: 'TKT-1246', checked: true, time: '07:48 AM' },
  { id: 3, name: 'Mary Uwase', seat: '12', ticket: 'TKT-1247', checked: false, time: null },
  { id: 4, name: 'James Habimana', seat: '15', ticket: 'TKT-1248', checked: true, time: '07:52 AM' },
  { id: 5, name: 'Grace Mukamana', seat: '18', ticket: 'TKT-1249', checked: false, time: null },
];

// ==================== MAIN COMPONENT ====================
import { useAuth } from '../../components/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DriverDashboard() {
  const { accessToken, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [showScanner, setShowScanner] = useState(false);
  const [driverName, setDriverName] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [driverContext, setDriverContext] = useState(null);
  const [companyName, setCompanyName] = useState(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [tripsError, setTripsError] = useState<string | null>(null);
  const [activeTrip, setActiveTrip] = useState<any | null>(null);
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({ tripsCompleted: 0, activeTrips: 0, totalPassengers: 0, revenue: 0 });
  const [recentPassengersState, setRecentPassengersState] = useState<any[]>(recentPassengers);
  const [selectedScheduleForTracking, setSelectedScheduleForTracking] = useState<any | null>(null);
  const [sessionScannedTickets, setSessionScannedTickets] = useState<Set<string>>(new Set());

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
        const res = await fetch(`/api/driver/my-trips`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!mounted) return;
        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `Failed to load trips: ${res.status}`);
        }
        const j = await res.json();
        if (!mounted) return;
        // expect { trips: [...] } or array directly
        const loaded = Array.isArray(j) ? j : (j.trips || j.data || []);
        setTrips(loaded);
        // compute active and upcoming trips for dashboard
        const act = loaded.find((t: any) => {
          const status = String(t.status || '').toUpperCase();
          return status === 'ACTIVE' || status === 'IN_PROGRESS';
        }) || null;
        setActiveTrip(act);
        setUpcomingTrips(
          loaded.filter((t: any) => {
            const status = String(t.status || '').toUpperCase();
            return status !== 'ACTIVE' && status !== 'IN_PROGRESS';
          })
        );
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
        const res = await fetch(`/api/driver/dashboard`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) return;
        const j = await res.json();
        if (!mounted) return;
        const s = j.stats || {};
        setDashboardStats({ tripsCompleted: s.completed || 0, activeTrips: s.active || 0, totalPassengers: s.passengers || 0, revenue: s.revenue || 0 });
        setUpcomingTrips(j.upcoming || []);
        setRecentPassengersState(j.recentCheckins || []);
      } catch (e) {
        // ignore
      }
    };
    loadDashboard();
    return () => { mounted = false; };
  }, [accessToken]);

  // Handle Start Trip button click
  const handleStartTrip = (schedule: any) => {
    if (!schedule || !schedule.id) {
      console.error('Invalid schedule for starting trip');
      return;
    }
    console.log('🚀 Starting trip for schedule:', schedule.id);
    setSelectedScheduleForTracking(schedule);
    setActiveView('tracking');
  };

  // Refresh data after trip starts/ends
  const handleTripStarted = () => {
    console.log('✅ Trip started, refreshing data...');
    // Reload schedules and trips
    window.location.reload(); // Simple refresh, or you can re-fetch data
  };

  const handleTripEnded = () => {
    console.log('✅ Trip ended, refreshing data...');
    setSelectedScheduleForTracking(null);
    setActiveView('dashboard');
    window.location.reload(); // Simple refresh, or you can re-fetch data
  };

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
                <div className="font-bold text-white truncate">{(driverContext?.name || driverName || user?.full_name || driverData.name)}</div>
                <div className="text-xs text-white/70">{(companyName || driverContext?.id || user?.companyName || driverData.id)}</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-white/90">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-yellow-300 text-yellow-300" />
                <span className="font-bold">{driverData.rating}</span>
              </div>
              <div className="h-3 w-px bg-white/30"></div>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3" />
                <span className="font-bold">{driverData.totalTrips} trips</span>
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
              onClick={() => { setActiveView(item.id); setSidebarOpen(false); }}
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
          {activeView === 'dashboard' && <DashboardView setShowScanner={setShowScanner} driverName={driverName} schedules={schedules} user={user} activeTrip={activeTrip} upcomingTrips={upcomingTrips} dashboardStats={dashboardStats} recentPassengers={recentPassengersState} onStartTrip={handleStartTrip} />}
          {activeView === 'trips' && <TripsView trips={trips} loading={tripsLoading} error={tripsError} onStartTrip={handleStartTrip} />}
          {activeView === 'passengers' && <PassengersView setShowScanner={setShowScanner} />}
          {activeView === 'tracking' && <TrackingView schedule={selectedScheduleForTracking} onTripStarted={handleTripStarted} onTripEnded={handleTripEnded} />}
          {activeView === 'profile' && <ProfileView driverName={driverName} driverContext={driverContext} companyName={companyName} />}
        </div>
      </main>

      {/* ========== SCANNER MODAL ========== */}
      {showScanner && (
        <ScannerModal 
          onClose={() => setShowScanner(false)} 
          sessionScannedTickets={sessionScannedTickets}
          setSessionScannedTickets={setSessionScannedTickets}
        />
      )}
    </div>
  );
}

// ==================== DASHBOARD VIEW ====================
function DashboardView({ setShowScanner, driverName, schedules, user, activeTrip, upcomingTrips, dashboardStats, recentPassengers, onStartTrip }: { setShowScanner: any, driverName: any, schedules: any[], user: any, activeTrip: any, upcomingTrips: any[], dashboardStats: any, recentPassengers: any[], onStartTrip?: (schedule: any) => void }) {
  const navigate = _useNavigate();
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-slate-900 mb-1">
            Good morning, {((driverName || user?.full_name || user?.name || driverData.name) + '').split(' ')[0]}! 👋
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
                  ACTIVE TRIP
                </div>
                <h2 className="text-2xl lg:text-3xl font-black mb-2">{activeTrip.route || (activeTrip.routeFrom && activeTrip.routeTo ? `${activeTrip.routeFrom} → ${activeTrip.routeTo}` : '')}</h2>
                <p className="text-white/80 text-sm">{(activeTrip.bus && typeof activeTrip.bus === 'object') ? (activeTrip.bus.plateNumber || activeTrip.bus.plate_number || activeTrip.bus.id) : activeTrip.bus} • {activeTrip.departure || activeTrip.departureTime || '—'}</p>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/70 mb-1">ETA</div>
                <div className="text-3xl font-black">{activeTrip.eta}</div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-medium">Trip Progress</span>
                <span className="font-bold">{activeTrip.progress}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-500"
                  style={{ width: `${activeTrip.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="text-xs text-white/70 mb-1">Passengers</div>
                <div className="text-2xl font-black">{activeTrip.passengers}/{activeTrip.totalSeats}</div>
              </div>
              <button className="bg-white text-[#0077B6] rounded-xl p-4 font-bold hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" />
                End Trip
              </button>
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
            <button className="text-[#0077B6] font-bold text-sm hover:underline flex items-center gap-1">
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
                    <div className="text-sm font-bold text-[#0077B6]">{trip.time}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600">
                    {(() => {
                      const passengers = typeof trip.passengers === 'number' ? trip.passengers : (typeof trip.soldSeats === 'number' ? trip.soldSeats : (trip.seatsAvailable !== undefined && trip.total ? (trip.total - trip.seatsAvailable) : (trip.totalSeats ? '—' : '—')));
                      const total = trip.total || trip.totalSeats || '—';
                      return <span className="font-semibold">{(passengers !== null && passengers !== undefined) ? passengers : '—'}/{total}</span>;
                    })()} seats
                  </div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => {
                      const passengers = typeof trip.passengers === 'number' ? trip.passengers : (typeof trip.soldSeats === 'number' ? trip.soldSeats : null);
                      const total = trip.total || trip.totalSeats || null;
                      const filled = (passengers !== null && total) ? Math.floor((passengers / total) * 5) : 0;
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
              onClick={() => navigate('/dashboard/driver/scanner')}
              className="text-[#0077B6] font-bold text-sm hover:underline flex items-center gap-1"
            >
              Scan <QrCode className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {recentPassengers.slice(0, 5).map(passenger => (
              <div key={passenger.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {passenger.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-slate-900 truncate">{passenger.name}</div>
                  <div className="text-xs text-slate-500">Seat {passenger.seat}</div>
                </div>
                {passenger.checked ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0"></div>
                )}
              </div>
            ))}
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
function TripsView({ trips, loading, error, onStartTrip }: { trips?: any[], loading?: boolean, error?: string | null, onStartTrip?: (schedule: any) => void }) {
  const list = (trips && trips.length > 0) ? trips : [];

  const renderEntry = (s: any) => {
    // If schedule from backend
    if (s.bus || s.routeFrom || s.departureTime) {
      const route = s.routeFrom && s.routeTo ? `${s.routeFrom} → ${s.routeTo}` : (s.name || s.route || 'Schedule');
      const bus = s.bus ? (s.bus.plateNumber || '') : (s.bus_registration || s.bus || '');
      const departure = s.departureTime ? (new Date(s.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })) : (s.time || '—');
      const totalSeats = (s.totalSeats || (s.bus && s.bus.capacity)) || null;
      const seatsAvailable = (typeof s.seatsAvailable === 'number' ? s.seatsAvailable : (s.available_seats !== undefined ? s.available_seats : null));
      // Prefer explicit soldSeats from backend; fallback to passengers or compute from capacity - available
      const passengers = (typeof s.soldSeats === 'number') ? s.soldSeats : (typeof s.passengers === 'number' ? s.passengers : ((totalSeats !== null && seatsAvailable !== null) ? (totalSeats - seatsAvailable) : null));
      const occupancy = (totalSeats !== null && typeof passengers === 'number' && totalSeats > 0) ? Math.round((passengers / totalSeats) * 100) : null;

      return (
        <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center shadow-lg">
                <Bus className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900 mb-1">{route}</div>
                <div className="text-sm text-slate-600">{bus}</div>
              </div>
            </div>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{(s.status || s.status === undefined) ? (String(s.status).toUpperCase() || 'UPCOMING') : 'UPCOMING'}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Time</div>
              <div className="font-bold text-slate-900">{departure}</div>
            </div>
            <div className="text-center bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Passengers</div>
              <div className="font-bold text-[#0077B6]">{(passengers !== null && passengers !== undefined) ? passengers : '—'}/{totalSeats || '—'}</div>
            </div>
            <div className="text-center bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Occupancy</div>
              <div className="font-bold text-slate-900">{occupancy !== null ? `${occupancy}%` : '—'}</div>
            </div>
          </div>

          <button 
            onClick={() => onStartTrip?.(s)}
            className="w-full bg-gradient-to-r from-[#27AE60] to-[#229954] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Navigation className="w-5 h-5" />
            Start Trip
          </button>
        </div>
      );
    }

    // Fallback (legacy sample)
    return (
      <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center shadow-lg">
              <Bus className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="text-xl font-black text-slate-900 mb-1">{s.route}</div>
              <div className="text-sm text-slate-600">{s.bus}</div>
            </div>
          </div>
          <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{s.status || 'UPCOMING'}</span>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Time</div>
            <div className="font-bold text-slate-900">{s.time}</div>
          </div>
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Passengers</div>
            <div className="font-bold text-[#0077B6]">{s.passengers}/{s.total}</div>
          </div>
          <div className="text-center bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Occupancy</div>
            <div className="font-bold text-slate-900">{Math.round((s.passengers / s.total) * 100)}%</div>
          </div>
        </div>

        <button 
          onClick={() => onStartTrip?.(s)}
          className="w-full bg-gradient-to-r from-[#27AE60] to-[#229954] text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <Navigation className="w-5 h-5" />
          Start Trip
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900">My Trips</h1>
        <button className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 hover:border-[#0077B6] transition-all text-sm font-semibold">
          <Calendar className="w-4 h-4" />
          Filter
        </button>
      </div>

      <div className="space-y-4">
        {list.map(item => renderEntry(item))}
      </div>
    </div>
  );
}

// ==================== PASSENGERS VIEW ====================
function PassengersView({ setShowScanner }: { setShowScanner: (show: boolean) => void }) {
  const [search, setSearch] = useState('');
  const navigate = _useNavigate();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl lg:text-3xl font-black text-slate-900">Passengers</h1>
        <button 
          onClick={() => navigate('/dashboard/driver/scanner')}
          className="bg-gradient-to-r from-[#0077B6] to-[#00A8E8] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
        >
          <Scan className="w-5 h-5" />
          Scan
        </button>
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

      {/* Passenger List */}
      <div className="space-y-3">
        {recentPassengers.map(passenger => (
          <div key={passenger.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0077B6] to-[#00A8E8] flex items-center justify-center text-white font-bold">
                {passenger.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-900">{passenger.name}</div>
                <div className="text-sm text-slate-600">{passenger.ticket}</div>
              </div>
              {passenger.checked ? (
                <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Checked
                </div>
              ) : (
                <button className="bg-[#0077B6] text-white px-6 py-2 rounded-lg font-bold hover:bg-[#005F8E] transition-all">
                  Check In
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1">
                <strong className="text-slate-900">Seat:</strong> #{passenger.seat}
              </span>
              {passenger.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {passenger.time}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
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
function ProfileView({ driverName, driverContext, companyName }: { driverName: string | null, driverContext: any, companyName: string | null }) {
  const { user } = useAuth();
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
            <div className="text-2xl font-black mb-1">{driverContext?.name || driverName || (user as any)?.full_name || driverData.name}</div>
            <div className="text-white/80 text-sm">{companyName || driverContext?.id || (user as any)?.companyName || driverData.id}</div>
          </div>
          <button className="bg-white/20 border-2 border-white/30 text-white px-6 py-2 rounded-lg font-bold hover:bg-white/30 transition-all">
            Edit
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <div className="text-2xl font-black text-slate-900">{driverData.rating}</div>
          <div className="text-sm text-slate-600">Rating</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <Package className="w-8 h-8 text-[#0077B6] mx-auto mb-2" />
          <div className="text-2xl font-black text-slate-900">{driverData.totalTrips}</div>
          <div className="text-sm text-slate-600">Total Trips</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center">
          <Award className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-black text-slate-900">98%</div>
          <div className="text-sm text-slate-600">On-Time Rate</div>
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="text-lg font-black text-slate-900 mb-4">Contact Information</h3>
        <div className="space-y-3">
          {[
            { icon: Phone, label: 'Phone', value: '+250 788 123 456' },
            { icon: Mail, label: 'Email', value: 'john.kamau@safaritix.com' },
            { icon: MapPin, label: 'Location', value: 'Kigali, Rwanda' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-[#0077B6]/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[#0077B6]" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-slate-500 mb-1">{item.label}</div>
                <div className="font-semibold text-slate-900">{item.value}</div>
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
  sessionScannedTickets, 
  setSessionScannedTickets 
}: { 
  onClose: () => void,
  sessionScannedTickets: Set<string>,
  setSessionScannedTickets: React.Dispatch<React.SetStateAction<Set<string>>>
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

  const startScanning = async () => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    setScanMessage(null);
    processingRef.current = false;
    lastScannedCodeRef.current = null;

    try {
      const videoInputDevices = await BrowserQRCodeReader.listVideoInputDevices();

      // Some browsers do not expose stable device IDs until permission is granted.
      // In that case, pass undefined and let ZXing use the default/environment camera.
      let selectedDeviceId: string | undefined;
      if (videoInputDevices.length > 0) {
        const backCamera = videoInputDevices.find((d) =>
          /back|rear|environment/i.test(d.label || '')
        );
        selectedDeviceId = backCamera?.deviceId || videoInputDevices[0]?.deviceId || undefined;
      }

      if (readerRef.current && videoRef.current) {
        const controls = await readerRef.current.decodeFromVideoDevice(
          selectedDeviceId,
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
        // Store the video stream for cleanup
        if (videoRef.current.srcObject instanceof MediaStream) {
          streamRef.current = videoRef.current.srcObject;
        }
      }
    } catch (err: any) {
      console.error('Failed to start scanner:', err);
      setError(err.message || 'Failed to access camera');
      setScanning(false);
    }
  };

  const stopScanning = () => {
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
      const response = await fetch(`/api/driver/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ qrCode }),
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
      } else {
        // FAILURE: Invalid ticket from backend
        console.log('❌ Invalid ticket:', data.reason);
        
        // Check if it's "already used" - could mean another driver scanned it
        if (data.reason === 'ALREADY_USED') {
          setScanMessage('Ticket already used by another driver ⚠️');
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
