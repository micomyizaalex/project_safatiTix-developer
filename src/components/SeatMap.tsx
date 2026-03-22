import React, { useEffect, useMemo, useState, useRef } from 'react';
import { User, Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

type SeatState = 'AVAILABLE' | 'LOCKED' | 'BOOKED' | 'DRIVER';

type Seat = {
  id?: number | string;
  seat_number: string;
  row?: number;
  col?: number;
  side?: 'L' | 'R' | 'l' | 'r';
  state: SeatState;
  is_driver?: boolean;
  lock_expires_at?: string | null;
};

type SeatMapProps = {
  scheduleId: string | number;
  price?: number;
  className?: string;
  onBooked?: (result: any) => void;
  onSelect?: (seat: any, lock?: any) => void; // Legacy callback for external booking flow
  scheduleDetails?: {
    routeFrom: string;
    routeTo: string;
    departureTime: string;
    scheduleDate: string;
    busPlateNumber: string;
    companyName: string;
  };
};

export default function SeatMap({ scheduleId, price = 0, className = '', onBooked, onSelect, scheduleDetails }: SeatMapProps) {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const [seats, setSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{message: string, type: 'error' | 'info'} | null>(null);
  const lastFetchTime = useRef<number>(0);

  const fetchSeats = async (isAutoRefresh = false, forceRefresh = false) => {
    // Prevent duplicate fetches within 1 second unless forced
    const now = Date.now();
    if (!forceRefresh && now - lastFetchTime.current < 1000) {
      return;
    }
    lastFetchTime.current = now;
    
    if (isAutoRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const hdrs: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) hdrs['Authorization'] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/seats/schedules/${scheduleId}`, { headers: hdrs });
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `Failed to load seats (${res.status})`);
      }
      if (!ct.includes('application/json')) {
        throw new Error('Seat endpoint returned non-JSON response');
      }
      const json = await res.json();
      
      // Debug: Log the raw API response
      console.log('\n🔍 === API RESPONSE ===');
      console.log('Total seats received:', json.seats?.length);
      console.log('Summary:', json.summary);
      console.log('Sample seats:', json.seats?.slice(0, 3));
      
      // PRODUCTION-GRADE PARSING: Strict validation
      const returnedRaw = Array.isArray(json.seats) ? json.seats : [];
      if (returnedRaw.length === 0) {
        console.warn('⚠️ No seats returned from API');
      }

      // Derive total seats from response
      const totalSeatsFromResp = Number(json.summary?.total ?? json.totalSeats ?? json.total_seats ?? 29) || 29;

      const seatMap = new Map<string, Seat>();

      // BULLETPROOF PARSING - Backend is authoritative source of truth
      returnedRaw.forEach((entry: any) => {
        if (!entry || typeof entry !== 'object') {
          console.warn('⚠️ Invalid seat entry:', entry);
          return;
        }

        const num = String(entry.seat_number ?? entry.id ?? '');
        if (!num) {
          console.warn('⚠️ Seat missing seat_number:', entry);
          return;
        }

        // Get state - STRICT VALIDATION
        let stateRaw = entry.state ?? entry.status ?? null;
        let finalState: SeatState = 'AVAILABLE'; // Safe default

        if (typeof stateRaw === 'string') {
          const upper = stateRaw.toUpperCase();
          const validStates: SeatState[] = ['AVAILABLE', 'BOOKED', 'LOCKED', 'DRIVER'];
          
          if (validStates.includes(upper as SeatState)) {
            finalState = upper as SeatState;
          } else {
            console.warn(`⚠️ Invalid state "${stateRaw}" for seat ${num}, defaulting to AVAILABLE`);
          }
        } else if (stateRaw !== null) {
          console.warn(`⚠️ Non-string state for seat ${num}:`, stateRaw);
        }

        // Store normalized seat
        seatMap.set(num, {
          seat_number: num,
          state: finalState,
          is_driver: entry.is_driver || finalState === 'DRIVER',
          lock_expires_at: entry.lock_expires_at ?? null
        });

        // Debug log for non-available seats
        if (finalState === 'BOOKED') {
          console.log(`🔴 BOOKED seat parsed: ${num}`);
        } else if (finalState === 'LOCKED') {
          console.log(`🟡 LOCKED seat parsed: ${num}`);
        } else if (finalState === 'DRIVER') {
          console.log(`⚫ DRIVER seat parsed: ${num}`);
        }
      });

      // Build organized seat array (1 to N)
      const organized: Seat[] = [];
      for (let i = 1; i <= totalSeatsFromResp; i++) {
        const seatNum = String(i);
        const existing = seatMap.get(seatNum);
        if (existing) {
          organized.push(existing);
        } else {
          // Seat not in response = AVAILABLE (or missing)
          console.warn(`⚠️ Seat ${seatNum} not in API response, defaulting to AVAILABLE`);
          organized.push({ seat_number: seatNum, state: 'AVAILABLE' } as Seat);
        }
      }

      setSeats(organized);
      
      // Clear any selected seats that are now booked/locked
      setSelected(prev => {
        const newSelection: Record<string, boolean> = {};
        let clearedCount = 0;
        Object.keys(prev).forEach(seatNum => {
          const seat = organized.find(s => s.seat_number === seatNum);
          if (seat && seat.state === 'AVAILABLE' && prev[seatNum]) {
            newSelection[seatNum] = true;
          } else if (prev[seatNum]) {
            clearedCount++;
            console.log(`🔒 Seat ${seatNum} is no longer available - cleared from selection`);
          }
        });
        if (clearedCount > 0) {
          setToast({
            message: `${clearedCount} seat${clearedCount > 1 ? 's' : ''} ${clearedCount > 1 ? 'were' : 'was'} booked by another user`,
            type: 'info'
          });
          setTimeout(() => setToast(null), 4000);
        }
        return newSelection;
      });
      
      // FINAL STATE VERIFICATION
      console.log('\n🎫 === SEAT MAP LOADED ===');
      console.log('Schedule:', scheduleId);
      console.log('Total seats:', organized.length);
      
      const availCount = organized.filter(s => s.state === 'AVAILABLE').length;
      const bookedCount = organized.filter(s => s.state === 'BOOKED').length;
      const lockedCount = organized.filter(s => s.state === 'LOCKED').length;
      const driverCount = organized.filter(s => s.state === 'DRIVER').length;
      
      console.log('State Distribution:');
      console.log(`  🟢 AVAILABLE: ${availCount}`);
      console.log(`  🔴 BOOKED:    ${bookedCount}`);
      console.log(`  🟡 LOCKED:    ${lockedCount}`);
      console.log(`  ⚫ DRIVER:    ${driverCount}`);
      
      if (bookedCount > 0) {
        const bookedSeats = organized
          .filter(s => s.state === 'BOOKED')
          .map(s => s.seat_number)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .join(', ');
        console.log(`  🔴 Booked seats: [${bookedSeats}]`);
      }
      
      // Verify all states are valid
      const invalidStates = organized.filter(s => 
        !['AVAILABLE', 'BOOKED', 'LOCKED', 'DRIVER'].includes(s.state)
      );
      if (invalidStates.length > 0) {
        console.error('❌ INVALID STATES DETECTED:', invalidStates);
      }
      
      console.log('========================\n');
    } catch (err: any) {
      console.error('❌ fetchSeats error:', err);
      setError(err.message || 'Failed to load seats');
      
      // Fallback: Show all seats as unavailable on error
      const fallback: Seat[] = [];
      for (let i = 1; i <= 29; i++) {
        fallback.push({ seat_number: String(i), state: 'BOOKED' } as Seat);
      }
      setSeats(fallback);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!scheduleId) return;
    // Force immediate refresh on mount/schedule change
    fetchSeats(false, true);
    
    // Auto-refresh every 3 seconds for real-time updates
    // This will automatically reflect any bookings made
    const intervalId = setInterval(() => {
      fetchSeats(true);
    }, 3000);
    
    return () => clearInterval(intervalId);
  }, [scheduleId, accessToken]);
  
  // Force refresh when returning from navigation (e.g., payment page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('🔄 Tab became visible - refreshing seat map');
        fetchSeats(false, true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => fetchSeats(false, true));
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', () => fetchSeats(false, true));
    };
  }, [scheduleId]);

  const toggleSelect = (seatNum: string, seatState: SeatState) => {
    console.log(`👆 Clicked seat ${seatNum} (state: ${seatState})`);
    
    // Prevent selecting driver seats
    if (seatState === 'DRIVER') {
      console.log(`⛔ Cannot select driver seat ${seatNum}`);
      setToast({ message: 'Driver seat is not available for booking', type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    // Prevent selecting booked seats
    if (seatState === 'BOOKED') {
      console.log(`⛔ Cannot select seat ${seatNum} - Already booked`);
      setToast({ message: `Seat ${seatNum} is already booked`, type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    // Prevent selecting locked seats
    if (seatState === 'LOCKED') {
      console.log(`⛔ Cannot select seat ${seatNum} - Temporarily locked`);
      setToast({ message: `Seat ${seatNum} is temporarily reserved by another user`, type: 'info' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    if (seatState !== 'AVAILABLE') {
      console.log(`⛔ Cannot select seat ${seatNum} - Status: ${seatState}`);
      setToast({ message: `Seat ${seatNum} is not available`, type: 'error' });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    
    console.log(`✅ Toggling seat ${seatNum}`);
    setSelected((s) => {
      const newSelection = { ...s, [seatNum]: !s[seatNum] };
      console.log('Updated selection:', Object.keys(newSelection).filter(k => newSelection[k]));
      return newSelection;
    });
    
    // Legacy callback support (deprecated - SeatMap now handles booking internally)
    if (onSelect) {
      console.warn('⚠️ onSelect prop is deprecated. SeatMap now handles booking internally via confirmBooking()');
      const seat = seats.find(st => st.seat_number === seatNum);
      if (seat) {
        onSelect(seat, null);
      }
    }
  };

  const handleKey = (e: React.KeyboardEvent, seatNum: string, state: SeatState) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSelect(seatNum, state);
    }
  };

  const confirmBooking = async () => {
    const picks = Object.keys(selected).filter(k => selected[k]);
    
    console.log('🎫 Book button clicked');
    console.log('Selected seats:', picks);
    console.log('Schedule ID:', scheduleId);
    console.log('Price per seat:', price);
    
    if (picks.length === 0) {
      setError('Please select at least one seat to continue');
      console.warn('⚠️ No seats selected');
      return;
    }
    
    if (!user) {
      setError('Please login to book seats');
      console.warn('⚠️ User not authenticated');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }
    
    setError(null);
    console.log('✅ Navigating to payment page...');
    
    try {
      // Navigate to payment page with selected seats and schedule details
      // NOTE: Cannot pass functions in navigation state (causes DataCloneError)
      navigate('/dashboard/commuter/payment', {
        state: {
          selectedSeats: picks,
          scheduleId,
          price,
          scheduleDetails
        }
      });
      console.log('✅ Navigation initiated');
    } catch (err) {
      console.error('❌ Navigation error:', err);
      setError('Failed to proceed to payment. Please try again.');
    }
  };

  // Expose refresh function for external use
  React.useEffect(() => {
    if (onBooked) {
      // Allow parent components to trigger refresh
      (window as any).__refreshSeatMap = () => fetchSeats(false);
    }
    return () => {
      delete (window as any).__refreshSeatMap;
    };
  }, [onBooked]);

  const layout = useMemo(() => {
    const seatsByNum = new Map<number, Seat>();
    seats.forEach(s => seatsByNum.set(parseInt(s.seat_number), s));

    return {
      frontRight: seatsByNum.get(1),
      rows: [
        { left: [2, 3], right: [4, 5] },
        { left: [6, 7], right: [8, 9] },
        { left: [10, 11], right: [12, 13] },
        { left: [14, 15], right: [16, 17] },
        { left: [18, 19], right: [20, 21] },
        { left: [22, 23], right: [24, 25] },
        { left: [26, 27], right: [28, 29] },
      ].map(row => ({
        left: row.left.map(n => seatsByNum.get(n)).filter(Boolean) as Seat[],
        right: row.right.map(n => seatsByNum.get(n)).filter(Boolean) as Seat[],
      }))
    };
  }, [seats]);

  const selectedSeats = Object.keys(selected).filter(k => selected[k]);
  const selectedCount = selectedSeats.length;
  const totalPrice = selectedCount * price;

  const renderSeat = (seat: Seat | undefined) => {
    if (!seat) return null;
    
    const id = String(seat.seat_number);
    const st = seat.state;
    const isSelected = !!selected[id];
    const isDriver = seat.is_driver || st === 'DRIVER';
    
    // Define explicit styles for each state
    const getStyle = () => {
      if (isDriver) {
        return {
          background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
          color: '#F3F4F6',
          cursor: 'not-allowed',
          opacity: 0.8,
          border: '2px solid #374151'
        };
      }
      if (st === 'BOOKED') {
        return {
          background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
          color: '#FFFFFF',
          cursor: 'not-allowed',
          opacity: 0.9,
          border: '3px solid #B91C1C',
          fontWeight: '800' as const,
          position: 'relative' as const
        };
      }
      if (st === 'LOCKED') {
        return {
          background: 'linear-gradient(135deg, #FDE047 0%, #FACC15 100%)',
          color: '#78350F',
          cursor: 'not-allowed',
          border: '3px solid #EAB308',
          fontWeight: 'bold'
        };
      }
      if (isSelected) {
        return {
          background: 'linear-gradient(135deg, #0077B6 0%, #005F8E 100%)',
          color: '#FFFFFF',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 119, 182, 0.4)',
          transform: 'scale(1.05)',
          border: '2px solid #003F5C'
        };
      }
      // AVAILABLE
      return {
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        color: '#FFFFFF',
        cursor: 'pointer',
        border: '2px solid #047857'
      };
    };
    
    return (
      <button
        key={id}
        onClick={() => toggleSelect(id, st)}
        onKeyDown={(e) => handleKey(e, id, st)}
        disabled={st !== 'AVAILABLE'}
        aria-pressed={isSelected}
        aria-label={`Seat ${id} ${st.toLowerCase()}`}
        aria-disabled={st !== 'AVAILABLE'}
        title={
          isDriver ? '🚫 Driver seat - Not available for booking' :
          st === 'BOOKED' ? '🔴 This seat is already booked and cannot be selected' :
          st === 'LOCKED' ? '🟡 This seat is temporarily reserved by another user' :
          isSelected ? '🔵 Selected - Click to deselect' :
          '🟢 Available - Click to select this seat'
        }
        style={{
          ...getStyle(),
          width: '100%',
          aspectRatio: '1',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '13px',
          transition: 'all 0.2s ease'
        }}
        className={st === 'BOOKED' ? 'animate-pulse-subtle' : ''}
        onMouseEnter={(e) => {
          if (st === 'AVAILABLE' && !isSelected) {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (st === 'AVAILABLE' && !isSelected) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {st === 'BOOKED' ? (
          <div className="flex flex-col items-center justify-center">
            <span className="text-lg font-black">🔒</span>
          </div>
        ) : st === 'LOCKED' ? (
          <span className="text-xs">⏳</span>
        ) : (
          id
        )}
      </button>
    );
  };

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Header - ULTRA COMPACT */}
      <div className="bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-t-xl p-2 text-white">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5 justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center text-xs">
              🚌
            </div>
            Select Seat
          </div>
          {refreshing && (
            <div className="flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded">
              <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Updating
            </div>
          )}
        </h3>
        
        <div className="grid grid-cols-4 gap-1 text-[10px]">
          <div className="flex items-center gap-1 bg-white/10 rounded p-1">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: '1px solid #047857'
            }}></div>
            <span className="font-semibold">Free</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded p-1">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(135deg, #0077B6 0%, #005F8E 100%)',
              border: '1px solid #003F5C'
            }}></div>
            <span className="font-semibold">Pick</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded p-1">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
              border: '1px solid #B91C1C'
            }}></div>
            <span className="font-semibold">Booked</span>
          </div>
          <div className="flex items-center gap-1 bg-white/10 rounded p-1">
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '3px',
              background: 'linear-gradient(135deg, #FDE047 0%, #FACC15 100%)',
              border: '2px solid #EAB308'
            }}></div>
            <span className="font-semibold">Lock</span>
          </div>
        </div>
      </div>

      {/* Bus Interior - ULTRA COMPACT */}
      <div className="bg-gradient-to-b from-gray-50 to-white rounded-b-xl shadow-lg border-x-2 border-b-2 border-gray-300">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-[#0077B6] animate-spin mb-2" />
            <p className="text-gray-600 text-xs">Loading...</p>
          </div>
        ) : (
          <div className="p-2.5">
            {/* Windshield */}
            <div className="mb-2">
              <div className="h-1.5 bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 rounded-t-full mx-4"></div>
            </div>

            {/* Front Row - Driver + Seat 1 */}
            <div className="mb-2.5">
              <div className="flex items-center gap-2 justify-center">
                {/* Driver */}
                <div className="w-11">
                  <div className="w-full aspect-square bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center shadow-md border border-gray-700">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-center text-[9px] font-semibold text-gray-600 mt-0.5">
                    Driver
                  </div>
                </div>

                {/* Aisle */}
                <div className="w-12 h-11 flex items-center justify-center">
                  <div className="w-px h-full bg-gray-300"></div>
                </div>

                {/* Seat 1 */}
                <div className="w-11">
                  {renderSeat(layout.frontRight)}
                </div>
              </div>
            </div>

            {/* Passenger Rows - TIGHTER */}
            <div className="space-y-1.5">
              {layout.rows.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 justify-center">
                  {/* Left Seats */}
                  <div className="flex gap-1">
                    {row.left.map(seat => (
                      <div key={seat.seat_number} className="w-11">
                        {renderSeat(seat)}
                      </div>
                    ))}
                  </div>

                  {/* Aisle */}
                  <div className="w-12 h-11 flex items-center justify-center">
                    <div className="w-px h-full bg-gray-300"></div>
                  </div>

                  {/* Right Seats */}
                  <div className="flex gap-1">
                    {row.right.map(seat => (
                      <div key={seat.seat_number} className="w-11">
                        {renderSeat(seat)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Bus Back */}
            <div className="mt-2">
              <div className="h-2 bg-gradient-to-b from-gray-300 to-gray-400 rounded-b-lg mx-4"></div>
            </div>
          </div>
        )}
      </div>

      {/* Selection Summary & Booking - Always Visible */}
      <div className="mt-2.5">
        {selectedCount > 0 ? (
          <div className="bg-gradient-to-br from-[#0077B6] to-[#005F8E] rounded-lg p-2.5 text-white shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] opacity-90 mb-0.5">Selected Seats</div>
                <div className="text-sm font-bold mb-0.5 truncate">{selectedSeats.join(', ')}</div>
                <div className="text-xs">
                  <span className="font-bold">RWF {totalPrice.toLocaleString()}</span>
                  <span className="opacity-80 ml-1">({selectedCount} {selectedCount === 1 ? 'seat' : 'seats'})</span>
                </div>
              </div>
              
              <div className="flex gap-1.5">
                <button
                  onClick={() => setSelected({})}
                  className="bg-white/20 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-white/30 transition-all border border-white/30"
                  title="Clear selection"
                >
                  Clear
                </button>
                <button
                  onClick={confirmBooking}
                  className="bg-white text-[#0077B6] px-4 py-1.5 rounded-md text-xs font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-1"
                  title="Proceed to payment"
                >
                  Book Now
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-3 border-2 border-dashed border-gray-300">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1">
                <div className="text-xs font-semibold text-gray-700 mb-0.5">
                  No seats selected
                </div>
                <div className="text-[10px] text-gray-500">
                  Select available seats above to continue
                </div>
              </div>
              <button
                onClick={confirmBooking}
                disabled={true}
                className="bg-gray-300 text-gray-500 px-4 py-1.5 rounded-md text-xs font-bold cursor-not-allowed opacity-60"
                title="Please select a seat first"
              >
                Book Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Refresh Button */}
      {!loading && (
        <div className="mt-2.5 flex justify-center">
          <button
            onClick={() => fetchSeats(false)}
            disabled={refreshing}
            className="bg-gray-100 text-gray-900 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-200 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? 'Updating...' : 'Refresh Seats'}
          </button>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="mt-2.5 bg-red-50 border-2 border-red-200 rounded-lg p-2.5 animate-pulse">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="flex-1">
              <div className="font-bold text-red-900 text-sm">Error</div>
              <div className="text-xs text-red-700 mt-0.5">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Toast Notifications */}
      {toast && (
        <div className={`mt-2.5 border-2 rounded-lg p-2.5 animate-in slide-in-from-top duration-300 ${
          toast.type === 'error' 
            ? 'bg-red-50 border-red-200' 
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}>
              <span className="text-white text-xs font-bold">
                {toast.type === 'error' ? '✕' : 'ℹ'}
              </span>
            </div>
            <div className="flex-1">
              <div className={`text-xs mt-0.5 ${
                toast.type === 'error' ? 'text-red-700' : 'text-blue-700'
              }`}>{toast.message}</div>
            </div>
            <button
              onClick={() => setToast(null)}
              className={`hover:opacity-70 transition-opacity ${
                toast.type === 'error' ? 'text-red-400' : 'text-blue-400'
              }`}
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}