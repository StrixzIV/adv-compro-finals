"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    
    try {
      setBusy(true);
      
      // Get the auth token from localStorage, cookies, or your auth context
      const token = localStorage.getItem("access_token"); // Adjust based on your auth implementation
      
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/storage/upload/photo`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
        body: fd,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Upload failed");
      }
      
      const result = await res.json();
      console.log("Upload successful:", result);
      
      router.push("/gallery");
      router.refresh();
    } catch (err) {
      console.error("Upload error:", err);
      alert(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Upload</h1>
        <div className="ml-auto"/>
        <a href="/gallery" className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200">
          Back to Gallery
        </a>
      </div>
      
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Photo file</label>
          <input 
            required 
            type="file" 
            name="file" 
            accept="image/*" 
            className="w-full border rounded-xl px-3 py-2 bg-white"
          />
          <p className="text-xs text-gray-500 mt-1">
            EXIF data will be automatically extracted from your photo
          </p>
        </div>
        
        <button 
          disabled={busy} 
          className="w-full px-4 py-2 rounded-xl bg-neutral-900 text-white disabled:opacity-60 hover:bg-neutral-800 transition-colors"
        >
          {busy ? "Uploading…" : "Upload Photo"}
        </button>
      </form>
      
      <div className="text-sm text-gray-600 space-y-2">
        <p className="font-medium">Note:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Your photo will be automatically processed and thumbnails will be generated</li>
          <li>EXIF metadata (camera, location, date) will be extracted if available</li>
          <li>Supported formats: JPEG, PNG, and other common image types</li>
        </ul>
      </div>
    </div>
  );
}