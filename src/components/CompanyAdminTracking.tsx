import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { io, Socket } from 'socket.io-client';
import L from 'leaflet';
import { MapPin, Loader2, AlertCircle, CheckCircle, XCircle, Bus, Building2 } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
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

// Custom bus icon
const busIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#27AE60" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="6" width="22" height="12" rx="2" ry="2"/>
      <path d="M1 10h22"/>
      <path d="M1 14h22"/>
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

interface CompanyAdminTrackingProps {
  scheduleId: string;
  routeFrom?: string;
  routeTo?: string;
  busPlate?: string;
  driverName?: string;
  onError?: (error: string) => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: string;
}

const mergeLocationHistory = (history: LocationData[], incoming: LocationData) => {
  const lastPoint = history[history.length - 1];
  if (
    lastPoint &&
    lastPoint.timestamp === incoming.timestamp &&
    lastPoint.latitude === incoming.latitude &&
    lastPoint.longitude === incoming.longitude
  ) {
    return history;
  }

  return [...history, incoming];
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Component to auto-center map on location updates
function MapUpdater({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

const CompanyAdminTracking: React.FC<CompanyAdminTrackingProps> = ({ 
  scheduleId,
  routeFrom,
  routeTo,
  busPlate,
  driverName,
  onError 
}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);

  // Fetch initial location and connect to socket
  useEffect(() => {
    const initializeTracking = async () => {
      try {
        setLoading(true);
        setConnectionStatus('connecting');
        
        const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!accessToken) {
          throw new Error('Authentication required');
        }

        // Fetch initial location from API
        const response = await fetch(
          `/api/tracking/schedule/${scheduleId}/location`,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to fetch location');
        }

        const data = await response.json();
        
        if (Array.isArray(data.history) && data.history.length > 0) {
          const history = data.history.map((point: LocationData) => ({
            latitude: point.latitude,
            longitude: point.longitude,
            speed: point.speed,
            heading: point.heading,
            timestamp: String(point.timestamp),
          }));
          setLocationHistory(history);
          setCurrentLocation(history[history.length - 1] || null);
        } else if (data.hasLocation && data.location) {
          const latestLocation = {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            speed: data.location.speed,
            heading: data.location.heading,
            timestamp: String(data.location.timestamp)
          };
          setLocationHistory([latestLocation]);
          setCurrentLocation(latestLocation);
        }

        // Initialize Socket.IO connection
        const socket = io(SOCKET_ORIGIN, {
          ...socketOptions,
          auth: { token: accessToken },
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('✅ Company Admin connected to tracking server');
          setConnectionStatus('connected');
          
          // Join the schedule room as company admin
          socket.emit('companyAdmin:joinSchedule', { scheduleId });
        });

        socket.on('companyAdmin:joinedSchedule', (data) => {
          console.log('✅ Company Admin successfully joined tracking:', data);
        });

        socket.on('bus:currentLocation', (data) => {
          console.log('📍 Received current location:', data);
          const latestLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            heading: data.heading,
            timestamp: String(data.timestamp)
          };
          setCurrentLocation(latestLocation);
          setLocationHistory((prev) => mergeLocationHistory(prev, latestLocation));
        });

        socket.on('bus:locationUpdate', (data) => {
          console.log('📍 Live location update:', data);
          const latestLocation = {
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed,
            heading: data.heading,
            timestamp: String(data.timestamp)
          };
          setCurrentLocation(latestLocation);
          setLocationHistory((prev) => mergeLocationHistory(prev, latestLocation));
        });

        socket.on('error', (data) => {
          console.error('❌ Socket error:', data);
          setError(data.message);
          setConnectionStatus('error');
          onError?.(data.message);
        });

        socket.on('disconnect', () => {
          console.log('🔌 Disconnected from tracking server');
          setConnectionStatus('connecting');
        });

        socket.on('connect_error', (err) => {
          console.error('❌ Connection error:', err);
          setConnectionStatus('connecting');
        });

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize tracking';
        console.error('❌ Error initializing tracking:', err);
        setError(errorMessage);
        setConnectionStatus('error');
        onError?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    initializeTracking();

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [scheduleId, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading tracking information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <h3 className="text-red-800 font-semibold">Tracking Error</h3>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const mapCenter: [number, number] = currentLocation 
    ? [currentLocation.latitude, currentLocation.longitude]
    : [-1.9441, 30.0619]; // Default to Kigali, Rwanda
  const polylinePositions = locationHistory.map((point) => [point.latitude, point.longitude] as [number, number]);

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-gray-900">
                {routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : 'Live Bus Tracking'}
              </h3>
              <div className="flex items-center gap-4 mt-1">
                {busPlate && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Bus:</span> {busPlate}
                  </p>
                )}
                {driverName && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Driver:</span> {driverName}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <>
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </>
            )}
            {connectionStatus === 'connecting' && (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Connecting...</span>
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                <XCircle className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Disconnected</span>
              </>
            )}
            {connectionStatus === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium text-red-700">Error</span>
              </>
            )}
          </div>
        </div>

        {/* Location Info */}
        {currentLocation && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Latitude</p>
              <p className="text-sm font-mono font-medium">{currentLocation.latitude.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Longitude</p>
              <p className="text-sm font-mono font-medium">{currentLocation.longitude.toFixed(6)}</p>
            </div>
            {currentLocation.speed !== null && (
              <div>
                <p className="text-xs text-gray-500">Speed</p>
                <p className="text-sm font-medium">{currentLocation.speed.toFixed(1)} km/h</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Last Update</p>
              <p className="text-sm font-medium">
                {new Date(currentLocation.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: '500px', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {polylinePositions.length > 1 && (
            <Polyline positions={polylinePositions} pathOptions={{ color: '#27AE60', weight: 4, opacity: 0.8 }} />
          )}

          {currentLocation && (
            <Marker 
              position={[currentLocation.latitude, currentLocation.longitude]}
              icon={busIcon}
            >
              <Popup>
                <div className="text-center">
                  <strong className="block mb-2">Company Bus</strong>
                  {busPlate && <p className="text-sm mb-1">Bus: {busPlate}</p>}
                  {driverName && <p className="text-sm mb-1">Driver: {driverName}</p>}
                  <p className="text-sm mb-1">
                    {routeFrom && routeTo ? `${routeFrom} → ${routeTo}` : 'Active Route'}
                  </p>
                  {currentLocation.speed !== null && (
                    <p className="text-xs text-gray-600">
                      Speed: {currentLocation.speed.toFixed(1)} km/h
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Updated: {new Date(currentLocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          <MapUpdater center={currentLocation ? [currentLocation.latitude, currentLocation.longitude] : null} />
        </MapContainer>
      </div>

      {!currentLocation && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-yellow-900 mb-1">Waiting for GPS Signal</h4>
              <p className="text-sm text-yellow-700">
                The driver hasn't started sharing their location yet. 
                The map will update automatically when they begin the trip.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyAdminTracking;

