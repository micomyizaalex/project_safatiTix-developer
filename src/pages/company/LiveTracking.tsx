import { useState, useEffect, useRef, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { MapPin, Navigation, Clock, Users, Bus as BusIcon, Activity } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

interface BusData {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  seatLayout: string;
  driverId: string | null;
  status: string;
}

interface DriverData {
  id: string;
  name: string;
  license: string;
  phone: string;
  available: boolean;
  buses: any[];
}

interface TicketData {
  id: string;
  status: string;
  scheduleDate: string;
  busPlateNumber: string;
}

interface BusLocation {
  id: string;
  plateNumber: string;
  model: string;
  driverName: string;
  currentRoute: string;
  status: 'active' | 'idle' | 'maintenance';
  latitude: number;
  longitude: number;
  speed: number;
  lastUpdate: string;
  passengers: number;
  capacity: number;
}

// Mapbox token - replace with your own from https://account.mapbox.com/
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const hasMapboxToken = typeof MAPBOX_TOKEN === 'string' && MAPBOX_TOKEN.trim().length > 0;
export default function LiveTracking() {
  const { accessToken } = useAuth();
  const [buses, setBuses] = useState<BusLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBus, setSelectedBus] = useState<BusLocation | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [totalPassengers, setTotalPassengers] = useState(0);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Initialize map
  useEffect(() => {
    if (!hasMapboxToken || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [36.8219, -1.2921], // Nairobi, Kenya
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
    };
  }, []);

  // Fetch live bus locations
  useEffect(() => {
    fetchBusLocations();
    const interval = setInterval(fetchBusLocations, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchBusLocations = async () => {
    try {
      const response = await fetch(`${API_URL}/tracking/company/live-locations`, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        // If no live locations yet, show empty state
        if (response.status === 404 || response.status === 403) {
          setBuses([]);
          setTotalPassengers(0);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch live locations');
      }

      const data = await response.json();
      console.log('Live locations API response:', data);

      if (data.success && data.locations && data.locations.length > 0) {
        const transformedBuses: BusLocation[] = data.locations.map((loc: any) => ({
          id: loc.bus.id,
          plateNumber: loc.bus.plateNumber,
          model: loc.bus.model,
          driverName: loc.driver.name,
          currentRoute: 'On Route', // You can add route info later
          status: loc.trip_status === 'in_progress' ? 'active' : 'idle',
          latitude: loc.location.latitude,
          longitude: loc.location.longitude,
          speed: loc.location.speed,
          lastUpdate: loc.updated_at,
          passengers: 0, // You can fetch this from tickets API if needed
          capacity: loc.bus.capacity,
        }));

        setBuses(transformedBuses);
        updateMapMarkers(transformedBuses);
        
        // Calculate total passengers
        const total = transformedBuses.reduce((sum, bus) => sum + bus.passengers, 0);
        setTotalPassengers(total);
      } else {
        // No active trips
        console.log('No active bus locations found');
        setBuses([]);
        setTotalPassengers(0);
      }
    } catch (error) {
      console.error('Error fetching bus locations:', error);
      // Set empty state on error
      setBuses([]);
      setTotalPassengers(0);
    } finally {
      setLoading(false);
    }
  };

  const updateMapMarkers = (busLocations: BusLocation[]) => {
    if (!map.current) return;

    // Remove old markers
    Object.values(markers.current).forEach(marker => marker.remove());
    markers.current = {};

    // Add new markers for active buses with valid coordinates
    busLocations.forEach(bus => {
      if (bus.latitude !== 0 && bus.longitude !== 0) {
        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.background = bus.status === 'active' ? SAFARITIX.primary : '#94A3B8';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:white;font-size:14px;font-weight:bold;">🚌</div>`;

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 8px; min-width: 200px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 6px;">${bus.plateNumber}</div>
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
              <strong>Driver:</strong> ${bus.driverName}
            </div>
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
              <strong>Model:</strong> ${bus.model}
            </div>
            <div style="font-size: 12px; color: #6B7280; margin-bottom: 4px;">
              <strong>Speed:</strong> ${bus.speed.toFixed(1)} km/h
            </div>
            <div style="font-size: 12px; color: #6B7280;">
              <strong>Status:</strong> <span style="color: ${bus.status === 'active' ? '#27AE60' : '#94A3B8'};">${bus.status}</span>
            </div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([bus.longitude, bus.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        markers.current[bus.id] = marker;

        // Click handler
        el.addEventListener('click', () => {
          setSelectedBus(bus);
        });
      }
    });

    // Fit map to show all markers
    if (busLocations.length > 0) {
      const validLocations = busLocations.filter(b => b.latitude !== 0 && b.longitude !== 0);
      if (validLocations.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        validLocations.forEach(bus => {
          bounds.extend([bus.longitude, bus.latitude]);
        });
        map.current?.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  };

  const filteredBuses = buses.filter(bus => {
    if (filterStatus === 'all') return true;
    return bus.status === filterStatus;
  });

  const activeCount = buses.filter(b => b.status === 'active').length;
  const idleCount = buses.filter(b => b.status === 'idle').length;

  const styles: Record<string, CSSProperties> = {
    container: {
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#6B7280',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
    },
    statLabel: {
      fontSize: '13px',
      color: '#6B7280',
      marginBottom: '8px',
      fontWeight: '500',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#111827',
    },
    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '24px',
    },
    mapContainer: {
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      padding: '24px',
      minHeight: '500px',
    },
    map: {
      width: '100%',
      height: '450px',
      background: '#E5E7EB',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#6B7280',
      fontSize: '14px',
    },
    busList: {
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      padding: '24px',
      maxHeight: '674px',
      overflowY: 'auto' as const,
    },
    listTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#111827',
      marginBottom: '16px',
    },
    filterSelect: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      marginBottom: '16px',
    },
    busCard: {
      padding: '16px',
      border: '1px solid #E5E7EB',
      borderRadius: '8px',
      marginBottom: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
    },
    busCardHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '8px',
    },
    busPlate: {
      fontSize: '15px',
      fontWeight: '600',
      color: '#111827',
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
    },
    busInfo: {
      fontSize: '13px',
      color: '#6B7280',
      marginBottom: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    progressBar: {
      width: '100%',
      height: '6px',
      background: '#E5E7EB',
      borderRadius: '3px',
      marginTop: '8px',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      background: SAFARITIX.primary,
      borderRadius: '3px',
      transition: 'width 0.3s',
    },
    detailsPanel: {
      gridColumn: '1 / -1',
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      padding: '24px',
    },
    detailsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
    },
    detailItem: {
      padding: '16px',
      background: '#F9FAFB',
      borderRadius: '8px',
    },
    detailLabel: {
      fontSize: '12px',
      color: '#6B7280',
      marginBottom: '4px',
      fontWeight: '500',
    },
    detailValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#111827',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      fontSize: '16px',
      color: '#6B7280',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading bus locations...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <MapPin size={32} color={SAFARITIX.primary} />
          Live Bus Tracking
        </h1>
        <p style={styles.subtitle}>
          Monitor your fleet in real-time
        </p>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Buses</div>
          <div style={styles.statValue}>{buses.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active</div>
          <div style={{ ...styles.statValue, color: '#15803D' }}>{activeCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Idle</div>
          <div style={{ ...styles.statValue, color: '#D97706' }}>{idleCount}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Passengers</div>
          <div style={styles.statValue}>{totalPassengers}</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainGrid}>
        {/* Map View */}
        <div style={styles.mapContainer}>
          <h2 style={styles.listTitle}>Map View</h2>
          {!hasMapboxToken ? (
            <div
              style={{
                width: '100%',
                height: '450px',
                borderRadius: '8px',
                border: '1px solid #FCD34D',
                background: '#FFFBEB',
                color: '#92400E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '24px',
              }}
            >
              Missing Mapbox token. Add VITE_MAPBOX_TOKEN to your frontend .env file to enable live map tracking.
            </div>
          ) : (
            <div 
              ref={mapContainer} 
              style={{ 
                width: '100%', 
                height: '450px', 
                borderRadius: '8px', 
                overflow: 'hidden' 
              }} 
            />
          )}
          {buses.length === 0 && !loading && (
            <div style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              background: 'white',
              padding: '32px',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxWidth: '400px',
              zIndex: 1000
            }}>
              <Navigation size={48} color="#94A3B8" style={{ marginBottom: '16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                No Active Trips
              </h3>
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
                No buses are currently tracking their location. To see live tracking:
              </p>
              <ol style={{ fontSize: '13px', color: '#6B7280', textAlign: 'left', paddingLeft: '20px', lineHeight: '1.8' }}>
                <li>A driver must log in to the system</li>
                <li>Navigate to the Driver Tracking page</li>
                <li>Click "Start Trip" button</li>
                <li>Allow GPS location access</li>
                <li>The bus will appear here within 10 seconds</li>
              </ol>
            </div>
          )}
        </div>

        {/* Bus List */}
        <div style={styles.busList}>
          <h2 style={styles.listTitle}>Active Buses</h2>
          
          <select
            style={styles.filterSelect}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Buses</option>
            <option value="active">Active Only</option>
            <option value="idle">Idle Only</option>
            <option value="maintenance">Maintenance</option>
          </select>

          {filteredBuses.map((bus) => {
            const occupancy = (bus.passengers / bus.capacity) * 100;
            
            return (
              <div
                key={bus.id}
                style={{
                  ...styles.busCard,
                  borderColor: selectedBus?.id === bus.id ? SAFARITIX.primary : '#E5E7EB',
                  background: selectedBus?.id === bus.id ? SAFARITIX.primarySoft : 'white',
                }}
                onClick={() => setSelectedBus(bus)}
              >
                <div style={styles.busCardHeader}>
                  <strong style={styles.busPlate}>{bus.plateNumber}</strong>
                  <span
                    style={{
                      ...styles.statusBadge,
                      background: bus.status === 'active' ? '#DCFCE7' : '#FEF3C7',
                      color: bus.status === 'active' ? '#15803D' : '#D97706',
                    }}
                  >
                    {bus.status === 'active' && '🟢'}
                    {bus.status === 'idle' && '🟡'}
                    {bus.status === 'active' ? 'Active' : 'Idle'}
                  </span>
                </div>
                
                <div style={styles.busInfo}>
                  <BusIcon size={14} />
                  {bus.model}
                </div>
                
                <div style={styles.busInfo}>
                  <Navigation size={14} />
                  {bus.currentRoute}
                </div>
                
                {bus.status === 'active' && (
                  <>
                    <div style={styles.busInfo}>
                      <Activity size={14} />
                      Speed: {bus.speed} km/h
                    </div>
                    
                    <div style={styles.busInfo}>
                      <Users size={14} />
                      {bus.passengers}/{bus.capacity} passengers ({occupancy.toFixed(0)}%)
                    </div>
                    
                    <div style={styles.progressBar}>
                      <div style={{ ...styles.progressFill, width: `${occupancy}%` }} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Bus Details */}
      {selectedBus && (
        <div style={styles.detailsPanel}>
          <h2 style={styles.listTitle}>Bus Details - {selectedBus.plateNumber}</h2>
          
          <div style={styles.detailsGrid}>
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Driver</div>
              <div style={styles.detailValue}>{selectedBus.driverName}</div>
            </div>
            
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Current Route</div>
              <div style={styles.detailValue}>{selectedBus.currentRoute}</div>
            </div>
            
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Speed</div>
              <div style={styles.detailValue}>{selectedBus.speed} km/h</div>
            </div>
            
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Passengers</div>
              <div style={styles.detailValue}>
                {selectedBus.passengers} / {selectedBus.capacity}
              </div>
            </div>
            
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Location</div>
              <div style={styles.detailValue}>
                {selectedBus.latitude.toFixed(4)}, {selectedBus.longitude.toFixed(4)}
              </div>
            </div>
            
            <div style={styles.detailItem}>
              <div style={styles.detailLabel}>Last Update</div>
              <div style={styles.detailValue}>
                {new Date(selectedBus.lastUpdate).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
