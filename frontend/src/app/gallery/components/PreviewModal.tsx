import React, { useEffect } from "react";
import { X } from "lucide-react";
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