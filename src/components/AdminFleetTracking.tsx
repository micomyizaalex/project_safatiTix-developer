import React, { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { Bus, Loader2, MapPin, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

const busIcon = new L.Icon({
  iconUrl:
    'data:image/svg+xml;base64,' +
    btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#0077B6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="6" width="22" height="12" rx="2" ry="2"/>
        <path d="M1 10h22"/>
        <circle cx="7" cy="18" r="2" fill="#0077B6"/>
        <circle cx="17" cy="18" r="2" fill="#0077B6"/>
      </svg>
    `),
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19],
});

type LiveLocation = {
  scheduleId: string;
  trip_status: string;
  date: string | null;
  time: string | null;
  updated_at: string;
  bus: {
    id: string | null;
    plateNumber: string | null;
    model: string | null;
    capacity: number | null;
    status: string | null;
  };
  route: {
    from: string | null;
    to: string | null;
  };
  driver: {
    name: string | null;
  };
  company?: {
    name: string | null;
  };
  location: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
  };
};

export default function AdminFleetTracking() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locations, setLocations] = useState<LiveLocation[]>([]);

  const fetchLocations = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication token missing. Please sign in again.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/tracking/company/live-locations', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || `Failed to fetch live locations (${res.status})`);
      }

      setLocations(Array.isArray(payload.locations) ? payload.locations : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load live bus locations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 15000);
    return () => clearInterval(interval);
  }, []);

  const mapCenter = useMemo<[number, number]>(() => {
    if (locations.length === 0) return [-1.9441, 30.0619];
    const first = locations[0];
    return [first.location.latitude, first.location.longitude];
  }, [locations]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 flex items-center justify-center min-h-[420px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0077B6] mx-auto mb-2" />
          <p className="text-gray-600">Loading live buses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <p className="text-red-700 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">In-progress Buses</div>
          <div className="text-2xl font-black text-[#2B2D42] mt-1">{locations.length}</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500">Companies Active</div>
          <div className="text-2xl font-black text-[#2B2D42] mt-1">{new Set(locations.map((l) => l.company?.name || 'Unknown')).size}</div>
        </div>
        <button
          onClick={fetchLocations}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors text-left"
        >
          <div className="text-xs text-gray-500">Refresh</div>
          <div className="mt-1 flex items-center gap-2 text-[#0077B6] font-bold">
            <RefreshCw className="w-4 h-4" /> Update now
          </div>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <MapContainer center={mapCenter} zoom={8} style={{ height: '70vh', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {locations.map((entry) => (
            <Marker
              key={entry.scheduleId}
              position={[entry.location.latitude, entry.location.longitude]}
              icon={busIcon}
            >
              <Popup>
                <div className="min-w-[220px] space-y-1">
                  <div className="font-bold text-gray-900 flex items-center gap-1">
                    <Bus className="w-4 h-4" /> {entry.bus.plateNumber || 'Unknown bus'}
                  </div>
                  <div className="text-sm text-gray-700">{(entry.route.from || 'N/A')} {'->'} {(entry.route.to || 'N/A')}</div>
                  <div className="text-xs text-gray-600">Company: {entry.company?.name || 'N/A'}</div>
                  <div className="text-xs text-gray-600">Driver: {entry.driver.name || 'Unassigned'}</div>
                  <div className="text-xs text-gray-600">Status: {entry.trip_status || 'in_progress'}</div>
                  <div className="text-xs text-gray-500">Updated: {new Date(entry.updated_at).toLocaleTimeString()}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {locations.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-900">No active buses right now</h3>
          <p className="text-gray-600">As soon as drivers start trips and send GPS updates, buses will appear here.</p>
        </div>
      )}
    </div>
  );
}
