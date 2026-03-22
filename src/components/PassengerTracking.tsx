import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from '@react-google-maps/api';
import { AlertCircle, Bus, Clock, Loader2, Navigation, RefreshCw, Route } from 'lucide-react';
import { socketOptions, SOCKET_ORIGIN } from '../utils/network';

interface PassengerTrackingProps {
  scheduleId: string;
  ticketId: string;
  routeFrom?: string;
  routeTo?: string;
  departureTime?: string | Date;
  arrivalTime?: string | Date;
  autoStart?: boolean;
}

interface BusLocation {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: string | number;
}

interface PassengerLocation {
  lat: number;
  lng: number;
}

interface TrackingSample extends BusLocation {
  latitude: number;
  longitude: number;
  timestamp: string | number;
}

const mergeLocationHistory = (history: google.maps.LatLngLiteral[], nextPoint: google.maps.LatLngLiteral) => {
  const lastPoint = history[history.length - 1];
  if (lastPoint && lastPoint.lat === nextPoint.lat && lastPoint.lng === nextPoint.lng) {
    return history;
  }

  return [...history, nextPoint];
};

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
type TrackingMode = 'idle' | 'live' | 'estimated';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const hasGoogleMapsKey = typeof GOOGLE_MAPS_API_KEY === 'string' && GOOGLE_MAPS_API_KEY.trim().length > 0;
const DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: -1.9441, lng: 30.0619 };
const DEFAULT_TRIP_DURATION_MINUTES = 90;
const DEFAULT_BUS_SPEED_KMH = 35;
const MIN_MOVING_SPEED_KMH = 5;
const KNOWN_LOCATIONS: Record<string, google.maps.LatLngLiteral> = {
  'kigali nyabugogo': { lat: -1.9423, lng: 30.0445 },
  nyabugogo: { lat: -1.9423, lng: 30.0445 },
  kigali: { lat: -1.9441, lng: 30.0619 },
  'mukoto rulindo': { lat: -1.7552, lng: 30.1162 },
  mukoto: { lat: -1.7552, lng: 30.1162 },
  rulindo: { lat: -1.7095, lng: 29.9949 },
};

const normalizeLocationName = (value?: string) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const parseDate = (value?: string | Date): Date | null => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const resolveAuthToken = () =>
  localStorage.getItem('accessToken') || localStorage.getItem('token') || '';

const parseTimestamp = (value: string | number | undefined) => {
  if (typeof value === 'number') return value;
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? null : parsed;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const calculateDistanceKm = (
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral
) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLat) * Math.cos(toLat) *
    Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const formatEta = (minutes: number | null) => {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) {
    return 'Calculating';
  }

  if (minutes < 1) return 'Less than 1 min';

  const roundedMinutes = Math.round(minutes);
  if (roundedMinutes < 60) return `${roundedMinutes} min`;

  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const formatArrivalTime = (minutes: number | null) => {
  if (minutes === null || !Number.isFinite(minutes) || minutes < 0) {
    return 'Waiting for live speed';
  }

  return new Date(Date.now() + minutes * 60 * 1000).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const estimatePosition = (
  from: google.maps.LatLngLiteral,
  to: google.maps.LatLngLiteral,
  departureTime?: string | Date,
  arrivalTime?: string | Date
): google.maps.LatLngLiteral => {
  const departure = parseDate(departureTime);
  const arrival = parseDate(arrivalTime);
  const now = Date.now();
  let progress = 0.2;

  if (departure && arrival && arrival.getTime() > departure.getTime()) {
    const total = arrival.getTime() - departure.getTime();
    const elapsed = now - departure.getTime();
    progress = Math.min(1, Math.max(0, elapsed / total));
  } else if (departure) {
    const total = DEFAULT_TRIP_DURATION_MINUTES * 60 * 1000;
    const elapsed = now - departure.getTime();
    progress = Math.min(1, Math.max(0, elapsed / total));
  }

  return {
    lat: from.lat + (to.lat - from.lat) * progress,
    lng: from.lng + (to.lng - from.lng) * progress,
  };
};

const PassengerTracking: React.FC<PassengerTrackingProps> = ({
  scheduleId,
  ticketId,
  routeFrom,
  routeTo,
  departureTime,
  arrivalTime,
  autoStart = true,
}) => {
  const [isTracking, setIsTracking] = useState(false);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [trackingSamples, setTrackingSamples] = useState<TrackingSample[]>([]);
  const [locationHistory, setLocationHistory] = useState<google.maps.LatLngLiteral[]>([]);
  const [estimatedLocation, setEstimatedLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('idle');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>(DEFAULT_CENTER);
  const [routeEndpoints, setRouteEndpoints] = useState<{
    from: google.maps.LatLngLiteral;
    to: google.maps.LatLngLiteral;
  } | null>(null);
  const [passengerLocation, setPassengerLocation] = useState<PassengerLocation | null>(null);
  const [passengerLocationError, setPassengerLocationError] = useState<string | null>(null);
  const [tripWaitingMessage, setTripWaitingMessage] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const estimateIntervalRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const geolocationWatchRef = useRef<number | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'passenger-tracking-map',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
  });

  const busIcon = useMemo(() => {
    return {
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="%230077B6"/><path d="M7 6h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v1.5a1 1 0 1 1-2 0V16h-4v1.5a1 1 0 1 1-2 0V16H7a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm1 2v3h8V8H8Zm1 5.25a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" fill="white"/></svg>',
    } as google.maps.Icon;
  }, [isTracking, busLocation, estimatedLocation]);

  const passengerIcon = useMemo(() => {
    return {
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFFFFF" stroke="%230077B6" stroke-width="2"/><circle cx="12" cy="9" r="3" fill="%230077B6"/><path d="M7.5 17.2a4.8 4.8 0 0 1 9 0" fill="none" stroke="%230077B6" stroke-width="2" stroke-linecap="round"/></svg>',
    } as google.maps.Icon;
  }, []);

  const stopIcon = useMemo(() => {
    return {
      url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FFFFFF" stroke="%230077B6" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="%230077B6"/></svg>',
    } as google.maps.Icon;
  }, []);

  const stopEstimateTimer = () => {
    if (estimateIntervalRef.current !== null) {
      window.clearInterval(estimateIntervalRef.current);
      estimateIntervalRef.current = null;
    }
  };

  const stopPollingTimer = () => {
    if (pollingIntervalRef.current !== null) {
      window.clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  const stopPassengerLocationWatcher = () => {
    if (geolocationWatchRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(geolocationWatchRef.current);
      geolocationWatchRef.current = null;
    }
  };

  const applyLocationSnapshot = (data: { history?: BusLocation[]; location?: BusLocation; hasLocation?: boolean; message?: string }) => {
    if (Array.isArray(data.history) && data.history.length > 0) {
      setTrackingSamples(data.history as TrackingSample[]);
      const history = data.history.map((point: BusLocation) => ({
        lat: point.latitude,
        lng: point.longitude,
      }));
      setLocationHistory(history);
    }

    if (data.hasLocation && data.location) {
      setBusLocation(data.location);
      setTrackingSamples((prev) => {
        const next = [...prev, data.location as TrackingSample];
        return next.filter((sample, index, collection) => {
          return collection.findIndex((candidate) => (
            candidate.timestamp === sample.timestamp &&
            candidate.latitude === sample.latitude &&
            candidate.longitude === sample.longitude
          )) === index;
        });
      });
      setTrackingMode('live');
      setTripWaitingMessage(null);
      setMapCenter({ lat: data.location.latitude, lng: data.location.longitude });
      setLastUpdateTime(new Date());
      stopEstimateTimer();
      return;
    }

    if (!data.hasLocation) {
      setTripWaitingMessage(data.message || 'Your bus has not started the trip yet.');
    }
  };

  const fetchLocationSnapshot = async (accessToken: string) => {
    const response = await fetch(`/api/tracking/schedule/${scheduleId}/location`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Failed to load bus history');
    }

    applyLocationSnapshot(data);
  };

  useEffect(() => {
    return () => {
      stopEstimateTimer();
      stopPollingTimer();
      stopPassengerLocationWatcher();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!autoStart || isTracking || !hasGoogleMapsKey) return;
    startTracking();
  }, [autoStart, isTracking]);

  useEffect(() => {
    if (!isTracking) {
      stopEstimateTimer();
      return;
    }

    const fromKey = normalizeLocationName(routeFrom);
    const toKey = normalizeLocationName(routeTo);
    const knownFrom = KNOWN_LOCATIONS[fromKey];
    const knownTo = KNOWN_LOCATIONS[toKey];
    if (knownFrom && knownTo) {
      setRouteEndpoints({ from: knownFrom, to: knownTo });
      return;
    }

    if (!isLoaded || !window.google?.maps || !routeFrom || !routeTo) {
      return;
    }

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: routeFrom }, (fromRes, fromStatus) => {
      if (fromStatus !== 'OK' || !fromRes?.[0]?.geometry?.location) return;
      geocoder.geocode({ address: routeTo }, (toRes, toStatus) => {
        if (toStatus !== 'OK' || !toRes?.[0]?.geometry?.location) return;
        const fromLoc = fromRes[0].geometry.location;
        const toLoc = toRes[0].geometry.location;
        setRouteEndpoints({
          from: { lat: fromLoc.lat(), lng: fromLoc.lng() },
          to: { lat: toLoc.lat(), lng: toLoc.lng() },
        });
      });
    });
  }, [isTracking, routeFrom, routeTo, isLoaded]);

  useEffect(() => {
    if (!isTracking || busLocation || !routeEndpoints) return;

    const updateEstimate = () => {
      const estimated = estimatePosition(routeEndpoints.from, routeEndpoints.to, departureTime, arrivalTime);
      setTrackingMode('estimated');
      setEstimatedLocation(estimated);
      setMapCenter(estimated);
      setLastUpdateTime(new Date());
    };

    updateEstimate();
    stopEstimateTimer();
    estimateIntervalRef.current = window.setInterval(updateEstimate, 15000);

    return () => stopEstimateTimer();
  }, [isTracking, busLocation, routeEndpoints, departureTime, arrivalTime]);

  useEffect(() => {
    if (!isTracking || !navigator.geolocation) {
      stopPassengerLocationWatcher();
      return;
    }

    setPassengerLocationError(null);
    geolocationWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setPassengerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setPassengerLocationError('Enable your location to calculate distance and ETA.');
      },
      {
        enableHighAccuracy: true,
        maximumAge: 15000,
        timeout: 10000,
      }
    );

    return () => stopPassengerLocationWatcher();
  }, [isTracking]);

  const markerPosition: google.maps.LatLngLiteral | null = busLocation
    ? { lat: busLocation.latitude, lng: busLocation.longitude }
    : estimatedLocation;

  const routePath = routeEndpoints ? [routeEndpoints.from, routeEndpoints.to] : [];
  const livePath = locationHistory;

  const passengerDistanceKm = useMemo(() => {
    if (!passengerLocation || !markerPosition) return null;
    return calculateDistanceKm(passengerLocation, markerPosition);
  }, [passengerLocation, markerPosition]);

  const inferredSpeedKmh = useMemo(() => {
    const latestSample = trackingSamples[trackingSamples.length - 1];
    const previousSample = trackingSamples[trackingSamples.length - 2];

    if (!latestSample || !previousSample) return null;

    const latestTimestamp = parseTimestamp(latestSample.timestamp);
    const previousTimestamp = parseTimestamp(previousSample.timestamp);
    if (latestTimestamp === null || previousTimestamp === null || latestTimestamp <= previousTimestamp) {
      return null;
    }

    const distanceKm = calculateDistanceKm(
      { lat: previousSample.latitude, lng: previousSample.longitude },
      { lat: latestSample.latitude, lng: latestSample.longitude }
    );

    if (distanceKm <= 0) return null;

    const elapsedHours = (latestTimestamp - previousTimestamp) / (1000 * 60 * 60);
    if (elapsedHours <= 0) return null;

    const speedKmh = distanceKm / elapsedHours;
    return Number.isFinite(speedKmh) && speedKmh >= MIN_MOVING_SPEED_KMH ? speedKmh : null;
  }, [trackingSamples]);

  const effectiveSpeedKmh = useMemo(() => {
    if (busLocation?.speed && busLocation.speed > 0) {
      return busLocation.speed;
    }

    if (inferredSpeedKmh && inferredSpeedKmh > 0) {
      return inferredSpeedKmh;
    }

    if (markerPosition) {
      return DEFAULT_BUS_SPEED_KMH;
    }

    return null;
  }, [busLocation?.speed, inferredSpeedKmh, markerPosition]);

  const etaSourceLabel = useMemo(() => {
    if (busLocation?.speed && busLocation.speed > 0) {
      return 'Using live bus speed';
    }

    if (inferredSpeedKmh && inferredSpeedKmh > 0) {
      return 'Using recent bus movement';
    }

    if (markerPosition) {
      return 'Using average city traffic speed';
    }

    return 'Waiting for live bus position';
  }, [busLocation?.speed, inferredSpeedKmh, markerPosition]);

  const etaMinutes = useMemo(() => {
    if (!passengerDistanceKm || !effectiveSpeedKmh || effectiveSpeedKmh <= 0) {
      return null;
    }

    return (passengerDistanceKm / effectiveSpeedKmh) * 60;
  }, [passengerDistanceKm, effectiveSpeedKmh]);

  const startTracking = () => {
    try {
      setError(null);
      setIsTracking(true);
      setTrackingMode('idle');
      setEstimatedLocation(null);
      setTripWaitingMessage(null);

      const accessToken = resolveAuthToken();
      if (!accessToken) {
        throw new Error('Authentication required');
      }

      void fetchLocationSnapshot(accessToken)
        .catch((loadError) => {
          console.warn('Passenger tracking history load failed:', loadError);
        });

      stopPollingTimer();
      pollingIntervalRef.current = window.setInterval(() => {
        void fetchLocationSnapshot(accessToken).catch((pollError) => {
          console.warn('Passenger tracking poll failed:', pollError);
        });
      }, 5000);

      const socket = io(SOCKET_ORIGIN, {
        ...socketOptions,
        auth: { token: accessToken },
      });

      setConnectionStatus('connecting');

      socket.on('connect', () => {
        setConnectionStatus('connected');
        socket.emit('passenger:joinSchedule', { scheduleId, ticketId });
      });

      socket.on('bus:currentLocation', (data: BusLocation) => {
        setBusLocation(data);
        setTrackingSamples((prev) => [...prev, data as TrackingSample]);
        setLocationHistory((prev) => mergeLocationHistory(prev, { lat: data.latitude, lng: data.longitude }));
        setTrackingMode('live');
        setTripWaitingMessage(null);
        setLastUpdateTime(new Date());
        setMapCenter({ lat: data.latitude, lng: data.longitude });
        stopEstimateTimer();
      });

      socket.on('bus:locationUpdate', (data: BusLocation) => {
        setBusLocation(data);
        setTrackingSamples((prev) => [...prev, data as TrackingSample]);
        setLocationHistory((prev) => mergeLocationHistory(prev, { lat: data.latitude, lng: data.longitude }));
        setTrackingMode('live');
        setTripWaitingMessage(null);
        setLastUpdateTime(new Date());
        setMapCenter({ lat: data.latitude, lng: data.longitude });
        stopEstimateTimer();
      });

      socket.on('disconnect', () => {
        setConnectionStatus('disconnected');
      });

      socket.on('error', (data: { message: string }) => {
        setError(data.message);
        setConnectionStatus('error');
      });

      socketRef.current = socket;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsTracking(false);
    }
  };

  const stopTracking = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsTracking(false);
    setTrackingMode('idle');
    setConnectionStatus('disconnected');
    setBusLocation(null);
    setTrackingSamples([]);
    setLocationHistory([]);
    setEstimatedLocation(null);
    setTripWaitingMessage(null);
    stopEstimateTimer();
    stopPollingTimer();
    stopPassengerLocationWatcher();
    setLastUpdateTime(null);
    setMapCenter(DEFAULT_CENTER);
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'connecting':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'disconnected':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      case 'error':
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }
  };

  const getConnectionLabel = () => {
    if (connectionStatus === 'connected') {
      if (lastUpdateTime && Date.now() - lastUpdateTime.getTime() < 15000) {
        return 'Updating';
      }
      return 'Connected';
    }

    if (connectionStatus === 'connecting') return 'Connecting';
    if (connectionStatus === 'error') return 'Connection issue';
    return 'Disconnected';
  };

  const formatTimeDifference = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white/95 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <div className="bg-[linear-gradient(135deg,#031b34_0%,#0077B6_60%,#6ec5f0_100%)] px-5 py-6 text-white lg:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-50">
              <Bus className="h-4 w-4" /> Live Bus Tracking
            </div>
            <h2 className="mt-4 text-3xl font-black leading-tight lg:text-4xl">Follow your journey in real time</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-sky-50/90">Monitor the bus location, your distance to it, trip progress, and the latest update state from the driver.</p>
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] ${getConnectionStatusColor()}`}>
            <span className="h-2.5 w-2.5 rounded-full bg-current" />
            {getConnectionLabel()}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <TrackingMetricCard
            label="Distance to you"
            value={passengerDistanceKm !== null ? `${passengerDistanceKm.toFixed(1)} km` : 'Waiting'}
            description="Measured from your current device location"
            tone="light"
          />
          <TrackingMetricCard
            label="Estimated arrival"
            value={formatEta(etaMinutes)}
            description={etaSourceLabel}
            tone="light"
          />
          <TrackingMetricCard
            label="Arrival time"
            value={formatArrivalTime(etaMinutes)}
            description="Adjusted automatically while the trip is active"
            tone="light"
          />
          <TrackingMetricCard
            label="Last update"
            value={lastUpdateTime ? formatTimeDifference(lastUpdateTime) : 'Waiting'}
            description={trackingMode === 'estimated' ? 'Using estimated route position' : 'Using live driver updates'}
            tone="light"
          />
        </div>
      </div>

      {error && (
        <div className="mx-5 mt-5 flex items-start gap-2 rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 lg:mx-6">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!hasGoogleMapsKey && (
        <div className="mx-5 mt-5 flex items-start gap-2 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 lg:mx-6">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>
            Missing Google Maps key. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> in frontend <code>.env</code>.
          </p>
        </div>
      )}

      {isTracking ? (
        <div className="mx-5 mt-5 lg:mx-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-slate-50/70">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 sm:px-5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Journey map</div>
                  <div className="mt-1 text-lg font-black text-slate-950">{routeFrom || 'Departure'} to {routeTo || 'Destination'}</div>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.2em] ${getConnectionStatusColor()}`}>
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  {getConnectionLabel()}
                </div>
              </div>

              {tripWaitingMessage && !markerPosition && (
                <div className="mx-4 mt-4 rounded-[22px] border border-amber-200 bg-amber-50 p-4 sm:mx-5">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold text-amber-900">Your bus has not started the trip yet.</p>
                      <p className="mt-1 text-sm leading-6 text-amber-800">{tripWaitingMessage} We will keep checking for the first live location.</p>
                    </div>
                  </div>
                </div>
              )}

              {passengerLocationError && (
                <div className="mx-4 mt-4 rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 sm:mx-5">
                  {passengerLocationError}
                </div>
              )}

              {hasGoogleMapsKey ? (
                <div className="relative p-4 sm:p-5">
                  {!isLoaded ? (
                    <div className="flex h-[360px] items-center justify-center rounded-[24px] bg-white sm:h-[520px]">
                      <Loader2 className="h-8 w-8 animate-spin text-[#0077B6]" />
                    </div>
                  ) : (
                    <GoogleMap
                      mapContainerStyle={{ height: window.innerWidth < 640 ? '360px' : '520px', width: '100%' }}
                      center={markerPosition || mapCenter}
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
                      {livePath.length > 1 && (
                        <PolylineF
                          path={livePath}
                          options={{
                            strokeColor: '#0077B6',
                            strokeOpacity: 0.92,
                            strokeWeight: 5,
                          }}
                        />
                      )}
                      {livePath.length <= 1 && routePath.length === 2 && (
                        <PolylineF
                          path={routePath}
                          options={{
                            strokeColor: '#5AB5E8',
                            strokeOpacity: 0.7,
                            strokeWeight: 4,
                          }}
                        />
                      )}
                      {routeEndpoints && <MarkerF position={routeEndpoints.from} icon={stopIcon} />}
                      {routeEndpoints && <MarkerF position={routeEndpoints.to} icon={stopIcon} />}
                      {passengerLocation && <MarkerF position={passengerLocation} icon={passengerIcon} />}
                      {markerPosition && <MarkerF position={markerPosition} icon={busIcon} />}
                    </GoogleMap>
                  )}

                  <div className="pointer-events-none absolute inset-x-8 bottom-8 z-[1000] rounded-[24px] border border-white/70 bg-white/92 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.14)] backdrop-blur sm:inset-x-10">
                    <div className="flex flex-wrap items-center gap-4">
                      <LegendItem colorClassName="bg-[#0077B6]" label="Live bus" />
                      <LegendItem colorClassName="bg-white border border-[#0077B6]" label="Passenger" />
                      <LegendItem colorClassName="bg-[#5AB5E8]" label="Route guide" />
                      <LegendItem colorClassName="bg-slate-300" label="Stops" />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <TrackingMetricCard label="ETA" value={formatEta(etaMinutes)} description="Estimated from current live position" />
                      <TrackingMetricCard label="Distance" value={passengerDistanceKm !== null ? `${passengerDistanceKm.toFixed(1)} km` : 'Waiting'} description="Bus distance from your device" />
                      <TrackingMetricCard label="Speed" value={effectiveSpeedKmh !== null ? `${effectiveSpeedKmh.toFixed(1)} km/h` : 'Waiting'} description={busLocation?.speed ? 'Live reported speed' : 'Estimated for ETA calculations'} />
                      <TrackingMetricCard label="Status" value={trackingMode === 'estimated' ? 'Estimated' : 'Live'} description={lastUpdateTime ? `Updated ${formatTimeDifference(lastUpdateTime)}` : 'Waiting for updates'} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#0077B6]/10 text-[#0077B6]">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Trip route</div>
                    <div className="mt-1 text-lg font-black text-slate-950">{routeFrom || 'Departure'} to {routeTo || 'Destination'}</div>
                  </div>
                </div>
                <div className="mt-5 space-y-4">
                  <StopRow label="Boarding" value={routeFrom || 'Departure stop'} />
                  <StopRow label="Drop-off" value={routeTo || 'Arrival stop'} />
                  <StopRow label="Tracking mode" value={trackingMode === 'estimated' ? 'Estimated position' : trackingMode === 'live' ? 'Live GPS updates' : 'Waiting to start'} />
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#0077B6]/10 text-[#0077B6]">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#0077B6]">Live status</div>
                    <div className="mt-1 text-lg font-black text-slate-950">Operational details</div>
                  </div>
                </div>
                <div className="mt-5 space-y-4 text-sm text-slate-600">
                  <StopRow label="Connection" value={getConnectionLabel()} />
                  <StopRow label="Last update" value={lastUpdateTime ? lastUpdateTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Waiting for location'} />
                  <StopRow label="ETA source" value={etaSourceLabel} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 py-10 lg:px-6 lg:py-12">
          <div className="mx-auto max-w-3xl rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 text-center shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#0077B6]/10 text-[#0077B6]">
              <Navigation className="h-10 w-10" />
            </div>
            <h3 className="mt-6 text-2xl font-black text-slate-950">Track your bus in real time</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">Start the live tracking session to see the bus on the map, your location relative to it, and a continuously updated ETA.</p>
            <button
              onClick={startTracking}
              disabled={!hasGoogleMapsKey}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0077B6] px-8 py-3.5 text-sm font-bold text-white shadow-[0_18px_36px_rgba(0,119,182,0.24)] transition hover:bg-[#005F8E] disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Bus className="h-5 w-5" />
              Start Tracking
            </button>
          </div>
        </div>
      )}

      {isTracking && (
        <div className="flex flex-col gap-3 border-t border-slate-200/80 px-5 py-5 sm:flex-row lg:px-6">
          <button
            onClick={stopTracking}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <AlertCircle className="h-4 w-4" />
            Stop Tracking
          </button>
          <button
            onClick={() => {
              if (!markerPosition) return;
              setMapCenter(markerPosition);
              mapRef.current?.panTo(markerPosition);
            }}
            disabled={!markerPosition}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0077B6] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#005F8E] disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            <RefreshCw className="h-5 w-5" />
            Re-center
          </button>
        </div>
      )}

      {!isTracking && (
        <div className="border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 lg:px-6">
          <p className="text-center text-sm text-slate-600">
            <strong>Note:</strong> Tracking is available for active trips linked to your confirmed ticket.
          </p>
        </div>
      )}
    </div>
  );
};

function TrackingMetricCard({
  label,
  value,
  description,
  tone = 'default',
}: {
  label: string;
  value: string;
  description: string;
  tone?: 'default' | 'light';
}) {
  const className = tone === 'light'
    ? 'rounded-[22px] border border-white/15 bg-white/10 p-4 backdrop-blur-sm'
    : 'rounded-[20px] border border-slate-200/80 bg-white p-4';
  const labelClassName = tone === 'light'
    ? 'text-sky-50/90'
    : 'text-slate-400';
  const valueClassName = tone === 'light'
    ? 'text-white'
    : 'text-slate-950';
  const descriptionClassName = tone === 'light'
    ? 'text-sky-50/80'
    : 'text-slate-500';

  return (
    <div className={className}>
      <div className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${labelClassName}`}>{label}</div>
      <div className={`mt-3 text-2xl font-black ${valueClassName}`}>{value}</div>
      <div className={`mt-2 text-xs leading-5 ${descriptionClassName}`}>{description}</div>
    </div>
  );
}

function LegendItem({ colorClassName, label }: { colorClassName: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
      <span className={`h-3 w-3 rounded-full ${colorClassName}`} />
      {label}
    </div>
  );
}

function StopRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className="mt-2 text-sm font-black text-slate-900">{value}</div>
    </div>
  );
}

export default PassengerTracking;
