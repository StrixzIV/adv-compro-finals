// File: components/AddPhotosToAlbumModal.tsx
import { X, Check } from "lucide-react";
import React, { useState, useEffect } from "react";

import { AddPhotosToAlbumModalProps } from "../interfaces/types";

const AddPhotosToAlbumModal: React.FC<AddPhotosToAlbumModalProps> = ({
    isOpen,
    onClose,
    albumId,
    photos,
    onAdd,
    isLoading,
    error,
}) => {
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (isOpen) {
            setSelectedPhotos(new Set());
        }
    }, [isOpen]);

    if (!isOpen || !albumId) return null;

    const togglePhotoSelection = (photoId: string) => {
        setSelectedPhotos(prev => {
            const newSet = new Set(prev);
            if (newSet.has(photoId)) {
                newSet.delete(photoId);
            } else {
                newSet.add(photoId);
            }
            return newSet;
        });
    };

    const handleAddPhotos = () => {
        if (selectedPhotos.size > 0) {
            onAdd(albumId, Array.from(selectedPhotos));
            // Note: onAdd should handle closing the modal upon success
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex justify-between items-center pb-4 border-b">
                    <h3 className="text-xl font-semibold">Select Photos to Add</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>
                
                {error && (
                    <div className="my-3 p-3 text-sm bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto my-4 grid grid-cols-4 md:grid-cols-6 gap-4">
                    {photos
                        .filter(p => !p.trashed) // Don't allow trashing photos
                        .map(photo => (
                            <div key={photo.id} className="relative aspect-square cursor-pointer" onClick={() => togglePhotoSelection(photo.id)}>
                                <img 
                                    src={photo.thumbnail} 
                                    alt={photo.title} 
                                    className="w-full h-full object-cover rounded-lg" 
                                />
                                {selectedPhotos.has(photo.id) && (
                                    <div className="absolute inset-0 bg-blue-500 bg-opacity-10 flex items-center justify-center rounded-lg">
                                        <Check size={32} className="text-white" />
                                    </div>
                                )}
                            </div>
                        ))}
                    {photos.length === 0 && <p className="col-span-full text-center text-gray-500">No photos uploaded yet.</p>}
                </div>

                <div className="pt-4 border-t flex justify-end">
                    <button
                        onClick={handleAddPhotos}
                        className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
                        disabled={isLoading || selectedPhotos.size === 0}
                    >
                        {isLoading ? 'Adding...' : `Add ${selectedPhotos.size} Photo${selectedPhotos.size !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddPhotosToAlbumModal;