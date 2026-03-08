import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { AlertCircle, CheckCircle, Loader2, MapPin, Navigation, XCircle } from 'lucide-react';
import { apiUrl, socketOptions, SOCKET_ORIGIN } from '../utils/network';

interface DriverTrackingProps {
  scheduleId: string;
  initialStatus?: 'scheduled' | 'in_progress' | 'completed';
  onTripStarted?: () => void;
  onTripEnded?: () => void;
}

interface LocationData {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

type TripStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const hasGoogleMapsKey = typeof GOOGLE_MAPS_API_KEY === 'string' && GOOGLE_MAPS_API_KEY.trim().length > 0;
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: -1.9441, lng: 30.0619 };
const LOCATION_EMIT_INTERVAL_MS = 5000;

const DriverTracking: React.FC<DriverTrackingProps> = ({
  scheduleId,
  initialStatus = 'scheduled',
  onTripStarted,
  onTripEnded,
}) => {
  const mapBackendStatus = (status: string): TripStatus => {
    switch (status) {
      case 'in_progress':
        return 'ACTIVE';
      case 'completed':
        return 'COMPLETED';
      default:
        return 'PENDING';
    }
  };

  const [tripStatus, setTripStatus] = useState<TripStatus>(mapBackendStatus(initialStatus));
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<google.maps.LatLngLiteral[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const latestLocationRef = useRef<LocationData | null>(null);
  const sendIntervalRef = useRef<number | null>(null);
  const rejoinTimeoutRef = useRef<number | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'driver-tracking-map',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  const busIcon = useMemo(() => ({
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="%230077B6"/><path d="M7 6h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v1.5a1 1 0 1 1-2 0V16h-4v1.5a1 1 0 1 1-2 0V16H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm1 2v3h8V8H8Zm1 5.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" fill="white"/></svg>',
  } as google.maps.Icon), []);

  const getAuthToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token');

  const upsertHistoryPoint = (locationData: LocationData) => {
    setLocationHistory((prev) => {
      const nextPoint = { lat: locationData.latitude, lng: locationData.longitude };
      const lastPoint = prev[prev.length - 1];
      if (lastPoint && lastPoint.lat === nextPoint.lat && lastPoint.lng === nextPoint.lng) {
        return prev;
      }
      return [...prev, nextPoint].slice(-100);
    });
  };

  const applyLocationSample = (locationData: LocationData) => {
    latestLocationRef.current = locationData;
    setCurrentLocation(locationData);
    upsertHistoryPoint(locationData);
  };

  const requestSingleLocation = () => new Promise<LocationData>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
      },
      (geoError) => reject(geoError),
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  });

  const fetchLatestStoredLocation = async (accessToken: string) => {
    try {
      const response = await fetch(apiUrl(`/api/tracking/schedule/${scheduleId}/location`), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (Array.isArray(data.history) && data.history.length > 0) {
        const history = data.history.map((point: any) => ({
          latitude: point.latitude,
          longitude: point.longitude,
          speed: point.speed,
          heading: point.heading,
          timestamp: Number(new Date(point.timestamp)),
        }));

        const latest = history[history.length - 1] || null;
        if (latest) {
          latestLocationRef.current = latest;
          setCurrentLocation(latest);
          setLocationHistory(history.map((point) => ({ lat: point.latitude, lng: point.longitude })));
        }
      } else if (data.hasLocation && data.location) {
        const latest = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          speed: data.location.speed,
          heading: data.location.heading,
          timestamp: Number(new Date(data.location.timestamp)),
        };
        latestLocationRef.current = latest;
        setCurrentLocation(latest);
        setLocationHistory([{ lat: latest.latitude, lng: latest.longitude }]);
      }
    } catch (loadError) {
      console.error('Failed to load latest stored location:', loadError);
    }
  };

  const persistLocationUpdate = async (locationData: LocationData) => {
    const accessToken = getAuthToken();
    if (!accessToken) {
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/tracking/driver/location'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scheduleId,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          speed: locationData.speed !== null ? Math.max(0, locationData.speed * 3.6) : null,
          heading: locationData.heading,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update location');
      }

      setError(null);

      if (data.location) {
        applyLocationSample({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          speed: data.location.speed,
          heading: data.location.heading,
          timestamp: Number(new Date(data.location.recorded_at)),
        });
      }
    } catch (persistError) {
      const message = persistError instanceof Error ? persistError.message : 'Failed to update location';
      setError(message);
      console.error('Failed to persist GPS update:', persistError);
    }
  };

  const stopLocationTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (sendIntervalRef.current !== null) {
      window.clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }

    if (rejoinTimeoutRef.current !== null) {
      window.clearTimeout(rejoinTimeoutRef.current);
      rejoinTimeoutRef.current = null;
    }
  };

  const initializeSocket = (accessToken: string) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const socket = io(SOCKET_ORIGIN, {
      ...socketOptions,
      auth: { token: accessToken },
    });

    setConnectionStatus('connecting');

    socket.on('connect', () => {
      setError(null);
      setConnectionStatus('connected');
      socket.emit('driver:joinSchedule', { scheduleId });
    });

    socket.on('driver:joinedSchedule', () => {
      setError(null);
      setConnectionStatus('connected');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('connecting');
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionStatus('connecting');
    });

    socket.io.on('reconnect', () => {
      setError(null);
      setConnectionStatus('connected');
      socket.emit('driver:joinSchedule', { scheduleId });
    });

    socket.on('connect_error', (connectError) => {
      console.error('Driver tracking socket connection error:', connectError);
      setConnectionStatus('connecting');
    });

    socket.on('error', (data: { message: string }) => {
      setError(data.message);
      setConnectionStatus('error');

      if (rejoinTimeoutRef.current !== null) {
        window.clearTimeout(rejoinTimeoutRef.current);
      }

      rejoinTimeoutRef.current = window.setTimeout(() => {
        if (socket.connected) {
          setConnectionStatus('connecting');
          socket.emit('driver:joinSchedule', { scheduleId });
        }
      }, 2000);
    });

    socketRef.current = socket;
  };

  const startLocationTracking = (persistImmediately = true) => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    stopLocationTracking();

    if (persistImmediately) {
      requestSingleLocation()
        .then((initialLocation) => {
          applyLocationSample(initialLocation);
          void persistLocationUpdate(initialLocation);
        })
        .catch((geoError: GeolocationPositionError | Error) => {
          setError(`Location error: ${geoError.message}`);
        });
    }

    sendIntervalRef.current = window.setInterval(() => {
      if (latestLocationRef.current) {
        void persistLocationUpdate(latestLocationRef.current);
      }
    }, LOCATION_EMIT_INTERVAL_MS);

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        applyLocationSample({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
      },
      (geoError) => {
        setError(`Location error: ${geoError.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000,
      }
    );

    watchIdRef.current = watchId;
  };

  useEffect(() => {
    const accessToken = getAuthToken();
    if (!accessToken || tripStatus !== 'ACTIVE') {
      return;
    }

    void fetchLatestStoredLocation(accessToken);
    initializeSocket(accessToken);
    startLocationTracking(true);
  }, []);

  useEffect(() => () => {
    stopLocationTracking();
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const startTrip = async () => {
    try {
      setIsStarting(true);
      setError(null);

      const accessToken = getAuthToken();
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const initialLocation = await requestSingleLocation();
      applyLocationSample(initialLocation);

      const response = await fetch(apiUrl('/api/tracking/driver/trip/start'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          scheduleId,
          latitude: initialLocation.latitude,
          longitude: initialLocation.longitude,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to start trip');
      }

      setTripStatus('ACTIVE');
      setConnectionStatus('connecting');
      setLocationHistory([]);

      if (data.location) {
        applyLocationSample({
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          speed: data.location.speed,
          heading: data.location.heading,
          timestamp: Number(new Date(data.location.recorded_at)),
        });
      }

      onTripStarted?.();
      initializeSocket(accessToken);
      startLocationTracking(false);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Failed to start trip');
    } finally {
      setIsStarting(false);
    }
  };

  const endTrip = async () => {
    try {
      setIsEnding(true);
      setError(null);

      stopLocationTracking();

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      const accessToken = getAuthToken();
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(apiUrl('/api/tracking/driver/trip/end'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ scheduleId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to end trip');
      }

      setTripStatus('COMPLETED');
      setConnectionStatus('disconnected');
      setCurrentLocation(null);
      setLocationHistory([]);
      latestLocationRef.current = null;
      onTripEnded?.();
    } catch (endError) {
      setError(endError instanceof Error ? endError.message : 'Failed to end trip');
      const accessToken = getAuthToken();
      if (accessToken) {
        initializeSocket(accessToken);
        startLocationTracking(true);
      }
    } finally {
      setIsEnding(false);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5" />;
      case 'connecting':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      case 'disconnected':
        return <XCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Navigation className="w-6 h-6" />
        Live GPS Tracking
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {tripStatus === 'ACTIVE' && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Connection Status:</span>
            <div className={`flex items-center gap-2 ${getConnectionStatusColor()}`}>
              {getConnectionStatusIcon()}
              <span className="text-sm font-semibold capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>
      )}

      {tripStatus === 'ACTIVE' && (
        <div className="mb-4 rounded-lg overflow-hidden border border-blue-100">
          {!hasGoogleMapsKey ? (
            <div className="p-4 bg-amber-50 text-amber-800 text-sm">
              Missing Google Maps key. Add VITE_GOOGLE_MAPS_API_KEY in frontend .env.
            </div>
          ) : !isLoaded ? (
            <div className="p-6 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '320px' }}
              center={
                currentLocation
                  ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
                  : DEFAULT_CENTER
              }
              zoom={14}
              onLoad={(mapInstance) => {
                mapRef.current = mapInstance;
              }}
              options={{
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
              }}
            >
              {locationHistory.length > 1 && (
                <PolylineF
                  path={locationHistory}
                  options={{
                    strokeColor: '#1D4ED8',
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                  }}
                />
              )}
              {currentLocation && (
                <MarkerF
                  position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
                  icon={busIcon}
                />
              )}
            </GoogleMap>
          )}
        </div>
      )}

      {currentLocation && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Current Location</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Latitude:</span>
              <p className="font-mono font-medium">{currentLocation.latitude.toFixed(6)}</p>
            </div>
            <div>
              <span className="text-gray-600">Longitude:</span>
              <p className="font-mono font-medium">{currentLocation.longitude.toFixed(6)}</p>
            </div>
            {currentLocation.speed !== null && (
              <div>
                <span className="text-gray-600">Speed:</span>
                <p className="font-medium">{(currentLocation.speed * 3.6).toFixed(1)} km/h</p>
              </div>
            )}
            {currentLocation.heading !== null && (
              <div>
                <span className="text-gray-600">Heading:</span>
                <p className="font-medium">{currentLocation.heading.toFixed(0)} deg</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {tripStatus !== 'ACTIVE' ? (
          <button
            onClick={startTrip}
            disabled={isStarting || tripStatus === 'COMPLETED'}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {isStarting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Starting Trip...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                Start Trip
              </>
            )}
          </button>
        ) : (
          <button
            onClick={endTrip}
            disabled={isEnding}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {isEnding ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ending Trip...
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                End Trip
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
        {tripStatus === 'PENDING' && <p>Click "Start Trip" to begin sharing your location with passengers.</p>}
        {tripStatus === 'ACTIVE' && (
          <p>Your location is being shared with passengers. Click "End Trip" when the journey is complete.</p>
        )}
        {tripStatus === 'COMPLETED' && <p className="text-green-700 font-medium">Trip completed successfully.</p>}
      </div>
    </div>
  );
};

export default DriverTracking;
