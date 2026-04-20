"use client";
/**
 * Hostel Management Dashboard
 */
import { useState } from "react";

const MOCK_ROOMS = [
  { id: "r1", block: "A", floor: 1, roomNo: "A101", type: "STANDARD", capacity: 4, occupied: 4, warden: "Mr. Ravi Kumar" },
  { id: "r2", block: "A", floor: 1, roomNo: "A102", type: "STANDARD", capacity: 4, occupied: 3, warden: "Mr. Ravi Kumar" },
  { id: "r3", block: "A", floor: 2, roomNo: "A201", type: "DELUXE", capacity: 2, occupied: 2, warden: "Mr. Ravi Kumar" },
  { id: "r4", block: "B", floor: 1, roomNo: "B101", type: "STANDARD", capacity: 4, occupied: 1, warden: "Mrs. Sunita Devi" },
  { id: "r5", block: "B", floor: 1, roomNo: "B102", type: "STANDARD", capacity: 4, occupied: 0, warden: "Mrs. Sunita Devi" },
];

const MOCK_LEAVES = [
  { id: "l1", studentName: "Arjun Sharma", class: "XI-A", type: "WEEKEND", from: "2026-04-19", to: "2026-04-20", status: "APPROVED", parentApproved: true, wardenApproved: true },
  { id: "l2", studentName: "Priya Singh", class: "X-B", type: "MEDICAL", from: "2026-04-20", to: "2026-04-22", status: "PENDING", parentApproved: true, wardenApproved: false },
  { id: "l3", studentName: "Rahul Verma", class: "XII-C", type: "HOLIDAY", from: "2026-04-25", to: "2026-04-27", status: "PENDING", parentApproved: false, wardenApproved: false },
];

export default function HostelPage() {
  const [activeTab, setActiveTab] = useState<"rooms" | "leaves" | "rollcall">("rooms");

  const totalBeds = MOCK_ROOMS.reduce((s, r) => s + r.capacity, 0);
  const occupiedBeds = MOCK_ROOMS.reduce((s, r) => s + r.occupied, 0);
  const pendingLeaves = MOCK_LEAVES.filter(l => l.status === "PENDING").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hostel Management</h1>
          <p className="text-sm text-gray-500 mt-1">Room allotment, leave management, daily roll call</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900">{occupiedBeds}/{totalBeds}</div>
          <div className="text-sm text-gray-500 mt-1">Beds Occupied</div>
          <div className="text-xs text-gray-400 mt-1">{Math.round(occupiedBeds * 100 / totalBeds)}% occupancy</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{pendingLeaves}</div>
          <div className="text-sm text-gray-500 mt-1">Pending Leave Requests</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{MOCK_ROOMS.length}</div>
          <div className="text-sm text-gray-500 mt-1">Total Rooms</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">{totalBeds - occupiedBeds}</div>
          <div className="text-sm text-gray-500 mt-1">Vacant Beds</div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {(["rooms", "leaves", "rollcall"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${activeTab === tab ? "border-gray-800 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {tab === "rollcall" ? "Night Roll Call" : tab === "leaves" ? `Leave Requests ${pendingLeaves > 0 ? `(${pendingLeaves})` : ""}` : "Rooms"}
          </button>
        ))}
      </div>

      {activeTab === "rooms" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOCK_ROOMS.map(room => (
            <div key={room.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-gray-900">Room {room.roomNo}</div>
                  <div className="text-xs text-gray-500">Block {room.block} · Floor {room.floor} · {room.type}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${room.occupied === room.capacity ? "bg-red-50 text-red-700" : room.occupied === 0 ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                  {room.occupied}/{room.capacity} beds
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(room.occupied / room.capacity) * 100}%` }} />
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-2">Warden: {room.warden}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "leaves" && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
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
              {MOCK_LEAVES.map(leave => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900">{leave.studentName}</div>
                    <div className="text-xs text-gray-400">{leave.class}</div>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{leave.type}</td>
                  <td className="px-5 py-3 text-gray-600">{leave.from} → {leave.to}</td>
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
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-3">🌙</div>
            <div className="font-medium text-gray-700">Night Roll Call</div>
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
