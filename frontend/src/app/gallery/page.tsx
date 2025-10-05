"use client";

import React, { useEffect, useMemo, useRef, useState } from "react"; // NEW: useRef
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Images,
  Upload as UploadIcon,
  Album as AlbumIcon,
  Heart,
  Trash2,
  LayoutDashboard,
  Settings,
  Search as SearchIcon,
  Filter,
  Eye,
  Undo2,
  X,
  Download,
  Plus,
  ChevronLeft,
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
} from "recharts";

// -------------------- Types --------------------

type Photo = {
  id: number;
  title: string;
  date: string; // YYYY-MM-DD
  size: string; // e.g., "4.2 MB"
  src: string;
  preview?: boolean;
  favorite?: boolean;
  trashed?: boolean;
};

type ViewType =
  | "photos"
  | "upload"
  | "albums"
  | "favorites"
  | "trash"
  | "dashboard"
  | "settings";

/** Backend may return extra fields like { url } or { path } */
type ApiCreated = Partial<Photo> & {
  url?: string;
  path?: string;
  image_url?: string;
};

// NEW: album type
type Album = {
  id: number;
  name: string;
  photoIds: number[];
  createdAt: string; // YYYY-MM-DD
};

// -------------------- Utilities --------------------

function formatBytesToMB(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function todayStr() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// -------------------- Mock data (fallback) --------------------

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
  {
    id: 3,
    title: "Portrait Session",
    date: "2025-09-08",
    size: "5.1 MB",
    src: "https://images.unsplash.com/photo-1507120410856-1f35574c3b45?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Food Photography",
    date: "2025-09-07",
    size: "2.9 MB",
    src: "https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 5,
    title: "Sunset Travel",
    date: "2025-09-06",
    size: "3.2 MB",
    src: "https://images.unsplash.com/photo-1501973801540-537f08ccae7b?q=80&w=1200&auto=format&fit=crop",
  },
  {
    id: 6,
    title: "Abstract Art",
    date: "2025-09-05",
    size: "4.7 MB",
    src: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?q=80&w=1200&auto=format&fit=crop",
  },
];

// -------------------- Small UI atoms --------------------

function SidebarLink({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
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

/** Next.js-aware nav link for real routes (Dashboard) */
function SidebarNavLink({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(href + "/"));

  return (
    <Link
      href={href}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-gray-900/5 text-gray-900 shadow-sm"
          : "text-gray-600 hover:bg-gray-900/5 hover:text-gray-900"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

function PhotoCard({
  p,
  mode = "photos",
  onPreview,
  onToggleFavorite,
  onTrash,
  onRestore,
}: {
  p: Photo;
  mode?: "photos" | "favorites" | "trash";
  onPreview?: (id: number) => void;
  onToggleFavorite?: (id: number) => void;
  onTrash?: (id: number) => void;
  onRestore?: (id: number) => void;
}) {
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
        <img
          src={p.src}
          alt={p.title}
          className="h-full w-full object-cover"
          loading="lazy"
        />

        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          {p.size}
        </div>

        <div
          className={`pointer-events-none absolute inset-0 grid place-items-center transition ${
            p.preview ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          } bg-black/0 group-hover:bg-black/20`}
        >
          <span className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium shadow-sm">
            <Eye size={14} /> Preview
          </span>
        </div>

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
              <Heart
                size={16}
                strokeWidth={2}
                fill={p.favorite ? "currentColor" : "none"}
              />
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

// -------------------- Preview Modal --------------------

function PreviewModal({
  photo,
  meta,
  onClose,
  onToggleFavorite,
  onTrash,
  onRestore,
  inTrash,
  // NEW: album controls
  albums,
  onAddToAlbum,
  onRemoveFromAlbum,
  onQuickCreateAndAdd,
  photoAlbumNames,
}: {
  photo: Photo;
  meta: { width: number; height: number } | null;
  onClose: () => void;
  onToggleFavorite: (id: number) => void;
  onTrash: (id: number) => void;
  onRestore: (id: number) => void;
  inTrash: boolean;
  albums: Album[];
  onAddToAlbum: (albumId: number, photoId: number) => void;
  onRemoveFromAlbum: (albumId: number, photoId: number) => void;
  onQuickCreateAndAdd: (name: string, photoId: number) => void;
  photoAlbumNames: string[];
}) {
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | "">("");
  const [newAlbumName, setNewAlbumName] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="relative grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative bg-black/5">
          <img src={photo.src} alt={photo.title} className="h-full w-full object-contain" />
          <a
            href={photo.src}
            download
            className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 text-sm shadow ring-1 ring-gray-200 hover:bg-white"
          >
            <Download size={16} /> Download
          </a>
        </div>

        {/* Details */}
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{photo.title}</h3>
              <p className="text-xs text-gray-500">{photo.date}</p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
            >
              <X size={16} />
            </button>
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Size</dt>
              <dd className="font-medium text-gray-900">{photo.size || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Dimensions</dt>
              <dd className="font-medium text-gray-900">
                {meta ? `${meta.width} × ${meta.height}px` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">File type</dt>
              <dd className="font-medium text-gray-900">
                {(() => {
                  const m = photo.src.split("?")[0].split(".");
                  return m.length > 1 ? m[m.length - 1].toUpperCase() : "JPEG";
                })()}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">ID</dt>
              <dd className="font-medium text-gray-900">{photo.id}</dd>
            </div>
          </dl>

          {/* NEW: shows which albums contain this photo */}
          <div className="flex flex-wrap gap-2 text-xs">
            {photoAlbumNames.length > 0 ? (
              photoAlbumNames.map((n) => (
                <span key={n} className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 ring-1 ring-gray-200">
                  {n}
                </span>
              ))
            ) : (
              <span className="text-gray-500">This photo is not in any album</span>
            )}
          </div>

          {/* NEW: album management */}
          <div className="mt-2 space-y-2 rounded-lg border border-gray-200 p-3">
            <div className="text-sm font-medium text-gray-900">Album</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                value={selectedAlbumId}
                onChange={(e) =>
                  setSelectedAlbumId(e.target.value ? Number(e.target.value) : "")
                }
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
              >
                <option value="">— Select album —</option>
                {albums.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.photoIds.length})
                  </option>
                ))}
              </select>
              <button
                disabled={selectedAlbumId === ""}
                onClick={() => {
                  if (selectedAlbumId !== "") onAddToAlbum(selectedAlbumId as number, photo.id);
                }}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
              <button
                disabled={selectedAlbumId === ""}
                onClick={() => {
                  if (selectedAlbumId !== "") onRemoveFromAlbum(selectedAlbumId as number, photo.id);
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder="New album name…"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
              />
              <button
                disabled={!newAlbumName.trim()}
                onClick={() => {
                  if (newAlbumName.trim()) {
                    onQuickCreateAndAdd(newAlbumName.trim(), photo.id);
                    setNewAlbumName("");
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-2 text-sm text-white shadow hover:bg-green-700 disabled:opacity-50"
              >
                <Plus size={16} /> Create & Add
              </button>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(photo.id)}
              className={`rounded-lg px-3 py-2 text-sm shadow-sm ring-1 ring-gray-200 ${
                photo.favorite ? "bg-red-50 text-red-600" : "bg-white text-gray-800"
              }`}
            >
              {photo.favorite ? "Unfavorite" : "Add to Favorites"}
            </button>
            {!inTrash ? (
              <button
                onClick={() => onTrash(photo.id)}
                className="rounded-lg bg-white px-3 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200"
              >
                Move to Trash
              </button>
            ) : (
              <button
                onClick={() => onRestore(photo.id)}
                className="rounded-lg bg-white px-3 py-2 text-sm text-gray-800 shadow-sm ring-1 ring-gray-200"
              >
                Restore
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------- Album Card (NEW) --------------------

function AlbumCard({
  album,
  coverSrc,
  onOpen,
}: {
  album: Album;
  coverSrc?: string;
  onOpen: (id: number) => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200"
      onClick={() => onOpen(album.id)}
    >
      <div className="relative aspect-[4/3] w-full bg-gray-100">
        {coverSrc ? (
          <img src={coverSrc} alt={album.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-400">
            <AlbumIcon size={36} />
          </div>
        )}
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
          {album.photoIds.length} photos
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="text-sm font-medium text-gray-900">{album.name}</div>
        <div className="text-xs text-gray-500">{album.createdAt}</div>
      </div>
    </motion.div>
  );
}

// -------------------- Main App --------------------

const INITIAL_BATCH = 12; // NEW: page size for infinite scroll
const LS_ALBUMS_KEY = "photocloud.albums.v1"; // NEW: persist albums

export default function PhotoCloud() {
  const [view, setView] = useState<ViewType>("photos");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [query, setQuery] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [imgMeta, setImgMeta] = useState<{ width: number; height: number } | null>(null);

  // Upload form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // NEW: albums state
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);

  // NEW: infinite scroll state
  const [showCount, setShowCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // API endpoints
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const LIST_PATH = "/photos/";
  const UPLOAD_PATH = process.env.NEXT_PUBLIC_API_UPLOAD_PATH || "/photos/upload";

  // Load from API, otherwise fallback so UI looks like the screenshot
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

  // NEW: load albums from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ALBUMS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Album[];
        if (Array.isArray(parsed)) setAlbums(parsed);
      }
    } catch {}
  }, []);

  // NEW: persist albums
  useEffect(() => {
    try {
      localStorage.setItem(LS_ALBUMS_KEY, JSON.stringify(albums));
    } catch {}
  }, [albums]);

  const toggleFavorite = (id: number) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, favorite: !p.favorite } : p)));

  const moveToTrash = (id: number) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, trashed: true, favorite: false } : p)));

  const restoreFromTrash = (id: number) =>
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, trashed: false } : p)));

  // NEW: album helpers
  const createAlbum = (name: string) => {
    const newAlbum: Album = {
      id: Math.max(0, ...albums.map((a) => a.id)) + 1,
      name,
      photoIds: [],
      createdAt: todayStr(),
    };
    setAlbums((prev) => [newAlbum, ...prev]);
    return newAlbum.id;
  };

  const addPhotoToAlbum = (albumId: number, photoId: number) => {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId && !a.photoIds.includes(photoId)
          ? { ...a, photoIds: [photoId, ...a.photoIds] }
          : a
      )
    );
  };

  const removePhotoFromAlbum = (albumId: number, photoId: number) => {
    setAlbums((prev) =>
      prev.map((a) =>
        a.id === albumId ? { ...a, photoIds: a.photoIds.filter((id) => id !== photoId) } : a
      )
    );
  };

  const quickCreateAndAdd = (name: string, photoId: number) => {
    const id = createAlbum(name);
    addPhotoToAlbum(id, photoId);
  };

  const getAlbumById = (id: number | null) => albums.find((a) => a.id === id) || null;
  const photoAlbumNames = (photoId: number) =>
    albums.filter((a) => a.photoIds.includes(photoId)).map((a) => a.name);

  const titleMap: Record<ViewType, string> = {
    photos: "Photos",
    upload: "Upload",
    albums: "Albums",
    favorites: "Favorites",
    trash: "Trash",
    dashboard: "Dashboard",
    settings: "Settings",
  };

  // Filter visible photos by view and query
  const visible = useMemo(() => {
    let list = photos;
    if (view === "favorites") list = list.filter((p) => p.favorite && !p.trashed);
    else if (view === "trash") list = list.filter((p) => p.trashed);
    else if (view === "albums" && selectedAlbumId) {
      const album = getAlbumById(selectedAlbumId);
      const ids = new Set(album?.photoIds ?? []);
      list = list.filter((p) => ids.has(p.id) && !p.trashed);
    } else {
      // photos view
      list = list.filter((p) => !p.trashed);
    }

    if (query.trim() && (view === "photos" || view === "favorites" || (view === "albums" && selectedAlbumId))) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.date.includes(q));
    }
    return list;
  }, [photos, view, query, selectedAlbumId]);

  // NEW: reset and wire IntersectionObserver for infinite scroll
  useEffect(() => {
    setShowCount(INITIAL_BATCH);
  }, [view, query, photos.length, selectedAlbumId]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShowCount((c) => Math.min(c + INITIAL_BATCH, visible.length));
        }
      },
      { root: null, rootMargin: "200px" }
    );

    obs.observe(node);
    return () => obs.disconnect();
  }, [visible.length]);

  const openPreview = (id: number) => setPreviewId(id);
  const closePreview = () => {
    setPreviewId(null);
    setImgMeta(null);
  };

  // load dimensions when preview opens
  useEffect(() => {
    if (previewId == null) return;
    const p = photos.find((x) => x.id === previewId);
    if (!p) return;
    const img = new Image();
    img.onload = () => setImgMeta({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = p.src;
  }, [previewId, photos]);

  // -------------------- Upload logic (FIXED) --------------------
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    setUploadError(null);
    if (!API_BASE) {
      setUploadError("Missing NEXT_PUBLIC_API_BASE_URL");
      return;
    }
    if (!file) {
      setUploadError("Please choose an image file.");
      return;
    }
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", file); // FastAPI alias "file"
      form.append("title", title || file.name);

      const res = await fetch(`${API_BASE}${UPLOAD_PATH}`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Upload failed with ${res.status}`);
      }

      const created = (await res.json()) as ApiCreated;

      // Pick the best available URL-like field safely
      const srcFromApi =
        (typeof created.src === "string" && created.src) ||
        (typeof created.url === "string" && created.url) ||
        (typeof created.image_url === "string" && created.image_url) ||
        (typeof created.path === "string" &&
          (created.path.startsWith("http")
            ? created.path
            : `${API_BASE}${created.path}`)) ||
        "";

      const newPhoto: Photo = {
        id:
          typeof created.id === "number"
            ? created.id
            : Math.max(0, ...photos.map((p) => p.id)) + 1,
        title: (created.title as string) ?? (title || file.name),
        date: (created.date as string) ?? todayStr(),
        size:
          (created.size as string) ??
          (typeof file.size === "number" ? formatBytesToMB(file.size) : "—"),
        src: srcFromApi,
        preview: true,
        favorite: false,
        trashed: false,
      };

      if (!newPhoto.src) {
        throw new Error(
          "Upload succeeded but no image URL was returned (src/url/image_url/path)."
        );
      }

      setPhotos((prev) => [newPhoto, ...prev]);
      setFile(null);
      setTitle("");
      setView("photos");
    } catch (err: any) {
      setUploadError(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  // -------------------- Renderers --------------------

  function renderPhotoGrid(mode: "photos" | "favorites" | "trash") {
    const list = visible.slice(0, showCount);
    return (
      <>
        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <PhotoCard
              key={p.id}
              p={p}
              mode={mode}
              onPreview={openPreview}
              onToggleFavorite={toggleFavorite}
              onTrash={moveToTrash}
              onRestore={restoreFromTrash}
            />
          ))}
          {list.length === 0 && (
            <div className="col-span-full text-sm text-gray-500">No photos to show</div>
          )}
        </section>
        {/* NEW: infinite scroll sentinel */}
        {showCount < visible.length && (
          <div ref={sentinelRef} className="mt-6 h-10 w-full animate-pulse rounded-lg bg-gray-200/60" />
        )}
      </>
    );
  }

  function renderAlbums() {
    // album list view
    if (!selectedAlbumId) {
      return (
        <div className="space-y-6">
          {/* Create album */}
          <CreateAlbumBar
            onCreate={(name) => {
              const id = createAlbum(name);
              setSelectedAlbumId(id); // jump into the new album
            }}
          />

          {/* Album grid */}
          <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {albums.map((a) => {
              const cover = photos.find((p) => a.photoIds.includes(p.id) && !p.trashed)?.src;
              return (
                <AlbumCard
                  key={a.id}
                  album={a}
                  coverSrc={cover}
                  onOpen={(id) => setSelectedAlbumId(id)}
                />
              );
            })}
            {albums.length === 0 && (
              <div className="col-span-full text-sm text-gray-500">No albums yet — create one above.</div>
            )}
          </section>
        </div>
      );
    }

    // album detail view
    const album = getAlbumById(selectedAlbumId);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setSelectedAlbumId(null)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm hover:bg-gray-50"
          >
            <ChevronLeft size={16} /> Back
          </button>
          <h2 className="text-lg font-semibold">{album?.name}</h2>
          <div className="text-sm text-gray-500">{album?.photoIds.length ?? 0} photos</div>
        </div>

        {/* search only within this album */}
        <div className="flex w-full items-center gap-2 sm:w-80">
          <div className="relative flex-1">
            <SearchIcon
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in album..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
            />
          </div>
        </div>

        {renderPhotoGrid("photos")}
      </div>
    );
  }

  function renderContent() {
    switch (view) {
      case "photos":
        return renderPhotoGrid("photos");

      case "favorites":
        return renderPhotoGrid("favorites");

      case "upload":
        return (
          <form
            className="rounded-2xl border border-gray-200 bg-white p-6 text-sm shadow-sm"
            onSubmit={handleUpload}
          >
            <label className="mb-2 block font-medium">Upload Photo</label>

            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-600">Title (optional)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
                  placeholder="My awesome photo"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-600">Choose image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 focus:border-gray-400"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  รองรับไฟล์รูปภาพเท่านั้น (PNG, JPG, WEBP ฯลฯ)
                </p>
              </div>
            </div>

            {/* Local preview before upload */}
            {file && (
              <div className="mb-4 flex items-center gap-4 rounded-xl border border-gray-200 p-3">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="h-24 w-32 rounded-lg object-cover"
                />
                <div className="text-sm">
                  <div className="font-medium">{title || file.name}</div>
                  <div className="text-gray-500">{formatBytesToMB(file.size)}</div>
                </div>
              </div>
            )}

            {uploadError && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadError}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={uploading}
                className="rounded-md bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 disabled:opacity-60"
              >
                {uploading ? "Uploading..." : "Upload"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setTitle("");
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-sm hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </form>
        );

      case "trash":
        return renderPhotoGrid("trash");

      case "dashboard":
        // The real dashboard is at /dashboard now.
        return (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-2 text-lg font-semibold">Dashboard moved</h2>
            <p className="text-sm text-gray-600">
              The Dashboard page is now available at <code>/dashboard</code>. Use the sidebar link.
            </p>
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={photos}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="id" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case "albums":
        return renderAlbums();

      case "settings":
        return <div className="text-sm text-gray-500">Coming soon…</div>;

      default:
        return null;
    }
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 bg-white p-4">
        <div className="mb-6 text-lg font-semibold">PhotoCloud</div>
        <div className="flex flex-col gap-2">
          <SidebarLink icon={Images} label="Photos" active={view === "photos"} onClick={() => { setView("photos"); setSelectedAlbumId(null); }} />
          <SidebarLink icon={UploadIcon} label="Upload" active={view === "upload"} onClick={() => { setView("upload"); setSelectedAlbumId(null); }} />
          <SidebarLink icon={AlbumIcon} label="Albums" active={view === "albums"} onClick={() => setView("albums")} />
          <SidebarLink icon={Heart} label="Favorites" active={view === "favorites"} onClick={() => { setView("favorites"); setSelectedAlbumId(null); }} />
          <SidebarLink icon={Trash2} label="Trash" active={view === "trash"} onClick={() => { setView("trash"); setSelectedAlbumId(null); }} />

          {/* Real route link for Dashboard */}
          <SidebarNavLink icon={LayoutDashboard} label="Dashboard" href="/dashboard" />

          <SidebarLink
            icon={Settings}
            label="Settings"
            active={view === "settings"}
            onClick={() => { setView("settings"); setSelectedAlbumId(null); }}
          />
        </div>
      </aside>

      {/* Main content (NEW: make the main column scrollable) */}
      <main className="flex-1 h-screen overflow-y-auto p-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">{titleMap[view]}</h1>

          {/* Search only where it makes sense */}
          {(view === "photos" || view === "favorites") && (
            <div className="flex w-full items-center gap-2 sm:w-80">
              <div className="relative flex-1">
                <SearchIcon
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search photos..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm shadow-sm outline-none placeholder:text-gray-400 focus:border-gray-400"
                />
              </div>
              <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm">
                <Filter size={16} /> Filters
              </button>
            </div>
          )}
        </header>

        {renderContent()}

        {/* Preview modal */}
        {previewId !== null &&
          (() => {
            const p = photos.find((x) => x.id === previewId)!;
            const inTrash = !!p.trashed;
            return (
              <PreviewModal
                photo={p}
                meta={imgMeta}
                onClose={closePreview}
                onToggleFavorite={toggleFavorite}
                onTrash={moveToTrash}
                onRestore={restoreFromTrash}
                inTrash={inTrash}
                // NEW: album controls
                albums={albums}
                onAddToAlbum={addPhotoToAlbum}
                onRemoveFromAlbum={removePhotoFromAlbum}
                onQuickCreateAndAdd={quickCreateAndAdd}
                photoAlbumNames={photoAlbumNames(p.id)}
              />
            );
          })()}
      </main>
    </div>
  );
}

// -------------------- Create Album Bar (NEW) --------------------

function CreateAlbumBar({ onCreate }: { onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New album name…"
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none"
      />
      <button
        disabled={!name.trim()}
        onClick={() => {
          if (name.trim()) {
            onCreate(name.trim());
            setName("");
          }
        }}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
      >
        <Plus size={16} /> Create album
      </button>
    </div>
  );
}
