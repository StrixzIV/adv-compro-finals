import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { GalleryItem } from "../interfaces/types";

type DashboardChartsProps = {
    items: GalleryItem[];
};

export default function DashboardCharts({ items }: DashboardChartsProps) {
    // ---------------- Dashboard demo data (edit freely) ----------------
    const stats = {
      totalPhotos: items.length + 7240, // demo value to look rich :)
      totalVideos: 3671,
      lastHourRequests: 156,
      totalUsers: 2318,
    };
  
    const usersLine = [
      { name: "Jan", thisYear: 12, lastYear: 6 },
      { name: "Feb", thisYear: 8, lastYear: 12 },
      { name: "Mar", thisYear: 13, lastYear: 9 },
      { name: "Apr", thisYear: 22, lastYear: 8 },
      { name: "May", thisYear: 25, lastYear: 14 },
      { name: "Jun", thisYear: 19, lastYear: 18 },
      { name: "Jul", thisYear: 21, lastYear: 26 },
    ];
  
    const trafficDaily = [
      { day: "9 Sep", value: 14 },
      { day: "10 Sep", value: 30 },
      { day: "11 Sep", value: 22 },
      { day: "12 Sep", value: 32 },
      { day: "13 Sep", value: 12 },
      { day: "14 Sep", value: 24 },
    ];
  
    const siteTraffic = [
      { name: "Google", value: 18 },
      { name: "YouTube", value: 14 },
      { name: "Instagram", value: 16 },
      { name: "Pinterest", value: 28 },
      { name: "Facebook", value: 12 },
      { name: "Twitter", value: 15 },
    ];
  
    const storagePie = [
      { name: "Videos", value: 52.1 },
      { name: "Photos", value: 22.8 },
      { name: "Free space", value: 13.9 },
    ];
    const PIE_COLORS = ["#111827", "#60A5FA", "#10B981"]; // gray-900, blue-400, emerald-500

    return (
        <div className="space-y-4">
            {/* TOP STATS */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="text-xs text-gray-500">Total photos</div>
                <div className="mt-1 text-2xl font-semibold">{stats.totalPhotos.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="text-xs text-gray-500">Total videos</div>
                <div className="mt-1 text-2xl font-semibold">{stats.totalVideos.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="text-xs text-gray-500">Requests (Last 1 hour)</div>
                <div className="mt-1 text-2xl font-semibold">{stats.lastHourRequests.toLocaleString()}</div>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="text-xs text-gray-500">Total Users</div>
                <div className="mt-1 text-2xl font-semibold">{stats.totalUsers.toLocaleString()}</div>
              </div>
            </div>

            {/* MIDDLE: USERS AREA + TRAFFIC BY WEBSITE */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Area chart */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
                <div className="mb-3 flex items-center gap-4">
                  <div className="text-sm font-medium text-gray-900">Total Users</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-900" />This year</span>
                    <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-gray-300" />Last year</span>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usersLine} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="c1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#111827" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="c2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D1D5DB" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#D1D5DB" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                      <YAxis domain={[0, 30]} tickFormatter={(v) => `${v}K`} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                      <Tooltip formatter={(v) => `${v}K`} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }} />
                      <Area type="monotone" dataKey="thisYear" stroke="#111827" strokeWidth={2} fill="url(#c1)" />
                      <Area type="monotone" dataKey="lastYear" stroke="#D1D5DB" strokeWidth={2} fill="url(#c2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Traffic by Website */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="mb-4 text-sm font-medium text-gray-900">Traffic by Website</div>
                <ul className="space-y-3">
                  {siteTraffic.map((s) => (
                    <li key={s.name} className="text-sm text-gray-700">
                      <div className="mb-1 flex items-center justify-between">
                        <span>{s.name}</span>
                        <span className="text-xs text-gray-500">{s.value}K</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-gray-900"
                          style={{ width: `${Math.min(100, (s.value / 30) * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* BOTTOM: BAR + PIE */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* Bar chart */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 lg:col-span-2">
                <div className="mb-3 text-sm font-medium text-gray-900">Traffic</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trafficDaily} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                      <CartesianGrid stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                      <YAxis domain={[0, 35]} tickFormatter={(v) => `${v}K`} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                      <Tooltip formatter={(v) => `${v}K`} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#60A5FA" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Donut chart */}
              <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                <div className="mb-3 text-sm font-medium text-gray-900">Storage Distribution</div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={storagePie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                        {storagePie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} />
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: PIE_COLORS[0] }} /> Videos <span className="ml-auto font-medium">52.1%</span></div>
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: PIE_COLORS[1] }} /> Photos <span className="ml-auto font-medium">22.8%</span></div>
                  <div className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: PIE_COLORS[2] }} /> Free space <span className="ml-auto font-medium">13.9%</span></div>
                </div>
              </div>
            </div>
        </div>
    );
}