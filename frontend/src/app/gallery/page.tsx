"use client";

import React from "react";
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'

import {
  Cloud,
  Images,
  Upload,
  Album,
  Heart,
  Trash2,
  LayoutDashboard,
  Settings,
  Search,
  Filter,
  X,
  Eye,
  Undo2,
  LogOut
} from "lucide-react";
import { motion } from "framer-motion";
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
import UploadPanel from "./UploadPanel";

interface PhotoItem {
  id: string; // uuid.UUID is a string in JSON
  filename: string;
  caption: string | null;
  upload_date: string; // datetime.datetime is a string in JSON
  file_url: string; // URL to the original file
  thumbnail_url: string; // URL to the thumbnail
  exif_data: Record<string, any> | null;
}

interface GalleryItem {
  id: string | string; // Use string to match the UUID, or update component logic if only number is expected
  title: string;
  date: string;
  size: string; // You'll need to derive this
  src: string; // This will be the thumbnail_url or file_url
  thumbnail: string;
  preview: boolean;
  trashed: boolean;
  favorite: boolean; // You'll need to set a default for this
  // Add other properties from PhotoItem if your component needs them
  // e.g., filename: string;
}

type SidebarLinkProps = {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

function SidebarLink({ icon: Icon, label, active = false, onClick }: SidebarLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-gray-900/5 text-gray-900 shadow-sm"
          : "text-gray-600 hover:bg-gray-900/5 hover:text-gray-900"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

type Photo = {
  id: string;
  title: string;
  date: string;
  size: string;
  src: string;
  thumbnail: string;
  preview?: boolean;
  favorite?: boolean;
  trashed?: boolean;
};

type PhotoCardProps = {
  p: Photo;
  mode?: "photos" | "favorites" | "trash";
  onPreview?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
};

function PhotoCard({ p, mode = "photos", onPreview, onToggleFavorite, onTrash, onRestore }: PhotoCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="group relative overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200"
      onClick={() => onPreview?.(p.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onPreview?.(p.id);
      }}
    >
      <div className="relative aspect-[4/3] w-full">
        <img src={p.thumbnail} alt={p.title} className="h-full w-full object-cover" loading="lazy" />

        {/* file size badge */}
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          {p.size}
        </div>

        {/* preview overlay */}
        <div
          className={`pointer-events-none absolute inset-0 grid place-items-center transition ${
            p.preview ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } bg-black/0 group-hover:bg-black/20`}
        >
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow-sm">
            <Eye size={14} /> Preview
          </span>
        </div>

        {/* action buttons */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
          {(mode === "photos" || mode === "favorites") && (
            <button
              aria-label={p.favorite ? "Unfavorite" : "Add to favorites"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(p.id);
              }}
              className={`rounded-full bg-white/90 p-2 shadow-sm ring-1 ring-gray-200 hover:bg-white ${
                p.favorite ? "text-red-500" : "text-gray-700"
              }`}
            >
              <Heart size={16} strokeWidth={2} fill={p.favorite ? "currentColor" : "none"} />
            </button>
          )}
          {mode !== "trash" && (
            <button
              aria-label="Move to Trash"
              onClick={(e) => {
                e.stopPropagation();
                onTrash?.(p.id);
              }}
              className="rounded-full bg-white/90 p-2 text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-white"
            >
              <Trash2 size={16} />
            </button>
          )}
          {mode === "trash" && (
            <button
              aria-label="Restore"
              onClick={(e) => {
                e.stopPropagation();
                onRestore?.(p.id);
              }}
              className="rounded-full bg-white/90 p-2 text-gray-700 shadow-sm ring-1 ring-gray-200 hover:bg-white"
            >
              <Undo2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="text-sm font-medium text-gray-900">{p.title}</div>
          <div className="text-xs text-gray-500">{p.date}</div>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-600 shadow-sm">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}

function PreviewModal({
  photo,
  onClose,
}: {
  photo: Photo | undefined;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-gray-700 shadow-lg ring-1 ring-gray-200 hover:bg-white"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X size={18} />
        </button>
        <img src={photo.src} alt={photo.title} className="max-h-[80vh] w-full rounded-xl object-contain shadow-2xl" />
        <div className="mt-3 rounded-xl bg-white/95 p-4 shadow-sm">
          <div className="text-sm font-medium text-gray-900">{photo.title}</div>
          <div className="text-xs text-gray-500">{photo.date} · {photo.size}</div>
        </div>
      </div>
    </div>
  );
}

export default function PhotoCloud() {

  const [view, setView] = useState<ViewType>("photos");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadThumbnail = async (apiUrl: string) => {

    const accessToken = localStorage.getItem("accessToken");

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        // 3. Attach the JWT to the Authorization header
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      
      if (response.status === 401) {
         router.push('/login'); 
      }
      throw new Error(`Failed to fetch photos: ${response.statusText}`);
    }

    const blobImg = await response.blob()
    const blobBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blobImg);
    });

    return blobBase64

  }

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

  type ViewType = "photos" | "upload" | "albums" | "favorites" | "trash" | "dashboard" | "settings";

  const titleMap: Record<ViewType, string> = {
    photos: "Photos",
    upload: "Upload",
    albums: "Albums",
    favorites: "Favorites",
    trash: "Trash",
    dashboard: "Dashboard",
    settings: "Settings",
  };

  const counts = {
    total: items.length,
    favorites: items.filter((p) => p.favorite && !p.trashed).length,
    trashed: items.filter((p) => p.trashed).length,
  };

  const visiblePhotos = (() => {
    if (view === "favorites") return items.filter((p) => p.favorite && !p.trashed);
    if (view === "trash") return items.filter((p) => p.trashed);
    return items.filter((p) => !p.trashed);
  })();

  // actions
  const toggleFavorite = (id: string) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
  const moveToTrash = (id: string) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, trashed: true, favorite: false } : p)));
  const restoreFromTrash = (id: string) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, trashed: false } : p)));

  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsAuthenticated(false);
    router.push('/login');
  };

  useEffect(() => {

    const hash = window.location.hash;

    if (hash.startsWith('#/auth_success')) {
      
      const params = new URLSearchParams(hash.substring('#/auth_success?'.length));
      const token = params.get('token');
      const tokenType = params.get('token_type');
      
      if (token && tokenType === 'bearer') {
        localStorage.setItem('accessToken', token);
        setIsAuthenticated(true);

        if (window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        
        else {
          window.location.hash = '';
        }

      }
    }
    
    else {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setIsAuthenticated(true);
      }
    }

    setIsLoading(false);
    
  }, []);

  useEffect(() => {
    const fetchPhotos = async () => {
      setIsLoading(true);
      setError(null);
      
      // 1. Get the JWT from local storage
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Authentication token not found. Please log in.");
        setIsLoading(false);
        return;
      }

      // 2. Define the API endpoint
      // NOTE: Replace 'http://localhost:8000' with your actual API base URL.
      // A common practice is to use an environment variable: 
      // const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
      const API_BASE_URL = 'http://localhost:8000'; 
      const apiUrl = `${API_BASE_URL}/api/v1/storage/gallery`;

      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
            // 3. Attach the JWT to the Authorization header
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Handle API errors (e.g., 401 Unauthorized, 404 Not Found)
          if (response.status === 401) {
             // Example: Redirect to login page on unauthorized
             router.push('/login'); 
          }
          throw new Error(`Failed to fetch photos: ${response.statusText}`);
        }

        const data: PhotoItem[] = await response.json();
        
        const formattedItemsPromises = data.map(async (item) => ({
            id: item.id,
            title: item.caption || item.filename,
            date: new Date(item.upload_date).toLocaleDateString(),
            size: 'N/A',
            src: await loadThumbnail(`${API_BASE_URL}/api/v1${item.file_url}`),
            thumbnail: await loadThumbnail(`${API_BASE_URL}/api/v1${item.thumbnail_url}`),
            preview: false,
            trashed: false,
            favorite: false,
        }));
        
        const formattedItems = await Promise.all(formattedItemsPromises);

        setItems(formattedItems);
      } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
    return () => {};
  }, [isAuthenticated, router]);

  if (isLoading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    router.push('/login')
  }

  const mappedItems = items.map((p) => ({
    ...p,
  }));

  function renderContent() {
    switch (view) {
      case "photos":
      case "favorites":
        return (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePhotos.map((p) => (
              <PhotoCard key={p.id} p={p} mode={view} onPreview={(id) => setPreviewId(id)} onToggleFavorite={toggleFavorite} onTrash={moveToTrash} />
            ))}
            {visiblePhotos.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No items" subtitle="Nothing to show yet." />
              </div>
            )}
          </section>
        );
      case "upload":
        return <UploadPanel />;
      case "albums":
        return (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <EmptyState title="No albums yet" subtitle="Create an album to organize your photos." />
            <EmptyState title="Tip" subtitle="Select photos and add to a new album." />
          </section>
        );
      case "trash":
        return (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePhotos.map((p) => (
              <PhotoCard key={p.id} p={p} mode="trash" onPreview={(id) => setPreviewId(id)} onRestore={restoreFromTrash} />
            ))}
            {visiblePhotos.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="Trash is empty" subtitle="Deleted items will appear here for 30 days." />
              </div>
            )}
          </section>
        );
      case "dashboard":
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
      case "settings":
        return (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <div className="text-sm font-medium">Appearance</div>
              <div className="mt-2 text-xs text-gray-500">(Demo) Your theme is set to Light.</div>
            </div>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto flex max-w-[1200px] gap-6 p-4 md:p-6">
        {/* Sidebar */}
        <aside className="sticky top-4 hidden h-[92vh] w-60 shrink-0 flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 md:flex">
          <div className="flex items-center gap-2 px-2 py-1">
            <Cloud size={22} className="text-gray-900" />
            <span className="text-[15px] font-semibold">PhotoCloud</span>
          </div>

          <nav className="mt-4 space-y-1">
            <SidebarLink icon={Images} label="Photos" active={view === "photos"} onClick={() => setView("photos")} />
            <SidebarLink icon={Upload} label="Upload" active={view === "upload"} onClick={() => setView("upload")} />
            <SidebarLink icon={Album} label="Albums" active={view === "albums"} onClick={() => setView("albums")} />
            <SidebarLink icon={Heart} label="Favorites" active={view === "favorites"} onClick={() => setView("favorites")} />
            <SidebarLink icon={Trash2} label="Trash" active={view === "trash"} onClick={() => setView("trash")} />
            <SidebarLink icon={LayoutDashboard} label="Dashboard" active={view === "dashboard"} onClick={() => setView("dashboard")} />
          </nav>

          <div className="mt-auto space-y-2">
            
            <SidebarLink icon={Settings} label="Settings" active={view === "settings"} onClick={() => setView("settings")} />
            
            <SidebarLink 
                icon={LogOut} 
                label="Logout" 
                onClick={handleLogout} 
            />
            
            <div className="flex items-center gap-3 rounded-xl px-3 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-xs font-semibold">CT</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">Chindhanai Tho...</div>
                <div className="truncate text-xs text-gray-500">chindew2549@gmail.com</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1">
          {/* Top bar */}
          <header className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">{titleMap[view]}</h1>

            <div className="flex items-center gap-2">
              {view === "photos" && (
                <div className="relative hidden w-72 items-center md:flex">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search photos..."
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-gray-400 focus:border-gray-300"
                  />
                </div>
              )}
              {view === "photos" && (
                <button className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50">
                  <Filter size={16} />
                  Filters
                </button>
              )}
            </div>
          </header>

          {/* Content */}
          {renderContent()}
        </main>
      </div>

      {/* Preview modal */}
      <PreviewModal photo={items.find((p) => p.id === previewId)} onClose={() => setPreviewId(null)} />
    </div>
  );
}


