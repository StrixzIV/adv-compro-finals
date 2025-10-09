import React, { useState, useEffect } from "react";
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

// --- TypeScript Interfaces for API Response ---

interface StatCardData {
  label: string;
  value: number;
  change: number;
}

interface TimeSeriesDataPoint {
  time: string;
  value: number;
}

interface StorageBreakdownItem {
  name: string;
  value: number;
}

interface SystemStats {
  stat_cards: StatCardData[];
  user_signups: TimeSeriesDataPoint[];
  storage_breakdown: StorageBreakdownItem[];
  daily_traffic: TimeSeriesDataPoint[];
}

// --- Main Component ---

export default function DashboardCharts() {

    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        
        const token = localStorage.getItem('accessToken'); 

        const fetchStats = async () => {
            if (!token) {
                setLoading(false);
                setError("Authentication token not found in local storage.");
                return;
            }

            try {
                const response = await fetch('http://localhost:8000/api/v1/dashboard/stats', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data: SystemStats = await response.json();
                setStats(data);
            } catch (e) {
                console.error("Failed to fetch dashboard stats:", e);
                setError("Could not load dashboard data.");
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []); // Effect runs once on component mount

    // --- Chart Configuration ---
    const PIE_COLORS = ["#6366F1", "#818CF8", "#A5B4FC", "#C7D2FE"];

    // --- Render Logic ---
    if (loading) {
        return <div className="flex h-96 items-center justify-center text-gray-500">Loading dashboard...</div>;
    }

    if (error || !stats) {
        return <div className="flex h-96 items-center justify-center rounded-lg bg-red-50 p-4 text-red-600">{error || "No data available."}</div>;
    }
    
    // Calculate total for storage breakdown percentage
    const storageTotal = stats.storage_breakdown.reduce((acc, item) => acc + item.value, 0);

    return (
        <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.stat_cards.map((card, index) => (
                    <div key={index} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <p className="text-sm text-gray-500">{card.label}</p>
                        <p className="mt-2 text-3xl font-bold">{card.value.toLocaleString()}</p>
                        <p className={`mt-2 text-sm font-medium ${card.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {card.change >= 0 ? '▲' : '▼'} {Math.abs(card.change * 100).toFixed(1)}% vs last month
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* User Signups Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
                    <h3 className="text-lg font-semibold">User Signups (Last 30 Days)</h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer>
                            <AreaChart data={stats.user_signups} margin={{ top: 20, right: 20, bottom: 0, left: -10 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }} />
                                <Area type="monotone" dataKey="value" stroke="#6366F1" fill="#818CF8" fillOpacity={0.3} strokeWidth={2} name="New Users" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Storage Breakdown Chart */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold">Storage Breakdown</h3>
                     <div className="h-48 w-full">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={stats.storage_breakdown} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={3} labelLine={false}>
                                    {stats.storage_breakdown.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => `${value} items`} contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-gray-600">
                      {stats.storage_breakdown.map((item, index) => (
                          <div key={index} className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} /> 
                              {item.name}
                              <span className="ml-auto font-medium">
                                  {storageTotal > 0 ? ((item.value / storageTotal) * 100).toFixed(1) : 0}%
                              </span>
                          </div>
                      ))}
                    </div>
                </div>
            </div>

             {/* Daily Traffic */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold">Daily Traffic (Last 15 Days)</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer>
                        <BarChart data={stats.daily_traffic} margin={{ top: 20, right: 20, bottom: 0, left: -10 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB" }} cursor={{ fill: '#F3F4F6' }}/>
                            <Bar dataKey="value" fill="#818CF8" barSize={20} radius={[4, 4, 0, 0]} name="Requests"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </>
    );
}

