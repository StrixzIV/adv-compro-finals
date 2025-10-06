import React, { useState, useEffect } from "react";
import { CreateAlbumModalProps } from "../interfaces/types";

const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ 
    isOpen, 
    onClose, 
    onCreate, 
    isLoading,
    error 
}) => {

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Reset form when opened/closed
    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onCreate(title.trim(), description.trim() || null);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Create New Album</h3>
                
                {error && (
                    <div className="mb-3 p-3 text-sm bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="albumTitle" className="block text-sm font-medium text-gray-700">Album Title</label>
                        <input
                            type="text"
                            id="albumTitle"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            maxLength={255}
                            className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="albumDescription" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                        <textarea
                            id="albumDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                        />
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 disabled:opacity-50"
                            disabled={isLoading || !title.trim()}
                        >
                            {isLoading ? 'Creating...' : 'Create Album'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateAlbumModal;
