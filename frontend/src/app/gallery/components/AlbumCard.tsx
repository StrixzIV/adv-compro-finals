import { Folder, Plus } from "lucide-react";
import { AlbumCardProps } from "../interfaces/types";

const AlbumCard: React.FC<AlbumCardProps> = ({ album, onAddPhotosClick, onViewAlbumClick }) => {
    return (
        <div className="group relative rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-shadow hover:shadow-md">
            <div 
                className="cursor-pointer"
                onClick={() => onViewAlbumClick(album.id, album.title)}
            >
                <div className="flex items-center justify-between">
                    <Folder size={36} className="text-gray-500" />
                    <span className="text-xs text-gray-500">
                        {new Date(album.created_at).toLocaleDateString()}
                    </span>
                </div>
                <h3 className="mt-3 text-sm font-semibold truncate">{album.title}</h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                    {album.description || "No description provided."}
                </p>
                {/* 🔑 Optional: Add padding to separate content from the button area */}
                <div className="h-4"></div> 
            </div>
            
            {/* --- Add Photos Button Overlay (Remains the same) --- */}
            <div className="p-0 transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                <button
                    onClick={() => onAddPhotosClick(album.id)}
                    className="flex w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-lg hover:bg-indigo-700"
                >
                    <Plus size={16} />
                    Add Photos
                </button>
            </div>
        </div>
    );
}

export default AlbumCard;
