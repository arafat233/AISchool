"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Bus, MapPin, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useChildStore } from "@/store/child.store";

export default function TransportPage() {
  const activeChildId = useChildStore((s) => s.activeChildId);

  const { data, isLoading } = useQuery({
    queryKey: ["transport", activeChildId],
    queryFn: () => api.get(`/transport/student/${activeChildId}`).then((r) => r.data),
    enabled: !!activeChildId,
    refetchInterval: 30_000, // refresh every 30s for live tracking
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <Bus className="w-12 h-12" />
        <p className="text-sm">No transport assigned for this child</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Transport Tracking</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Route</p>
          <p className="text-lg font-bold text-gray-800">{data.routeName}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Bus Number</p>
          <p className="text-lg font-bold text-gray-800">{data.vehicleRegNo}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">Assigned Stop</p>
          </div>
          <p className="text-sm font-semibold text-gray-800">{data.stopName}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500">Expected Pickup</p>
          </div>
          <p className="text-sm font-semibold text-gray-800">{data.stopArrivalTime ?? "—"}</p>
        </div>
      </div>

      {/* Live position map embed */}
      {data.liveLocation && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Live Location</h2>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="h-64 bg-gray-100 flex items-center justify-center">
            <iframe
              title="Bus Location"
              src={`https://maps.google.com/maps?q=${data.liveLocation.lat},${data.liveLocation.lng}&z=15&output=embed`}
              width="100%" height="100%" style={{ border: 0 }}
              loading="lazy"
            />
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              ETA to your stop: <span className="font-semibold text-gray-800">{data.etaMinutes != null ? `~${data.etaMinutes} min` : "Calculating…"}</span>
            </p>
          </div>
        </div>
      )}

      {!data.liveLocation && (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 py-12 text-center text-gray-400 text-sm">
          GPS tracking not yet active for today&apos;s trip
        </div>
      )}
    </div>
  );
}
