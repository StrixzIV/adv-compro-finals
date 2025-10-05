"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);

    const file = fd.get("file") as File;
    if (!file) return alert("Please select a file first!");
    if (!file.type.startsWith("image/")) return alert("Only image files are allowed!");
    if (file.size > 5 * 1024 * 1024) return alert("File size must be below 5MB.");

    try {
      setBusy(true);
      setProgress(10);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/photos/`, {
        method: "POST",
        body: fd,
      });

      setProgress(90);

      if (!res.ok) throw new Error(await res.text());
      setProgress(100);
      setSuccess(true);

      setTimeout(() => {
        router.push("/gallery");
        router.refresh();
      }, 1500);
    } catch (err) {
      alert(String(err));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return setPreview(null);

    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function resetForm() {
    formRef.current?.reset();
    setPreview(null);
    setProgress(0);
    setSuccess(false);
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold">Upload</h1>
        <div className="ml-auto" />
        <a
          href="/gallery"
          className="px-3 py-1.5 rounded-xl bg-neutral-100 hover:bg-neutral-200"
        >
          Back to Gallery
        </a>
      </div>

      {success && (
        <div className="p-3 bg-green-100 text-green-700 rounded-lg text-center font-medium">
          ✅ Uploaded successfully! Redirecting...
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} className="card p-6 space-y-4" onKeyDown={(e) => {
        if (e.key === "Enter" && !busy) onSubmit(e as any);
      }}>
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            required
            name="title"
            className="w-full border rounded-xl px-3 py-2"
            placeholder="Mountain Landscape"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Date Taken</label>
            <input type="date" name="taken_at" className="w-full border rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input
              name="location"
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Swiss Alps"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Camera</label>
            <input
              name="camera"
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Canon EOS R5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Photo File</label>
          <input
            required
            type="file"
            name="file"
            accept="image/*"
            onChange={onFileChange}
            className="w-full border rounded-xl px-3 py-2 bg-white"
          />
        </div>

        {preview && (
          <div className="mt-3">
            <p className="text-sm text-neutral-600 mb-1">Preview:</p>
            <img
              src={preview}
              alt="preview"
              className="w-full rounded-xl shadow-md border object-cover"
            />
          </div>
        )}

        {progress > 0 && (
          <div className="w-full bg-neutral-200 rounded-full h-2 mt-2">
            <div
              className="h-2 bg-green-600 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="flex gap-3">
          <button
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-neutral-900 text-white disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 rounded-xl border border-neutral-300 hover:bg-neutral-100"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

