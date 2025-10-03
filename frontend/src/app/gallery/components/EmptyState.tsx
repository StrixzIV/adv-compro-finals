import React from "react";

type EmptyStateProps = {
    title: string;
    subtitle: string;
};

export default function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="grid place-items-center rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-600 shadow-sm">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  );
}