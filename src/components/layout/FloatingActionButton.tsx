"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  FolderPlus,
  CheckSquare,
  FileUp,
  Sparkles,
  ChevronRight,
  Layers,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { UploadDocumentModal } from "@/components/modals/UploadDocumentModal";

export function FloatingActionButton() {
  const { setIsCreateProjectModalOpen, setIsCreateTaskModalOpen } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to smoothly close the floating action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard shortcut: Escape to close FAB menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const actionItems = [
    {
      id: "create_project",
      label: "Create Project",
      sublabel: "New project board & milestones",
      icon: FolderPlus,
      gradient: "from-blue-600 to-indigo-600",
      shadow: "shadow-blue-500/25",
      badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      onClick: () => {
        setIsOpen(false);
        setIsCreateProjectModalOpen(true);
      },
    },
    {
      id: "create_task",
      label: "Create a Task",
      sublabel: "Add to-dos, work items & assignments",
      icon: CheckSquare,
      gradient: "from-emerald-600 to-teal-600",
      shadow: "shadow-emerald-500/25",
      badgeColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      onClick: () => {
        setIsOpen(false);
        setIsCreateTaskModalOpen(true);
      },
    },
    {
      id: "upload_document",
      label: "Upload Document",
      sublabel: "Attach briefs, PDFs, spreadsheets & files",
      icon: FileUp,
      gradient: "from-purple-600 to-fuchsia-600",
      shadow: "shadow-purple-500/25",
      badgeColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      onClick: () => {
        setIsOpen(false);
        setIsUploadDocModalOpen(true);
      },
    },
  ];

  return (
    <>
      <div ref={containerRef} className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Backdrop scrim overlay when open */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-2xs z-40"
              onClick={() => setIsOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Floating Action Menu Items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.9 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 26,
                mass: 0.8,
              }}
              className="relative z-50 mb-3.5 flex flex-col space-y-2.5 w-72 sm:w-80"
            >
              {actionItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: 24, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 18, scale: 0.9 }}
                    transition={{
                      type: "spring",
                      stiffness: 450,
                      damping: 28,
                      delay: (actionItems.length - 1 - index) * 0.05,
                    }}
                    whileHover={{ scale: 1.025, x: -3 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={item.onClick}
                    className="group relative flex items-center justify-between p-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/80 shadow-xl hover:border-primary/50 transition-colors text-left cursor-pointer overflow-hidden"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${item.gradient} text-white flex items-center justify-center shadow-md ${item.shadow} group-hover:scale-110 transition-transform duration-200 shrink-0`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                          {item.label}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {item.sublabel}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Action Master Button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.93 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`relative z-50 flex items-center justify-center w-14 h-14 rounded-2xl text-white shadow-xl cursor-pointer transition-all duration-300 ${
            isOpen
              ? "bg-slate-900 border border-slate-700 shadow-slate-900/40 text-foreground"
              : "bg-gradient-to-tr from-indigo-600 via-purple-600 to-fuchsia-600 shadow-indigo-500/35 hover:shadow-indigo-500/50"
          }`}
          title={isOpen ? "Close Actions" : "Quick Actions (Create Task, Project, Upload)"}
        >
          {/* Subtle Ambient Pulse Ring when closed */}
          {!isOpen && (
            <span className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-40 blur-md -z-10 animate-pulse" />
          )}

          {/* Smooth rotating icon from Plus to X */}
          <motion.div
            animate={{ rotate: isOpen ? 135 : 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="flex items-center justify-center"
          >
            <Plus className="w-6 h-6 stroke-[2.4]" />
          </motion.div>
        </motion.button>
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
      />
    </>
  );
}
