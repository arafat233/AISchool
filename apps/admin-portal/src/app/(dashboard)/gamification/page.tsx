"use client";
/**
 * Gamification & Engagement Dashboard
 * Points, badges, leaderboards, house standings, rewards
 */
import { useState } from "react";

const HOUSE_DATA = [
  { house: "Phoenix", color: "bg-red-500", points: 4820, rank: 1 },
  { house: "Falcon", color: "bg-blue-500", points: 4210, rank: 2 },
  { house: "Lion", color: "bg-yellow-500", points: 3950, rank: 3 },
  { house: "Emerald", color: "bg-green-500", points: 3680, rank: 4 },
];

const TOP_STUDENTS = [
  { rank: 1, name: "Aarav Mehta", class: "XII-A", house: "Phoenix", points: 1840, badges: 7, streak: 42 },
  { rank: 2, name: "Sneha Patel", class: "XI-B", house: "Falcon", points: 1720, badges: 6, streak: 38 },
  { rank: 3, name: "Rohit Kumar", class: "XII-C", house: "Lion", points: 1650, badges: 5, streak: 31 },
  { rank: 4, name: "Kavya Rao", class: "X-A", house: "Emerald", points: 1540, badges: 5, streak: 29 },
  { rank: 5, name: "Arjun Nair", class: "XI-A", house: "Phoenix", points: 1480, badges: 4, streak: 25 },
];

const RECENT_BADGES = [
  { student: "Aarav Mehta", badge: "Scholar 🎓", tier: "SILVER", category: "ACADEMIC", awardedAt: "2 hours ago" },
  { student: "Sneha Patel", badge: "Champion 🏆", tier: "GOLD", category: "SPORTS", awardedAt: "5 hours ago" },
  { student: "Rohit Kumar", badge: "Perfect Attendance 🥇", tier: "GOLD", category: "ATTENDANCE", awardedAt: "Yesterday" },
];

const tierColor: Record<string, string> = {
  BRONZE: "text-orange-700 bg-orange-50",
  SILVER: "text-muted-foreground bg-muted",
  GOLD: "text-yellow-700 bg-yellow-50",
};

export default function GamificationPage() {
  const [activeTab, setActiveTab] = useState<"leaderboard" | "houses" | "badges" | "rewards">("leaderboard");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gamification & Engagement</h1>
          <p className="text-sm text-muted-foreground mt-1">Points, badges, streaks, house standings, rewards</p>
        </div>
        <a href="/gamification/config" className="px-4 py-2 text-sm border border-input rounded-lg hover:bg-muted">Configure Points</a>
      </div>

      {/* House Leaderboard Strip */}
      <div className="grid grid-cols-4 gap-3">
        {HOUSE_DATA.sort((a, b) => b.points - a.points).map((house, idx) => (
          <div key={house.house} className={`rounded-xl p-4 text-white ${house.color}`}>
            <div className="flex items-start justify-between">
              <div className="font-bold text-lg">{house.house}</div>
              <div className="text-2xl font-bold">#{idx + 1}</div>
            </div>
            <div className="text-2xl font-bold mt-1">{house.points.toLocaleString()}</div>
            <div className="text-sm opacity-80">house points</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["leaderboard", "houses", "badges", "rewards"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px ${activeTab === tab ? "border-gray-800 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "leaderboard" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-5 py-3 text-center w-12">Rank</th>
                <th className="px-5 py-3 text-left">Student</th>
                <th className="px-5 py-3 text-left">House</th>
                <th className="px-5 py-3 text-right">Points</th>
                <th className="px-5 py-3 text-center">Badges</th>
                <th className="px-5 py-3 text-center">Streak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TOP_STUDENTS.map(s => (
                <tr key={s.rank} className={`hover:bg-muted ${s.rank <= 3 ? "bg-yellow-50/30" : ""}`}>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-lg font-bold ${s.rank === 1 ? "text-yellow-500" : s.rank === 2 ? "text-muted-foreground" : s.rank === 3 ? "text-orange-500" : "text-muted-foreground"}`}>
                      {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-foreground">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.class}</div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{s.house}</td>
                  <td className="px-5 py-3 text-right font-bold text-foreground">{s.points.toLocaleString()}</td>
                  <td className="px-5 py-3 text-center text-muted-foreground">{s.badges} 🏅</td>
                  <td className="px-5 py-3 text-center">
                    <span className="text-orange-600 font-medium">🔥 {s.streak}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "badges" && (
        <div className="space-y-4">
          <h2 className="font-semibold text-foreground">Recently Awarded Badges</h2>
          {RECENT_BADGES.map((b, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-3xl">{b.badge.split(" ").pop()}</div>
                <div>
                  <div className="font-medium text-foreground">{b.student}</div>
                  <div className="text-sm text-muted-foreground">{b.badge.split(" ").slice(0, -1).join(" ")} · {b.category}</div>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tierColor[b.tier]}`}>{b.tier}</span>
                <div className="text-xs text-muted-foreground mt-1">{b.awardedAt}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: "Canteen Wallet Credit", description: "₹50 added to canteen wallet", cost: 200, icon: "🍔" },
            { name: "Library Priority Borrow", description: "Reserve a book before others for 7 days", cost: 100, icon: "📚" },
            { name: "Merit Certificate", description: "Printed certificate of excellence", cost: 500, icon: "📜" },
            { name: "Extra Library Time", description: "30 min extra library access per week", cost: 150, icon: "⏰" },
            { name: "House Captain for a Day", description: "Lead house activities for one day", cost: 1000, icon: "👑" },
            { name: "Cafeteria Special Meal", description: "Free special meal at cafeteria", cost: 300, icon: "🍽️" },
          ].map(reward => (
            <div key={reward.name} className="bg-card border border-border rounded-xl p-4">
              <div className="text-3xl mb-2">{reward.icon}</div>
              <div className="font-medium text-foreground">{reward.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{reward.description}</div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-bold text-purple-700">{reward.cost} pts</span>
                <button className="text-xs px-3 py-1 bg-gray-800 text-white rounded-md hover:bg-gray-700">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
