import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';
import { MapPin, Navigation, Play, Square, Clock, Activity } from 'lucide-react';

const SAFARITIX = {
  primary: '#0077B6',
  success: '#27AE60',
  danger: '#E63946',
  warning: '#F59E0B',
};

interface Trip {
  id: string;
  bus: {
    id: string;
    plateNumber: string;
    model: string;
  };
  trip_status: string;
  started_at: string;
  last_update: string;
}

export default function DriverTracking() {
  const { accessToken } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number; speed: number } | null>(null);
  const [error, setError] = useState<string>('');
  const [busId, setBusId] = useState<string>('');
  const [locationInterval, setLocationInterval] = useState<NodeJS.Timeout | null>(null);
  const API_URL = import.meta.env.VITE_API_URL || 'https://backend-v2-wjcs.onrender.com/api';

  // Check for active trip on mount
  useEffect(() => {
    checkTripStatus();
  }, []);

  const checkTripStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/tracking/driver/trip/status`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch trip status');

      const data = await response.json();
      if (data.success && data.hasActiveTrip) {
        setCurrentTrip(data.trip);
        setBusId(data.trip.bus.id);
        setIsTracking(true);
        startLocationTracking(data.trip.bus.id);
      }
    } catch (err: any) {
      console.error('Error checking trip status:', err);
    }
  };

  const requestLocationPermission = async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return false;
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          setError('');
          resolve(true);
        },
        (err) => {
          setError(`Location permission denied: ${err.message}`);
          resolve(false);
        },
        { enableHighAccuracy: true }
      );
    });
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; speed: number }> => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed || 0,
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 5000,
        }
      );
    });
  };

  const sendLocationUpdate = async (busId: string, latitude: number, longitude: number, speed: number) => {
    try {
      const response = await fetch(`${API_URL}/tracking/driver/location`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bus_id: busId,
          latitude,
          longitude,
          speed: Math.max(0, speed * 3.6), // Convert m/s to km/h
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update location');
      }

      console.log('Location updated successfully');
    } catch (err: any) {
      console.error('Error sending location:', err);
      setError(`Failed to update location: ${err.message}`);
    }
  };

  const startLocationTracking = (bus_id: string) => {
    // Clear any existing interval
    if (locationInterval) {
      clearInterval(locationInterval);
    }

    // Send location immediately
    getCurrentLocation().then((loc) => {
      setLocation(loc);
      sendLocationUpdate(bus_id, loc.latitude, loc.longitude, loc.speed);
    }).catch(console.error);

    // Setup interval to send location every 10 seconds
    const interval = setInterval(async () => {
      try {
        const loc = await getCurrentLocation();
        setLocation(loc);
        await sendLocationUpdate(bus_id, loc.latitude, loc.longitude, loc.speed);
      } catch (err) {
        console.error('Error getting location:', err);
      }
    }, 10000); // 10 seconds

    setLocationInterval(interval);
  };

  const handleStartTrip = async () => {
    if (!busId) {
      setError('Please enter Bus ID');
      return;
    }

    setError('');

    // Request location permission
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return;
    }

    try {
      // Get current location
      const currentLoc = await getCurrentLocation();
      setLocation(currentLoc);

      // Start trip on server
      const response = await fetch(`${API_URL}/tracking/driver/trip/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bus_id: busId,
          latitude: currentLoc.latitude,
          longitude: currentLoc.longitude,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start trip');
      }

      const data = await response.json();
      console.log('Trip started:', data);

      setIsTracking(true);
      startLocationTracking(busId);
      
      // Check trip status to get full trip info
      await checkTripStatus();

      alert('✅ Trip started! Your location is now being tracked.');
    } catch (err: any) {
      console.error('Error starting trip:', err);
      setError(`Failed to start trip: ${err.message}`);
      alert(`❌ ${err.message}`);
    }
  };

  const handleEndTrip = async () => {
    if (!busId) return;

    const confirmed = window.confirm('Are you sure you want to end this trip?');
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/tracking/driver/trip/end`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bus_id: busId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end trip');
      }

      // Stop location tracking
      if (locationInterval) {
        clearInterval(locationInterval);
        setLocationInterval(null);
      }

      setIsTracking(false);
      setCurrentTrip(null);
      setLocation(null);
      setError('');

      alert('✅ Trip ended successfully!');
    } catch (err: any) {
      console.error('Error ending trip:', err);
      setError(`Failed to end trip: ${err.message}`);
      alert(`❌ ${err.message}`);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Navigation size={28} color={SAFARITIX.primary} />
          Trip Tracking
        </h1>
        <p style={styles.subtitle}>Start/End your trip and track your location</p>
      </div>

      {error && (
        <div style={styles.errorBanner}>
          ⚠️ {error}
        </div>
      )}

      {/* Trip Status Card */}
      <div style={styles.statusCard}>
        <div style={styles.statusHeader}>
          <div style={styles.statusIndicator}>
            <Activity size={20} color={isTracking ? SAFARITIX.success : '#94A3B8'} />
            <span style={{ fontWeight: '600', color: isTracking ? SAFARITIX.success : '#64748B' }}>
              {isTracking ? 'TRIP ACTIVE' : 'NO ACTIVE TRIP'}
            </span>
          </div>
          {isTracking && location && (
            <div style={styles.locationBadge}>
              <MapPin size={14} />
              <span style={{ fontSize: '12px' }}>Live Tracking</span>
            </div>
          )}
        </div>

        {currentTrip && (
          <div style={styles.tripInfo}>
            <div style={styles.tripDetail}>
              <span style={styles.tripLabel}>Bus:</span>
              <span style={styles.tripValue}>{currentTrip.bus.plateNumber} - {currentTrip.bus.model}</span>
            </div>
            <div style={styles.tripDetail}>
              <span style={styles.tripLabel}>Started:</span>
              <span style={styles.tripValue}>{new Date(currentTrip.started_at).toLocaleString()}</span>
            </div>
            <div style={styles.tripDetail}>
              <span style={styles.tripLabel}>Last Update:</span>
              <span style={styles.tripValue}>{new Date(currentTrip.last_update).toLocaleString()}</span>
            </div>
          </div>
        )}

        {!isTracking && (
          <div style={styles.startForm}>
            <label style={styles.inputLabel}>Bus ID</label>
            <input
              type="text"
              placeholder="Enter your bus ID"
              value={busId}
              onChange={(e) => setBusId(e.target.value)}
              style={styles.input}
            />
            <p style={styles.hint}>
              💡 Get your Bus ID from the company admin or bus assignment list
            </p>
          </div>
        )}
      </div>

      {/* Location Info */}
      {location && isTracking && (
        <div style={styles.locationCard}>
          <h3 style={styles.cardTitle}>Current Location</h3>
          <div style={styles.locationGrid}>
            <div style={styles.locationItem}>
              <span style={styles.locationLabel}>Latitude</span>
              <span style={styles.locationValue}>{location.latitude.toFixed(6)}°</span>
            </div>
            <div style={styles.locationItem}>
              <span style={styles.locationLabel}>Longitude</span>
              <span style={styles.locationValue}>{location.longitude.toFixed(6)}°</span>
            </div>
            <div style={styles.locationItem}>
              <span style={styles.locationLabel}>Speed</span>
              <span style={styles.locationValue}>{(location.speed * 3.6).toFixed(1)} km/h</span>
            </div>
          </div>
          <p style={styles.updateInfo}>
            <Clock size={14} />
            Updating every 10 seconds
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div style={styles.buttonGroup}>
        {!isTracking ? (
          <button onClick={handleStartTrip} style={styles.startButton}>
            <Play size={20} />
            Start Trip
          </button>
        ) : (
          <button onClick={handleEndTrip} style={styles.endButton}>
            <Square size={20} />
            End Trip
          </button>
        )}
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600' }}>📋 Instructions:</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.8' }}>
          <li>Enter your Bus ID before starting the trip</li>
          <li>Allow location access when prompted</li>
          <li>Keep the app open during the trip for accurate tracking</li>
          <li>Your location will be sent every 10 seconds</li>
          <li>End the trip when you reach your destination</li>
        </ul>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B7280',
  },
  errorBanner: {
    background: '#FEE2E2',
    color: '#991B1B',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  statusCard: {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
  },
  locationBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    background: '#DCFCE7',
    color: SAFARITIX.success,
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  tripInfo: {
    background: '#F9FAFB',
    padding: '16px',
    borderRadius: '8px',
  },
  tripDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #E5E7EB',
  },
  tripLabel: {
    fontSize: '13px',
    color: '#6B7280',
    fontWeight: '500',
  },
  tripValue: {
    fontSize: '13px',
    color: '#111827',
    fontWeight: '600',
  },
  startForm: {
    marginTop: '16px',
  },
  inputLabel: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '8px',
    marginBottom: 0,
  },
  locationCard: {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '16px',
  },
  locationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '12px',
  },
  locationItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  locationLabel: {
    fontSize: '12px',
    color: '#6B7280',
    fontWeight: '500',
  },
  locationValue: {
    fontSize: '16px',
    color: '#111827',
    fontWeight: '600',
  },
  updateInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#6B7280',
    marginTop: '12px',
    marginBottom: 0,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
  },
  startButton: {
    flex: 1,
    padding: '14px 24px',
    background: SAFARITIX.success,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  endButton: {
    flex: 1,
    padding: '14px 24px',
    background: SAFARITIX.danger,
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  instructions: {
    background: '#F0F9FF',
    border: '1px solid #BAE6FD',
    borderRadius: '8px',
    padding: '16px',
    color: '#075985',
  },
};
