"use client";
/**
 * Compliance Dashboard
 * Annual compliance calendar, POSH, RTI, EPF/ESI/PT status
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface ComplianceItem {
  id: string;
  category: string;
  name: string;
  dueDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  responsiblePerson: string;
  documentUrl?: string;
}

const statusColor: Record<string, string> = {
  PENDING: "bg-muted text-muted-foreground",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
};

const categoryColor: Record<string, string> = {
  EPF: "bg-blue-50 text-blue-700",
  ESI: "bg-purple-50 text-purple-700",
  PT: "bg-indigo-50 text-indigo-700",
  POSH: "bg-pink-50 text-pink-700",
  FIRE: "bg-orange-50 text-orange-700",
  UDISE: "bg-teal-50 text-teal-700",
  BUILDING: "bg-yellow-50 text-yellow-700",
  RTI: "bg-muted text-foreground",
  LWF: "bg-green-50 text-green-700",
};

export default function CompliancePage() {
  const [filter, setFilter] = useState("ALL");

  const { data: items = [], isLoading, error } = useQuery<ComplianceItem[]>({
    queryKey: ["compliance-items"],
    queryFn: async () => {
      const res = await api.get("/compliance/items");
      return res.data?.data ?? [];
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="p-4 text-red-500">Failed to load data. Please try again.</div>;

  const filtered = filter === "ALL" ? items : items.filter(i => i.status === filter || i.category === filter);
  const overdue = items.filter(i => i.status === "OVERDUE").length;
  const dueSoon = items.filter(i => {
    const days = Math.ceil((new Date(i.dueDate).getTime() - Date.now()) / 86400000);
    return days >= 0 && days <= 15 && i.status === "PENDING";
  }).length;

  const categories = [...new Set(items.map(i => i.category))];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Annual Compliance Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">EPF · ESI · PT · LWF · POSH · Fire Safety · UDISE · RTI</p>
        </div>
        <div className="flex gap-2">
          <a href="/compliance/posh" className="px-3 py-2 text-sm border border-input rounded-lg hover:bg-muted">POSH Module</a>
          <a href="/compliance/rte" className="px-3 py-2 text-sm border border-input rounded-lg hover:bg-muted">RTE Module</a>
          <button className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700">Export Calendar</button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-600">{overdue}</div>
          <div className="text-sm text-red-700 mt-1">Overdue Items</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-orange-600">{dueSoon}</div>
          <div className="text-sm text-orange-700 mt-1">Due in 15 days</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-blue-600">{items.filter(i => i.status === "IN_PROGRESS").length}</div>
          <div className="text-sm text-blue-700 mt-1">In Progress</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{items.filter(i => i.status === "COMPLETED").length}</div>
          <div className="text-sm text-green-700 mt-1">Completed</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter("ALL")} className={`text-xs px-3 py-1 rounded-full border ${filter === "ALL" ? "bg-gray-800 text-white" : "text-muted-foreground border-border hover:bg-muted"}`}>All</button>
        <button onClick={() => setFilter("OVERDUE")} className={`text-xs px-3 py-1 rounded-full border ${filter === "OVERDUE" ? "bg-red-600 text-white" : "text-red-600 border-red-200 hover:bg-red-50"}`}>Overdue</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} className={`text-xs px-3 py-1 rounded-full border ${filter === cat ? "bg-gray-800 text-white" : "text-muted-foreground border-border hover:bg-muted"}`}>{cat}</button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs uppercase">
            <tr>
              <th className="px-5 py-3 text-left">Compliance Item</th>
              <th className="px-5 py-3 text-left">Category</th>
              <th className="px-5 py-3 text-left">Due Date</th>
              <th className="px-5 py-3 text-left">Responsible</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(item => {
              const daysLeft = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / 86400000);
              return (
                <tr key={item.id} className={`hover:bg-muted ${item.status === "OVERDUE" ? "bg-red-50/50" : ""}`}>
                  <td className="px-5 py-3 font-medium text-foreground">{item.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor[item.category] ?? "bg-muted text-muted-foreground"}`}>{item.category}</span>
                  </td>
                  <td className="px-5 py-3">
                    <div className={`font-medium ${daysLeft < 0 ? "text-red-600" : daysLeft <= 7 ? "text-orange-600" : "text-foreground"}`}>
                      {new Date(item.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                    {daysLeft >= 0 && daysLeft <= 30 && item.status !== "COMPLETED" && (
                      <div className="text-xs text-muted-foreground">{daysLeft} days left</div>
                    )}
                    {daysLeft < 0 && <div className="text-xs text-red-500">{Math.abs(daysLeft)} days overdue</div>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{item.responsiblePerson}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[item.status]}`}>{item.status.replace("_", " ")}</span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    {item.documentUrl ? (
                      <a href={`/api/documents/${item.documentUrl}`} className="text-xs text-blue-600 hover:underline">View Doc</a>
                    ) : item.status !== "COMPLETED" ? (
                      <button className="text-xs text-muted-foreground border border-border px-3 py-1 rounded-md hover:bg-muted">Upload</button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
