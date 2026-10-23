"use client";

import React from "react";
import { Client } from "@/types";

interface ClientAvatarProps {
  client?: Partial<Client> | null;
  name?: string;
  company?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const CLIENT_GRADIENTS = [
  "from-indigo-600 to-violet-700 text-white",
  "from-blue-600 to-cyan-600 text-white",
  "from-emerald-600 to-teal-700 text-white",
  "from-rose-600 to-pink-700 text-white",
  "from-amber-600 to-orange-700 text-white",
  "from-violet-600 to-fuchsia-700 text-white",
  "from-cyan-600 to-blue-700 text-white",
  "from-teal-600 to-emerald-700 text-white",
  "from-sky-600 to-indigo-700 text-white",
  "from-purple-600 to-pink-700 text-white",
];

export function getClientInitials(company?: string, name?: string): string {
  const source = (company && company.trim()) || (name && name.trim()) || "Client";
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1) {
    const single = words[0];
    if (single.length >= 2) {
      return single.substring(0, 2).toUpperCase();
    }
    return single.substring(0, 1).toUpperCase();
  }
  return "CL";
}

function getGradient(source: string): string {
  let hash = 0;
  for (let i = 0; i < source.length; i++) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CLIENT_GRADIENTS.length;
  return CLIENT_GRADIENTS[index];
}

export function ClientAvatar({
  client,
  name,
  company,
  size = "md",
  rounded = "xl",
  className = "",
}: ClientAvatarProps) {
  const clientCompany = company || client?.company || "";
  const clientName = name || client?.name || "";
  const displayName = clientCompany || clientName || "Client";
  const initials = getClientInitials(clientCompany, clientName);
  const gradient = getGradient(displayName);

  const sizeClasses = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-[11px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-lg",
  };

  const roundedClasses = {
    sm: "rounded-md",
    md: "rounded-lg",
    lg: "rounded-xl",
    xl: "rounded-xl",
    full: "rounded-full",
  };

  return (
    <div
      title={`${displayName}${clientCompany && clientName ? ` (${clientName})` : ""}`}
      className={`relative inline-flex items-center justify-center shrink-0 font-bold tracking-wider select-none shadow-2xs ring-1 ring-border/20 bg-gradient-to-br ${gradient} ${sizeClasses[size]} ${roundedClasses[rounded]} ${className}`}
    >
      <span className="leading-none drop-shadow-2xs">{initials}</span>
    </div>
  );
}
