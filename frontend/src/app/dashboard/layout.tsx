"use client";

import React from "react";
import Link from 'next/link'

import { CornerUpLeftIcon } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="h-14 border-b flex items-center px-6 gap-3">
        <Link href="/gallery"><button className="w-9 h-9 rounded-xl bg-neutral-100 grid place-items-center"><CornerUpLeftIcon /></button></Link>
        <h1 className="text-xl font-semibold">Memo Dashboard</h1>
        <div className="ml-auto"/>
        <div className="w-9 h-9 rounded-full bg-neutral-200"/>
      </header>
      <main className="mx-auto max-w-7xl p-6">{children}</main>
    </div>
  );
}