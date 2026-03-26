import React, { useEffect, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { authHeaders, parseMaybeJson } from '../utils';

interface SeatMapPreviewProps {
  scheduleId: string;
  isTrackable: boolean;
  trackingHint?: string;
  accessToken?: string;
}

interface BusLocation {
  latitude: number;
  longitude: number;
  speed?: number | null;
  heading?: number | null;
  timestamp?: string | number;
}

export default function SeatMapPreview({ scheduleId, isTrackable, trackingHint, accessToken }: SeatMapPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<BusLocation | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!isTrackable || !scheduleId || !accessToken) {
      setLocation(null);
      return;
    }

    const loadLocation = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/tracking/schedule/${scheduleId}/location`, {
          headers: authHeaders(accessToken),
        });
        const payload = await parseMaybeJson(response);
        if (!isMounted) return;
        if (response.ok && payload?.hasLocation && payload?.location) {
          setLocation(payload.location);
        } else {
          setLocation(null);
        }
      } catch {
        if (isMounted) setLocation(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadLocation();
    const timer = window.setInterval(loadLocation, 30000);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, [scheduleId, isTrackable, accessToken]);

  if (!isTrackable) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-xs text-slate-500">
        {trackingHint || 'Tracking is not available for this booking yet.'}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading live location...
      </div>
    );
  }

  if (!location) {
    return (
      <div className="rounded-xl border border-dashed border-[#0077B6]/30 bg-[#0077B6]/5 px-3 py-3 text-xs text-[#005F8E]">
        No live bus location available yet.
      </div>
    );
  }

  const mapUrl = `https://maps.google.com/maps?q=${location.latitude},${location.longitude}&z=14&output=embed`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <iframe
        title="Live bus preview"
        src={mapUrl}
        className="h-28 w-full"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600">
        <MapPin className="h-3.5 w-3.5 text-[#0077B6]" />
        <span>
          {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
