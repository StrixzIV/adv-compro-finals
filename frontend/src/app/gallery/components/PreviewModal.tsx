import React, { useEffect } from "react";
import { X, Download } from "lucide-react"; // Import the Download icon
import { PreviewModalProps } from "../interfaces/types";

export default function PreviewModal({ photo, onClose }: PreviewModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!photo) return null;

  // Helper to render EXIF data
  const renderExifData = () => {
    if (!photo.exif_data || Object.keys(photo.exif_data).length === 0) {
      return null;
    }

    return (
      <div className="mt-4 border-t border-gray-200 pt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase text-gray-500">EXIF Metadata</h3>
        <div className="grid max-h-48 grid-cols-2 gap-x-4 gap-y-2 overflow-y-auto text-xs text-gray-700 md:grid-cols-3">
          {Object.entries(photo.exif_data).map(([key, value]) => (
            <div key={key} className="truncate">
              <strong className="font-medium text-gray-800">{key}:</strong> {String(value)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <button
          className="absolute -right-3 -top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-gray-700 shadow-lg ring-1 ring-gray-200 hover:bg-white"
          onClick={onClose}
          aria-label="Close preview"
        >
          <X size={18} />
        </button>
        <img src={photo.src} alt={photo.title} className="max-h-[75vh] w-full rounded-xl object-contain shadow-2xl" />
        <div className="mt-3 rounded-xl bg-white/95 p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">{photo.title}</div>
              <div className="text-xs text-gray-500">{photo.date} · {photo.size}</div>
            </div>
            {/* Download Button */}
            <a
              href={photo.src}
              download={photo.filename || photo.title.replace(/ /g, "_") + ".jpg"}
              className="ml-4 flex items-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              onClick={(e) => e.stopPropagation()}
              aria-label="Download image"
            >
              <Download size={14} />
              <span>Download</span>
            </a>
          </div>
          {/* EXIF Data Section */}
          {renderExifData()}
        </div>
      </div>
    </div>
  );
}