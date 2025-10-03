"use client";

import React from "react";
import { useState, useEffect, useMemo } from "react";

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
  LogOut
} from "lucide-react";

import UploadPanel from "./components/UploadPanel";
import SidebarLink from "./components/SidebarLink";
import PhotoCard from "./components/PhotoCard";
import EmptyState from "./components/EmptyState";
import PreviewModal from "./components/PreviewModal";
import DashboardCharts from "./components/DashboardCharts";

import { PhotoItem, GalleryItem, ViewType } from "./interfaces/types";


export default function PhotoCloud() {

  const [view, setView] = useState<ViewType>("photos");
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  const titleMap: Record<ViewType, string> = {
    photos: "Photos",
    upload: "Upload",
    albums: "Albums",
    favorites: "Favorites",
    trash: "Trash",
    dashboard: "Dashboard",
    settings: "Settings",
  };

  // Memoized filtered photos based on current view
  const visiblePhotos = useMemo(() => {
    if (view === "favorites") return items.filter((p) => p.favorite && !p.trashed);
    if (view === "trash") return items.filter((p) => p.trashed);
    return items.filter((p) => !p.trashed);
  }, [items, view]);


  // Photo Actions
  const toggleFavorite = (id: string) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));
  const moveToTrash = (id: string) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, trashed: true, favorite: false } : p)));
  const restoreFromTrash = (id: string) => setItems((prev) => prev.map((p) => (p.id === id ? { ...p, trashed: false } : p)));


  // Auth/Logout handlers
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsAuthenticated(false);
    router.push('/login');
  };

  // Helper function to load thumbnail as a data URL (simulating fetching the binary data)
  const loadThumbnail = async (apiUrl: string) => {

    const accessToken = localStorage.getItem("accessToken");

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
         router.push('/login'); 
      }
      throw new Error(`Failed to fetch photo asset: ${response.statusText}`);
    }

    const blobImg = await response.blob()
    const blobBase64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blobImg);
    });

    return blobBase64
  }

  // --- useEffect for initial auth check and token handling ---
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
        } else {
          window.location.hash = '';
        }
      }
    } else {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setIsAuthenticated(true);
      }
    }

    setIsLoading(false);
  }, [router]);


  // --- useEffect for fetching photos ---
  useEffect(() => {
    const fetchPhotos = async () => {
      // Only proceed if authenticated
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);
      
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        setError("Authentication token not found. Please log in.");
        setIsLoading(false);
        return;
      }

      // NOTE: Replace 'http://localhost:8000' with your actual API base URL.
      const API_BASE_URL = 'http://localhost:8000'; 
      const apiUrl = `${API_BASE_URL}/api/v1/storage/gallery`;

      try {
        const response = await fetch(apiUrl, {
          method: "GET",
          headers: {
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

        const data: PhotoItem[] = await response.json();
        
        // This is where we fetch the actual thumbnail and full image as base64 URLs
        const formattedItemsPromises = data.map(async (item) => ({
            id: item.id,
            title: item.caption || item.filename,
            date: new Date(item.upload_date).toLocaleDateString(),
            size: 'N/A', // Update size to be read from PhotoItem if available
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

    if (isAuthenticated) {
        fetchPhotos();
    }
    
  }, [isAuthenticated, router]);


  // --- Conditional Renders ---
  if (isLoading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // --- Content Render Switch ---
  function renderContent() {
    switch (view) {
      case "photos":
      case "favorites":
        return (
          <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visiblePhotos.map((p) => (
              <PhotoCard 
                key={p.id} 
                p={p} 
                mode={view} 
                onPreview={(id: string) => setPreviewId(id)} 
                onToggleFavorite={toggleFavorite} 
                onTrash={moveToTrash} 
              />
            ))}
            {visiblePhotos.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="No items" subtitle="Nothing to show yet." />
              </div>
            )}
          </section>
        );
      case "upload":
        return <UploadPanel />; // Assuming UploadPanel is a separate component
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
              <PhotoCard 
                key={p.id} 
                p={p} 
                mode="trash" 
                onPreview={(id: string) => setPreviewId(id)} 
                onRestore={restoreFromTrash} 
              />
            ))}
            {visiblePhotos.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="Trash is empty" subtitle="Deleted items will appear here for 30 days." />
              </div>
            )}
          </section>
        );
      case "dashboard":
        return <DashboardCharts items={items} />;
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
            <SidebarLink icon={Heart} label={`Favorites (${items.filter(p => p.favorite && !p.trashed).length})`} active={view === "favorites"} onClick={() => setView("favorites")} />
            <SidebarLink icon={Trash2} label={`Trash (${items.filter(p => p.trashed).length})`} active={view === "trash"} onClick={() => setView("trash")} />
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

          {/* Display error message if present */}
          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert">
                <span className="font-medium">Error:</span> {error}
            </div>
          )}
        </main>
      </div>

      {/* Preview modal */}
      <PreviewModal photo={items.find((p) => p.id === previewId)} onClose={() => setPreviewId(null)} />
    </div>
  );
}
