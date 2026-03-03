import React, { useState, useEffect, useRef } from 'react';
import {
  Home,
  Ticket,
  MapPin,
  User,
  Bell,
  Search,
  Calendar,
  Clock,
  Bus,
  ArrowRight,
  QrCode,
  CreditCard,
  History,
  Star,
  Settings,
  LogOut,
  X,
  Check,
  AlertCircle,
  ChevronRight,
  Navigation,
  Download,
  Share2,
  Menu,
  Plus,
  Ban,
  Loader2,
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../../components/AuthContext';
import SeatMap from '../../components/SeatMap';
import SearchResults from '../../components/SearchResults';
import PopularRoutes, { PopularRoute } from '../../components/PopularRoutes';
import PersonalInformation from '../../components/account/PersonalInformation';
import PaymentMethods from '../../components/account/PaymentMethods';
import NotificationsSettings from '../../components/account/NotificationsSettings';
import PrivacySecurity from '../../components/account/PrivacySecurity';
import PassengerTracking from '../../components/PassengerTracking';

export default function CommuterDashboard() {
  const { user, signOut, accessToken, signIn } = useAuth();
  const [expandedSetting, setExpandedSetting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [seats, setSeats] = useState<any[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [selectedSeatsMap, setSelectedSeatsMap] = useState<Record<string, boolean>>({});
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [trackedTicket, setTrackedTicket] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadSeats = async () => {
      if (!showTicketModal || !selectedTicket) return;
      // don't try to load if this is an existing confirmed ticket
      if (selectedTicket.seat || selectedTicket.qrCode) return;
      setSeatsLoading(true);
      setSeats([]);
      setSelectedSeatsMap({});
      try {
        const hdrs: Record<string,string> = { 'Content-Type': 'application/json' };
        if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
        const res = await fetch(`/api/seats/schedules/${selectedTicket.id}`, { headers: hdrs });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setSeats(Array.isArray(json.seats) ? json.seats : []);
        } else {
          setSeats([]);
        }
      } catch (err) {
        console.error('Failed to load seats', err);
        setSeats([]);
      } finally {
        if (mounted) setSeatsLoading(false);
      }
    };

    loadSeats();
    return () => { mounted = false; };
  }, [showTicketModal, selectedTicket, accessToken]);
  // Data from backend (replaces previous mock data)
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [popularRoutes, setPopularRoutes] = useState<any[]>([]);

  const [stats, setStats] = useState({ totalTrips: 0, activeTickets: 0, favoriteRoutes: 0, rewardsPoints: 0 });
  const [loading, setLoading] = useState({ upcoming: true, popular: true, stats: true, recent: true, notifs: true });

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Live Map state
  const [driverLocations, setDriverLocations] = useState<any[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const hasMapboxToken = typeof MAPBOX_TOKEN === 'string' && MAPBOX_TOKEN.trim().length > 0;
  useEffect(() => {
    setProfileForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' });
  }, [user]);

  // Search state
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Fetch user tickets - extracted to be reusable
  const fetchTickets = async () => {
    const hdrs: Record<string,string> = { 'Content-Type': 'application/json' };
    if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
    
    try {
      const res = await fetch('/api/tickets', { headers: hdrs });
      if (res.ok) {
        const json = await res.json();
        const tickets = Array.isArray(json.tickets) ? json.tickets : (json.tickets || []);
        // upcoming: only CONFIRMED
        const confirmed = tickets.filter((t:any) => t.status === 'CONFIRMED');
        setUpcomingTrips(confirmed);
        // recent bookings: latest tickets (all statuses) sorted by createdAt
        const recent = tickets.slice().sort((a:any,b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setRecentBookings(recent);
      } else {
        setUpcomingTrips([]);
        setRecentBookings([]);
      }
    } catch (e) {
      setUpcomingTrips([]);
      setRecentBookings([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    const hdrs: Record<string,string> = { 'Content-Type': 'application/json' };
    if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;

    // Fetch user tickets directly from /api/tickets
    const fetchTicketsInEffect = async () => {
      try {
        const res = await fetch('/api/tickets', { headers: hdrs });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          const tickets = Array.isArray(json.tickets) ? json.tickets : (json.tickets || []);
          // upcoming: only CONFIRMED
          const confirmed = tickets.filter((t:any) => t.status === 'CONFIRMED');
          setUpcomingTrips(confirmed);
          // recent bookings: latest tickets (all statuses) sorted by createdAt
          const recent = tickets.slice().sort((a:any,b:any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setRecentBookings(recent);
        } else {
          setUpcomingTrips([]);
          setRecentBookings([]);
        }
      } catch (e) {
        setUpcomingTrips([]);
        setRecentBookings([]);
      } finally {
        if (mounted) setLoading((s) => ({ ...s, upcoming: false, recent: false }));
      }
    };

    // Fetch available schedules (used for Book New Ticket / popular routes)
    const fetchSchedules = async () => {
      try {
        const res = await fetch('/api/schedules', { headers: hdrs });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          const schedules = Array.isArray(json.schedules) ? json.schedules : (json.schedules || []);
          setPopularRoutes(schedules);
        } else {
          setPopularRoutes([]);
        }
      } catch (e) {
        setPopularRoutes([]);
      } finally {
        if (mounted) setLoading((s) => ({ ...s, popular: false }));
      }
    };

    // lightweight stats derived from tickets/schedules
    const fetchStats = async () => {
      try {
        // use /api/tickets for counts
        const res = await fetch('/api/tickets', { headers: hdrs });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          const tickets = Array.isArray(json.tickets) ? json.tickets : (json.tickets || []);
          const confirmed = tickets.filter((t:any) => t.status === 'CONFIRMED');
          setStats((s) => ({ ...s, totalTrips: tickets.length, activeTickets: confirmed.length }));
        }
      } catch (e) {
        // keep defaults
      } finally {
        if (mounted) setLoading((s) => ({ ...s, stats: false }));
      }
    };

    const fetchNotifs = async () => {
      try {
        const res = await fetch('/api/notifications', { headers: hdrs });
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setNotifications(Array.isArray(json) ? json : json.notifications || []);
        } else {
          setNotifications([]);
        }
      } catch (e) {
        setNotifications([]);
      } finally {
        if (mounted) setLoading((s) => ({ ...s, notifs: false }));
      }
    };

    fetchTicketsInEffect();
    fetchSchedules();
    fetchStats();
    fetchNotifs();

    return () => { mounted = false; };
  }, [accessToken]);

  // Initialize map for live tracking
  useEffect(() => {
    if (activeTab !== 'map' || !hasMapboxToken || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [30.0619, -1.9403], // Rwanda center coordinates
      zoom: 10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [activeTab]);

  // Fetch driver locations when map tab is active
  useEffect(() => {
    if (activeTab !== 'map' || !hasMapboxToken) return;

    const fetchDriverLocations = async () => {
      setMapLoading(true);
      try {
        const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
        if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_URL}/tracking/company/live-locations`, {
          headers: hdrs,
        });

        if (!response.ok) {
          if (response.status === 404 || response.status === 403) {
            setDriverLocations([]);
            setMapLoading(false);
            return;
          }
          throw new Error('Failed to fetch driver locations');
        }

        const data = await response.json();
        
        if (data.success && data.locations && data.locations.length > 0) {
          const locations = data.locations.map((loc: any) => ({
            id: loc.bus.id,
            plateNumber: loc.bus.plateNumber,
            model: loc.bus.model,
            driverName: loc.driver.name,
            status: loc.trip_status === 'in_progress' ? 'active' : 'idle',
            latitude: loc.location.latitude,
            longitude: loc.location.longitude,
            speed: loc.location.speed,
            lastUpdate: loc.updated_at,
            capacity: loc.bus.capacity,
          }));

          setDriverLocations(locations);
          updateMapMarkers(locations);
        } else {
          setDriverLocations([]);
        }
      } catch (error) {
        console.error('Error fetching driver locations:', error);
        setDriverLocations([]);
      } finally {
        setMapLoading(false);
      }
    };

    fetchDriverLocations();
    const interval = setInterval(fetchDriverLocations, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [activeTab, accessToken]);

  // Update map markers
  const updateMapMarkers = (locations: any[]) => {
    if (!map.current) return;

    // Remove old markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Add new markers
    locations.forEach(loc => {
      if (loc.latitude !== 0 && loc.longitude !== 0) {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.background = loc.status === 'active' ? '#0077B6' : '#94A3B8';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:14px;font-weight:bold;">🚌</div>`;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; min-width: 200px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">${loc.plateNumber}</div>
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
              <strong>Driver:</strong> ${loc.driverName}
            </div>
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
              <strong>Model:</strong> ${loc.model}
            </div>
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
              <strong>Speed:</strong> ${loc.speed.toFixed(1)} km/h
            </div>
            <div style="font-size: 12px; color: #6B7280;">
              <strong>Status:</strong> <span style="color: ${loc.status === 'active' ? '#27AE60' : '#94A3B8'};">${loc.status}</span>
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([loc.longitude, loc.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current[loc.id] = marker;
      }
    });

    // Fit map to show all markers
    if (locations.length > 0) {
      const validLocations = locations.filter(l => l.latitude !== 0 && l.longitude !== 0);
      if (validLocations.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validLocations.forEach(loc => {
          bounds.extend([loc.longitude, loc.latitude]);
        });
        map.current?.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSearchError(null);
    const from = fromInput.trim();
    const to = toInput.trim();
    const date = dateInput.trim();
    if (!from || !to) return setSearchError('Enter both departure and arrival cities');

    setSearchPerformed(true);

    setSearchLoading(true);
    try {
      const hdrs: Record<string,string> = { 'Content-Type': 'application/json' };
      if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
      
      // Build query string with optional date
      let qs = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      if (date) {
        qs += `&date=${encodeURIComponent(date)}`;
      }
      
      const res = await fetch(`/api/schedules/search${qs}`, { headers: hdrs });
      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      if (!res.ok) {
        // Try fallback PG endpoint
        console.warn('Primary schedules search failed, trying fallback /api/schedules/search-pg', res.status);
        const alt = await fetch(`/api/schedules/search-pg${qs}`, { headers: hdrs });
        const altCt = (alt.headers.get('content-type') || '').toLowerCase();
        if (alt.ok && altCt.includes('application/json')) {
          const jsonAlt = await alt.json();
          const list = Array.isArray(jsonAlt) ? jsonAlt : (jsonAlt.schedules || jsonAlt.schedules || jsonAlt);
          setSearchResults(list || []);
          console.log('🔍 Search results:', list);
        } else if (alt.ok) {
          const text = await alt.text();
          console.error('Fallback /search-pg returned non-JSON:', text);
          setSearchResults([]);
          setSearchError('Failed to search schedules');
        } else {
          setSearchResults([]);
          setSearchError('Failed to search schedules');
        }
      } else if (!contentType.includes('application/json')) {
        const txt = await res.text();
        console.error('Primary /search returned non-JSON response:', txt);
        // Try fallback
        const alt = await fetch(`/api/schedules/search-pg${qs}`, { headers: hdrs });
        const altCt = (alt.headers.get('content-type') || '').toLowerCase();
        if (alt.ok && altCt.includes('application/json')) {
          const jsonAlt = await alt.json();
          const results = Array.isArray(jsonAlt) ? jsonAlt : jsonAlt.schedules || [];
          setSearchResults(results);
          console.log('🔍 Search results:', results);
        } else {
          setSearchResults([]);
          setSearchError('Failed to search schedules');
        }
      } else {
        const json = await res.json();
        const results = Array.isArray(json) ? json : json.schedules || [];
        setSearchResults(results);
        console.log('🔍 Search results:', results);
      }
    } catch (err) {
      console.error('Search schedules error:', err);
      setSearchResults([]);
      setSearchError('Failed to search schedules');
    } finally {
      setSearchLoading(false);
    }
  };

  const formatCurrency = (n?: number) => `RWF ${Number(n || 0).toLocaleString()}`;

  const calcDuration = (dep?: string | Date, arr?: string | Date) => {
    if (!dep || !arr) return null;
    const d = new Date(dep);
    const a = new Date(arr);
    if (isNaN(d.getTime()) || isNaN(a.getTime())) return null;
    const diff = Math.max(0, a.getTime() - d.getTime());
    const mins = Math.round(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
  };

  const resolveScheduleId = (ticket: any): string | null => {
    if (!ticket) return null;
    return (
      ticket.scheduleId ||
      ticket.schedule_id ||
      ticket.schedule?.id ||
      ticket.trip?.scheduleId ||
      null
    );
  };

  const resolveTicketId = (ticket: any): string | null => {
    if (!ticket) return null;
    return ticket.id || ticket.ticketId || ticket.ticket_id || null;
  };

  const handleTrackBus = (ticket: any) => {
    if (!ticket) return;
    setTrackedTicket(ticket);
    setActiveTab('map');
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!upcomingTrips.length) return;
    const trackable = upcomingTrips.find((t: any) => resolveScheduleId(t));
    if (!trackedTicket && trackable) {
      setTrackedTicket(trackable);
      return;
    }
    if (trackedTicket) {
      const stillExists = upcomingTrips.some((t: any) => resolveTicketId(t) === resolveTicketId(trackedTicket));
      if (!stillExists && trackable) {
        setTrackedTicket(trackable);
      }
    }
  }, [upcomingTrips]);

  const downloadTicket = (ticket: any) => {
    try {
      const el = document.getElementById('ticket-qr-canvas');
      let qrDataUrl: string | null = null;
      if (el) {
        if ((el as HTMLCanvasElement).toDataURL) {
          try { qrDataUrl = (el as HTMLCanvasElement).toDataURL('image/png'); } catch (_) { qrDataUrl = null; }
        } else if (el instanceof SVGElement) {
          const svg = el as SVGElement;
          const svgStr = new XMLSerializer().serializeToString(svg);
          qrDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
        }
      }

      // Fallback: if no canvas/svg but ticket has qrData, embed it as text below
      const passenger = ticket.passengerName || ticket.name || (user && user.name) || '';
      const passengerEmail = ticket.passengerEmail || ticket.email || (user && (user as any).email) || '';
      const passengerPhone = ticket.passengerPhone || ticket.phone || (user && ((user as any).phone || (user as any).phoneNumber)) || '';
      const ref = ticket.reference || ticket.id || '';

      const html = `
        <html>
          <head>
            <title>SafariTix Ticket</title>
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <style>
              body{font-family:Inter, Arial, Helvetica, sans-serif;margin:0;background:#f6f7fb;color:#0f172a}
              .wrap{padding:28px}
              .card{max-width:780px;margin:0 auto;background:white;border-radius:14px;box-shadow:0 8px 30px rgba(15,23,42,0.08);overflow:hidden;border:1px solid #e6eef8}
              .header{display:flex;align-items:center;justify-content:space-between;padding:20px 28px;background:linear-gradient(90deg,#0077B6 0%,#005F8E 100%);color:white}
              .brand{display:flex;align-items:center;gap:12px;font-weight:700}
              .brand .logo{width:44px;height:44px;border-radius:10px;background:white;display:flex;align-items:center;justify-content:center;color:#0077B6;font-weight:800}
              .content{display:flex;gap:24px;padding:28px}
              .left{flex:1}
              .route{font-size:20px;font-weight:800;margin-bottom:8px}
              .meta{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:10px}
              .meta .item{background:#f8fafc;padding:12px;border-radius:10px;font-size:14px}
              .qrBox{width:260px;flex-shrink:0;display:flex;align-items:center;justify-content:center}
              .qrBox img{width:220px;height:220px;object-fit:contain;border-radius:8px}
              .code{margin-top:12px;font-family:monospace;background:#0f172a;color:white;padding:8px;border-radius:6px;text-align:center}
              .footer{padding:18px 28px;background:#fbfdff;border-top:1px solid #eef6ff;font-size:13px;color:#334155}
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="card">
                <div class="header">
                  <div class="brand"><div class="logo">ST</div><div>SafariTix</div></div>
                  <div style="text-align:right">
                    <div style="font-size:12px;opacity:0.9">Booking Ref</div>
                    <div style="font-weight:800">${ref}</div>
                  </div>
                </div>

                <div class="content">
                  <div class="left">
                    <div class="route">${ticket.from} → ${ticket.to}</div>
                    <div style="color:#475569;font-size:15px">${passenger}</div>
                    <div style="color:#475569;font-size:13px;margin-top:6px">${passengerEmail ? passengerEmail : ''}</div>
                    <div style="color:#475569;font-size:13px">${passengerPhone ? passengerPhone : ''}</div>
                    <div class="meta">
                      <div class="item"><strong>Date</strong><div>${new Date(ticket.date).toLocaleDateString()}</div></div>
                      <div class="item"><strong>Time</strong><div>${ticket.time}</div></div>
                      <div class="item"><strong>Seat</strong><div>#${ticket.seat}</div></div>
                      <div class="item"><strong>Bus</strong><div>${ticket.bus}</div></div>
                    </div>
                    <div style="margin-top:16px;font-size:16px"><strong>Fare:</strong> RWF ${Number(ticket.price || 0).toLocaleString()}</div>
                  </div>
                  <div class="qrBox">
                    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" />` : `<div style="width:220px;height:220px;border-radius:12px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8">QR not available</div>`}
                  </div>
                </div>

                <div style="padding:0 28px 18px">
                  <div class="code">${ticket.qrCode || ticket.qrData || ''}</div>
                </div>

                <div class="footer">Present this ticket (printed or on your phone) to the driver when boarding. This ticket is non-transferable. Contact support@safaritix.example for help.</div>
              </div>
            </div>
            <script>window.onload = function(){ setTimeout(()=>{ window.print(); },250); };</script>
          </body>
        </html>
      `;

      const w = window.open('', '_blank');
      if (!w) {
        alert('Popup blocked. Please allow popups to download the ticket.');
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (err) {
      console.error('Download ticket error', err);
      alert('Failed to prepare ticket for download');
    }
  };

  const shareTicket = async (ticket: any) => {
    try {
      const shareUrl = `${window.location.origin}/tickets/${ticket.id}`;
      const text = `My SafariTix ticket: ${ticket.from} → ${ticket.to} on ${new Date(ticket.date).toLocaleDateString()} (Seat #${ticket.seat})`;
      if (navigator.share) {
        await navigator.share({ title: 'SafariTix Ticket', text, url: shareUrl });
        return;
      }
      // fallback: open social share links
      const encodedText = encodeURIComponent(text + ' ' + shareUrl);
      const twitter = `https://twitter.com/intent/tweet?text=${encodedText}`;
      const whatsapp = `https://wa.me/?text=${encodedText}`;
      const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`;
      // open a small chooser
      const chooser = window.open('', 'share', 'width=600,height=400');
      if (!chooser) return alert('Popup blocked. Please allow popups to share the ticket.');
      chooser.document.write(`<p style="font-family:Arial,Helvetica,sans-serif;padding:20px">Share your ticket:<br/><a href="${twitter}" target="_blank">Twitter</a> · <a href="${facebook}" target="_blank">Facebook</a> · <a href="${whatsapp}" target="_blank">WhatsApp</a></p>`);
      chooser.document.close();
    } catch (err) {
      console.error('Share ticket error', err);
      alert('Failed to share ticket');
    }
  };

  // Check if ticket can be cancelled
  const canCancelTicket = (ticket: any): { canCancel: boolean; reason?: string } => {
    // Already cancelled or checked in
    if (ticket?.status === 'CANCELLED' || ticket?.status === 'cancelled') {
      return { canCancel: false, reason: 'Ticket already cancelled' };
    }
    if (ticket?.status === 'CHECKED_IN' || ticket?.status === 'checked_in') {
      return { canCancel: false, reason: 'Cannot cancel checked-in ticket' };
    }

    // Check departure time
    if (!ticket?.time || !ticket?.date) {
      return { canCancel: true }; // Allow if time not set
    }

    // Combine date and time
    const departureDateTimeStr = `${ticket.date}T${ticket.time}`;
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
  const handleCancelTicket = async (ticket: any) => {
    const cancelCheck = canCancelTicket(ticket);
    if (!cancelCheck.canCancel) {
      alert(cancelCheck.reason || 'Cannot cancel this ticket');
      return;
    }

    if (!confirm('Are you sure you want to cancel this ticket? This action cannot be undone.')) {
      return;
    }

    setCancelling(true);
    try {
      const hdrs: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;

      const response = await fetch(`/api/tickets/${ticket.id}/cancel`, {
        method: 'PATCH',
        headers: hdrs,
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        alert(data.message || 'Ticket cancelled successfully');
        // Update ticket status in state
        setSelectedTicket({ ...ticket, status: 'CANCELLED' });
        // Refresh tickets
        fetchTickets();
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

  const renderHome = () => (
    <div className="space-y-6">
      {/* Hero Section - Next Trip */}
      {upcomingTrips.length > 0 && (
        <div className="bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full text-sm font-semibold">
                Your Next Trip
              </div>
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <div className="text-4xl font-bold mb-3">
                  {upcomingTrips[0].from} → {upcomingTrips[0].to}
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                      <Calendar className="w-4 h-4" />
                      Date
                    </div>
                    <div className="font-bold text-lg">
                      {new Date(upcomingTrips[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                      <Clock className="w-4 h-4" />
                      Time
                    </div>
                    <div className="font-bold text-lg">{upcomingTrips[0].time}</div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
                      <Bus className="w-4 h-4" />
                      Seat
                    </div>
                    <div className="font-bold text-lg">{upcomingTrips[0].seat}</div>
                  </div>
                </div>
                
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/80">
                      <CreditCard className="w-4 h-4" />
                      <span>Total Fare</span>
                    </div>
                    <div className="font-bold text-2xl">RWF {upcomingTrips[0].price.toLocaleString()}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex lg:flex-col gap-3">
                <button
                  onClick={() => {
                    setSelectedTicket(upcomingTrips[0]);
                    setShowTicketModal(true);
                  }}
                  className="flex-1 lg:flex-initial bg-white text-[#0077B6] px-6 py-3 rounded-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                >
                  <QrCode className="w-5 h-5" />
                  View Ticket
                </button>
                <button
                  onClick={() => handleTrackBus(upcomingTrips[0])}
                  className="flex-1 lg:flex-initial bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <Navigation className="w-5 h-5" />
                  Track Bus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Search */}
      <div className="bg-white rounded-2xl shadow-xl p-6 lg:p-8 border border-gray-100">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0077B6]/10 rounded-xl flex items-center justify-center">
            <Search className="w-5 h-5 text-[#0077B6]" />
          </div>
          Find Your Next Trip
        </h3>
        
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">From</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Departure city"
                  value={fromInput}
                  onChange={(e) => setFromInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] focus:outline-none transition-all text-gray-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">To</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Arrival city"
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] focus:outline-none transition-all text-gray-900 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date (Optional)</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  placeholder="Travel date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-[#0077B6] focus:outline-none transition-all text-gray-900 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-2">
            <button
              type="submit"
              className="w-full md:w-1/2 lg:w-1/3 bg-[#0077B6] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#005F8E] transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              Search Buses
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>

        {searchError && (
          <div className="mt-3 flex items-center gap-3">
            <div className="text-sm text-red-600">{searchError}</div>
            <button onClick={() => handleSearch()} className="text-sm px-3 py-1 bg-[#0077B6] text-white rounded">Try again</button>
          </div>
        )}

        {searchLoading && <div className="mt-3 text-sm text-gray-600">Searching for schedules...</div>}

        {searchLoading && <div className="mt-4 text-sm text-gray-600">Searching...</div>}

        {!searchLoading && searchPerformed && searchResults.length === 0 && (
          <div className="mt-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg">No schedules available for this route at the moment.</div>
        )}

        {searchResults.length > 0 && (
          <div className="mt-4">
            <SearchResults
              results={searchResults}
              onSelect={(s) => { setSelectedTicket(s); setShowTicketModal(true); }}
            />
          </div>
        )}
      </div>

      {/* Popular Routes (redesigned) */}
      <div>
        <PopularRoutes
          routes={popularRoutes.map((s: any): PopularRoute => ({
            id: s.id || Math.random() * 100000,
            from: s.routeFrom || s.from || s.origin || s.from_location || s.from_location_name || 'Unknown',
            to: s.routeTo || s.to || s.destination || s.to_location || s.to_location_name || 'Unknown',
            departureDate: s.date || s.departureDate || s.departure_date || (s.schedule_date ? s.schedule_date : new Date().toISOString().slice(0,10)),
            departureTime: s.time || s.departureTime || s.departure_time || s.start_time || '08:00 AM',
            duration: s.duration || calcDuration(s.departureTime || s.departure_time || s.start_time, s.arrivalTime || s.arrival_time || s.end_time) || s.duration,
            price: Number(s.price ?? s.fare ?? s.price_per_seat ?? 0),
            availableSeats: Number(s.seatsAvailable ?? s.availableSeats ?? s.available_seats ?? (s.totalSeats ? s.totalSeats - (s.soldSeats||0) : 0)),
            totalSeats: Number(s.totalSeats ?? s.total_seats ?? s.capacity ?? 0),
            company: s.company || s.operator || s.companyName || '',
            popular: !!s.popular,
          }))}
          onSelect={(r) => { setSelectedTicket(r); setShowTicketModal(true); }}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="text-blue-600 text-sm font-semibold mb-2">Total Trips</div>
          <div className="text-3xl font-bold text-blue-900">{loading.stats ? '—' : Number(stats.totalTrips || 0).toLocaleString()}</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="text-green-600 text-sm font-semibold mb-2">Active Tickets</div>
          <div className="text-3xl font-bold text-green-900">{loading.stats ? '—' : Number(stats.activeTickets ?? upcomingTrips.length).toLocaleString()}</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="text-purple-600 text-sm font-semibold mb-2">Favorite Routes</div>
          <div className="text-3xl font-bold text-purple-900">{loading.stats ? '—' : Number(stats.favoriteRoutes || 0).toLocaleString()}</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="text-orange-600 text-sm font-semibold mb-2">Rewards Points</div>
          <div className="text-3xl font-bold text-orange-900">{loading.stats ? '—' : Number(stats.rewardsPoints || 0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );

  const renderTickets = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">My Tickets</h2>
        <button className="bg-[#0077B6] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#005F8E] transition-all duration-300 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Book New Ticket
        </button>
      </div>

      {/* Upcoming Tickets */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Ticket className="w-6 h-6 text-[#0077B6]" />
          Upcoming Trips
        </h3>
        
        <div className="space-y-4">
          {upcomingTrips.map((trip) => (
            <div
              key={trip.id}
              className="border-2 border-gray-100 rounded-xl p-6 hover:border-[#0077B6] hover:shadow-lg transition-all duration-300 cursor-pointer"
              onClick={() => {
                setSelectedTicket(trip);
                setShowTicketModal(true);
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-[#0077B6]/10 rounded-xl flex items-center justify-center">
                      <Bus className="w-6 h-6 text-[#0077B6]" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-gray-900">
                        {trip.from} → {trip.to}
                      </div>
                      <div className="text-sm text-gray-500">Bus #{trip.bus}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Date</div>
                      <div className="font-semibold text-gray-900">
                        {new Date(trip.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Time</div>
                      <div className="font-semibold text-gray-900">{trip.time}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Seat</div>
                      <div className="font-semibold text-gray-900">#{trip.seat}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Price</div>
                      <div className="font-semibold text-[#0077B6]">
                        RWF {trip.price.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex lg:flex-col gap-2">
                  <span className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-semibold text-sm">
                    <Check className="w-4 h-4" />
                    Confirmed
                  </span>
                  <button className="bg-[#0077B6]/10 text-[#0077B6] px-4 py-2 rounded-lg font-semibold text-sm hover:bg-[#0077B6] hover:text-white transition-all duration-300 flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    View QR
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTrackBus(trip);
                    }}
                    className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-semibold text-sm hover:bg-green-600 hover:text-white transition-all duration-300 flex items-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Track Bus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <History className="w-6 h-6 text-[#0077B6]" />
          Recent Bookings
        </h3>
        
        <div className="space-y-3">
          {recentBookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Bus className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{booking.route}</div>
                  <div className="text-sm text-gray-500">{booking.date}</div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-bold text-gray-900">RWF {booking.price.toLocaleString()}</div>
                <div className="text-xs text-gray-500 capitalize">{booking.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-900">Profile Settings</h2>

      {/* Profile Card (view / edit) */}
      {!editingProfile ? (
        <div className="bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-2xl p-8 text-white shadow-2xl">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/30">
              <User className="w-12 h-12" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-2xl font-bold mb-2">{user?.name || 'John Doe'}</h3>
              <p className="text-white/80 mb-1">{user?.email || 'john.doe@example.com'}</p>
              <p className="text-white/80">{user?.phone || user?.phoneNumber || user?.phone_number || '+250 788 123 456'}</p>
            </div>
            <button onClick={() => setEditingProfile(true)} className="bg-white/20 backdrop-blur-sm border-2 border-white/30 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all duration-300">
              Edit Profile
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h3 className="text-xl font-bold mb-4">Edit Personal Information</h3>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full name</label>
              <input value={profileForm.name} onChange={(e)=>setProfileForm(p=>({...p, name: e.target.value}))} className="w-full px-4 py-3 rounded-lg border border-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input value={profileForm.email} onChange={(e)=>setProfileForm(p=>({...p, email: e.target.value}))} className="w-full px-4 py-3 rounded-lg border border-gray-200" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input value={profileForm.phone} onChange={(e)=>setProfileForm(p=>({...p, phone: e.target.value}))} className="w-full px-4 py-3 rounded-lg border border-gray-200" />
            </div>
            {profileError && <div className="text-sm text-red-600">{profileError}</div>}
            <div className="flex gap-3">
              <button onClick={async ()=>{
                setProfileSaving(true); setProfileError(null);
                try {
                  const hdrs: Record<string,string> = { 'Content-Type': 'application/json' };
                  if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
                  const body = { full_name: profileForm.name, email: profileForm.email, phone_number: profileForm.phone };
                  const res = await fetch('/api/auth/me', { method: 'PUT', headers: hdrs, body: JSON.stringify(body) });
                  if (!res.ok) {
                    const txt = await res.text(); throw new Error(txt || 'Failed to update profile');
                  }
                  const json = await res.json();
                  const updated = json.user || json;
                  // update auth context and localStorage
                  if (signIn) await signIn(accessToken || '', updated);
                  setEditingProfile(false);
                } catch (err: any) {
                  console.error('Profile save error', err);
                  setProfileError(err.message || 'Failed to save');
                } finally { setProfileSaving(false); }
              }} disabled={profileSaving} className="bg-[#0077B6] text-white px-4 py-2 rounded-lg font-semibold">{profileSaving ? 'Saving…' : 'Save'}</button>
              <button onClick={()=>{ setEditingProfile(false); setProfileError(null); setProfileForm({ name: user?.name||'', email: user?.email||'', phone: user?.phone||'' }); }} className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#0077B6]" />
            Account Settings
          </h3>
          
          <div className="space-y-3">
            {
              [
                { label: 'Personal Information', icon: User },
                { label: 'Payment Methods', icon: CreditCard },
                { label: 'Notifications', icon: Bell },
                { label: 'Privacy & Security', icon: Settings },
              ].map((item, index) => {
                const Icon = item.icon as any;
                return (
                  <button
                    key={index}
                    onClick={() => setExpandedSetting(prev => prev === item.label ? null : item.label)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#0077B6] hover:shadow-md transition-all duration-300 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#0077B6]/10 rounded-lg flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#0077B6]" />
                      </div>
                      <span className="font-semibold text-gray-900">{item.label}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                );
              })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-6 h-6 text-[#0077B6]" />
            Rewards & Benefits
          </h3>
          
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 mb-4 border border-yellow-200">
            <div className="text-yellow-700 text-sm font-semibold mb-2">Total Points</div>
            <div className="text-4xl font-bold text-yellow-900 mb-2">1,250</div>
            <div className="text-sm text-yellow-600">Redeem for discounts and free trips!</div>
          </div>
          
          <button className="w-full bg-[#0077B6] text-white py-3 rounded-xl font-semibold hover:bg-[#005F8E] transition-all duration-300">
            View Rewards Catalog
          </button>
        </div>
      </div>

      {/* Logout */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-3 bg-red-50 text-red-600 py-4 rounded-xl font-bold hover:bg-red-100 transition-all duration-300 border-2 border-red-200"
        >
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </div>
  );

  const renderLiveMap = () => (
    <div className="space-y-6">
      {(() => {
        const selectedTrackingTicket = trackedTicket || upcomingTrips.find((t: any) => resolveScheduleId(t));
        const scheduleId = resolveScheduleId(selectedTrackingTicket);
        const ticketId = resolveTicketId(selectedTrackingTicket);

        if (!selectedTrackingTicket) {
          return (
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center">
                <Navigation className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">No trackable booked trip</h3>
                <p className="text-gray-600">Book or confirm a ticket first, then tap "Track Bus".</p>
              </div>
            </div>
          );
        }

        if (!scheduleId || !ticketId) {
          return (
            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
              <h3 className="text-lg font-semibold text-amber-900 mb-1">Tracking unavailable for this ticket</h3>
              <p className="text-amber-800 text-sm">
                This ticket is missing schedule linking information from backend response.
              </p>
            </div>
          );
        }

        return (
          <PassengerTracking
            scheduleId={String(scheduleId)}
            ticketId={String(ticketId)}
            routeFrom={selectedTrackingTicket.from || selectedTrackingTicket.routeFrom}
            routeTo={selectedTrackingTicket.to || selectedTrackingTicket.routeTo}
            departureTime={selectedTrackingTicket.departureTime || selectedTrackingTicket.time || selectedTrackingTicket.date}
            arrivalTime={selectedTrackingTicket.arrivalTime}
            autoStart
          />
        );
      })()}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Live Driver Tracking</h2>
          <p className="text-gray-600 mt-1">Track active buses in real-time</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 bg-[#0077B6] rounded-full animate-pulse"></div>
          <span className="text-gray-600">Live Updates</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-blue-600 text-sm font-semibold mb-1">Active Buses</div>
              <div className="text-3xl font-bold text-blue-900">
                {mapLoading ? '—' : driverLocations.filter(d => d.status === 'active').length}
              </div>
            </div>
            <Bus className="w-10 h-10 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-green-600 text-sm font-semibold mb-1">Total Drivers</div>
              <div className="text-3xl font-bold text-green-900">
                {mapLoading ? '—' : driverLocations.length}
              </div>
            </div>
            <User className="w-10 h-10 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-purple-600 text-sm font-semibold mb-1">Tracking</div>
              <div className="text-3xl font-bold text-purple-900">
                {mapLoading ? '—' : driverLocations.filter(d => d.latitude !== 0 && d.longitude !== 0).length}
              </div>
            </div>
            <MapPin className="w-10 h-10 text-purple-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Legacy Mapbox fleet map (optional) */}
      {hasMapboxToken && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-[#0077B6]" />
              Live Map View
            </h3>
          </div>

          {mapLoading && !map.current ? (
            <div className="h-[500px] flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-[#0077B6] animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading map...</p>
              </div>
            </div>
          ) : (
            <div
              ref={mapContainer}
              style={{ width: '100%', height: '500px' }}
            />
          )}
        </div>
      )}

      {/* Driver List */}
      {driverLocations.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Bus className="w-6 h-6 text-[#0077B6]" />
            Active Drivers ({driverLocations.length})
          </h3>

          <div className="space-y-3">
            {driverLocations.map((driver) => (
              <div
                key={driver.id}
                className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-[#0077B6] hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    driver.status === 'active' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    🚌
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">{driver.plateNumber}</div>
                    <div className="text-sm text-gray-600">{driver.driverName}</div>
                    <div className="text-xs text-gray-500">{driver.model}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                    driver.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      driver.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></div>
                    {driver.status === 'active' ? 'On Trip' : 'Idle'}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {driver.speed.toFixed(1)} km/h
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center">
            <Bus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Active Trips</h3>
            <p className="text-gray-600">
              No drivers are currently sharing their location. Check back later to see active trips.
            </p>
          </div>
        </div>
      )}
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-900">Notifications</h2>
        <button className="text-[#0077B6] font-semibold hover:underline">Mark all as read</button>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#0077B6] hover:shadow-md transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                notif.type === 'info' ? 'bg-blue-100' :
                notif.type === 'success' ? 'bg-green-100' :
                'bg-yellow-100'
              }`}> 
                {notif.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
                {notif.type === 'success' && <Check className="w-5 h-5 text-green-600" />}
                {notif.type === 'warning' && <AlertCircle className="w-5 h-5 text-yellow-600" />}
              </div>
              
              <div className="flex-1">
                <p className="font-semibold text-gray-900 mb-1">{notif.message}</p>
                <p className="text-sm text-gray-500">{notif.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-xl flex items-center justify-center">
                <Bus className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#0077B6] to-[#005F8E] bg-clip-text text-transparent">
                SafariTix
              </span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'tickets', label: 'My Tickets', icon: Ticket },
                { id: 'map', label: 'Live Map', icon: MapPin },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'profile', label: 'Profile', icon: User },
              ].map((item) => {
                const Icon = item.icon as any;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
                      activeTab === item.id
                        ? 'bg-[#0077B6] text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.id === 'notifications' && (
                      <span className="w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center font-bold">
                        {notifications.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'tickets', label: 'My Tickets', icon: Ticket },
                { id: 'map', label: 'Live Map', icon: MapPin },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'profile', label: 'Profile', icon: User },
              ].map((item) => {
                const Icon = item.icon as any;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                      activeTab === item.id
                        ? 'bg-[#0077B6] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {activeTab === 'home' && renderHome()}
        {activeTab === 'tickets' && renderTickets()}
        {activeTab === 'map' && renderLiveMap()}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'notifications' && renderNotifications()}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-bottom z-50">
        <div className="flex items-center justify-around">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'tickets', icon: Ticket, label: 'Tickets' },
            { id: 'map', icon: MapPin, label: 'Map' },
            { id: 'notifications', icon: Bell, label: 'Alerts', badge: notifications.length },
            { id: 'profile', icon: User, label: 'Profile' },
          ].map((item) => {
            const Icon = item.icon as any;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 relative ${
                  activeTab === item.id
                    ? 'text-[#0077B6]'
                    : 'text-gray-400'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-semibold">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Ticket Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 xl:flex xl:flex-col bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl xl:overflow-y-auto xl:flex-1 max-w-md w-full p-8 relative animate-scale-in">
            <button
              onClick={() => setShowTicketModal(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all duration-300"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* If selectedTicket already has a confirmed seat/qrCode (existing ticket), show ticket details. Otherwise show seat map for booking */}
            {(selectedTicket.qrCode || selectedTicket.seat) ? (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Your Ticket</h3>
                  <p className="text-gray-600">{selectedTicket.from} → {selectedTicket.to}</p>
                </div>

                <div className="bg-gradient-to-br from-[#0077B6]/10 to-[#005F8E]/10 rounded-2xl p-8 mb-6 border-2 border-dashed border-[#0077B6]/30">
                  <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center shadow-md">
                    {selectedTicket.qrData ? (
                      <QRCodeCanvas id="ticket-qr-canvas" value={selectedTicket.qrData} size={160} bgColor="#ffffff" fgColor="#0077B6" />
                    ) : (
                      <QrCode className="w-32 h-32 text-[#0077B6]" />
                    )}
                  </div>
                  <div className="text-center mt-4">
                    <p className="text-xs text-gray-500 mb-1">Booking Reference</p>
                    <p className="text-sm font-bold text-gray-900 font-mono">{selectedTicket.bookingRef || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-2">Scan QR code for check-in</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Status</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-xs ${
                      selectedTicket.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                      selectedTicket.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-700' :
                      selectedTicket.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedTicket.status === 'CHECKED_IN' ? 'Checked In' : 
                       selectedTicket.status === 'CONFIRMED' ? 'Confirmed' :
                       selectedTicket.status || 'Pending'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Date</span>
                    <span className="font-bold text-gray-900">{new Date(selectedTicket.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Time</span>
                    <span className="font-bold text-gray-900">{selectedTicket.time}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Seat</span>
                    <span className="font-bold text-gray-900">#{selectedTicket.seat}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Bus</span>
                    <span className="font-bold text-gray-900">{selectedTicket.bus}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Price</span>
                    <span className="font-bold text-gray-900">RWF {selectedTicket.price?.toLocaleString() || '0'}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-1">Passenger</div>
                  <div className="font-semibold text-gray-900">{selectedTicket.passengerName || selectedTicket.name || user?.name || '—'}</div>
                  <div className="text-sm text-gray-500">{selectedTicket.passengerEmail || selectedTicket.email || user?.email || ''}</div>
                  <div className="text-sm text-gray-500">{selectedTicket.passengerPhone || selectedTicket.phone || user?.phone || user?.phoneNumber || ''}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => downloadTicket(selectedTicket)} className="flex items-center justify-center gap-2 bg-[#0077B6] text-white px-4 py-3 rounded-xl font-semibold hover:bg-[#005F8E] transition-all duration-300">
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                  <button onClick={() => shareTicket(selectedTicket)} className="flex items-center justify-center gap-2 bg-gray-100 text-gray-900 px-4 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-300">
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>

                {/* Cancel Button */}
                <div className="mt-3">
                  {(() => {
                    const cancelCheck = canCancelTicket(selectedTicket);
                    return (
                      <button
                        onClick={() => handleCancelTicket(selectedTicket)}
                        disabled={!cancelCheck.canCancel || cancelling}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-300 ${
                          cancelCheck.canCancel && !cancelling
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                        title={cancelCheck.reason || 'Cancel Ticket'}
                      >
                        {cancelling ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <Ban className="w-5 h-5" />
                            Cancel Ticket
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">Select Seat</h3>
                  <p className="text-sm text-gray-600">{selectedTicket.from} → {selectedTicket.to}</p>
                </div>

                <div className="mb-3">
                  <div className="flex items-center gap-3 justify-center flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-white border border-gray-300"></div>
                      <div className="text-sm text-gray-600">Available</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#0077B6]"></div>
                      <div className="text-sm text-gray-600">Selected</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-gray-300"></div>
                      <div className="text-sm text-gray-600">Occupied</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-yellow-100 border border-yellow-300"></div>
                      <div className="text-sm text-gray-600">Locked</div>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <SeatMap scheduleId={selectedTicket.id} price={selectedTicket.price || 0} selectedSeatsMap={selectedSeatsMap} setSelectedSeatsMap={setSelectedSeatsMap} accessToken={accessToken} />
                </div>

                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Selected seat(s): <span className="font-semibold text-gray-900">{Object.keys(selectedSeatsMap).filter(k=>selectedSeatsMap[k]).join(', ') || 'None'}</span></div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        const picks = Object.keys(selectedSeatsMap).filter(k=>selectedSeatsMap[k]);
                        if (picks.length === 0) {
                          setLockError('Select at least one seat');
                          return;
                        }
                        setLockError(null);
                        setLocking(true);
                        try {
                          const hdrs: Record<string,string> = { 'Content-Type': 'application/json' };
                          if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
                          // lock each seat sequentially
                          const results = [];
                          for (const seatNum of picks) {
                            const body = { seat_number: seatNum, passenger_id: user?.id, price: selectedTicket.price || 0 };
                            const res = await fetch(`/api/seats/schedules/${selectedTicket.id}/lock`, { method: 'POST', headers: hdrs, body: JSON.stringify(body) });
                            if (!res.ok) {
                              const txt = await res.text();
                              throw new Error(txt || 'Failed to lock seat');
                            }
                            const json = await res.json();
                            results.push(json);
                          }
                          // success - close modal and refresh available seats / show confirmation
                          setShowTicketModal(false);
                          // optional: refresh lists
                        } catch (err: any) {
                          console.error('Lock error', err);
                          setLockError(err.message || 'Failed to lock seats');
                        } finally {
                          setLocking(false);
                        }
                      }}
                      className="bg-[#0077B6] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#005F8E] transition-all duration-200"
                      disabled={locking}
                    >
                      {locking ? 'Booking…' : 'Confirm Booking'}
                    </button>
                    <button onClick={() => { setSelectedSeatsMap({}); setShowTicketModal(false); }} className="bg-gray-100 text-gray-900 px-4 py-2 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200">
                      Cancel
                    </button>
                  </div>
                  {lockError && <div className="text-sm text-red-600 mt-2">{lockError}</div>}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
