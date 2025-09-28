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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/photos/`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/gallery");
      router.refresh();
    } catch (err) {
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
        <a href="/gallery" className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200">Back to Gallery</a>
      </div>
      <form onSubmit={onSubmit} className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input required name="title" className="w-full border rounded-xl px-3 py-2" placeholder="Mountain Landscape"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date Taken</label>
            <input type="date" name="taken_at" className="w-full border rounded-xl px-3 py-2"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input name="location" className="w-full border rounded-xl px-3 py-2" placeholder="Swiss Alps"/>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Camera</label>
            <input name="camera" className="w-full border rounded-xl px-3 py-2" placeholder="Canon EOS R5"/>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Photo file</label>
          <input required type="file" name="file" accept="image/*" className="w-full border rounded-xl px-3 py-2 bg-white"/>
        </div>
        <button disabled={busy} className="px-4 py-2 rounded-xl bg-neutral-900 text-white disabled:opacity-60">{busy ? "Uploading…" : "Upload"}</button>
      </form>
    </div>
  );
}
