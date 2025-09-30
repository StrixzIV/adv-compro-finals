"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Images,
  Upload as UploadIcon,
  Album,
  Heart,
  Trash2,
  LayoutDashboard,
  Settings,
  Search as SearchIcon,
  Filter,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// --- Types shared with your app ---
type Photo = {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  size: string;
  src: string;
  preview?: boolean;
  favorite?: boolean;
  trashed?: boolean;
};

// --- Fallback mock data ---
const fallbackPhotos: Photo[] = [
  {
    id: 1,
    title: "Mountain Landscape",
    date: "2025-09-10",
    size: "4.2 MB",
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop",
    preview: true,
  },
  {
    id: 2,
    title: "City Architecture",
    date: "2025-09-09",
    size: "3.8 MB",
    src: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1200&auto=format&fit=crop",
  },
  // more mock data...
];

export default function DashboardPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const LIST_PATH = "/photos/";

  // Load photos from API (fallback to mock if not configured)
  useEffect(() => {
    let abort = false;
    const load = async () => {
      try {
        if (!API_BASE) throw new Error("No API base env");
        const res = await fetch(`${API_BASE}${LIST_PATH}`, { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = (await res.json()) as Photo[];
        if (!abort) setPhotos(Array.isArray(data) ? data : fallbackPhotos);
      } catch {
        if (!abort) setPhotos(fallbackPhotos);
      }
    };
    load();
    return () => {
      abort = true;
    };
  }, [API_BASE]);

  // --- Derived stats & chart data ---
  const totals = useMemo(() => {
    const totalPhotos = photos.filter((p) => !p.trashed).length;
    const totalFavorites = photos.filter((p) => p.favorite && !p.trashed).length;

    // Disk usage
    const totalMB = photos
      .filter((p) => !p.trashed)
      .reduce((acc, p) => acc + parseMB(p.size), 0);

    // Uploads per day (for AreaChart)
    const byDate = new Map<string, number>();
    for (const p of photos) {
      if (p.trashed) continue;
      byDate.set(p.date, (byDate.get(p.date) ?? 0) + 1);
    }
    const uploadsOverTime = [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([date, count]) => ({ date, uploads: count }));

    return {
      totalPhotos,
      totalFavorites,
      totalMB,
      uploadsOverTime,
    };
  }, [photos]);

  // --- Fallback storage pie ---
  const storagePie = useMemo(() => {
    const photosMB = totals.totalMB;
    const videosMB = photosMB * 1.8;
    const freeMB = Math.max(0, 1024 - (photosMB + videosMB)); 

    return [
      { name: "Videos", value: videosMB },
      { name: "Photos", value: photosMB },
      { name: "Free space", value: freeMB },
    ];
  }, [totals.totalMB]);

  // Sidebar navigation
  const SidebarLink = ({ icon: Icon, label, href }: { icon: React.ElementType, label: string, href: string }) => {
    const pathname = usePathname();
    const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
    return (
      <Link href={href} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${active ? "bg-gray-900/5 text-gray-900 shadow-sm" : "text-gray-600 hover:bg-gray-900/5 hover:text-gray-900"}`}>
        <Icon size={18} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white p-4">
        <div className="mb-6 text-lg font-semibold">PhotoCloud</div>
        <div className="flex flex-col gap-2">
          <SidebarLink icon={Images} label="Photos" href="/photos" />
          <SidebarLink icon={UploadIcon} label="Upload" href="/upload" />
          <SidebarLink icon={Album} label="Albums" href="/albums" />
          <SidebarLink icon={Heart} label="Favorites" href="/favorites" />
          <SidebarLink icon={Trash2} label="Trash" href="/trash" />
          <SidebarLink icon={LayoutDashboard} label="Dashboard" href="/dashboard" />
          <SidebarLink icon={Settings} label="Settings" href="/settings" />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
        </header>

        {/* Stat Cards */}
        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="text-xs text-gray-500">Total photos</div>
            <div className="mt-1 text-2xl font-semibold">{totals.totalPhotos.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="text-xs text-gray-500">Favorites</div>
            <div className="mt-1 text-2xl font-semibold">{totals.totalFavorites.toLocaleString()}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="text-xs text-gray-500">Disk usage (approx.)</div>
            <div className="mt-1 text-2xl font-semibold">{formatMB(totals.totalMB)}</div>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="text-xs text-gray-500">Last updated</div>
            <div className="mt-1 text-2xl font-semibold">
              {photos.length ? photos[0].date : "—"}
            </div>
          </div>
        </section>

        {/* Charts Row */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Uploads Over Time */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-lg font-semibold">Photo uploads over time</h2>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={totals.uploadsOverTime}>
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <CartesianGrid strokeDasharray="5 5" />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="uploads" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Storage Distribution */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="mb-4 text-lg font-semibold">Storage distribution</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={storagePie}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={({ name }) => name}
                >
                  {storagePie.map((_, i) => (
                    <Cell key={i} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </section>
      </main>
    </div>
  );
}
