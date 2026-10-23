"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base primitive Skeleton component with silky shimmer sweep
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-secondary/80 animate-pulse skeleton-shimmer",
        className
      )}
      {...props}
    />
  );
}

/**
 * Dashboard View Skeleton
 */
export function DashboardSkeleton() {
  return (
    <div className="h-full flex flex-col space-y-5 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Top Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-52 rounded-md" />
          <Skeleton className="h-3.5 w-80 rounded-md" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border/80 bg-card/60 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-9 w-9 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-7 w-24 rounded-md" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Middle Grid (Project Progress + Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 flex-1 min-h-0">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-border/80 bg-card/60 p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>

          <div className="space-y-3 flex-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl border border-border/60 bg-secondary/30 flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <Skeleton className="h-7 w-7 rounded-lg shrink-0" />
                  <div className="space-y-1.5 min-w-0">
                    <Skeleton className="h-4 w-44 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (1 col): Recent Activity */}
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-4 w-36 rounded-md" />
            </div>
            <Skeleton className="h-4 w-12 rounded-md" />
          </div>

          <div className="space-y-3.5 flex-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-full rounded-md" />
                  <Skeleton className="h-2.5 w-24 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Projects View Skeleton
 */
export function ProjectsSkeleton() {
  return (
    <div className="h-full flex flex-col space-y-5 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <div className="flex items-center space-x-2.5">
          <Skeleton className="h-9 w-60 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-border/80 bg-card/60 shadow-2xs space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <Skeleton className="h-8 w-8 rounded-xl" />
                  <Skeleton className="h-4 w-36 rounded-md" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="space-y-1.5 pt-1">
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-3/4 rounded-md" />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16 rounded-md" />
                <Skeleton className="h-3 w-10 rounded-md" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border/50">
              <Skeleton className="h-4 w-28 rounded-md" />
              <div className="flex items-center -space-x-1.5">
                {[1, 2, 3].map((av) => (
                  <Skeleton key={av} className="w-5 h-5 rounded-full ring-2 ring-card" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Kanban Board Skeleton
 */
export function BoardSkeleton() {
  return (
    <div className="h-full flex flex-col space-y-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Board Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center space-x-3">
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-lg" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-28 rounded-xl" />
        </div>
      </div>

      {/* 4 Column Kanban Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1 overflow-hidden">
        {[1, 2, 3, 4].map((col) => (
          <div
            key={col}
            className="flex flex-col rounded-2xl border border-border/70 bg-card/40 p-3.5 space-y-3 h-full"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <div className="flex items-center space-x-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>

            {/* Task Card Skeletons */}
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {[1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="p-3.5 rounded-xl border border-border/60 bg-card shadow-2xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-4 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-3 w-3/4 rounded-md" />
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Skeleton className="h-3.5 w-16 rounded-md" />
                    <div className="flex -space-x-1.5">
                      <Skeleton className="w-5 h-5 rounded-full" />
                      <Skeleton className="w-5 h-5 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * List Table View Skeleton
 */
export function ListSkeleton() {
  return (
    <div className="h-full flex flex-col space-y-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 px-1">
        <Skeleton className="h-9 w-64 rounded-xl" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-20 rounded-xl" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>

      {/* Table Frame */}
      <div className="flex-1 rounded-2xl border border-border/80 bg-card/60 overflow-hidden flex flex-col">
        {/* Table Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/70 bg-secondary/30">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-20 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-border/50 overflow-y-auto flex-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div className="flex items-center space-x-3 w-1/3">
                <Skeleton className="h-4 w-4 rounded-md" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <div className="flex -space-x-1.5">
                <Skeleton className="w-5 h-5 rounded-full" />
                <Skeleton className="w-5 h-5 rounded-full" />
              </div>
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Team Directory View Skeleton
 */
export function TeamSkeleton() {
  return (
    <div className="h-full flex flex-col space-y-5 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <div className="flex items-center space-x-2.5">
          <Skeleton className="h-9 w-60 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-border/80 bg-card/60 shadow-2xs space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3.5">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-3 w-20 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
              <Skeleton className="h-3.5 w-44 rounded-md" />
              <Skeleton className="h-3.5 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Clients & Files View Skeleton
 */
export function ClientsFilesSkeleton() {
  return (
    <div className="h-full flex flex-col space-y-5 max-w-7xl mx-auto w-full overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
        <div className="flex items-center space-x-2.5">
          <Skeleton className="h-9 w-52 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-border/80 bg-card/60 shadow-2xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded-md" />
              <Skeleton className="h-3 w-48 rounded-md" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/50">
              <Skeleton className="h-3.5 w-24 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Notes & Announcements Skeleton
 */
export function NotesSkeleton() {
  return (
    <div className="h-full flex flex-col space-y-5 max-w-5xl mx-auto w-full overflow-hidden">
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-36 rounded-md" />
          <Skeleton className="h-3.5 w-60 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-4 rounded-2xl border border-border/80 bg-card/60 shadow-2xs space-y-3"
          >
            <Skeleton className="h-4 w-32 rounded-md" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-4/5 rounded-md" />
              <Skeleton className="h-3 w-2/3 rounded-md" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/40">
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full Workspace Application Skeleton (Sidebar + Navbar + Viewport)
 */
export function WorkspaceSkeleton() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar Skeleton */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/70 bg-card/50 p-4 space-y-5 shrink-0">
        {/* Workspace Brand / Selector */}
        <div className="flex items-center space-x-3 pb-3 border-b border-border/50">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>

        {/* Navigation Items */}
        <div className="space-y-2 flex-1">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div
              key={item}
              className="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-secondary/30"
            >
              <Skeleton className="w-4 h-4 rounded-md shrink-0" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
          ))}
        </div>

        {/* Sidebar Footer User Pill */}
        <div className="p-3 rounded-xl border border-border/60 bg-secondary/30 flex items-center space-x-3">
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3.5 w-24 rounded-md" />
            <Skeleton className="h-2.5 w-16 rounded-md" />
          </div>
        </div>
      </aside>

      {/* Main Workspace Frame Skeleton */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar Skeleton */}
        <header className="h-16 border-b border-border/70 px-5 flex items-center justify-between bg-card/40 shrink-0">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-64 rounded-xl" />
          </div>
          <div className="flex items-center space-x-3">
            <Skeleton className="h-8 w-24 rounded-xl hidden sm:block" />
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="w-9 h-9 rounded-full" />
          </div>
        </header>

        {/* Viewport Skeleton */}
        <main className="flex-1 overflow-hidden p-4 md:p-6 bg-background/50">
          <DashboardSkeleton />
        </main>
      </div>
    </div>
  );
}
