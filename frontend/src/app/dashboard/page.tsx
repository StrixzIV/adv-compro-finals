"use client";
import React, { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

type Stats = {
  totals: { photos: number; videos: number; users: number; requests: number };
  series: { users: number[]; traffic: number[]; storage: { videos: number; photos: number; free: number } };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    fetch(`${API_BASE}/stats/`).then(r => r.json()).then(setStats).catch(e => console.error(e));
  }, []);

  if (!stats) return <div className="text-neutral-500">Loading…</div>;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul"];
  const usersData = stats.series.users.map((v, i) => ({ name: months[i], value: v }));
  const trafficDays = ["9 Sep","10 Sep","11 Sep","12 Sep","13 Sep","14 Sep"];
  const trafficData = stats.series.traffic.map((v, i) => ({ day: trafficDays[i], value: v }));
  const storageData = [
    { name: "Videos", value: stats.series.storage.videos },
    { name: "Photos", value: stats.series.storage.photos },
    { name: "Free", value: stats.series.storage.free },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total photos" value={stats.totals.photos.toLocaleString()} />
        <StatCard label="Total videos" value={stats.totals.videos.toLocaleString()} />
        <StatCard label="Requests (Last 1 hour)" value={stats.totals.requests.toLocaleString()} />
        <StatCard label="Total Users" value={stats.totals.users.toLocaleString()} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-4 col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Total Users</h3>
            <div className="text-sm text-neutral-400">This year · Last year</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-medium mb-2">Traffic by Website</h3>
          <div className="text-sm text-neutral-500 space-y-2">
            {"Google, YouTube, Instagram, Pinterest, Facebook, Twitter".split(", ").map((n) => (
              <div key={n} className="flex items-center justify-between"><span>{n}</span><span className="text-neutral-400">───</span></div>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-medium mb-2">Traffic</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="font-medium mb-2">Storage Distribution</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie dataKey="value" data={storageData} outerRadius={100} label>
                  {storageData.map((_, idx) => (<Cell key={idx} />))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="text-sm text-neutral-500 mt-2 space-y-1">
            {storageData.map(s => (<li key={s.name}>{s.name}: {s.value}%</li>))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-neutral-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}