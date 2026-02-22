/**
 * Example Driver Dashboard Page
 * Shows how to integrate the DriverTracking component
 */

import React, { useState, useEffect } from 'react';
import DriverTracking from '@/components/DriverTracking';
import { useAuth } from '@/components/AuthContext';

interface Schedule {
  id: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  routeFrom: string;
  routeTo: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
  bus: {
    id: string;
    plateNumber: string;
  };
}

export default function DriverDashboardExample() {
  const { user } = useAuth();
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch today's schedules
  useEffect(() => {
    fetchTodaySchedules();
  }, []);

  const fetchTodaySchedules = async () => {
    try {
      setLoading(true);
      setError(null);

      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        '/api/driver/today-schedule',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }

      const data = await response.json();
      setTodaySchedules(data.schedules || []);

      // Auto-select first schedule (or in-progress schedule)
      if (data.schedules && data.schedules.length > 0) {
        const activeSchedule = data.schedules.find(
          (s: Schedule) => s.status === 'in_progress'
        );
        setSelectedSchedule(activeSchedule || data.schedules[0]);
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const handleTripStarted = () => {
    console.log('✅ Trip started successfully!');
    // Refresh schedule list to update status
    fetchTodaySchedules();
  };

  const handleTripEnded = () => {
    console.log('✅ Trip ended successfully!');
    // Refresh schedule list
    fetchTodaySchedules();
    // Optionally: Show success notification or navigate away
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading schedules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-800 font-semibold mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTodaySchedules}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (todaySchedules.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 text-lg">No schedules for today</p>
          <p className="text-gray-500 text-sm mt-2">
            Check back later or contact dispatch
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Driver Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user?.full_name || 'Driver'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Schedule List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold mb-4">Today's Schedules</h2>

            <div className="space-y-3">
              {todaySchedules.map((schedule) => (
                <button
                  key={schedule.id}
                  onClick={() => setSelectedSchedule(schedule)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedSchedule?.id === schedule.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {schedule.routeFrom} → {schedule.routeTo}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(schedule.departureTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Bus: {schedule.bus.plateNumber}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        schedule.status === 'in_progress'
                          ? 'bg-green-100 text-green-800'
                          : schedule.status === 'completed'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {schedule.status === 'in_progress'
                        ? 'Active'
                        : schedule.status === 'completed'
                        ? 'Done'
                        : 'Scheduled'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Trip Controls */}
        <div className="lg:col-span-2">
          {selectedSchedule ? (
            <div className="space-y-6">
              {/* Schedule Details */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Trip Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Route</p>
                    <p className="font-semibold text-lg">
                      {selectedSchedule.routeFrom} → {selectedSchedule.routeTo}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bus</p>
                    <p className="font-semibold text-lg">
                      {selectedSchedule.bus.plateNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Departure</p>
                    <p className="font-semibold">
                      {new Date(selectedSchedule.departureTime).toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Arrival</p>
                    <p className="font-semibold">
                      {new Date(selectedSchedule.arrivalTime).toLocaleString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Trip Controls Component */}
              <DriverTracking
                scheduleId={selectedSchedule.id}
                initialStatus={selectedSchedule.status}
                onTripStarted={handleTripStarted}
                onTripEnded={handleTripEnded}
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500">Select a schedule to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
