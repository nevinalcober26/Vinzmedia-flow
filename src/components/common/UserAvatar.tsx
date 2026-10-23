"use client";

import React, { useState } from "react";
import { User, UserStatus } from "@/types";

interface UserAvatarProps {
  user?: Partial<User> | null;
  name?: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showStatus?: boolean;
  status?: UserStatus | string;
}

const GRADIENTS = [
  "from-indigo-500 via-purple-500 to-pink-500",
  "from-blue-600 via-indigo-600 to-violet-700",
  "from-emerald-500 via-teal-500 to-cyan-600",
  "from-amber-500 via-orange-500 to-rose-500",
  "from-fuchsia-500 via-pink-500 to-rose-500",
  "from-violet-600 via-purple-600 to-indigo-700",
  "from-cyan-500 via-blue-500 to-indigo-500",
];

function getGradientFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[index];
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function UserAvatar({
  user,
  name,
  avatarUrl,
  size = "md",
  className = "",
  showStatus = false,
  status,
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const displayName = name || user?.full_name || user?.email || "User";
  const photoUrl = avatarUrl !== undefined ? avatarUrl : user?.avatar_url;
  const currentStatus = status || user?.status || "online";

  const initials = getInitials(displayName);
  const gradient = getGradientFromName(displayName);

  const sizeClasses = {
    xs: "w-5 h-5 text-[9px]",
    sm: "w-7 h-7 text-[11px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-lg",
    "2xl": "w-24 h-24 text-2xl",
  };

  const statusDotSizes = {
    xs: "w-1.5 h-1.5 -bottom-0.5 -right-0.5 ring-1",
    sm: "w-2 h-2 -bottom-0.5 -right-0.5 ring-1.5",
    md: "w-2.5 h-2.5 -bottom-0.5 -right-0.5 ring-2",
    lg: "w-3.5 h-3.5 -bottom-0.5 -right-0.5 ring-2",
    xl: "w-4 h-4 bottom-0 right-0 ring-2.5",
    "2xl": "w-5 h-5 bottom-0.5 right-0.5 ring-3",
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case "online":
        return "bg-emerald-500 ring-card";
      case "busy":
        return "bg-rose-500 ring-card";
      case "away":
        return "bg-amber-500 ring-card";
      case "offline":
      default:
        return "bg-slate-400 ring-card";
    }
  };

  const hasValidPhoto = Boolean(photoUrl && photoUrl.trim() && !imageError);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {hasValidPhoto ? (
        <img
          src={photoUrl!}
          alt={displayName}
          onError={() => setImageError(true)}
          className={`${sizeClasses[size]} rounded-2xl object-cover ring-1 ring-border shadow-2xs select-none`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-2xl bg-gradient-to-br ${gradient} text-white font-bold flex items-center justify-center shadow-xs select-none ring-1 ring-white/10`}
        >
          <span>{initials}</span>
        </div>
      )}

      {showStatus && (
        <span
          className={`absolute rounded-full ${statusDotSizes[size]} ${getStatusColor(
            currentStatus
          )}`}
          title={`Status: ${currentStatus}`}
        />
      )}
    </div>
  );
}
