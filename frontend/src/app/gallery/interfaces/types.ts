import React from "react";

export interface PhotoItem {
  id: string; // uuid.UUID is a string in JSON
  filename: string;
  caption: string | null;
  upload_date: string; // datetime.datetime is a string in JSON
  file_url: string; // URL to the original file
  thumbnail_url: string; // URL to the thumbnail
  exif_data: Record<string, any> | null;
}

export interface GalleryItem {
  id: string; // Use string to match the UUID
  title: string;
  date: string;
  size: string; // Derived
  src: string; // The full image URL (base64 in this case)
  thumbnail: string; // The thumbnail image URL (base64 in this case)
  preview: boolean;
  trashed: boolean;
  favorite: boolean;
  // Note: Add other properties from PhotoItem if your component needs them
  // e.g., filename: string;
}

export type Photo = {
  id: string;
  title: string;
  date: string;
  size: string;
  src: string;
  thumbnail: string;
  preview?: boolean;
  favorite?: boolean;
  trashed?: boolean;
};

export type ViewType = "photos" | "upload" | "albums" | "favorites" | "trash" | "dashboard" | "settings";

export type SidebarLinkProps = {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export type PhotoCardProps = {
  p: Photo;
  mode?: "photos" | "favorites" | "trash";
  onPreview?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onTrash?: (id: string) => void;
  onRestore?: (id: string) => void;
};

export type PreviewModalProps = {
    photo: Photo | undefined;
    onClose: () => void;
};