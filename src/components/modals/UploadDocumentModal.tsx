"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCode,
  FileCheck,
  Building2,
  FolderKanban,
  Check,
  AlertCircle,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { ClientAvatar } from "@/components/common/ClientAvatar";

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadDocumentModal({ isOpen, onClose }: UploadDocumentModalProps) {
  const { projects, clients, uploadFile } = useStore();
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles = Array.from(fileList);
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);

    try {
      for (const file of selectedFiles) {
        // Read file as base64 URL or create object URL
        const reader = new FileReader();
        const fileUrl = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string) || "");
          reader.onerror = () => resolve(URL.createObjectURL(file));
          reader.readAsDataURL(file);
        });

        uploadFile({
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          url: fileUrl,
          project_id: selectedProjectId || undefined,
          client_id: selectedClientId || undefined,
        });
      }

      toast.success(
        "Documents Uploaded!",
        `${selectedFiles.length} ${selectedFiles.length === 1 ? "file" : "files"} added to workspace.`
      );
      setSelectedFiles([]);
      setSelectedProjectId("");
      setSelectedClientId("");
      onClose();
    } catch (err: any) {
      toast.error("Upload Failed", err?.message || "Failed to upload document.");
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg", "svg", "webp"].includes(ext || "")) {
      return <ImageIcon className="w-4 h-4 text-emerald-500" />;
    }
    if (["xls", "xlsx", "csv"].includes(ext || "")) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    }
    if (["js", "ts", "tsx", "html", "css", "json"].includes(ext || "")) {
      return <FileCode className="w-4 h-4 text-amber-500" />;
    }
    return <FileText className="w-4 h-4 text-primary" />;
  };

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ type: "spring", damping: 28, stiffness: 420 }}
            className="w-full max-w-lg max-h-[88vh] bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-card-foreground cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-muted/30 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Upload Documents & Files</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Upload PDFs, briefs, spreadsheets, and media assets
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
              {/* Drag and Drop Box */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragging
                    ? "border-primary bg-primary/10 scale-[1.01]"
                    : "border-border/80 hover:border-primary/60 bg-secondary/20 hover:bg-secondary/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="font-semibold text-foreground text-xs">
                  Drag & drop your files here, or <span className="text-primary hover:underline">browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Supports PDF, DOCX, XLSX, PNG, JPG, ZIP (up to 50MB)
                </p>
              </div>

              {/* Selected Files List */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <label className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
                    Selected Files ({selectedFiles.length})
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {selectedFiles.map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-secondary/50 border border-border/60 text-xs"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          {getFileIcon(f.name)}
                          <span className="font-medium text-foreground truncate max-w-[260px]">
                            {f.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            ({formatFileSize(f.size)})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Associations: Project & Client */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground text-[11px] flex items-center space-x-1">
                    <FolderKanban className="w-3 h-3 text-primary" />
                    <span>Link to Project (Optional)</span>
                  </label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    <option value="">No Project (Workspace General)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-muted-foreground text-[11px] flex items-center space-x-1">
                    <Building2 className="w-3 h-3 text-indigo-500" />
                    <span>Link to Client (Optional)</span>
                  </label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-xs"
                  >
                    <option value="">No Client Linked</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.company ? `(${c.company})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-2 px-5 py-3 border-t border-border/60 bg-muted/20 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all shadow-md disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploading ? "Uploading..." : `Upload ${selectedFiles.length || ""} Files`}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
