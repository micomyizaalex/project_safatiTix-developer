import React, { createContext, useContext, useState } from 'react';
import { useAuth } from '../../components/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import SuccessPopup from '../../components/SuccessPopup';
import RevenueReports from './RevenueReports';
import TicketsManagement from './TicketsManagement';
import { DEFAULT_PLAN_PERMISSIONS, PLAN_PERMISSION_PRESETS, hasPlanFeature as hasFrontendPlanFeature } from '../../utils/subscriptionPlans';
import CompanyFleetTracking from '../../components/CompanyFleetTracking';
import CompanySharedRoutesSection from '../../components/CompanySharedRoutesSection';
import NotificationBell from '../../components/NotificationBell';
import CompanySubscriptionManagement from './CompanySubscriptionManagement';
import ComplaintManagementCompany from '../../components/ComplaintManagementCompany';
import {
  LayoutDashboard,
  Bus,
  Users,
  Calendar,
  Ticket,
  TrendingUp,
  MapPin,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  DollarSign,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Crown,
  Clock,
  Navigation,
  Phone,
  Mail,
  Filter,
  Download,
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Bell,
  User,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// SafariTix Brand Colors
const COLORS = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  secondary: '#F4A261',
  success: '#27AE60',
  danger: '#E63946',
  darkGray: '#2B2D42',
  lightGray: '#F5F7FA',
  white: '#FFFFFF',
};

const routePerformance = [
  { route: 'Kigali → Gisenyi', trips: 45, revenue: 1250000, occupancy: 92 },
  { route: 'Kigali → Butare', trips: 38, revenue: 980000, occupancy: 88 },
  { route: 'Kigali → Musanze', trips: 32, revenue: 720000, occupancy: 85 },
  { route: 'Butare → Huye', trips: 28, revenue: 520000, occupancy: 78 },
];

const notifications = [
  { id: 1, type: 'alert', message: 'Bus RAB-202B scheduled for maintenance today', time: '10 min ago' },
  { id: 2, type: 'success', message: '3 new ticket bookings for Kigali → Gisenyi route', time: '25 min ago' },
  { id: 3, type: 'info', message: 'Driver James Mwangi completed trip RAB-101A', time: '1 hr ago' },
];

const CompanyVerificationContext = createContext({
  isVerified: false,
  accountStatus: 'pending',
  subscriptionPlan: 'Starter',
  planPermissions: DEFAULT_PLAN_PERMISSIONS,
  nextPayment: null as string | null,
  subscriptionStatus: 'inactive',
  refreshVerification: async () => {},
});

export default function CompanyDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchHint, setSearchHint] = useState('');
  const [searchHasResults, setSearchHasResults] = useState(false);
  const { user, signOut, signIn, accessToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const contentSearchRef = React.useRef<HTMLDivElement | null>(null);
  const searchMatchesRef = React.useRef<HTMLElement[]>([]);
  const searchTermRef = React.useRef('');
  const activeMatchIndexRef = React.useRef(-1);

  // Read logged-in user (stored by login/signup) from localStorage
  const storedUser: Record<string, any> | null = (() => {
    try {
      return typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || 'null') : null;
    } catch (_error) {
      return null;
    }
  })();

  const displayName = storedUser ? (storedUser.full_name || storedUser.name || storedUser.fullName || storedUser.email) : 'Admin User';
  const displayRole = storedUser
    ? (storedUser.role === 'company_admin' ? 'Company Admin' : (storedUser.role || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()))
    : 'Company Admin';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const initialIsVerified = Boolean(
    storedUser?.accountStatus === 'approved'
    || storedUser?.companyVerified === true
    || user?.accountStatus === 'approved'
    || user?.companyVerified === true
  );
  const [verificationState, setVerificationState] = React.useState({
    isVerified: initialIsVerified,
    accountStatus: storedUser?.accountStatus || user?.accountStatus || 'pending',
  });
  const [subscriptionState, setSubscriptionState] = React.useState({
    subscriptionPlan: storedUser?.subscriptionPlan || user?.subscriptionPlan || 'Starter',
    planPermissions: storedUser?.planPermissions || user?.planPermissions || DEFAULT_PLAN_PERMISSIONS,
    nextPayment: null as string | null,
    subscriptionStatus: 'inactive',
  });

  const isSubscriptionRoute = location.pathname.endsWith('/subscription');

  const applyCompanyAccessState = React.useCallback((nextUser: any, company: any) => {
    const subscriptionPlan = company?.subscriptionPlan || company?.plan || nextUser?.subscriptionPlan || 'Starter';
    const planPermissions = company?.planPermissions || nextUser?.planPermissions || PLAN_PERMISSION_PRESETS[subscriptionPlan as keyof typeof PLAN_PERMISSION_PRESETS] || DEFAULT_PLAN_PERMISSIONS;
    setSubscriptionState({
      subscriptionPlan,
      planPermissions,
      nextPayment: company?.nextPayment || null,
      subscriptionStatus: company?.subscriptionStatus || 'inactive',
    });
  }, []);

  const menuItems = React.useMemo(() => ([
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'buses', label: 'Buses', icon: Bus },
    { id: 'drivers', label: 'Drivers', icon: Users },
    { id: 'shared', label: 'Shared Routes', icon: Navigation },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
    {
      id: 'revenue',
      label: 'Revenue & Reports',
      icon: TrendingUp,
      disabled: !hasFrontendPlanFeature(subscriptionState.planPermissions, 'revenueReports'),
      lockText: 'Enterprise',
    },
    { id: 'subscription', label: 'Subscription', icon: Crown },
    { id: 'tracking', label: 'Live Tracking', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]), [subscriptionState.planPermissions]);

  const handleSectionChange = React.useCallback((sectionId: string) => {
    setActiveSection(sectionId);

    if (sectionId === 'subscription') {
      if (!isSubscriptionRoute) {
        navigate('/dashboard/company/subscription');
      }
    } else if (isSubscriptionRoute) {
      navigate('/dashboard/company');
    }

    setMobileMenuOpen(false);
  }, [isSubscriptionRoute, navigate]);

  React.useEffect(() => {
    if (isSubscriptionRoute) {
      setActiveSection('subscription');
    } else if (activeSection === 'schedules') {
      setActiveSection('dashboard');
    } else if (activeSection === 'subscription') {
      setActiveSection('dashboard');
    }
  }, [activeSection, isSubscriptionRoute]);

  const clearSearchHighlights = React.useCallback(() => {
    searchMatchesRef.current.forEach((el) => {
      el.classList.remove('dashboard-search-hit');
      el.classList.remove('dashboard-search-hit-active');
    });
    searchMatchesRef.current = [];
    searchTermRef.current = '';
    activeMatchIndexRef.current = -1;
    setSearchHasResults(false);
  }, []);

  const collectSearchMatches = React.useCallback((term: string) => {
    const root = contentSearchRef.current;
    if (!root) return [] as HTMLElement[];

    const selector = 'h1,h2,h3,h4,h5,h6,p,span,td,th,button,a,label,li,small,strong';
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(selector));
    const normalizedTerm = term.toLowerCase();

    return nodes.filter((el) => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      if (el.offsetParent === null && style.position !== 'fixed') return false;

      const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return text.length > 0 && text.includes(normalizedTerm);
    });
  }, []);

  const focusSearchMatch = React.useCallback((index: number) => {
    const matches = searchMatchesRef.current;
    if (!matches.length) return;

    const nextIndex = ((index % matches.length) + matches.length) % matches.length;
    activeMatchIndexRef.current = nextIndex;

    matches.forEach((el) => el.classList.remove('dashboard-search-hit-active'));
    const active = matches[nextIndex];
    active.classList.add('dashboard-search-hit-active');
    active.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    setSearchHasResults(true);
    setSearchHint(`Result ${nextIndex + 1} of ${matches.length}`);
  }, []);

  const runHeaderSearch = React.useCallback((rawQuery: string, direction: 'next' | 'prev' = 'next') => {
    const query = rawQuery.trim();
    if (!query) {
      clearSearchHighlights();
      setSearchHint('');
      setSearchHasResults(false);
      return;
    }

    const sameTerm = searchTermRef.current === query.toLowerCase();
    if (sameTerm && searchMatchesRef.current.length > 0) {
      const delta = direction === 'next' ? 1 : -1;
      focusSearchMatch(activeMatchIndexRef.current + delta);
      return;
    }

    clearSearchHighlights();
    const matches = collectSearchMatches(query);
    searchTermRef.current = query.toLowerCase();
    searchMatchesRef.current = matches;

    if (!matches.length) {
      setSearchHint('No results on this page');
      setSearchHasResults(false);
      return;
    }

    matches.forEach((el) => el.classList.add('dashboard-search-hit'));
    focusSearchMatch(0);
  }, [clearSearchHighlights, collectSearchMatches, focusSearchMatch]);

  React.useEffect(() => {
    clearSearchHighlights();
    setSearchHint('');
    setSearchHasResults(false);
  }, [activeSection, clearSearchHighlights]);

  // KPI state from backend
  const [kpis, setKpis] = React.useState({
    totalBuses: 0,
    activeBuses: 0,
    activeRoutes: 0,
    activeDrivers: 0,
    todaysRevenue: 0,
    todaysTickets: 0
  });

  const [activeBusesList, setActiveBusesList] = React.useState<any[]>([]);
  const [busStatusData, setBusStatusData] = React.useState([
    { name: 'Active', value: 0, color: COLORS.success },
    { name: 'In Maintenance', value: 0, color: COLORS.secondary },
    { name: 'Inactive', value: 0, color: COLORS.danger },
  ]);
  const [recentTickets, setRecentTickets] = React.useState<any[]>([]);
  const [revenueData, setRevenueData] = React.useState<any[]>([]);
  const [totalActiveTrips, setTotalActiveTrips] = useState(0);

  React.useEffect(() => {
    let mounted = true;

    async function refreshVerification() {
      if (!token) return;

      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

      try {
        const [meRes, companyRes] = await Promise.all([
          fetch('/api/auth/me', { headers }),
          fetch('/api/company', { headers }),
        ]);

        let nextUser: any = storedUser || user || null;
        if (meRes.ok) {
          const meJson = await meRes.json();
          nextUser = meJson.user || nextUser;
          if (nextUser && signIn) {
            await signIn(accessToken || token, nextUser);
          }
        }

        let company: any = null;
        if (companyRes.ok) {
          const companyJson = await companyRes.json();
          company = companyJson.company || null;
        }

        const isVerified = Boolean(
          nextUser?.accountStatus === 'approved'
          || nextUser?.companyVerified === true
          || company?.accountStatus === 'approved'
          || company?.account_status === 'approved'
          || company?.companyVerified === true
          || company?.company_verified === true
          || company?.status === 'approved'
          || company?.is_approved === true
        );

        const accountStatus = nextUser?.accountStatus
          || company?.accountStatus
          || company?.account_status
          || company?.status
          || 'pending';

        if (mounted) {
          setVerificationState({ isVerified, accountStatus });
          applyCompanyAccessState(nextUser, company);
        }
      } catch (error) {
        console.warn('Failed to refresh verification state', error);
      }
    }

    refreshVerification();

    const onFocus = () => { refreshVerification(); };
    window.addEventListener('focus', onFocus);

    return () => {
      mounted = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [accessToken, signIn, token]);

  const refreshVerification = React.useCallback(async () => {
    if (!token) return;
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    try {
      const [meRes, companyRes] = await Promise.all([
        fetch('/api/auth/me', { headers }),
        fetch('/api/company', { headers }),
      ]);

      let nextUser: any = storedUser || user || null;
      if (meRes.ok) {
        const meJson = await meRes.json();
        nextUser = meJson.user || nextUser;
        if (nextUser && signIn) {
          await signIn(accessToken || token, nextUser);
        }
      }

      const companyJson = companyRes.ok ? await companyRes.json() : { company: null };
      const company = companyJson.company || null;
      setVerificationState({
        isVerified: Boolean(
          nextUser?.accountStatus === 'approved'
          || nextUser?.companyVerified === true
          || company?.accountStatus === 'approved'
          || company?.account_status === 'approved'
          || company?.companyVerified === true
          || company?.company_verified === true
          || company?.status === 'approved'
          || company?.is_approved === true
        ),
        accountStatus: nextUser?.accountStatus || company?.accountStatus || company?.account_status || company?.status || 'pending',
      });
      applyCompanyAccessState(nextUser, company);
    } catch (error) {
      console.warn('Failed to refresh verification state', error);
    }
  }, [accessToken, applyCompanyAccessState, signIn, storedUser, token, user]);

  React.useEffect(() => {
    if (activeSection === 'revenue' && !hasFrontendPlanFeature(subscriptionState.planPermissions, 'revenueReports')) {
      setActiveSection('dashboard');
    }
  }, [activeSection, subscriptionState.planPermissions]);

  React.useEffect(() => {
    let mounted = true;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) headers['Authorization'] = `Bearer ${token}`;

    async function loadActiveBuses() {
      try {
        // Fetch active trips from the new endpoint
        const activeTripsRes = await fetch('/api/company/active-trips', { headers });

        if (!mounted) return;

        if (activeTripsRes.ok) {
          const activeTripsData = await activeTripsRes.json();
          const activeTrips = activeTripsData.activeTrips || [];
          
          const inProgressTrips = activeTrips.filter((trip: any) => trip.status === 'in_progress');
          setTotalActiveTrips(inProgressTrips.length);

          // Map active trips to the expected format for the dashboard
          const active = activeTrips.map((trip: any, index: number) => {
            // Calculate ETA (time since trip started)
            let eta = '—';
            if (trip.tripStartTime) {
              const startTime = new Date(trip.tripStartTime).getTime();
              const now = Date.now();
              const elapsedMinutes = Math.floor((now - startTime) / 60000);
              eta = `${elapsedMinutes} min ago`;
            }

            const route = `${trip.routeFrom} → ${trip.routeTo}`;

            return {
              id: trip.scheduleId || trip.id || `${trip.busPlate || 'unknown'}-${index}`,
              plate: trip.busPlate,
              driver: trip.driverName || '—',
              route,
              occupancy: '—', // We don't have this data yet
              eta,
              status: 'in_progress'
            };
          });

          setActiveBusesList(active);
        } else {
          console.warn('Failed to fetch active trips:', activeTripsRes.statusText);
          setActiveBusesList([]);
        }
      } catch (err) {
        console.warn('Failed to load active buses', err);
        setActiveBusesList([]);
      }
    }

    // Load active buses immediately
    loadActiveBuses();

    // Poll for updates every 5 seconds
    const pollInterval = setInterval(() => {
      loadActiveBuses();
    }, 5000);

    return () => { 
      mounted = false; 
      clearInterval(pollInterval);
    };
  }, []);

  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) headers['Authorization'] = `Bearer ${token}`;

    async function fetchKpis() {
      try {
        const [busesRes, driversRes, schedulesRes, ticketsRes, activeTripsRes] = await Promise.all([
          fetch('/api/company/buses', { headers }),
            fetch('/api/company/drivers', { headers }),
            fetch('/api/company/schedules', { headers }),
            fetch('/api/company/tickets', { headers }),
            fetch('/api/company/active-trips', { headers })
        ]);

        const busesJson = busesRes.ok ? await busesRes.json() : { buses: [] };
        const driversJson = driversRes.ok ? await driversRes.json() : { drivers: [] };
        const schedulesJson = schedulesRes.ok ? await schedulesRes.json() : { schedules: [] };
        const ticketsJson = ticketsRes.ok ? await ticketsRes.json() : { tickets: [] };
        const activeTripsJson = activeTripsRes.ok ? await activeTripsRes.json() : { activeTrips: [] };

        const buses = busesJson.buses || [];
        const drivers = driversJson.drivers || [];
        const schedules = schedulesJson.schedules || [];
        const tickets = ticketsJson.tickets || [];
        const activeTrips = activeTripsJson.activeTrips || [];

        const totalBuses = buses.length;
        const activeBuses = activeTrips.length; // Use active trips count instead of bus status

        // Count unique routes from schedules
        const routeSet = new Set();
        schedules.forEach((s: any) => routeSet.add(`${s.routeFrom || ''}::${s.routeTo || ''}`));
        const activeRoutes = routeSet.size;

        const activeDrivers = drivers.length;

        // Today's revenue and tickets from actual tickets (not schedule seat math)
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

        const normalizeTicketDate = (ticket: any): string | null => {
          const raw = ticket.scheduleDate
            || ticket.schedule_date
            || ticket.tripDate
            || ticket.trip_date
            || ticket.bookedAt
            || ticket.booked_at
            || ticket.createdAt
            || ticket.created_at;
          if (!raw) return null;
          const parsed = new Date(raw);
          if (Number.isNaN(parsed.getTime())) {
            const text = String(raw);
            return text.length >= 10 ? text.slice(0, 10) : null;
          }
          return parsed.toISOString().slice(0, 10);
        };

        const normalizeTicketStatus = (ticket: any) => String(ticket.status || '').toUpperCase();
        const ticketAmount = (ticket: any) => Number(ticket.price || ticket.totalPrice || ticket.total_price || 0);

        const isRevenueTicket = (ticket: any) => {
          const status = normalizeTicketStatus(ticket);
          return status !== 'CANCELLED' && status !== 'EXPIRED' && status !== 'PENDING_PAYMENT';
        };

        const revenueTickets = tickets.filter((ticket: any) => isRevenueTicket(ticket));
        const todaysTicketsRows = revenueTickets.filter((ticket: any) => normalizeTicketDate(ticket) === todayStr);
        const todaysRevenue = todaysTicketsRows.reduce((sum: number, ticket: any) => sum + ticketAmount(ticket), 0);
        const todaysTickets = todaysTicketsRows.length;

        setKpis({ totalBuses, activeBuses, activeRoutes, activeDrivers, todaysRevenue, todaysTickets });

        // Calculate bus status data
        const statusCounts = { active: 0, maintenance: 0, inactive: 0 };
        buses.forEach((b: any) => {
          const status = String(b.status || '').toLowerCase();
          if (status === 'active') statusCounts.active++;
          else if (status.includes('maintenance') || status === 'maintenance') statusCounts.maintenance++;
          else statusCounts.inactive++;
        });
        setBusStatusData([
          { name: 'Active', value: statusCounts.active, color: COLORS.success },
          { name: 'In Maintenance', value: statusCounts.maintenance, color: COLORS.secondary },
          { name: 'Inactive', value: statusCounts.inactive, color: COLORS.danger },
        ]);

        // Get recent tickets (last 5, sorted by date)
        const sortedTickets = [...tickets]
          .sort((a, b) => {
            const dateA = new Date(a.bookedAt || a.booked_at || a.created_at || 0);
            const dateB = new Date(b.bookedAt || b.booked_at || b.created_at || 0);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5)
          .map(t => ({
            id: t.bookingReference || t.booking_reference || t.id || '—',
            passenger: t.passengerName || t.passenger_name || (t.user && (t.user.full_name || t.user.name)) || '—',
            route: (t.routeFrom || t.route_from || '—') + ' → ' + (t.routeTo || t.route_to || '—'),
            date: t.bookedAt || t.booked_at || t.created_at ? new Date(t.bookedAt || t.booked_at || t.created_at).toISOString().split('T')[0] : '—',
            amount: parseFloat(t.price || t.totalPrice || t.total_price || 0),
            status: t.status || 'confirmed'
          }));
        setRecentTickets(sortedTickets);

        // Calculate monthly revenue data (last 6 months) from real tickets
        const monthlyRevenue = new Map<string, { revenue: number; tickets: number }>();
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const key = d.toISOString().slice(0, 7); // YYYY-MM
          const monthName = d.toLocaleString('default', { month: 'short' });
          last6Months.push({ key, monthName });
          monthlyRevenue.set(key, { revenue: 0, tickets: 0 });
        }

        revenueTickets.forEach((ticket: any) => {
          const ticketDate = normalizeTicketDate(ticket);
          if (!ticketDate) return;
          const monthKey = ticketDate.slice(0, 7); // YYYY-MM
          if (!monthlyRevenue.has(monthKey)) return;

          const current = monthlyRevenue.get(monthKey)!;
          current.revenue += ticketAmount(ticket);
          current.tickets += 1;
        });

        const chartData = last6Months.map(m => {
          const data = monthlyRevenue.get(m.key)!;
          return {
            month: m.monthName,
            revenue: data.revenue,
            tickets: data.tickets,
            occupancy: 0 // Not calculating occupancy for now
          };
        });
        setRevenueData(chartData);
      } catch (err) {
        console.warn('Failed to load KPI data', err);
      }
    }

    fetchKpis();
  }, []);

  return (
    <CompanyVerificationContext.Provider value={{ ...verificationState, ...subscriptionState, refreshVerification }}>
    <style>{`
      .dashboard-search-hit {
        background: rgba(255, 235, 59, 0.35);
        border-radius: 6px;
        transition: background-color 0.2s ease;
      }
      .dashboard-search-hit-active {
        background: rgba(255, 193, 7, 0.55);
        box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.45);
      }
    `}</style>
    <div className="flex h-screen w-full max-w-full m-0 overflow-hidden bg-[#F5F7FA] font-['Inter']">
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 h-screen shrink-0 flex flex-col
          bg-gradient-to-b from-[#2B2D42] to-[#1a1b2e]
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64' : 'w-20'}
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-center border-b border-white/10">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-xl flex items-center justify-center shadow-lg">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-['Montserrat'] font-bold bg-gradient-to-r from-[#0077B6] to-[#00A8E8] bg-clip-text text-transparent">
                SafariTix
              </span>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-xl flex items-center justify-center shadow-lg">
              <Bus className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 pb-3 space-y-2 flex-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if ((item as any).disabled) return;
                handleSectionChange(item.id);
              }}
              disabled={(item as any).disabled}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-300 font-medium text-sm
                ${activeSection === item.id
                  ? 'bg-gradient-to-r from-[#0077B6] to-[#005F8E] text-white shadow-lg shadow-[#0077B6]/30'
                  : (item as any).disabled ? 'text-gray-500 cursor-not-allowed opacity-60' : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && (item as any).disabled && <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">{(item as any).lockText}</span>}
              {sidebarOpen && activeSection === item.id && (
                <ChevronRight className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-3 border-t border-white/10">
          <button onClick={() => { signOut(); navigate('/app/login', { replace: true }); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-red-500/20 hover:text-red-400 transition-all duration-300 font-medium text-sm">
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            {/* Sidebar Toggle Desktop */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex w-10 h-10 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>

            {/* Search */}
            <div className="hidden md:flex flex-col">
              <div className="flex items-center gap-2 bg-[#F5F7FA] rounded-lg px-4 py-2 w-96">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => {
                  const next = e.target.value;
                  setHeaderSearch(next);
                  if (!next.trim()) {
                    clearSearchHighlights();
                    setSearchHint('');
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  runHeaderSearch(headerSearch, e.shiftKey ? 'prev' : 'next');
                }}
                placeholder="Search buses, drivers, routes..."
                className="bg-transparent border-none outline-none flex-1 text-sm"
              />
            </div>
              {searchHint && <span className="mt-1 text-xs text-gray-500 px-1">{searchHint}{searchHasResults ? ' (Enter for next)' : ''}</span>}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <NotificationBell />

            {/* Profile */}
            <button className="flex items-center gap-3 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-gray-900">{displayName}</div>
                <div className="text-xs text-gray-500">{displayRole}</div>
              </div>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-6 lg:py-5">
          <div ref={contentSearchRef} className="w-full max-w-[1400px] mx-auto">
          {/* Verification Banner — shown when company is not yet approved */}
          {user?.role === 'company_admin' && !verificationState.isVerified && activeSection !== 'settings' && (
            <div className="mb-6 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 font-medium">
                  Your company is not verified. Please complete verification in Settings to unlock platform features.
                </p>
              </div>
              <button
                onClick={() => setActiveSection('settings')}
                className="flex-shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Go to Settings
              </button>
            </div>
          )}

          {activeSection === 'dashboard' && <DashboardOverview kpis={kpis} activeBusesList={activeBusesList} revenueData={revenueData} busStatusData={busStatusData} recentTickets={recentTickets} planPermissions={subscriptionState.planPermissions} />}
          {activeSection === 'buses' && <BusesSection />}
          {activeSection === 'drivers' && <DriversSection />}
          {activeSection === 'shared' && (
            <CompanySharedRoutesSection
              planPermissions={subscriptionState.planPermissions}
              subscriptionPlan={subscriptionState.subscriptionPlan as 'Starter' | 'Growth' | 'Enterprise'}
            />
          )}
          {activeSection === 'tickets' && <TicketsManagement />}
          {activeSection === 'complaints' && <ComplaintManagementCompany />}
          {activeSection === 'revenue' && (hasFrontendPlanFeature(subscriptionState.planPermissions, 'revenueReports') ? <RevenueReports /> : <PlanLockedGate title="Revenue & Reports requires Enterprise" description="Upgrade to Enterprise to unlock revenue reports, full analytics, CSV exports, and premium reporting tools." />)}
          {activeSection === 'subscription' && <CompanySubscriptionManagement />}
          {activeSection === 'tracking' && <TrackingSection totalActiveTrips={totalActiveTrips} />}
          {activeSection === 'settings' && <SettingsSection />}
          </div>
        </main>
      </div>
    </div>
    </CompanyVerificationContext.Provider>
  );
}

// Dashboard Overview Component
function DashboardOverview({ kpis, activeBusesList, revenueData, busStatusData, recentTickets, planPermissions }: { kpis: any; activeBusesList?: any[]; revenueData?: any[]; busStatusData?: any[]; recentTickets?: any[]; planPermissions?: any }) {
  kpis = kpis || { totalBuses: 0, activeBuses: 0, activeRoutes: 0, activeDrivers: 0, todaysRevenue: 0, todaysTickets: 0 };
  activeBusesList = activeBusesList || [];
  revenueData = revenueData || [];
  busStatusData = busStatusData || [];
  recentTickets = recentTickets || [];
  const canSeeAnalytics = hasFrontendPlanFeature(planPermissions, 'basicAnalytics') || hasFrontendPlanFeature(planPermissions, 'fullAnalytics');
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-['Montserrat'] font-bold text-[#2B2D42] mb-2">
          Dashboard Overview
        </h1>
        <p className="text-gray-600">Welcome back! Here's what's happening with your business today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Buses"
          value={kpis.totalBuses}
          change="+2"
          trend="up"
          icon={Bus}
          color={COLORS.primary}
          subtitle={`${kpis.activeBuses} Active`}
        />
        <KPICard
          title="Active Routes"
          value={kpis.activeRoutes}
          change="+1"
          trend="up"
          icon={MapPin}
          color={COLORS.secondary}
          subtitle="High Traffic"
        />
        <KPICard
          title="Active Drivers"
          value={kpis.activeDrivers}
          change="-1"
          trend="down"
          icon={Users}
          color={COLORS.success}
          subtitle="On Duty"
        />
        <KPICard
          title="Today's Revenue"
          value={`RWF ${Math.round(kpis.todaysRevenue).toLocaleString()}`}
          change="+15%"
          trend="up"
          icon={DollarSign}
          color={COLORS.primary}
          subtitle={`${kpis.todaysTickets} Tickets`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42]">
                Revenue Overview
              </h3>
              <p className="text-sm text-gray-500 mt-1">Monthly revenue trends</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          {canSeeAnalytics ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={COLORS.primary}
                  strokeWidth={3}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <PlanLockedGate title="Analytics unlock on Growth" description="Upgrade to Growth or Enterprise to view analytics widgets and revenue trends on the dashboard." compact />
          )}
        </div>

        {/* Bus Status */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42] mb-6">
            Fleet Status
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={busStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {busStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {busStatusData.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Active Buses */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42]">
              Active Buses
            </h3>
            <button className="text-sm text-[#0077B6] font-semibold hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {activeBusesList.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bus className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No active buses at the moment</p>
              </div>
            ) : (
              activeBusesList.map((bus) => (
                <div key={bus.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-xl flex items-center justify-center">
                      <Bus className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">{bus.plate}</div>
                      <div className="text-sm text-gray-600">{bus.driver}</div>
                      <div className="text-xs text-gray-500 mt-1">{bus.route}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-[#27AE60]">{typeof bus.occupancy === 'number' ? `${bus.occupancy}%` : bus.occupancy}</div>
                    <div className="text-xs text-gray-500 mt-1">ETA: {bus.eta}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tickets */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42]">
              Recent Tickets
            </h3>
            <button className="text-sm text-[#0077B6] font-semibold hover:underline">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recentTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Ticket className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No recent tickets</p>
              </div>
            ) : (
              recentTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-[#0077B6] transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{ticket.id}</span>
                      <span className={`
                        text-xs px-2 py-0.5 rounded-full font-medium
                        ${ticket.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                      `}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">{ticket.passenger}</div>
                    <div className="text-xs text-gray-500 mt-1">{ticket.route}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">RWF {ticket.amount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500 mt-1">{ticket.date}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-['Montserrat'] font-bold text-[#2B2D42] mb-6">
          Alerts & Notifications
        </h3>
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div key={notif.id} className={`
              flex items-start gap-4 p-4 rounded-xl
              ${notif.type === 'alert' ? 'bg-red-50 border border-red-100' :
                notif.type === 'success' ? 'bg-green-50 border border-green-100' :
                'bg-blue-50 border border-blue-100'}
            `}>
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                ${notif.type === 'alert' ? 'bg-red-100' :
                  notif.type === 'success' ? 'bg-green-100' :
                  'bg-blue-100'}
              `}>
                {notif.type === 'alert' && <AlertCircle className="w-5 h-5 text-red-600" />}
                {notif.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {notif.type === 'info' && <Clock className="w-5 h-5 text-blue-600" />}
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-900">{notif.message}</p>
                <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, change, trend, icon: Icon, color, subtitle }: {
  title: string; value: string | number; change: string; trend: 'up' | 'down';
  icon: React.ElementType; color: string; subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
          trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {trend === 'up' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {change}
        </div>
      </div>
      <div className="text-3xl font-['Montserrat'] font-bold text-[#2B2D42] mb-1">{value}</div>
      <div className="text-sm text-gray-600">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-2">{subtitle}</div>}
    </div>
  );
}

// ── Verification gate — shown inside sections when company is not verified ─────
function NotVerifiedGate({ sectionName }: { sectionName: string }) {
  return (
    <div className="bg-white rounded-2xl p-10 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-amber-600" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">Company Verification Required</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Complete company verification in <strong>Settings → Company Verification</strong> to unlock {sectionName}.
        </p>
      </div>
    </div>
  );
}

function useIsCompanyVerified() {
  const { isVerified } = useContext(CompanyVerificationContext);
  return isVerified;
}

function PlanLockedGate({ title, description, compact = false }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={`rounded-2xl border border-[#0077B6]/20 bg-[#0077B6]/5 ${compact ? 'p-6' : 'p-10'} flex flex-col items-center justify-center text-center gap-4`}>
      <div className="w-16 h-16 rounded-full bg-[#0077B6]/10 flex items-center justify-center">
        <Crown className="w-8 h-8 text-[#0077B6]" />
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-500 max-w-lg">{description}</p>
      </div>
    </div>
  );
}

// Placeholder sections - to be implemented
function BusesSection() {
  const isVerified = useIsCompanyVerified();
  const { planPermissions, subscriptionPlan } = useContext(CompanyVerificationContext);
  if (!isVerified) return <NotVerifiedGate sectionName="Buses Management" />;

  const [buses, setBuses] = React.useState<any[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [drivers, setDrivers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showAddBus, setShowAddBus] = React.useState(false);
  const [showEditBus, setShowEditBus] = React.useState(false);
  const [editBus, setEditBus] = React.useState<any | null>(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  React.useEffect(() => {
    let mounted = true;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) headers['Authorization'] = `Bearer ${token}`;
    async function load() {
      try {
        const [busesRes, driversRes] = await Promise.all([
          fetch('/api/company/buses', { headers }),
          fetch('/api/company/drivers', { headers }),
        ]);
        if (!mounted) return;

        if (!busesRes.ok) {
          const txt = await busesRes.text().catch(() => null);
          setErrorMsg(txt || `Failed to load buses: ${busesRes.status}`);
          setBuses([]);
        } else {
          const busesJson = await busesRes.json();
          setBuses(busesJson.buses || []);
        }

        if (!driversRes.ok) {
          setDrivers([]);
        } else {
          const driversJson = await driversRes.json();
          setDrivers(driversJson.drivers || []);
        }
      } catch (err) {
        console.warn('Failed to load buses or drivers', err);
        if (mounted) {
          setBuses([]);
          setDrivers([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const busLimit = planPermissions?.limits?.maxBuses ?? null;
  const busLimitReached = busLimit !== null && buses.length >= busLimit;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-['Montserrat'] font-bold text-[#2B2D42]">Buses Management</h2>
        <button onClick={() => setShowAddBus(true)} disabled={busLimitReached} className="px-3 py-2 bg-[#0077B6] text-white rounded-md disabled:opacity-60 disabled:cursor-not-allowed">Add Bus</button>
      </div>

      {busLimitReached && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {subscriptionPlan} allows up to {busLimit} buses. Upgrade to add more buses.
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading buses...</div>
      ) : errorMsg ? (
        <div className="text-sm text-red-500">{errorMsg}</div>
      ) : buses.length === 0 ? (
        <div className="text-sm text-gray-500">No buses found for this company.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 border-b">Plate</th>
                <th className="px-3 py-2 border-b">Model</th>
                <th className="px-3 py-2 border-b">Capacity</th>
                <th className="px-3 py-2 border-b">Driver</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b">{b.plate_number || b.plateNumber || b.id}</td>
                  <td className="px-3 py-2 border-b">{b.model || b.make || '—'}</td>
                  <td className="px-3 py-2 border-b">{b.capacity || '—'}</td>
                  <td className="px-3 py-2 border-b">{b.driverName || (b.driver && (b.driver.full_name || b.driver.name)) || b.driver_id || '—'}</td>
                  <td className="px-3 py-2 border-b">{b.status ? String(b.status) : '—'}</td>
                  <td className="px-3 py-2 border-b">
                    <button onClick={() => { setShowEditBus(true); setEditBus(b); }} className="px-2 py-1 bg-gray-100 rounded">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddBus && <AddBusModal token={token} drivers={drivers} onClose={() => setShowAddBus(false)} onCreated={() => { setShowAddBus(false); window.location.reload(); }} />}
      {showEditBus && editBus && <EditBusModal token={token} drivers={drivers} bus={editBus} onClose={() => { setShowEditBus(false); setEditBus(null); }} onUpdated={() => { setShowEditBus(false); setEditBus(null); window.location.reload(); }} />}
    </div>
  );
}

function DriversSection() {
  const isVerified = useIsCompanyVerified();
  if (!isVerified) return <NotVerifiedGate sectionName="Drivers Management" />;

  const resolveDriverEmail = (driver: any) => {
    const candidates = [
      driver?.email,
      driver?.user_email,
      driver?.userEmail,
      driver?.driver_email,
      driver?.driverEmail,
      driver?.account_email,
      driver?.accountEmail,
      driver?.user?.email,
      driver?.account?.email,
      driver?.profile?.email,
    ];

    const valid = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
    return valid ? String(valid).trim() : '';
  };

  const [drivers, setDrivers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<any>(null);
  const [showAddDriver, setShowAddDriver] = React.useState(false);
  const [showEditDriver, setShowEditDriver] = React.useState(false);
  const [editDriver, setEditDriver] = React.useState<any | null>(null);
  const [successPopup, setSuccessPopup] = React.useState<{ open: boolean; tempPassword?: string | null; message?: string | null }>({ open: false, tempPassword: null, message: null });
  const [selectedIds, setSelectedIds] = React.useState<Record<string, boolean>>({});
  const [selectAll, setSelectAll] = React.useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  React.useEffect(() => {
    let mounted = true;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) headers['Authorization'] = `Bearer ${token}`;
    async function load() {
      try {
        const res = await fetch('/api/company/drivers', { headers });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          const normalizedDrivers = (json.drivers || []).map((driver: any) => ({
            ...driver,
            email: resolveDriverEmail(driver),
          }));
          setDrivers(normalizedDrivers);
        } else {
          setDrivers([]);
        }
      } catch (e) {
        setDrivers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-['Montserrat'] font-bold text-[#2B2D42]">Drivers Management</h2>
        <button onClick={() => setShowAddDriver(true)} className="px-3 py-2 bg-[#0077B6] text-white rounded-md">Add Driver</button>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading drivers...</div>
      ) : drivers.length === 0 ? (
        <div className="text-sm text-gray-500">No drivers found for this company.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 border-b"><input type="checkbox" checked={selectAll} onChange={(e) => {
                  const next = e.target.checked;
                  setSelectAll(next);
                  if (next) {
                    const map: Record<string, boolean> = {};
                    drivers.forEach(d => { map[String(d.id)] = true; });
                    setSelectedIds(map);
                  } else {
                    setSelectedIds({});
                  }
                }} /></th>
                <th className="px-3 py-2 border-b">Name</th>
                <th className="px-3 py-2 border-b">Email</th>
                <th className="px-3 py-2 border-b">Phone</th>
                <th className="px-3 py-2 border-b">License</th>
                <th className="px-3 py-2 border-b">Available</th>
                <th className="px-3 py-2 border-b">Assigned Buses</th>
                <th className="px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b">
                    <input type="checkbox" checked={!!selectedIds[String(d.id || '')]} onChange={(e) => {
                      const next = { ...selectedIds, [String(d.id || '')]: e.target.checked };
                      setSelectedIds(next);
                      if (!e.target.checked) setSelectAll(false);
                    }} />
                  </td>
                  <td className="px-3 py-2 border-b">{d.name}</td>
                  <td className="px-3 py-2 border-b">{resolveDriverEmail(d) || '—'}</td>
                  <td className="px-3 py-2 border-b">{d.phone || '—'}</td>
                  <td className="px-3 py-2 border-b">{d.license || '—'}</td>
                  <td className="px-3 py-2 border-b">{d.available ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 border-b">{(d.buses || []).length}</td>
                  <td className="px-3 py-2 border-b flex gap-2">
                    <button onClick={() => setSelected(d)} className="px-2 py-1 bg-gray-100 rounded">View</button>
                    <button onClick={() => { setEditDriver(d); setShowEditDriver(true); }} className="px-2 py-1 bg-blue-100 rounded">Edit</button>
                    <button onClick={async () => {
                      if (!confirm('Delete this driver? This cannot be undone.')) return;
                      try {
                        const headers: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) headers['Authorization'] = `Bearer ${token}`;
                        const res = await fetch(`/api/company/drivers/${d.id}`, { method: 'DELETE', headers });
                        if (!res.ok) {
                          const txt = await res.text().catch(() => null);
                          throw new Error(txt || `Failed to delete driver: ${res.status}`);
                        }
                        // refresh list
                        window.location.reload();
                      } catch (err: any) {
                        alert('Failed to delete driver: ' + (err?.message ?? String(err)));
                      }
                    }} className="px-2 py-1 bg-red-100 text-red-700 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <DriverModal driver={selected} onClose={() => setSelected(null)} />}
      {showAddDriver && <AddDriverModal onClose={() => setShowAddDriver(false)} token={token} onCreated={(driver: any, tempPassword: string) => {
        // Close create modal and show success popup with temporary password
        setShowAddDriver(false);
        setSuccessPopup({ open: true, tempPassword, message: 'Driver created successfully' });
      }} />}
      {showEditDriver && editDriver && <EditDriverModal token={token} driver={editDriver} onClose={() => { setShowEditDriver(false); setEditDriver(null); }} onUpdated={() => { setShowEditDriver(false); setEditDriver(null); window.location.reload(); }} />}

      {/* Success popup shown after creation */}
      <>{successPopup.open && <SuccessPopup isOpen={successPopup.open} title="Driver created" message={successPopup.message || ''} tempPassword={successPopup.tempPassword || ''} onClose={() => { setSuccessPopup({ open: false, tempPassword: null, message: null }); window.location.reload(); }} />}</>
    </div>
  );
}

function DriverModal({ driver, onClose }: { driver: any; onClose: () => void }) {
  const [details, setDetails] = React.useState<any>(driver);
  React.useEffect(() => { setDetails(driver); }, [driver]);
  const resolvedEmail = (
    details?.email ||
    details?.user_email ||
    details?.userEmail ||
    details?.driver_email ||
    details?.driverEmail ||
    details?.account_email ||
    details?.accountEmail ||
    details?.user?.email ||
    details?.account?.email ||
    details?.profile?.email ||
    ''
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl p-6 w-[520px] shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Driver Details</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        <div className="space-y-3">
          <div><span className="font-semibold">Name:</span> {details.name}</div>
          <div><span className="font-semibold">Email:</span> {resolvedEmail || 'N/A'}</div>
          <div><span className="font-semibold">License:</span> {details.license || 'N/A'}</div>
          <div><span className="font-semibold">Phone:</span> {details.phone || 'N/A'}</div>
          <div><span className="font-semibold">Status:</span> {details.available ? 'Available' : 'Unavailable'}</div>
          <div>
            <span className="font-semibold">Assigned buses:</span>
            <ul className="list-disc ml-6">
              {(details.buses || []).map((b: any) => (<li key={b.id}>{b.plate_number || b.plateNumber || b.id}</li>))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchedulesSection() {
  const isVerified = useIsCompanyVerified();
  const { planPermissions, subscriptionPlan } = useContext(CompanyVerificationContext);
  if (!isVerified) return <NotVerifiedGate sectionName="Schedules Management" />;

  const [schedules, setSchedules] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showAdd, setShowAdd] = React.useState(false);
  const [buses, setBuses] = React.useState<any[]>([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  React.useEffect(() => {
    let mounted = true;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }; if (token) headers['Authorization'] = `Bearer ${token}`;

    async function load() {
      try {
        const [sRes, busesRes] = await Promise.all([
          fetch('/api/company/schedules', { headers }),
          fetch('/api/company/buses', { headers }),
        ]);

        if (!mounted) return;

        if (!sRes.ok) {
          const txt = await sRes.text().catch(() => null);
          setError(txt || `Failed to load schedules: ${sRes.status}`);
          setSchedules([]);
        } else {
          const j = await sRes.json();
          setSchedules(j.schedules || []);
        }

        if (busesRes.ok) {
          const jb = await busesRes.json();
          setBuses(jb.buses || []);
        } else {
          setBuses([]);
        }
      } catch (err) {
        console.warn('Failed to load schedules', err);
        if (mounted) setError('Failed to load schedules');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const activeScheduleCount = schedules.filter((schedule) => ['scheduled', 'in_progress'].includes(String(schedule.status || '').toLowerCase())).length;
  const scheduleLimit = planPermissions?.limits?.maxActiveSchedules ?? null;
  const scheduleLimitReached = scheduleLimit !== null && activeScheduleCount >= scheduleLimit;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-['Montserrat'] font-bold text-[#2B2D42]">Schedules Management</h2>
        <button onClick={() => setShowAdd(true)} disabled={scheduleLimitReached} className="px-3 py-2 bg-[#0077B6] text-white rounded-md disabled:opacity-60 disabled:cursor-not-allowed">Create Schedule</button>
      </div>

      {scheduleLimitReached && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {subscriptionPlan} allows up to {scheduleLimit} active schedules. Upgrade to schedule more trips.
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading schedules...</div>
      ) : error ? (
        <div className="text-sm text-red-500">{error}</div>
      ) : schedules.length === 0 ? (
        <div className="text-sm text-gray-500">No schedules found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-2 border-b">Date</th>
                <th className="px-3 py-2 border-b">Route</th>
                <th className="px-3 py-2 border-b">Bus</th>
                <th className="px-3 py-2 border-b">Departure</th>
                <th className="px-3 py-2 border-b">Arrival</th>
                <th className="px-3 py-2 border-b">Seats</th>
                <th className="px-3 py-2 border-b">Price</th>
                <th className="px-3 py-2 border-b">Revenue</th>
                <th className="px-3 py-2 border-b">Driver</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => {
                const totalSeats = s.totalSeats || s.total_seats || 0;
                const availableSeats = (s.seatsAvailable != null ? s.seatsAvailable : s.seats_available) || 0;
                const soldSeats = totalSeats - availableSeats;
                const price = s.price || 0;
                const revenue = soldSeats * price;
                
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 border-b">{s.scheduleDate || s.date || s.schedule_date || '—'}</td>
                    <td className="px-3 py-2 border-b">{(s.routeFrom || '—') + ' → ' + (s.routeTo || '—')}</td>
                    <td className="px-3 py-2 border-b">{s.busPlateNumber || (s.Bus && (s.Bus.plate_number || s.Bus.plateNumber)) || '—'}</td>
                    <td className="px-3 py-2 border-b">{s.departureTime || '—'}</td>
                    <td className="px-3 py-2 border-b">{s.arrivalTime || '—'}</td>
                    <td className="px-3 py-2 border-b">{availableSeats + '/' + (totalSeats || '—')}</td>
                    <td className="px-3 py-2 border-b">{price ? `RWF ${price.toLocaleString()}` : '—'}</td>
                    <td className="px-3 py-2 border-b font-semibold text-[#27AE60]">{revenue > 0 ? `RWF ${revenue.toLocaleString()}` : 'RWF 0'}</td>
                    <td className="px-3 py-2 border-b">{s.driverName || (s.driver && (s.driver.full_name || s.driver.name)) || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddScheduleModal token={token} buses={buses} onClose={() => { setShowAdd(false); window.location.reload(); }} />}
    </div>
  );
}

function TrackingSection({totalActiveTrips}: { totalActiveTrips: number  }) {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('token') || localStorage.getItem('accessToken'))
    : null;
  return <CompanyFleetTracking token={token} activeBuses={totalActiveTrips} />;
}

function SettingsSection() {
  const { user, accessToken, signIn } = useAuth();
  const { refreshVerification } = useContext(CompanyVerificationContext);
  const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);

  // ── tabs ──────────────────────────────────────────────────────────────────
  const [tab, setTab] = React.useState<'company' | 'account' | 'password' | 'verification'>('company');

  // ── verification state ────────────────────────────────────────────────────
  const [verDocs, setVerDocs] = React.useState<any[]>([]);
  const [verLoadDone, setVerLoadDone] = React.useState(false);
  const [verForm, setVerForm] = React.useState({
    business_registration_number: '',
    tax_id: '',
    office_address: '',
  });
  const [verFiles, setVerFiles] = React.useState<Record<string, File | null>>({
    operating_license: null,
    company_logo: null,
  });
  const [verSubmitting, setVerSubmitting] = React.useState(false);
  const [verMsg, setVerMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // load existing documents when verification tab opens
  React.useEffect(() => {
    if (tab !== 'verification' || verLoadDone || !token) return;
    fetch('/api/company/documents', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => { setVerDocs(j.documents || []); setVerLoadDone(true); })
      .catch(() => setVerLoadDone(true));
  }, [tab, verLoadDone, token]);

  const handleVerFileChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setVerFiles(prev => ({ ...prev, [field]: file }));
  };

  const submitVerification = async () => {
    if (!verForm.business_registration_number.trim()) {
      return setVerMsg({ type: 'err', text: 'Business Registration Number is required' });
    }
    setVerSubmitting(true);
    setVerMsg(null);
    try {
      const body = new FormData();
      // Append text fields as files disguised via a hidden textarea trick isn't needed;
      // backend accepts multipart fields directly
      if (verForm.business_registration_number.trim()) {
        body.append('business_registration_number', verForm.business_registration_number.trim());
      }
      if (verForm.tax_id.trim()) body.append('tax_id', verForm.tax_id.trim());
      if (verForm.office_address.trim()) body.append('office_address', verForm.office_address.trim());
      if (verFiles.operating_license) body.append('operating_license', verFiles.operating_license);
      if (verFiles.company_logo) body.append('company_logo', verFiles.company_logo);

      const res = await fetch('/api/company/documents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setVerMsg({ type: 'ok', text: 'Documents submitted successfully. Your company verification is pending admin approval.' });
      setVerLoadDone(false); // force reload of doc list
      await refreshVerification();
    } catch (e: any) {
      setVerMsg({ type: 'err', text: e.message });
    } finally {
      setVerSubmitting(false);
    }
  };

  // ── company form ──────────────────────────────────────────────────────────
  const [company, setCompany] = React.useState<any>(null);
  const [compForm, setCompForm] = React.useState({ name: '', email: '', phone: '', address: '' });
  const [compSaving, setCompSaving] = React.useState(false);
  const [compMsg, setCompMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── account (admin profile) form ──────────────────────────────────────────
  const [accForm, setAccForm] = React.useState({ name: '', phone: '' });
  const [accSaving, setAccSaving] = React.useState(false);
  const [accMsg, setAccMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── password form ──────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = React.useState({ current: '', newPw: '', confirm: '' });
  const [pwSaving, setPwSaving] = React.useState(false);
  const [pwMsg, setPwMsg] = React.useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // ── load company on mount ─────────────────────────────────────────────────
  React.useEffect(() => {
    if (!token) return;
    fetch('/api/company', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => {
        const c = j.company || {};
        setCompany(c);
        setCompForm({ name: c.name || '', email: c.email || '', phone: c.phone || '', address: c.address || '' });
        refreshVerification();
      })
      .catch(() => {});
  }, [token]);

  React.useEffect(() => {
    setAccForm({ name: user?.name || '', phone: user?.phone || '' });
  }, [user]);

  // ── helpers ───────────────────────────────────────────────────────────────
  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0077B6] text-sm';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';

  const msgBanner = (msg: { type: 'ok' | 'err'; text: string } | null) =>
    msg ? (
      <div className={`text-sm px-4 py-2 rounded-lg ${msg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
        {msg.text}
      </div>
    ) : null;

  // ── save company ──────────────────────────────────────────────────────────
  const saveCompany = async () => {
    if (!compForm.name.trim()) return setCompMsg({ type: 'err', text: 'Company name is required' });
    setCompSaving(true); setCompMsg(null);
    try {
      const res = await fetch('/api/company/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: compForm.name, email: compForm.email, phone: compForm.phone, address: compForm.address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setCompany(json.company);
      setCompMsg({ type: 'ok', text: 'Company settings saved' });
      setTimeout(() => setCompMsg(null), 4000);
    } catch (e: any) {
      setCompMsg({ type: 'err', text: e.message });
    } finally { setCompSaving(false); }
  };

  // ── save account profile ──────────────────────────────────────────────────
  const saveAccount = async () => {
    if (!accForm.name.trim()) return setAccMsg({ type: 'err', text: 'Full name is required' });
    setAccSaving(true); setAccMsg(null);
    try {
      const body = new FormData();
      body.append('full_name', accForm.name);
      body.append('phone_number', accForm.phone);
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || json.message || 'Failed to save');
      if (signIn) await signIn(accessToken || '', { ...(user as any), name: json.user.name, phone: json.user.phone });
      setAccMsg({ type: 'ok', text: 'Profile updated' });
      setTimeout(() => setAccMsg(null), 4000);
    } catch (e: any) {
      setAccMsg({ type: 'err', text: e.message });
    } finally { setAccSaving(false); }
  };

  // ── change password ───────────────────────────────────────────────────────
  const changePassword = async () => {
    if (!pwForm.current || !pwForm.newPw) return setPwMsg({ type: 'err', text: 'Fill in all fields' });
    if (pwForm.newPw.length < 8) return setPwMsg({ type: 'err', text: 'New password must be at least 8 characters' });
    if (pwForm.newPw !== pwForm.confirm) return setPwMsg({ type: 'err', text: 'Passwords do not match' });
    setPwSaving(true); setPwMsg(null);
    try {
      const res = await fetch('/api/users/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || 'Failed');
      setPwForm({ current: '', newPw: '', confirm: '' });
      setPwMsg({ type: 'ok', text: 'Password updated successfully' });
      setTimeout(() => setPwMsg(null), 4000);
    } catch (e: any) {
      setPwMsg({ type: 'err', text: e.message });
    } finally { setPwSaving(false); }
  };

  const tabs = [
    { id: 'company',      label: 'Company Profile' },
    { id: 'account',      label: 'My Account' },
    { id: 'password',     label: 'Change Password' },
    { id: 'verification', label: 'Company Verification' },
  ] as const;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold text-[#2B2D42]">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">Manage your company profile and account preferences</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? 'bg-white text-[#0077B6] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Company Profile tab ─────────────────────────────────────────── */}
      {tab === 'company' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h3 className="text-base font-semibold text-slate-800">Company Information</h3>

          {company && (
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <div className="w-10 h-10 rounded-full bg-[#0077B6] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {(company.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">{company.name}</div>
                <div className="text-xs text-slate-500 capitalize">{company.status} · {company.subscriptionStatus || 'inactive'}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Company Name *</label>
              <input className={inputCls} value={compForm.name} onChange={e => setCompForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Contact Email</label>
              <input type="email" className={inputCls} value={compForm.email} onChange={e => setCompForm(f => ({ ...f, email: e.target.value }))} placeholder="company@example.com" />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input className={inputCls} value={compForm.phone} onChange={e => setCompForm(f => ({ ...f, phone: e.target.value }))} placeholder="+250 7XX XXX XXX" />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input className={inputCls} value={compForm.address} onChange={e => setCompForm(f => ({ ...f, address: e.target.value }))} placeholder="Kigali, Rwanda" />
            </div>
          </div>

          {msgBanner(compMsg)}

          <button
            disabled={compSaving}
            onClick={saveCompany}
            className="bg-[#0077B6] text-white px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 hover:bg-[#005f8e] transition-colors"
          >
            {compSaving ? 'Saving…' : 'Save Company Settings'}
          </button>
        </div>
      )}

      {/* ── My Account tab ──────────────────────────────────────────────── */}
      {tab === 'account' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h3 className="text-base font-semibold text-slate-800">Administrator Profile</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={accForm.name} onChange={e => setAccForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input className={inputCls} value={accForm.phone} onChange={e => setAccForm(f => ({ ...f, phone: e.target.value }))} placeholder="+250 7XX XXX XXX" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Email</label>
              <input className={`${inputCls} bg-gray-50 text-slate-400 cursor-not-allowed`} value={user?.email || ''} readOnly />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
          </div>

          {msgBanner(accMsg)}

          <button
            disabled={accSaving}
            onClick={saveAccount}
            className="bg-[#0077B6] text-white px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 hover:bg-[#005f8e] transition-colors"
          >
            {accSaving ? 'Saving…' : 'Save Profile'}
          </button>
        </div>
      )}

      {/* ── Change Password tab ─────────────────────────────────────────── */}
      {tab === 'password' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-slate-800">Change Password</h3>

          <div>
            <label className={labelCls}>Current Password</label>
            <input type="password" className={inputCls} value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>New Password</label>
              <input type="password" className={inputCls} value={pwForm.newPw} onChange={e => setPwForm(f => ({ ...f, newPw: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input type="password" className={inputCls} value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
          </div>
          <p className="text-xs text-slate-400">Minimum 8 characters with letters and numbers</p>

          {msgBanner(pwMsg)}

          <button
            disabled={pwSaving}
            onClick={changePassword}
            className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 hover:bg-slate-700 transition-colors"
          >
            {pwSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      )}

      {/* ── Company Verification tab ─────────────────────────────────────── */}
      {tab === 'verification' && (
        <div className="space-y-5">
          {/* Status banner */}
          <VerificationStatusBanner docs={verDocs} company={company} />

          {/* Submission form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-800">Submit Verification Documents</h3>
              <p className="text-xs text-slate-400 mt-1">Upload your company documents for SafariTix admin review. Accepted formats: PDF, JPG, PNG (max 5 MB each).</p>
            </div>

            {/* Text fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Business Registration Number *</label>
                <input
                  className={inputCls}
                  placeholder="e.g. 100123456"
                  value={verForm.business_registration_number}
                  onChange={e => setVerForm(f => ({ ...f, business_registration_number: e.target.value }))}
                />
              </div>
              <div>
                <label className={labelCls}>Tax ID <span className="text-gray-400 font-normal">(optional)</span></label>
                <input
                  className={inputCls}
                  placeholder="e.g. 100456789"
                  value={verForm.tax_id}
                  onChange={e => setVerForm(f => ({ ...f, tax_id: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Office Address</label>
                <input
                  className={inputCls}
                  placeholder="e.g. KG 120 St, Gasabo, Kigali"
                  value={verForm.office_address}
                  onChange={e => setVerForm(f => ({ ...f, office_address: e.target.value }))}
                />
              </div>
            </div>

            {/* File uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Operating License</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleVerFileChange('operating_license')}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0077B6]/10 file:text-[#0077B6] hover:file:bg-[#0077B6]/20 cursor-pointer border border-gray-200 rounded-lg px-2 py-1.5"
                />
                {verFiles.operating_license && (
                  <p className="text-xs text-green-600 mt-1">✓ {verFiles.operating_license.name}</p>
                )}
              </div>
              <div>
                <label className={labelCls}>Company Logo</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  onChange={handleVerFileChange('company_logo')}
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#0077B6]/10 file:text-[#0077B6] hover:file:bg-[#0077B6]/20 cursor-pointer border border-gray-200 rounded-lg px-2 py-1.5"
                />
                {verFiles.company_logo && (
                  <p className="text-xs text-green-600 mt-1">✓ {verFiles.company_logo.name}</p>
                )}
              </div>
            </div>

            {verMsg && (
              <div className={`text-sm px-4 py-3 rounded-lg ${verMsg.type === 'ok' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {verMsg.text}
              </div>
            )}

            <button
              disabled={verSubmitting}
              onClick={submitVerification}
              className="bg-[#0077B6] text-white px-6 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-60 hover:bg-[#005f8e] transition-colors"
            >
              {verSubmitting ? 'Submitting…' : 'Submit Verification'}
            </button>
          </div>

          {/* Previously submitted documents list */}
          {verDocs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Submitted Documents</h3>
              <div className="space-y-2">
                {verDocs.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg text-sm">
                    <span className="text-slate-700 font-medium capitalize">{String(d.document_type).replace(/_/g, ' ')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      d.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                      d.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {d.verification_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Verification status banner ─────────────────────────────────────────────────
function VerificationStatusBanner({ docs, company }: { docs: any[]; company: any }) {
  const accountStatus = company?.accountStatus || company?.account_status || company?.status || '';
  const hasDocs = docs.length > 0;

  if (accountStatus === 'approved' || company?.is_approved) {
    return (
      <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
        <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">Your company has been verified successfully.</p>
          <p className="text-xs text-green-600 mt-0.5">You have full access to all platform features.</p>
        </div>
      </div>
    );
  }

  if (accountStatus === 'rejected') {
    return (
      <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Verification rejected. Please upload correct documents.</p>
          {company?.rejection_reason && (
            <p className="text-xs text-red-600 mt-0.5">Reason: {company.rejection_reason}</p>
          )}
        </div>
      </div>
    );
  }

  if (hasDocs) {
    return (
      <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
        <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-yellow-800">Your documents are under review by the admin.</p>
          <p className="text-xs text-yellow-600 mt-0.5">This usually takes 1-2 business days. You will be notified when your account is approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4">
      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-blue-800">Your company is not verified. Please submit verification documents.</p>
        <p className="text-xs text-blue-600 mt-0.5">Fill in the form below and upload your documents to complete verification.</p>
      </div>
    </div>
  );
}

function AddDriverModal({ onClose, token, onCreated }: { onClose: () => void; token: string | null; onCreated?: (driver: any, tempPassword: string) => void }) {
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [license, setLicense] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!fullName || !license) { setError('Name and license number are required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/company/drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: fullName, email, phone, license })
      });
      const contentType = (res.headers && res.headers.get ? res.headers.get('content-type') || '' : '');
      if (!res.ok) {
        // Try to read text for better error message (handles HTML error pages)
        const text = await res.text().catch(() => null);
        throw new Error((text && text.slice ? text.slice(0, 1000) : `Request failed with status ${res.status}`) || 'Failed to create driver');
      }

      if (!contentType.includes('application/json')) {
        const text = await res.text().catch(() => null);
        throw new Error((text && text.slice ? `Unexpected non-JSON response: ${text.slice(0,200)}` : 'Unexpected non-JSON response from server'));
      }

      const j = await res.json();
      if (!j || j.error) throw new Error(j?.error || 'Failed to create driver');
      // Trigger parent callback with temporary password so frontend can show it
      if (onCreated) onCreated(j.driver, j.temporaryPassword);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl p-6 w-[520px] shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Driver</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">License number</label>
            <input value={license} onChange={e => setLicense(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0077B6] text-white rounded">{saving ? 'Saving...' : 'Create Driver'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddBusModal({ onClose, token, drivers, onCreated }: { onClose: () => void; token: string | null; drivers: any[]; onCreated?: () => void }) {
  const [plate, setPlate] = React.useState('');
  const [model, setModel] = React.useState('');
  const [capacity, setCapacity] = React.useState('30');
  const [driverId, setDriverId] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const selectableDrivers = React.useMemo(() => drivers.filter(d => !(String(d.id || '').startsWith('legacy-'))), [drivers]);

  const submit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!plate || !driverId) { setError('Plate number and driver selection are required'); return; }
    // Validate driverId looks like a UUID (prevent sending numeric indices)
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (driverId && !uuidRegex.test(driverId)) { setError('Invalid driver selected'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/company/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ plate_number: plate, model, capacity: parseInt(capacity, 10) || 30, driver_id: driverId })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error((text && text.slice ? text.slice(0, 1000) : `Request failed with status ${res.status}`) || 'Failed to create bus');
      }
      if (onCreated) onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl p-6 w-[520px] shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Bus</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Plate number</label>
            <input value={plate} onChange={e => setPlate(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Capacity</label>
            <input value={capacity} onChange={e => setCapacity(e.target.value)} type="number" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Assign Driver</label>
            {selectableDrivers.length === 0 ? (
              <div className="text-sm text-gray-500">No assignable drivers available. Create a driver first.</div>
            ) : (
              <select value={driverId || ''} onChange={e => setDriverId(e.target.value || null)} className="w-full border rounded px-3 py-2">
                <option value="">-- Select driver --</option>
                {selectableDrivers.map(d => (<option key={d.id} value={d.id}>{d.name || d.full_name || d.email || d.id}</option>))}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0077B6] text-white rounded">{saving ? 'Saving...' : 'Create Bus'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddScheduleModal({ onClose, token, buses }: { onClose: () => void; token: string | null; buses: any[] }) {
  const [routeFrom, setRouteFrom] = React.useState('');
  const [routeTo, setRouteTo] = React.useState('');
  const [date, setDate] = React.useState('');
  const [departureTime, setDepartureTime] = React.useState('');
  const [arrivalTime, setArrivalTime] = React.useState('');
  const [busId, setBusId] = React.useState<string | null>(null);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    setError('');

    const normalizedRouteFrom = routeFrom.trim();
    const normalizedRouteTo = routeTo.trim();

    if (!busId || !normalizedRouteFrom || !normalizedRouteTo || !date || !departureTime || !arrivalTime) {
      setError('Bus, route, date, departure time, and arrival time are required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/company/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          busId,
          routeFrom: normalizedRouteFrom,
          routeTo: normalizedRouteTo,
          departureTime,
          arrivalTime,
          date,
        })
      });

      if (!res.ok) {
        const contentType = res.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || json?.message || `Request failed with status ${res.status}`);
        }

        const text = await res.text().catch(() => null);
        throw new Error((text && text.slice ? text.slice(0, 1000) : `Request failed with status ${res.status}`) || 'Failed to create schedule');
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl p-6 w-[640px] shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Create Schedule</h3>
            <p className="text-xs text-gray-500 mt-0.5">Price is automatically set from RURA regulated tariffs</p>
          </div>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">From</label>
              <input value={routeFrom} onChange={e => setRouteFrom(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">To</label>
              <input value={routeTo} onChange={e => setRouteTo(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Date</label>
              <input value={date} onChange={e => setDate(e.target.value)} type="date" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Departure Time</label>
              <input value={departureTime} onChange={e => setDepartureTime(e.target.value)} type="time" className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm mb-1">Arrival Time</label>
              <input value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} type="time" className="w-full border rounded px-3 py-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm mb-1">Bus</label>
              <select value={busId || ''} onChange={e => setBusId(e.target.value || null)} className="w-full border rounded px-3 py-2">
                <option value="">-- Select Bus --</option>
                {buses.map(b => (<option key={b.id} value={b.id}>{b.plate_number || b.plateNumber || b.id}</option>))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0077B6] text-white rounded">{saving ? 'Saving...' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditBusModal({ onClose, token, drivers, bus, onUpdated }: { onClose: () => void; token: string | null; drivers: any[]; bus: any; onUpdated?: () => void }) {
  const [plate, setPlate] = React.useState(bus.plate_number || bus.plate || bus.plateNumber || '');
  const [model, setModel] = React.useState(bus.model || '');
  const [capacity, setCapacity] = React.useState(String(bus.capacity || '30'));
  const [driverId, setDriverId] = React.useState<string | null>(bus.driverId || bus.driver_id || (bus.driver && bus.driver.id) || null);
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const selectableDrivers = React.useMemo(() => drivers.filter(d => !(String(d.id || '').startsWith('legacy-'))), [drivers]);

  const submit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!plate) { setError('Plate number is required'); return; }
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (driverId && !uuidRegex.test(driverId)) { setError('Invalid driver selected'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/company/buses/${bus.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ plate_number: plate, model, capacity: parseInt(capacity, 10) || 30, driver_id: driverId })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error((text && text.slice ? text.slice(0, 1000) : `Request failed with status ${res.status}`) || 'Failed to update bus');
      }
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl p-6 w-[520px] shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Bus</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Plate number</label>
            <input value={plate} onChange={e => setPlate(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Model</label>
            <input value={model} onChange={e => setModel(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Capacity</label>
            <input value={capacity} onChange={e => setCapacity(e.target.value)} type="number" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Assign Driver</label>
            {selectableDrivers.length === 0 ? (
              <div className="text-sm text-gray-500">No assignable drivers available. Create a driver first.</div>
            ) : (
              <select value={driverId || ''} onChange={e => setDriverId(e.target.value || null)} className="w-full border rounded px-3 py-2">
                <option value="">-- Select driver --</option>
                {selectableDrivers.map(d => (<option key={d.id} value={d.id}>{d.name || d.full_name || d.email || d.id}</option>))}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0077B6] text-white rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditDriverModal({ onClose, token, driver, onUpdated }: { onClose: () => void; token: string | null; driver: any; onUpdated?: () => void }) {
  const [fullName, setFullName] = React.useState(driver.name || driver.full_name || '');
  const [email, setEmail] = React.useState(
    driver.email ||
    driver.user_email ||
    driver.userEmail ||
    driver.driver_email ||
    driver.driverEmail ||
    driver.account_email ||
    driver.accountEmail ||
    driver.user?.email ||
    driver.account?.email ||
    driver.profile?.email ||
    ''
  );
  const [phone, setPhone] = React.useState(driver.phone || driver.phone_number || '');
  const [license, setLicense] = React.useState(driver.license || '');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const submit = async (e: any) => {
    e.preventDefault();
    setError('');
    if (!fullName || !license) { setError('Name and license number are required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/company/drivers/${driver.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name: fullName, email, phone, license })
      });
      if (!res.ok) {
        const text = await res.text().catch(() => null);
        throw new Error((text && text.slice ? text.slice(0, 1000) : `Request failed with status ${res.status}`) || 'Failed to update driver');
      }
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl p-6 w-[520px] shadow-lg">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Edit Driver</h3>
          <button onClick={onClose} className="text-gray-500">Close</button>
        </div>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Phone number</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">License number</label>
            <input value={license} onChange={e => setLicense(e.target.value)} type="text" className="w-full border rounded px-3 py-2" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0077B6] text-white rounded">{saving ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
