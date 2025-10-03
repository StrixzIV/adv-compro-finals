import React from "react";
import { motion } from "framer-motion";
import { Eye, Heart, Trash2, Undo2 } from "lucide-react";
import { PhotoCardProps } from "../interfaces/types";

export default function PhotoCard({ p, mode = "photos", onPreview, onToggleFavorite, onTrash, onRestore }: PhotoCardProps) {
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