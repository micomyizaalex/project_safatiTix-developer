import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { io, Socket } from 'socket.io-client';
import L from 'leaflet';
import { MapPin, Loader2, AlertCircle, Bus, Navigation, Activity, Clock, User, MapPinned } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { API_BASE_URL } from '../config';
import { SOCKET_ORIGIN, socketOptions } from '../utils/network';

// Fix for default marker icons in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom bus icon with different colors for active/inactive
const createBusIcon = (isActive: boolean) => new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${isActive ? '#27AE60' : '#95A5A6'}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="6" width="22" height="12" rx="2" ry="2"/>
      <path d="M1 10h22"/>
      <path d="M1 14h22"/>
      <circle cx="7" cy="18" r="2" fill="${isActive ? '#27AE60' : '#95A5A6'}"/>
      <circle cx="17" cy="18" r="2" fill="${isActive ? '#27AE60' : '#95A5A6'}"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

interface BusLocation {
  scheduleId: string;
  busPlate: string;
  driverName: string | null;
  routeName: string;
  location: {
    latitude: number;
    longitude: number;
    speed: number | null;
    heading: number | null;
    recorded_at: string;
  } | null;
  status: 'active' | 'inactive' | 'completed' | 'in_progress';
  departureTime: string;
}

interface CompanyFleetTrackingProps {
  token: string | null;
  activeBuses: number;
}

// Component to auto-fit map bounds when buses change
function MapBoundsFitter({ buses }: { buses: BusLocation[] }) {
  const map = useMap();

  useEffect(() => {
    const busesWithLocation = buses.filter(b => b.location);
    if (busesWithLocation.length > 0) {
      const bounds = L.latLngBounds(
        busesWithLocation.map(b => [b.location!.latitude, b.location!.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [buses, map]);

  return null;
}

function MapFocusOnSelected({ selectedBus, buses }: { selectedBus: string | null; buses: BusLocation[] }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedBus) return;
    const bus = buses.find(b => b.scheduleId === selectedBus && b.location);
    if (!bus || !bus.location) return;

    // Avoid transition race conditions during rapid re-renders/unmounts.
    if ((map as any)?._loaded) {
      map.setView([bus.location.latitude, bus.location.longitude], 15, { animate: false });
    }
  }, [selectedBus, buses, map]);

  return null;
}

export default function CompanyFleetTracking({ token, activeBuses }: CompanyFleetTrackingProps) {
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [selectionNote, setSelectionNote] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Fetch active schedules and their locations
  const fetchFleetData = async () => {
    if (!token) {
      setError('No authentication token available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const baseUrl = API_BASE_URL;

      // Fetch all company schedules
      const schedulesRes = await fetch(`${baseUrl}/api/company/schedules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!schedulesRes.ok) {
        const errorText = await schedulesRes.text();
        console.error('Schedules fetch failed:', schedulesRes.status, errorText);
        throw new Error(`Failed to fetch schedules: ${schedulesRes.statusText}`);
      }

      const schedulesData = await schedulesRes.json();
      const schedules = schedulesData.schedules || [];

      // Track schedules that are in progress or scheduled for today.
      const today = new Date().toISOString().split('T')[0];
      const todaySchedules = schedules.filter((sch: any) => {
        const status = String(sch.status || '').toLowerCase();
        if (status === 'in_progress' || status === 'active') {
          return true;
        }
        const rawDate = sch.scheduleDate || sch.schedule_date || sch.date || null;
        if (!rawDate) return false;
        const normalizedDate = String(rawDate).slice(0, 10);
        return normalizedDate === today;
      });

      // For each schedule, try to get its location
      const locationPromises = todaySchedules.map(async (schedule: any) => {
        try {
          const locationRes = await fetch(
            `${baseUrl}/api/tracking/schedule/${schedule.id}/location`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (locationRes.ok) {
            const locationData = await locationRes.json();
            return {
              scheduleId: schedule.id,
              busPlate: schedule.busPlateNumber || 'Unknown',
              driverName: locationData.driver
                ? `${locationData.driver.first_name} ${locationData.driver.last_name}`
                : schedule.driverName || null,
              routeName: schedule.routeFrom && schedule.routeTo 
                ? `${schedule.routeFrom} → ${schedule.routeTo}` 
                : 'Unknown Route',
              location: locationData.location || null,
              status: locationData.location
                ? 'active'
                : (schedule.status === 'completed' ? 'completed' : (schedule.status === 'in_progress' ? 'active' : 'inactive')),
              departureTime: schedule.departureTime || null,
            };
          } else {
            // No location data available - bus hasn't started trip
            return {
              scheduleId: schedule.id,
              busPlate: schedule.busPlateNumber || 'Unknown',
              driverName: schedule.driverName || null,
              routeName: schedule.routeFrom && schedule.routeTo 
                ? `${schedule.routeFrom} → ${schedule.routeTo}` 
                : 'Unknown Route',
              location: null,
              status: schedule.status === 'completed' ? 'completed' : (schedule.status === 'in_progress' ? 'active' : 'inactive'),
              departureTime: schedule.departureTime || null,
            };
          }
        } catch (err) {
          console.error(`Failed to fetch location for schedule ${schedule.id}:`, err);
          return {
            scheduleId: schedule.id,
            busPlate: schedule.busPlateNumber || 'Unknown',
            driverName: schedule.driverName || null,
            routeName: schedule.routeFrom && schedule.routeTo 
              ? `${schedule.routeFrom} → ${schedule.routeTo}` 
              : 'Unknown Route',
            location: null,
            status: schedule.status === 'completed' ? 'completed' : (schedule.status === 'in_progress' ? 'active' : 'inactive'),
            departureTime: schedule.departureTime || null,
          };
        }
      });

      const busLocations = await Promise.all(locationPromises);
      setBuses(busLocations);
      setLoading(false);
    } catch (err: any) {
      console.error('Error fetching fleet data:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      setError(err.message || 'Failed to fetch fleet data');
      setLoading(false);
    }
  };

  // Initialize Socket.IO connection for real-time updates
  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_ORIGIN, {
      ...socketOptions,
      auth: { token },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Fleet tracking: Socket.IO connected');
      setConnectionStatus('connected');

      // Join all currently loaded schedules so first location update appears instantly.
      buses.forEach(bus => {
        socket.emit('companyAdmin:joinSchedule', { scheduleId: bus.scheduleId });
        console.log(`Joined room for schedule: ${bus.scheduleId}`);
      });
    });

    socket.on('disconnect', () => {
      console.log('Fleet tracking: Socket.IO disconnected');
      setConnectionStatus('connecting');
    });

    socket.on('connect_error', (err) => {
      console.error('Fleet tracking: Socket.IO connection error:', err);
      setConnectionStatus('connecting');
    });

    // Listen for location updates from any bus
    socket.on('bus:locationUpdate', (data: any) => {
      console.log('Fleet tracking: Received location update:', data);
      const incomingLocation = data.location || {
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed ?? null,
        heading: data.heading ?? null,
        recorded_at: data.timestamp || new Date().toISOString(),
      };

      setBuses(prevBuses => {
        const exists = prevBuses.some(bus => bus.scheduleId === data.scheduleId);
        if (!exists) {
          return [
            ...prevBuses,
            {
              scheduleId: data.scheduleId,
              busPlate: data.busPlate || 'Unknown',
              driverName: data.driverName || null,
              routeName: data.routeName || 'Unknown Route',
              location: incomingLocation,
              status: 'active',
              departureTime: data.departureTime || '',
            }
          ];
        }

        return prevBuses.map(bus =>
          bus.scheduleId === data.scheduleId
            ? { ...bus, location: incomingLocation, status: 'active' as const }
            : bus
        );
      });
    });

    // Listen for current location when joining
    socket.on('bus:currentLocation', (data: any) => {
      console.log('Fleet tracking: Received current location:', data);
      const incomingLocation = data.location || {
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed ?? null,
        heading: data.heading ?? null,
        recorded_at: data.timestamp || new Date().toISOString(),
      };

      setBuses(prevBuses => {
        const exists = prevBuses.some(bus => bus.scheduleId === data.scheduleId);
        if (!exists) {
          return [
            ...prevBuses,
            {
              scheduleId: data.scheduleId,
              busPlate: data.busPlate || 'Unknown',
              driverName: data.driver ? `${data.driver.first_name} ${data.driver.last_name}` : null,
              routeName: data.routeName || 'Unknown Route',
              location: incomingLocation,
              status: 'active',
              departureTime: data.departureTime || '',
            }
          ];
        }

        return prevBuses.map(bus =>
          bus.scheduleId === data.scheduleId
            ? {
                ...bus,
                location: incomingLocation,
                driverName: data.driver ? `${data.driver.first_name} ${data.driver.last_name}` : bus.driverName,
                status: 'active' as const,
              }
            : bus
        );
      });
    });

    return () => {
      console.log('Fleet tracking: Cleaning up Socket.IO connection');
      socket.disconnect();
    };
  }, [token]);

  // Fetch fleet data on mount and every 30 seconds
  useEffect(() => {
    fetchFleetData();
    const interval = setInterval(fetchFleetData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [token]);

  // Join rooms when buses change
  useEffect(() => {
    if (socketRef.current?.connected) {
      buses.forEach(bus => {
        socketRef.current?.emit('companyAdmin:joinSchedule', { scheduleId: bus.scheduleId });
      });
    }
  }, [buses, connectionStatus]);

  // Get default center (if no buses, use Rwanda coordinates)
  const getDefaultCenter = (): [number, number] => {
    const activeBuses = buses.filter(b => b.location);
    if (activeBuses.length > 0) {
      const firstBus = activeBuses[0];
      return [firstBus.location!.latitude, firstBus.location!.longitude];
    }
    return [-1.9403, 29.8739]; // Kigali, Rwanda
  };

  const handleSelectBus = async (bus: BusLocation) => {
    setSelectedBus(bus.scheduleId);
    setSelectionNote(null);

    if (bus.location) return;
    if (!token) {
      setSelectionNote('Missing authentication token. Please sign in again.');
      return;
    }

    try {
      const baseUrl = API_BASE_URL;
      const res = await fetch(`${baseUrl}/api/tracking/schedule/${bus.scheduleId}/location`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        setSelectionNote('Unable to fetch location for this bus right now.');
        return;
      }

      const data = await res.json();
      if (!data?.hasLocation || !data?.location) {
        setSelectionNote('This bus has not shared GPS location yet.');
        return;
      }

      setBuses(prev =>
        prev.map(item =>
          item.scheduleId === bus.scheduleId
            ? {
                ...item,
                location: {
                  latitude: data.location.latitude,
                  longitude: data.location.longitude,
                  speed: data.location.speed ?? null,
                  heading: data.location.heading ?? null,
                  recorded_at: data.location.timestamp || new Date().toISOString(),
                },
                status: 'active',
              }
            : item
        )
      );
    } catch (err) {
      setSelectionNote('Failed to load this bus location.');
    }
  };

  const inactiveBusesCount = buses.filter(b => b.status === 'inactive').length;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#27AE60] animate-spin" />
          <span className="ml-3 text-gray-600">Loading fleet data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-red-900">Failed to load fleet data</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button
            onClick={fetchFleetData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-['Montserrat'] font-bold text-[#2B2D42]">Live Fleet Tracking</h2>
          <p className="text-gray-600 text-sm mt-1">Real-time monitoring of your bus fleet</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            connectionStatus === 'connected' ? 'bg-green-100 text-green-700' :
            connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' :
              'bg-red-500'
            } ${connectionStatus === 'connecting' ? 'animate-pulse' : ''}`} />
            {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active Trips</p>
              <p className="text-2xl font-bold text-green-700">{activeBuses}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-slate-50 border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-500 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-700">{inactiveBusesCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Fleet</p>
              <p className="text-2xl font-bold text-blue-700">{buses.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map and Bus List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200" style={{ height: '500px' }}>
            <MapContainer
              center={getDefaultCenter()}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapBoundsFitter buses={buses} />
              <MapFocusOnSelected selectedBus={selectedBus} buses={buses} />

              {buses.map(bus => {
                if (!bus.location) return null;

                return (
                  <Marker
                    key={bus.scheduleId}
                    position={[bus.location.latitude, bus.location.longitude]}
                    icon={createBusIcon(bus.status === 'active')}
                    eventHandlers={{
                      click: () => handleSelectBus(bus),
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
                          <Bus className="w-5 h-5 text-[#27AE60]" />
                          <span className="font-bold text-lg text-gray-800">{bus.busPlate}</span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-gray-600 text-xs">Route</p>
                              <p className="font-medium text-gray-800">{bus.routeName}</p>
                            </div>
                          </div>

                          {bus.driverName && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div>
                                <p className="text-gray-600 text-xs">Driver</p>
                                <p className="font-medium text-gray-800">{bus.driverName}</p>
                              </div>
                            </div>
                          )}

                          {bus.location.speed !== null && (
                            <div className="flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-gray-500 flex-shrink-0" />
                              <div>
                                <p className="text-gray-600 text-xs">Speed</p>
                                <p className="font-medium text-gray-800">{Math.round(bus.location.speed)} km/h</p>
                              </div>
                            </div>
                          )}

                          <div className="pt-2 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              Last update: {bus.location.recorded_at ? new Date(bus.location.recorded_at).toLocaleTimeString() : 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Bus List */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4" style={{ height: '500px', overflowY: 'auto' }}>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-[#27AE60]" />
              Fleet Status
            </h3>
            {selectionNote && (
              <p className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {selectionNote}
              </p>
            )}
            
            <div className="space-y-3">
              {buses.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
                  No schedules for today yet. The map is ready and will show buses as soon as drivers start sharing location.
                </div>
              )}
              {buses.map(bus => (
                <div
                  key={bus.scheduleId}
                  onClick={() => handleSelectBus(bus)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedBus === bus.scheduleId
                      ? 'border-[#27AE60] bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Bus className={`w-4 h-4 ${bus.status === 'active' ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="font-bold text-gray-800">{bus.busPlate}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      bus.status === 'active' ? 'bg-green-100 text-green-700' :
                      bus.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {bus.status === 'active' ? '🟢 Active' : 
                       bus.status === 'completed' ? '✓ Completed' : '⏸ Scheduled'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-600 mb-1">{bus.routeName}</p>
                  
                  {bus.driverName && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {bus.driverName}
                    </p>
                  )}

                  {bus.departureTime && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Departure: {(() => {
                        try {
                          const date = new Date(bus.departureTime);
                          return isNaN(date.getTime()) ? 'Invalid time' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (err) {
                          return 'Invalid time';
                        }
                      })()}
                    </p>
                  )}

                  {bus.location && bus.location.speed !== null && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Speed: <span className="font-medium">{Math.round(bus.location.speed)} km/h</span>
                      </p>
                    </div>
                  )}

                  {!bus.location && bus.status !== 'completed' && (
                    <p className="text-xs text-gray-400 mt-2 italic">Waiting to start trip...</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Refresh Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Auto-refreshing every 30 seconds • Real-time updates via Socket.IO
        </p>
      </div>
    </div>
  );
}
