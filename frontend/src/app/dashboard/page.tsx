"use client";

import { useRouter } from 'next/navigation'
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
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
} from 'recharts';

// --- 1. Define TypeScript types for our API data (with ServiceStatus) ---
interface ServiceStatus {
  service: string;
  status: 'Online' | 'Offline';
}

interface TimeSeriesStat {
  minute: string;
  count: number;
}

interface EndpointStat {
  endpoint: string;
  count: number;
}

interface DashboardData {
  service_status: ServiceStatus[];
  total_photos: number;
  total_users: number;
  storage_usage: {
    database_size_mb: number;
    photo_storage_size_mb: number;
    total_size_mb: number;
  };
  request_stats: {
    time_series: TimeSeriesStat[];
    top_endpoints_15m: EndpointStat[];
  };
}

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

// --- Helper component for the status indicator dot ---
const StatusIndicator = ({ status }: { status: 'Online' | 'Offline' }) => {
  const bgColor = status === 'Online' ? 'bg-green-500' : 'bg-red-500';
  return <span className={`mr-2 inline-block h-2.5 w-2.5 rounded-full ${bgColor}`}></span>;
};


export default function DashboardCharts() {

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {

      try {

        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) return '';
        
        const response = await fetch('http://localhost:8000/api/v1/dashboard', {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
          },
        });
        
        if (!response.ok) {

          if (response.status == 401) {
            router.push('/login')
            return ;
          }

          else if (response.status == 403) {
            router.push('/gallery')
            return ;
          }

          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const apiData: DashboardData = await response.json();
        setData(apiData);
        setError(null);
      }
      
      catch (e: any) {
        setError(e.message);
        console.error("Failed to fetch dashboard data:", e);
      }
      
      finally {
        setLoading(false);
      }
      
    };

    fetchData();
    const intervalId = setInterval(fetchData, 10000); 

    return () => clearInterval(intervalId);
  }, []);

  // --- Transform API data for our charts ---
  const requestTimeSeries = useMemo(() => {
    if (!data) return [];
    return data.request_stats.time_series.map(stat => ({
      name: stat.minute,
      requests: stat.count,
    }));
  }, [data]);
  
  const topEndpointsData = useMemo(() => {
    if (!data) return [];
    // Reverse the array to have the highest count at the top in the chart
    return data.request_stats.top_endpoints_15m.slice().reverse();
  }, [data]);

  const storagePieData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Photo Storage (MB)', value: data.storage_usage.photo_storage_size_mb },
      { name: 'Database (MB)', value: data.storage_usage.database_size_mb },
    ];
  }, [data]);

  const totalRequestsLast15m = useMemo(() => {
    if (!data) return 0;
    return data.request_stats.time_series.reduce((sum, current) => sum + current.count, 0);
  }, [data]);

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  if (!data) {
    return <div className="p-8 text-center">No data available.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-6 p-4 md:grid-cols-2 lg:grid-cols-4 lg:p-8">
      {/* Stat Cards */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">Total Photos</div>
        <div className="mt-1 text-2xl font-semibold">{data.total_photos.toLocaleString()}</div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">Total Users</div>
        <div className="mt-1 text-2xl font-semibold">{data.total_users.toLocaleString()}</div>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">Storage Used</div>
        <div className="mt-1 text-2xl font-semibold">{data.storage_usage.total_size_mb} MB</div>
      </div>
       <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-gray-500">Requests (15m)</div>
        <div className="mt-1 text-2xl font-semibold">{totalRequestsLast15m.toLocaleString()}</div>
      </div>

      {/* --- Service Status Card --- */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-1 lg:col-span-1">
        <h3 className="text-lg font-semibold">Service Status</h3>
        <div className="mt-4 space-y-3">
          {data.service_status.map(service => (
            <div key={service.service} className="flex items-center text-sm">
              <StatusIndicator status={service.status} />
              <span className="text-gray-700 h-2.5">{service.service}</span>
              <span className={`ml-auto font-medium ${service.status === 'Online' ? 'text-green-600' : 'text-red-600'}`}>
                {service.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Traffic Chart (15-Minute Time Series) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-1 lg:col-span-3">
        <h3 className="text-lg font-semibold">Real-time Traffic (Last 15 Minutes)</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={requestTimeSeries} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
                cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }}
              />
              <Bar dataKey="requests" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* --- Top Endpoints Bar Chart --- */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-2 lg:col-span-2">
         <h3 className="text-lg font-semibold">Top API Endpoints (15m)</h3>
         <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEndpointsData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis 
                        dataKey="endpoint" 
                        type="category" 
                        width={120} 
                        tick={{ fontSize: 10 }} 
                        axisLine={false} 
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }}
                        cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }}
                    />
                    <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={15}>
                        {topEndpointsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
         </div>
      </div>

      {/* Storage Pie Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:col-span-2 lg:col-span-2">
        <h3 className="text-lg font-semibold">Storage Distribution</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={storagePieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                {storagePieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={36} />
              <Tooltip formatter={(value) => `${value} MB`} contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}