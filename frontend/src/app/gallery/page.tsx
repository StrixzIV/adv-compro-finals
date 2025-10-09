"use client";

import React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";

import { useRouter } from 'next/navigation'

import {
  Cloud,
  Images,
  Upload,
  Album,
  Heart,
  Trash2,
  LayoutDashboard,
  Search,
  Filter,
  LogOut,
  PlusCircle,
  UserCircle2
} from "lucide-react";

import UploadPanel from "./components/UploadPanel";
import SidebarLink from "./components/SidebarLink";
import PhotoCard from "./components/PhotoCard";
import EmptyState from "./components/EmptyState";
import PreviewModal from "./components/PreviewModal";
import AlbumCard from "./components/AlbumCard";
import CreateAlbumModal from "./components/CreateAlbumModal";
import AddPhotosToAlbumModal from "./components/AddPhotosToAlbumModal";

import { PhotoItem, GalleryItem, ViewType, AlbumListItem, AlbumDetailData, UserData } from "./interfaces/types";

const API_BASE_URL = 'http://localhost:8000';

function formatBytes(bytes: number, decimals: number = 2): string {

  // Return '0 B' immediately if size is 0
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  // Ensure the number of decimals is valid (non-negative)
  const dm = decimals < 0 ? 0 : decimals;

  // Calculate the index 'i' of the appropriate unit in the 'sizes' array.
  // The index is determined by the floor of the base-1024 logarithm of the byte size.
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  // Calculate the size in the determined unit (e.g., MB) and format it.
  // parseFloat is used to trim unnecessary trailing zeros from the fixed decimal output.
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];


}

export default function PhotoCloud() {

  const [view, setView] = useState<ViewType>("photos");

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [albums, setAlbums] = useState<AlbumListItem[]>([]);

  const [userData, setUserData] = useState<UserData | null>(null);
  
  const [previewId, setPreviewId] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [isCreatingAlbum, setIsCreatingAlbum] = useState(false);
  const [createAlbumError, setCreateAlbumError] = useState<string | null>(null); 
  const [isAlbumLoading, setIsAlbumLoading] = useState(false);

  const [isAddPhotosModalOpen, setIsAddPhotosModalOpen] = useState(false);
  const [albumToEditId, setAlbumToEditId] = useState<string | null>(null);
  const [addPhotosError, setAddPhotosError] = useState<string | null>(null);
  const [isAddingPhotos, setIsAddingPhotos] = useState(false);

  const [activeAlbumId, setActiveAlbumId] = useState<string | null>(null);
  const [activeAlbumTitle, setActiveAlbumTitle] = useState<string | null>(null);

  const [albumDetail, setAlbumDetail] = useState<AlbumDetailData | null>(null);
  const [isAlbumDetailLoading, setIsAlbumDetailLoading] = useState(false);
  const [albumDetailError, setAlbumDetailError] = useState<string | null>(null);
  
  const router = useRouter();

  const titleMap: Record<ViewType, string> = {
    photos: "Photos",
    upload: "Upload",
    albums: "Albums",
    favorites: "Favorites",
    trash: "Trash",
    dashboard: "Dashboard",
    album_detail: "album_detail",
  };

  const visiblePhotos = useMemo(() => {
    // NOTE: The current backend /gallery route only fetches non-deleted photos.
    // For a real Trash view, you'd need a separate backend route like /storage/trash.
    // We'll simulate the state here for now, but in a production app, these lists
    // would be fetched from two separate endpoints.
    if (view === "favorites") return items.filter((p) => p.favorite && !p.trashed);
    if (view === "trash") return items.filter((p) => p.trashed);
    return items.filter((p) => !p.trashed);
  }, [items, view]);

  // Auth/Logout handlers
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setIsAuthenticated(false);
    router.push('/login');
  };

  const handleViewAlbum = useCallback((albumId: string, albumTitle: string) => {
      setActiveAlbumId(albumId);
      setActiveAlbumTitle(albumTitle);
      setView("album_detail"); 
  }, []);

  const handleAddPhotosToAlbum = useCallback(async (albumId: string, photoIds: string[]) => {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) return;

      setAddPhotosError(null);
      setIsAddingPhotos(true);

      try {
          const apiUrl = `${API_BASE_URL}/api/v1/albums/${albumId}/add-photos`;
          const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                  "Authorization": `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
              },
              body: JSON.stringify({ photo_ids: photoIds }) // Matches the PhotoIdList backend model
          });

          const data = await response.json();

          if (!response.ok) {
              throw new Error(data.detail || "Failed to add photos to album.");
          }

          // Success: Close modal (no need to re-fetch albums, only content changes)
          setIsAddPhotosModalOpen(false);

          // Optional: Show a success toast/message here.

      } catch (e) {
          const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
          setAddPhotosError(errorMessage);
      } finally {
          setIsAddingPhotos(false);
      }
  }, []); 

  // Helper function to load thumbnail as a data URL (simulating fetching the binary data)
  const loadAsset = useCallback(async (apiUrl: string): Promise<string> => {

    const accessToken = localStorage.getItem("accessToken");

    if (!accessToken) return '';

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
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
  }, []);

  const moveToTrash = async (id: string) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;
    setError(null);

    try {
  
      const apiUrl = `${API_BASE_URL}/api/v1/storage/soft-delete/${id}`;
      const response = await fetch(apiUrl, {
        method: "DELETE", 
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
         if (response.status === 404) {
             throw new Error("Photo not found or access denied.");
         }
         throw new Error(`Failed to move to trash: ${response.statusText}`);
      }
      
      setItems((prev) => 
        prev.map((p) => (
            p.id === id ? { ...p, trashed: true, favorite: false } : p
        ))
      );
      
    }
    
    catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred while moving to trash.");
    }

  };

  const fetchAlbumDetails = useCallback(async (albumId: string) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken || !albumId) return;

    setIsAlbumDetailLoading(true);
    setAlbumDetailError(null);

    try {
        const apiUrl = `${API_BASE_URL}/api/v1/albums/${albumId}`;
        const response = await fetch(apiUrl, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        const data = await response.json(); // Data structure: { ..., photos: MinimalPhotoData[] }

        if (!response.ok) {
            throw new Error(data.detail || "Failed to fetch album details.");
        }

        // 🔑 1. Map the minimal photo data to the full GalleryItem structure
        const processedPhotosPromises = data.photos.map(async (photo: any) => { 
             
             // This explicit construction satisfies the GalleryItem contract
             const photoData: GalleryItem = {
                id: photo.id,
                title: photo.caption || photo.filename,
                date: new Date(photo.upload_date).toLocaleDateString(),
                size: "N/A", 
                src: await loadAsset(`${API_BASE_URL}${photo.file_url}`),
                thumbnail: await loadAsset(`${API_BASE_URL}${photo.thumbnail_url}`),
                
                // CRITICAL: Provide default values for missing GalleryItem properties
                preview: false,
                favorite: false, 
                trashed: false,
             };
             return photoData;
        });
        
        const processedPhotos: GalleryItem[] = await Promise.all(processedPhotosPromises);

        // 🔑 2. Set the state. We cast the final object to AlbumDetailData.
        // The 'photos' property is now the fully processed GalleryItem[] array.
        setAlbumDetail({ ...data, photos: processedPhotos } as AlbumDetailData); 

    } catch (e) {
        setAlbumDetailError(e instanceof Error ? e.message : "An unknown error occurred while fetching photos.");
    } finally {
        setIsAlbumDetailLoading(false);
    }
  }, [loadAsset]); 

  const restoreFromTrash = async (id: string) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;
    setError(null);

    try {
      
      const apiUrl = `${API_BASE_URL}/api/v1/storage/restore/${id}`;
      const response = await fetch(apiUrl, {
        method: "POST", 
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
         if (response.status === 404) {
             throw new Error("Photo not found or access denied.");
         }
         throw new Error(`Failed to restore photo: ${response.statusText}`);
      }
      
      // Update local state: move item out of trash (trashed=false)
      setItems((prev) => 
        prev.map((p) => (
            p.id === id ? { ...p, trashed: false } : p
        ))
      );

    }
    
    catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred while restoring.");
    }
    
  };

  const deletePermanent = async (id: string) => { // 🔑 NEW: Hard delete function for a single photo
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;
    setError(null);

    // Confirmation dialog (basic implementation)
    if (!window.confirm("Are you sure you want to permanently delete this photo? This action cannot be undone.")) {
        return;
    }

    try {
      
      const apiUrl = `${API_BASE_URL}/api/v1/storage/delete/${id}`;
      const response = await fetch(apiUrl, {
        method: "DELETE", // Reusing the hard delete endpoint
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
         if (response.status === 404) {
             throw new Error("Photo not found or access denied.");
         }
         throw new Error(`Failed to permanently delete photo: ${response.statusText}`);
      }
      
      // Update local state: remove item completely
      setItems((prev) => prev.filter((p) => p.id !== id));

    }
    
    catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred while permanently deleting.");
    }
  };

  const clearTrash = async () => { // 🔑 NEW: Clear all trash function
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;
    setError(null);

    // Confirmation dialog
    if (!window.confirm("Are you sure you want to permanently delete ALL items in the trash? This action cannot be undone.")) {
        return;
    }

    try {
        const apiUrl = `${API_BASE_URL}/api/v1/storage/clear-trash`;
        const response = await fetch(apiUrl, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to clear trash: ${response.statusText}`);
        }

        // After successful clear, remove all trashed items from local state
        setItems((prev) => prev.filter((p) => !p.trashed));
        
    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred while clearing trash.");
    }
  }

  const toggleFavoriteStatus = useCallback(async (photoId: string, isCurrentlyFavorite: boolean) => {
    
    const token = localStorage.getItem("accessToken");
    
    if (!token) return;

    setError(null);

    const method = isCurrentlyFavorite ? 'DELETE' : 'POST'; 
    const url = `${API_BASE_URL}/api/v1/storage/favorite/${photoId}`;

    setItems(prevItems => prevItems.map(item => 
        item.id === photoId ? { ...item, is_favorite: !isCurrentlyFavorite } : item
    ));

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            // Revert optimistic update if API call fails
            setItems(prevItems => prevItems.map(item => 
                item.id === photoId ? { ...item, is_favorite: isCurrentlyFavorite } : item
            ));
            
            const errorData = await response.json();
            throw new Error(errorData.detail || `Failed to toggle favorite status: ${response.status}`);
        }

    } catch (err: any) {
        console.error("Toggle favorite error:", err);
        setError(err.message || "Failed to update favorite status.");
        // Re-fetch data to ensure synchronization
        fetchPhotos(); 
    }
  }, [router]);

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
  const fetchPhotos = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);
    
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      setError("Authentication token not found. Please log in.");
      setIsLoading(false);
      return;
    }

    const galleryPromise = fetch(`${API_BASE_URL}/api/v1/storage/gallery`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    }).then(res => res.json());

    const trashPromise = fetch(`${API_BASE_URL}/api/v1/storage/trash`, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    }).then(res => res.json());

    try {

      const [galleryData, trashData] = await Promise.all([galleryPromise, trashPromise]);
      
      // Check for errors in fetch responses
      if (galleryData.detail) throw new Error(`Gallery fetch failed: ${galleryData.detail}`);
      if (trashData.detail) throw new Error(`Trash fetch failed: ${trashData.detail}`);

      // Helper to process and load assets
      const processItems = async (data: PhotoItem[]): Promise<GalleryItem[]> => {
        if (!Array.isArray(data)) {
            console.error("Received non-array data from API:", data);
            return [];
        }
        
        const formattedItemsPromises = data.map(async (item) => ({
            id: item.id,
            title: item.caption || item.filename,
            date: new Date(item.upload_date).toLocaleDateString(),
            size: formatBytes(item.size_bytes), 
            src: await loadAsset(`${API_BASE_URL}/api/v1${item.file_url}`),
            thumbnail: await loadAsset(`${API_BASE_URL}/api/v1${item.thumbnail_url}`),
            preview: false,
            favorite: item.is_favorite,
            trashed: item.is_deleted, 
        }));
        return Promise.all(formattedItemsPromises);
      };

      const galleryItems = await processItems(galleryData);
      const trashedItems = await processItems(trashData);
      
      // Merge all items into a single state array
      setItems([...galleryItems, ...trashedItems]);
      
    }
    
    catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred while fetching photos.");
    } 
    
    finally {
      setIsLoading(false);
    }

  }, [isAuthenticated, router]);

  const fetchAlbums = useCallback(async () => {
    if (!isAuthenticated) return;
    
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    try {
        const apiUrl = `${API_BASE_URL}/api/v1/albums`;
        const response = await fetch(apiUrl, {
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || "Failed to fetch albums.");
        }
        
        if (Array.isArray(data)) {
            setAlbums(data as AlbumListItem[]);
        }

    } catch (e) {
        setError(e instanceof Error ? e.message : "An unknown error occurred while fetching albums.");
    }
  }, [isAuthenticated]);

  const handleCreateAlbum = useCallback(async (title: string, description: string | null) => {

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    setCreateAlbumError(null);
    setIsAlbumLoading(true);

    try {
        const apiUrl = `${API_BASE_URL}/api/v1/albums`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ title, description })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || "Failed to create album.");
        }
        
        // Success: Close modal, refresh album list
        setIsCreatingAlbum(false);
        fetchAlbums(); // Re-fetch all albums to show the new one

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setCreateAlbumError(errorMessage);
    } finally {
        setIsAlbumLoading(false);
    }
  }, [fetchAlbums]);

  const handleRemovePhotoFromAlbum = useCallback(async (photoId: string) => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken || !activeAlbumId) return;

    // Optimistically update the UI before the API call
    setAlbumDetail(prevDetail => {
        if (!prevDetail) return null;
        return {
            ...prevDetail,
            photos: prevDetail.photos.filter(p => p.id !== photoId)
        };
    });
    
    setAlbumDetailError(null);

    try {
        // DELETE /api/v1/albums/{album_id}/photos/{photo_id}
        const apiUrl = `${API_BASE_URL}/api/v1/albums/${activeAlbumId}/photo/${photoId}`;
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to remove photo from album.");
        }

        // Success: UI already updated

    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        setAlbumDetailError(errorMessage);
        // Re-fetch to restore state if the API failed
        fetchAlbumDetails(activeAlbumId); 
    }
  }, [activeAlbumId, fetchAlbumDetails]);

  const handleDeleteAlbum = useCallback(async () => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken || !activeAlbumId) return;

    if (!window.confirm(`Are you sure you want to delete the album "${activeAlbumTitle}"? This cannot be undone.`)) {
        return;
    }

    try {
        // DELETE /api/v1/albums/{album_id}
        const apiUrl = `${API_BASE_URL}/api/v1/albums/${activeAlbumId}`;
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: { "Authorization": `Bearer ${accessToken}` },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || "Failed to delete album.");
        }

        // Success: Clear the active view and refresh the album list
        setView("albums");
        setActiveAlbumId(null);
        setActiveAlbumTitle(null);
        fetchAlbums(); // Re-fetch the main album list

    } catch (e) {
        setAlbumDetailError(e instanceof Error ? e.message : "An unknown error occurred while deleting the album.");
    }
  }, [activeAlbumId, activeAlbumTitle, fetchAlbums]);

  const fetchUser = useCallback(async () => {

    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) return;

    const apiUrl = `${API_BASE_URL}/api/v1/auth/userdata`;

    const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { "Authorization": `Bearer ${accessToken}` },
    });

    const data = await response.json() as UserData;
    setUserData(data);

  }, [isAuthenticated])

  useEffect(() => {
      if (view === "album_detail" && activeAlbumId) {
          fetchAlbumDetails(activeAlbumId);
      }
      // Clear detail when leaving the view
      if (view !== "album_detail") {
          setAlbumDetail(null);
      }
  }, [view, activeAlbumId, fetchAlbumDetails]);

  useEffect(() => {
    if (isAuthenticated) {
        fetchUser();
        fetchPhotos();
        fetchAlbums();
    }
  }, [isAuthenticated, fetchPhotos, fetchAlbums]);

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
                onToggleFavorite={toggleFavoriteStatus} 
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
          <section className="space-y-6">
            <div className="flex justify-end">
                <button 
                    className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700"
                    onClick={() => {
                        setIsCreatingAlbum(true); // 🔑 Open the modal
                        setCreateAlbumError(null); // Clear previous errors
                    }}
                >
                    <PlusCircle size={16} />
                    Create New Album
                </button>
            </div>
            
            {albums.length === 0 ? (
                <EmptyState title="No albums yet" subtitle="Create an album to organize your photos." />
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {albums.map((album) => (
                    <AlbumCard 
                        key={album.id} 
                        album={album} 
                        onAddPhotosClick={() => {
                            setAlbumToEditId(album.id);
                            setIsAddPhotosModalOpen(true);
                            setAddPhotosError(null);
                        }}
                        onViewAlbumClick={handleViewAlbum}
                    />
                ))}
                </div>
            )}
          </section>
        );
      case "album_detail":
        if (!activeAlbumId) return null;

      return (
            <div className="space-y-6">

                <button 
                    onClick={() => setView("albums")} 
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1"
                >
                    &larr; Back to Albums
                </button>

                <button
                    onClick={handleDeleteAlbum}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700"
                >
                    <Trash2 size={16} />
                    Delete Album
                </button>

                <h2 className="text-3xl font-bold">{activeAlbumTitle}</h2>
                
                {albumDetailError && (
                    <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        <span className="font-medium">Error:</span> {albumDetailError}
                    </div>
                )}

                {isAlbumDetailLoading ? (
                    <div className="p-10 text-center">Loading album photos...</div>
                ) : (
                    <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {albumDetail && albumDetail.photos.length > 0 ? (
                          albumDetail.photos.map((p) => (
                              <PhotoCard 
                                  key={p.id} 
                                  p={p} 
                                  mode="album_detail" 
                                  onPreview={(id: string) => setPreviewId(id)}
                                  onRemoveFromAlbum={handleRemovePhotoFromAlbum}
                              />
                          ))
                        ) : (
                            <div className="col-span-full">
                                <EmptyState title="No photos" subtitle={`This album is empty.`} />
                            </div>
                        )}
                    </section>
                )}
            </div>
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
                onDeletePermanent={deletePermanent} // 🔑 Passed the new permanent delete function
              />
            ))}
            {visiblePhotos.length === 0 && (
              <div className="col-span-full">
                <EmptyState title="Trash is empty" subtitle="Deleted items will appear here for 30 days." />
              </div>
            )}
            
            {/* Clear Trash Button */}
            {visiblePhotos.length > 0 && (
                <div className="col-span-full pt-4 text-center">
                    <button 
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-red-700"
                        onClick={clearTrash} // 🔑 Calls the new clear trash function
                    >
                        Clear Trash Permanently
                    </button>
                </div>
            )}
          </section>
        );

      case "dashboard":
        router.push('/dashboard');
        return null;
        
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
            
            <SidebarLink 
                icon={LogOut} 
                label="Logout" 
                onClick={handleLogout} 
            />
            
            <div className="flex items-center gap-3 rounded-xl px-3 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-xs font-semibold"><UserCircle2 /></div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{userData?.username}</div>
                <div className="truncate text-xs text-gray-500">{userData?.email}</div>
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

      <CreateAlbumModal 
          isOpen={isCreatingAlbum}
          onClose={() => setIsCreatingAlbum(false)}
          onCreate={handleCreateAlbum}
          isLoading={isAlbumLoading}
          error={createAlbumError}
      />

      <AddPhotosToAlbumModal
          isOpen={isAddPhotosModalOpen}
          onClose={() => setIsAddPhotosModalOpen(false)}
          albumId={albumToEditId}
          photos={items} // Use the filtered list of available photos
          onAdd={handleAddPhotosToAlbum}
          isLoading={isAddingPhotos}
          error={addPhotosError}
      />

      {/* Preview modal */}
      <PreviewModal photo={items.find((p) => p.id === previewId)} onClose={() => setPreviewId(null)} />
    </div>
  );
}
