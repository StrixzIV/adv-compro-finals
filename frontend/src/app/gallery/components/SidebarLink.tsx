import React from "react";
import { SidebarLinkProps } from "../interfaces/types";

export default function SidebarLink({ icon: Icon, label, active = false, onClick }: SidebarLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
        active
          ? "bg-gray-900/5 text-gray-900 shadow-sm"
          : "text-gray-600 hover:bg-gray-900/5 hover:text-gray-900"
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}