"use client";
import React, { useEffect, useMemo, useState } from "react";
import { API_BASE } from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type Totals = { photos: number; videos: number; users: number; requests: number };

// Flexible DTO: works with either objects [{label,value}] or numbers [] + optional labels[]
type SeriesArray =
  | Array<{ label: string; value: number }>
  | number[];

type StatsDTO = {
  totals: Totals;
  series: {
    users: SeriesArray;   // monthly/period user counts
    traffic: SeriesArray; // daily traffic counts
    storage: { videos: number; photos: number; free: number }; // percentages or GB — you decide
  };
  labels?: {
    users?: string[];   // optional: labels for users array if it's numbers
    traffic?: string[]; // optional: labels for traffic array if it's numbers
  };
};

type LabeledPoint = { label: string; value: number };

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`${API_BASE}/stats/`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const data: StatsDTO = await res.json();
        setStats(data);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4">
              <div className="h-4 w-24 bg-neutral-800/40 rounded" />
              <div className="h-8 w-32 bg-neutral-800/50 rounded mt-2" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-4 col-span-2 h-72" />
          <div className="card p-4 h-72" />
          <div className="card p-4 h-72" />
          <div className="card p-4 h-72" />
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="text-red-400">
        Failed to load dashboard: {err}{" "}
        <button
          className="ml-2 underline"
          onClick={() => {
            setLoading(true);
            setErr(null);
            setStats(null);
            // Re-run effect by toggling state:
            (async () => {
              try {
                const res = await fetch(`${API_BASE}/stats/`, { cache: "no-store" });
                if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
                const data: StatsDTO = await res.json();
                setStats(data);
              } catch (e: any) {
                setErr(e?.message ?? "Failed to load");
              } finally {
                setLoading(false);
              }
            })();
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-neutral-500">No data.</div>;
  }

  // --- Normalizers -----------------------------------------------------------
  const normalize = (arr: SeriesArray, fallbackPrefix: string, labelHints?: string[]): LabeledPoint[] => {
    if (!arr || !Array.isArray(arr)) return [];
    if (arr.length === 0) return [];
    // case 1: already labeled objects
    if (typeof arr[0] === "object") {
      return (arr as Array<any>)
        .map((d) => ({
          label: String(d.label ?? d.name ?? ""),
          value: Number(d.value ?? d.y ?? d.count ?? 0),
        }))
        .filter((d) => Number.isFinite(d.value) && d.label);
    }
    // case 2: plain numbers + optional labels[]
    const nums = arr as number[];
    return nums.map((v, i) => ({
      label: labelHints?.[i] ?? `${fallbackPrefix} ${i + 1}`,
      value: Number(v ?? 0),
    }));
  };

  // Users series (monthly or any period your API defines)
  const usersSeries = useMemo(
    () => normalize(stats.series.users, "Period", stats.labels?.users),
    [stats]
  );
  // Traffic series (daily or any period your API defines)
  const trafficSeries = useMemo(
    () => normalize(stats.series.traffic, "Day", stats.labels?.traffic),
    [stats]
  );

  // Storage
  const storageData = [
    { name: "Videos", value: stats.series.storage.videos },
    { name: "Photos", value: stats.series.storage.photos },
    { name: "Free", value: stats.series.storage.free },
  ];

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total photos" value={stats.totals.photos.toLocaleString()} />
        <StatCard label="Total videos" value={stats.totals.videos.toLocaleString()} />
        <StatCard label="Requests (Last 1 hour)" value={stats.totals.requests.toLocaleString()} />
        <StatCard label="Total users" value={stats.totals.users.toLocaleString()} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users line */}
        <div className="card p-4 col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Total Users</h3>
            <div className="text-sm text-neutral-400">This period</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={usersSeries.map(d => ({ name: d.label, value: d.value }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Referrers list (placeholder for real API field if you add one) */}
        <div className="card p-4">
          <h3 className="font-medium mb-2">Traffic by Website</h3>
          <div className="text-sm text-neutral-500 space-y-2">
            {/* If you later return referrers from the API, render them here.
                For now, show a compact fallback when nothing is provided. */}
            {(Array.isArray((stats as any).referrers) ? (stats as any).referrers : [
              { name: "Google" }, { name: "YouTube" }, { name: "Instagram" },
              { name: "Pinterest" }, { name: "Facebook" }, { name: "Twitter/X" },
            ]).map((r: any) => (
              <div key={r.name} className="flex items-center justify-between">
                <span>{r.name}</span>
                <span className="text-neutral-400">───</span>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic bar */}
        <div className="card p-4">
          <h3 className="font-medium mb-2">Traffic</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trafficSeries.map(d => ({ day: d.label, value: d.value }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Storage pie */}
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
            {storageData.map((s) => (
              <li key={s.name}>
                {s.name}: {formatStorageValue(s.value)}
              </li>
            ))}
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

// If your API returns storage as percent (0–100), this prints “%”.
// If it returns GB, change this to `${value} GB` or detect by range.
function formatStorageValue(value: number) {
  if (value <= 100 && value >= 0 && Number.isFinite(value)) return `${value}%`;
  return value.toLocaleString();
}
