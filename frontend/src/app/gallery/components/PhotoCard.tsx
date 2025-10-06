import React from "react";
import { motion } from "framer-motion";
import { Repeat2, Heart, Trash2, XCircle, FolderMinus } from "lucide-react";
import { PhotoCardProps } from "../interfaces/types";

export default function PhotoCard({ p, mode = "photos", onPreview, onToggleFavorite, onTrash, onRestore, onDeletePermanent, onRemoveFromAlbum }: PhotoCardProps) {
  const isFavorite = p.favorite;

    // Handler to prevent preview click when clicking an action button
    const handleActionClick = (handler: ((id: string) => void) | ((id: string, isFav: boolean) => void), ...args: any[]) => (e: React.MouseEvent) => {
        e.stopPropagation();
        (handler as any)(...args);
    };

    const renderActionButtons = () => {
        // --- 1. Album Detail Mode: Remove Photo from Album ---
        if (mode === 'album_detail') {
            return (
                <button 
                    onClick={handleActionClick(onRemoveFromAlbum!, p.id)}
                    className="p-1 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition"
                    title="Remove from Album"
                >
                    <FolderMinus size={18} /> 
                </button>
            );
        }

        // --- 2. Trash Mode: Restore or Delete Permanently ---
        if (mode === 'trash') {
            return (
                <div className="flex space-x-2">
                    <button 
                        onClick={handleActionClick(onRestore!, p.id)}
                        className="p-1 rounded-full bg-green-500 text-white shadow-lg hover:bg-green-600 transition"
                        title="Restore"
                    >
                        <Repeat2 size={18} />
                    </button>
                    <button 
                        onClick={handleActionClick(onDeletePermanent!, p.id)}
                        className="p-1 rounded-full bg-gray-900 text-white shadow-lg hover:bg-gray-700 transition"
                        title="Delete Permanently"
                    >
                        <XCircle size={18} />
                    </button>
                </div>
            );
        }

        // --- 3. Photos / Favorites Modes: Favorite and Trash ---
        // This covers 'photos' and 'favorites' modes.
        const favoriteButton = (
            <button 
                onClick={handleActionClick(onToggleFavorite!, p.id, isFavorite)}
                className={`p-1 rounded-full ${isFavorite ? 'bg-red-500 text-white' : 'bg-white text-red-500'} shadow-lg hover:opacity-80 transition`}
                title={isFavorite ? "Unfavorite" : "Favorite"}
            >
                <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
        );

        const trashButton = (
            <button 
                onClick={handleActionClick(onTrash!, p.id)}
                className="p-1 rounded-full bg-white text-gray-900 shadow-lg hover:bg-gray-200 transition"
                title="Move to Trash"
            >
                <Trash2 size={18} />
            </button>
        );

        return (
            <div className="flex space-x-2">
                {favoriteButton}
                {trashButton}
            </div>
        );
    };

    return (
        <div 
            className="group relative aspect-square w-full cursor-pointer overflow-hidden rounded-2xl bg-white shadow-lg transition-shadow hover:shadow-xl"
            onClick={() => onPreview && onPreview(p.id)}
        >
            {/* Image */}
            <img 
                src={p.thumbnail} 
                alt={p.title} 
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />

            {/* Overlay for actions and title */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                
                {/* Action Buttons (Top Right) */}
                <div className="absolute right-4 top-4">
                    {renderActionButtons()}
                </div>

                {/* Title and Info (Bottom Left) */}
                <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-sm font-semibold truncate max-w-full">{p.title}</h3>
                    <p className="text-xs opacity-75">{p.date}</p>
                </div>
            </div>
        </div>
    );
}