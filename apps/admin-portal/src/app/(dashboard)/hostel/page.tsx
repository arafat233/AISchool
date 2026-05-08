"use client";
/**
 * Hostel Management Dashboard
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface HostelRoom {
  id: string;
  block: string;
  floor: number;
  roomNo: string;
  type: string;
  capacity: number;
  occupied: number;
  warden: string;
}

interface HostelLeave {
  id: string;
  studentName: string;
  class: string;
  type: string;
  from: string;
  to: string;
  status: string;
  parentApproved: boolean;
  wardenApproved: boolean;
}

export default function HostelPage() {
  const [activeTab, setActiveTab] = useState<"rooms" | "leaves" | "rollcall">("rooms");

  const { data: rooms = [], isLoading: roomsLoading, error: roomsError } = useQuery<HostelRoom[]>({
    queryKey: ["hostel-rooms"],
    queryFn: async () => {
      const res = await api.get("/hostel/rooms");
      return res.data?.data ?? [];
    },
  });

  const { data: leaves = [], isLoading: leavesLoading, error: leavesError } = useQuery<HostelLeave[]>({
    queryKey: ["hostel-leaves"],
    queryFn: async () => {
      const res = await api.get("/hostel/leaves");
      return res.data?.data ?? [];
    },
  });

  if (roomsLoading || leavesLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (roomsError || leavesError) return <div className="p-4 text-red-500">Failed to load data. Please try again.</div>;

  const totalBeds = rooms.reduce((s, r) => s + r.capacity, 0);
  const occupiedBeds = rooms.reduce((s, r) => s + r.occupied, 0);
  const pendingLeaves = leaves.filter(l => l.status === "PENDING").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hostel Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Room allotment, leave management, daily roll call</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-foreground">{occupiedBeds}/{totalBeds}</div>
          <div className="text-sm text-muted-foreground mt-1">Beds Occupied</div>
          <div className="text-xs text-muted-foreground mt-1">{Math.round(occupiedBeds * 100 / totalBeds)}% occupancy</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{pendingLeaves}</div>
          <div className="text-sm text-muted-foreground mt-1">Pending Leave Requests</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{rooms.length}</div>
          <div className="text-sm text-muted-foreground mt-1">Total Rooms</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">{totalBeds - occupiedBeds}</div>
          <div className="text-sm text-muted-foreground mt-1">Vacant Beds</div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["rooms", "leaves", "rollcall"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${activeTab === tab ? "border-gray-800 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab === "rollcall" ? "Night Roll Call" : tab === "leaves" ? `Leave Requests ${pendingLeaves > 0 ? `(${pendingLeaves})` : ""}` : "Rooms"}
          </button>
        ))}
      </div>

      {activeTab === "rooms" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <div key={room.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-foreground">Room {room.roomNo}</div>
                  <div className="text-xs text-muted-foreground">Block {room.block} · Floor {room.floor} · {room.type}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${room.occupied === room.capacity ? "bg-red-50 text-red-700" : room.occupied === 0 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                  {room.occupied}/{room.capacity} beds
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(room.occupied / room.capacity) * 100}%` }} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">Warden: {room.warden}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-left">Student</th>
                <th className="px-5 py-3 text-left">Type</th>
                <th className="px-5 py-3 text-left">Dates</th>
                <th className="px-5 py-3 text-center">Warden</th>
                <th className="px-5 py-3 text-center">Parent</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaves.map(leave => (
                <tr key={leave.id} className="hover:bg-muted">
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">{leave.studentName}</div>
                    <div className="text-xs text-muted-foreground">{leave.class}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{leave.type}</td>
                  <td className="px-5 py-3 text-muted-foreground">{leave.from} → {leave.to}</td>
                  <td className="px-5 py-3 text-center">{leave.wardenApproved ? "✅" : "⏳"}</td>
                  <td className="px-5 py-3 text-center">{leave.parentApproved ? "✅" : "⏳"}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${leave.status === "APPROVED" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{leave.status}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {leave.status === "PENDING" && !leave.wardenApproved && (
                      <button className="text-xs px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-700">Approve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "rollcall" && (
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-center text-muted-foreground py-8">
            <div className="text-4xl mb-3">🌙</div>
            <div className="font-medium text-foreground">Night Roll Call</div>
            <p className="text-sm mt-2">Record tonight's night count for all hostel students</p>
            <button className="mt-4 px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm">
              Start Roll Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
