"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface WorkspaceLogoProps {
  name: string;
  logoUrl?: string;
  className?: string;
  textClassName?: string;
}

/** Workspace brand mark: uploaded logo, or a gradient tile with the workspace initials. */
export function WorkspaceLogo({ name, logoUrl, className, textClassName }: WorkspaceLogoProps) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [logoUrl]);

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "W";

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        onError={() => setFailed(true)}
        className={cn("rounded-xl object-cover bg-card flex-shrink-0", className)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold shadow-sm shadow-indigo-500/20 flex-shrink-0",
        className
      )}
    >
      <span className={cn("text-xs", textClassName)}>{initials}</span>
    </div>
  );
}
