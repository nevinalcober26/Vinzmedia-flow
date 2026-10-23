"use client";

import { EmptyState } from "@/components/common/EmptyState";
import React, { useState, useRef } from "react";
import { useStore } from "@/context/StoreContext";
import { useConfirm } from "@/context/ToastContext";
import {
  FolderKanban,
  FileText,
  Users,
  Upload,
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  FileCheck,
  Building2,
  Mail,
  User as UserIcon,
  X,
  Sparkles,
  Paperclip,
  CheckCircle2,
  Layers,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { ProjectFile, Client } from "@/types";
import { ClientAvatar } from "@/components/common/ClientAvatar";
import { motion, AnimatePresence } from "framer-motion";
import { fileService } from "@/lib/services/fileService";

interface ClientsFilesViewProps {
  initialProjectId?: string;
  hideClientTab?: boolean;
}

export function ClientsFilesView({
  initialProjectId,
  hideClientTab = false,
}: ClientsFilesViewProps = {}) {
  const confirm = useConfirm();
  const {
    files,
    uploadFile,
    deleteFile,
    clients,
    createClient,
    projects,
    currentUser,
  } = useStore();

  const [activeTab, setActiveTab] = useState<"files" | "clients">("files");
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>(initialProjectId || "all");
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>("all");

  // Upload modal / state
  const [isDocTypeModalOpen, setIsDocTypeModalOpen] = useState(false);
  const [fileInputAccept, setFileInputAccept] = useState<string>("*/*");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadProjectTarget, setUploadProjectTarget] = useState<string>(initialProjectId || "");
  const [uploadClientTarget, setUploadClientTarget] = useState<string>("");
  const [selectedFilesToUpload, setSelectedFilesToUpload] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const openFilePickerForType = (type: "doc" | "pdf" | "any") => {
    setIsDocTypeModalOpen(false);
    let acceptString = "*/*";
    if (type === "doc") {
      acceptString = ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else if (type === "pdf") {
      acceptString = ".pdf,application/pdf";
    }
    setFileInputAccept(acceptString);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  };

  React.useEffect(() => {
    if (initialProjectId) {
      setSelectedProjectFilter(initialProjectId);
      setUploadProjectTarget(initialProjectId);
    }
  }, [initialProjectId]);

  // Client modal
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientStatus, setClientStatus] = useState<"active" | "lead" | "past">("active");
  const [clientProjects, setClientProjects] = useState<string[]>([]);

  // File Preview modal
  const [previewFile, setPreviewFile] = useState<ProjectFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format bytes
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Helper: File Type Icon & Color
  const getFileIcon = (type: string, name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (type.includes("pdf") || ext === "pdf") {
      return {
        icon: FileText,
        color: "text-red-500 bg-red-500/10 border-red-500/20",
        label: "PDF Document",
      };
    }
    if (type.includes("word") || ext === "doc" || ext === "docx") {
      return {
        icon: FileText,
        color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
        label: "Word Document",
      };
    }
    if (type.includes("sheet") || ext === "xlsx" || ext === "csv") {
      return {
        icon: FileSpreadsheet,
        color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
        label: "Spreadsheet",
      };
    }
    if (type.includes("image") || ["png", "jpg", "jpeg", "svg", "webp"].includes(ext || "")) {
      return {
        icon: ImageIcon,
        color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
        label: "Image Media",
      };
    }
    if (type.includes("presentation") || ext === "pptx") {
      return {
        icon: Layers,
        color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
        label: "Presentation",
      };
    }
    return {
      icon: FileCode,
      color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
      label: "Document",
    };
  };

  // Filtered files
  const filteredFiles = files.filter((f) => {
    if (selectedProjectFilter !== "all" && f.project_id !== selectedProjectFilter) return false;
    if (selectedClientFilter !== "all" && f.client_id !== selectedClientFilter) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedType !== "all") {
      const ext = f.name.split(".").pop()?.toLowerCase() || "";
      if (selectedType === "pdf" && !ext.includes("pdf")) return false;
      if (selectedType === "doc" && !["doc", "docx"].includes(ext)) return false;
      if (selectedType === "sheet" && !["xlsx", "csv"].includes(ext)) return false;
      if (selectedType === "image" && !["png", "jpg", "jpeg", "svg", "webp"].includes(ext)) return false;
    }
    return true;
  });

  // Handle Real File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFilesToUpload(Array.from(e.target.files));
      setIsUploadModalOpen(true);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFilesToUpload(Array.from(e.dataTransfer.files));
      setIsUploadModalOpen(true);
    }
  };

  // Submit Upload to Store & Storage
  const handleConfirmUpload = async () => {
    setIsUploadModalOpen(false);
    for (const file of selectedFilesToUpload) {
      let fileUrl = "";
      try {
        const storageUrl = await fileService.uploadToStorage("documents", file.name, file);
        if (storageUrl) {
          fileUrl = storageUrl;
        }
      } catch {}

      if (!fileUrl) {
        fileUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      uploadFile({
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        url: fileUrl,
        project_id: uploadProjectTarget || undefined,
        client_id: uploadClientTarget || undefined,
      });
    }

    setSelectedFilesToUpload([]);
  };

  // Real Browser File Download
  const handleDownloadFile = (file: ProjectFile) => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientCompany.trim()) return;
    createClient({
      name: clientName.trim(),
      company: clientCompany.trim(),
      email: clientEmail.trim(),
      status: clientStatus,
      project_ids: clientProjects,
    });
    setClientName("");
    setClientCompany("");
    setClientEmail("");
    setClientProjects([]);
    setIsClientModalOpen(false);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-base font-bold text-foreground">
            Client & Project Assets Library
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage media files, PDF specs, Word documents, and client associations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept={fileInputAccept}
            multiple
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => setIsDocTypeModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>

          <button
            onClick={() => setIsClientModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold rounded-lg transition-all"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      {!hideClientTab && (
        <div className="flex items-center space-x-2 border-b border-border text-xs">
          <button
            onClick={() => setActiveTab("files")}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "files"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>All Documents & Media ({files.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("clients")}
            className={`flex items-center space-x-2 px-3.5 py-2 border-b-2 font-medium transition-colors ${
              activeTab === "clients"
                ? "border-primary text-foreground font-semibold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Clients & Accounts ({clients.length})</span>
          </button>
        </div>
      )}

      {/* Tab 1: Files & Media Assets */}
      {activeTab === "files" && (
        <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center text-center ${
              isDragging
                ? "border-primary bg-primary/10 scale-[0.99]"
                : "border-border/80 bg-secondary/20 hover:bg-secondary/40 hover:border-border"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              Drop PDFs, Word documents (.docx), Spreadsheets, or images here
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              or click to browse from your computer (supported formats: PDF, DOCX, XLSX, PPTX, PNG, JPG)
            </p>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search file name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-secondary/50 border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary w-40 md:w-56"
                />
              </div>

              {/* Type Category */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF Documents</option>
                <option value="doc">Word Docs (.docx)</option>
                <option value="sheet">Spreadsheets (.xlsx)</option>
                <option value="image">Media & Images</option>
              </select>

              {/* Project Filter */}
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* Client Filter */}
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="bg-secondary/50 border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground"
              >
                <option value="all">All Clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs text-muted-foreground font-mono">
              {filteredFiles.length} files found
            </span>
          </div>

          {/* Files Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pb-10">
            {filteredFiles.length === 0 ? (
              <EmptyState
                className="col-span-full self-start"
                icon={FileText}
                title={search || selectedType !== "all" || selectedClientFilter !== "all" || (!initialProjectId && selectedProjectFilter !== "all") ? "No files match your filters" : "Your files, all in one place"}
                description="Keep briefs, documents, and deliverables together. Upload a file or adjust your filters to find what you need."
                actionLabel={search || selectedType !== "all" || selectedClientFilter !== "all" || (!initialProjectId && selectedProjectFilter !== "all") ? "Clear filters" : "Upload a file"}
                onAction={() => {
                  if (search || selectedType !== "all" || selectedClientFilter !== "all" || (!initialProjectId && selectedProjectFilter !== "all")) {
                    setSearch(""); setSelectedType("all"); setSelectedClientFilter("all"); setSelectedProjectFilter(initialProjectId || "all");
                  } else setIsDocTypeModalOpen(true);
                }}
              />
            ) : (
              filteredFiles.map((file) => {
                const iconInfo = getFileIcon(file.type, file.name);
                const IconComponent = iconInfo.icon;
                const associatedProject = projects.find((p) => p.id === file.project_id);
                const associatedClient = clients.find((c) => c.id === file.client_id);

                return (
                  <div
                    key={file.id}
                    className="p-4 rounded-2xl border border-border/80 bg-card hover:border-border shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Row: File icon & Action Buttons */}
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${iconInfo.color}`}
                        >
                          <IconComponent className="w-5 h-5" />
                        </div>

                        <div className="flex items-center space-x-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          {/* Preview button */}
                          <button
                            onClick={() => setPreviewFile(file)}
                            title="Preview file"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download button */}
                          <button
                            onClick={() => handleDownloadFile(file)}
                            title="Download file"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Delete button */}
                          <button
                            onClick={() => {
                              confirm({
                                title: "Delete File?",
                                message: `Are you sure you want to delete "${file.name}"? This file will be removed permanently.`,
                                confirmText: "Delete File",
                                variant: "danger",
                                onConfirm: () => {
                                  deleteFile(file.id);
                                },
                              });
                            }}
                            title="Delete file"
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* File Name */}
                      <h4
                        onClick={() => setPreviewFile(file)}
                        className="text-xs font-bold text-foreground line-clamp-2 hover:text-primary transition-colors cursor-pointer leading-snug"
                        title={file.name}
                      >
                        {file.name}
                      </h4>

                      {/* Associated Project / Client Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {associatedProject && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-secondary text-foreground font-medium">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: associatedProject.color }}
                            />
                            <span>{associatedProject.name}</span>
                          </span>
                        )}

                        {associatedClient && (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-500 font-semibold border border-indigo-500/20">
                            <Building2 className="w-2.5 h-2.5" />
                            <span>{associatedClient.name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer: File Size & Uploaded info */}
                    <div className="mt-4 pt-2.5 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-mono font-medium">{formatBytes(file.size)}</span>
                      <span>{formatRelativeTime(file.uploaded_at)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Clients & Accounts */}
      {activeTab === "clients" && (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-12">
          {clients.length === 0 && <EmptyState className="col-span-full self-start" icon={Users} title="Make room for your first client" description="Connect clients to their projects, files, and billing so every engagement stays organized." actionLabel="Add client" onAction={() => setIsClientModalOpen(true)} />}
          {clients.map((client) => {
            const clientFiles = files.filter((f) => f.client_id === client.id);
            const clientProjectsList = projects.filter((p) =>
              (client.project_ids || []).includes(p.id)
            );

            return (
              <div
                key={client.id}
                className="p-5 rounded-2xl border border-border/80 bg-card shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <ClientAvatar client={client} size="lg" rounded="xl" />
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${
                        client.status === "active"
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                          : "bg-slate-500/10 text-slate-500 border-slate-500/30"
                      }`}
                    >
                      {client.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">{client.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{client.company}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center space-x-1 mt-1">
                    <Mail className="w-3 h-3" />
                    <span>{client.email}</span>
                  </p>

                  {/* Active Projects */}
                  <div className="mt-3 space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Associated Projects ({clientProjectsList.length})
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {clientProjectsList.map((p) => (
                        <span
                          key={p.id}
                          className="px-2 py-0.5 rounded text-[10px] bg-secondary text-foreground font-medium flex items-center space-x-1"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          <span>{p.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer: Uploaded files count */}
                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    {clientFiles.length} documents uploaded
                  </span>
                  <button
                    onClick={() => {
                      setUploadClientTarget(client.id);
                      fileInputRef.current?.click();
                    }}
                    className="text-primary hover:underline font-semibold text-[11px] flex items-center space-x-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload Assets</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Type Selector Popup */}
      <AnimatePresence>
        {isDocTypeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
            onClick={() => setIsDocTypeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="w-full max-w-md max-h-[85vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/60 bg-secondary/30 shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Choose Document Format</h3>
                    <p className="text-[11px] text-muted-foreground">Select what you want to upload</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDocTypeModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                {/* Option 1: Word Document */}
                <button
                  type="button"
                  onClick={() => openFilePickerForType("doc")}
                  className="w-full flex items-center space-x-3.5 p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground group-hover:text-blue-500 transition-colors">
                        Word Document
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
                        .DOCX, .DOC
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Microsoft Word, proposals, briefs, and editable text
                    </p>
                  </div>
                </button>

                {/* Option 2: PDF File */}
                <button
                  type="button"
                  onClick={() => openFilePickerForType("pdf")}
                  className="w-full flex items-center space-x-3.5 p-3.5 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground group-hover:text-rose-500 transition-colors">
                        PDF Document
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500">
                        .PDF
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Adobe PDF contracts, signed invoices, and reports
                    </p>
                  </div>
                </button>

                {/* Option 3: Other Files / Media */}
                <button
                  type="button"
                  onClick={() => openFilePickerForType("any")}
                  className="w-full flex items-center space-x-3.5 p-3.5 rounded-2xl border border-border/70 bg-secondary/30 hover:bg-secondary/60 transition-all text-left group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">
                        All Project Files & Media
                      </span>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-secondary text-muted-foreground">
                        Images, Sheets, etc.
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Spreadsheets (.xlsx), graphics, presentations
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setIsDocTypeModalOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Target Project / Client Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsUploadModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="w-full max-w-md max-h-[85vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30 shrink-0">
                <div className="flex items-center space-x-2">
                  <Upload className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Confirm File Upload ({selectedFilesToUpload.length})
                  </h3>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto text-xs">
                {/* Files preview list */}
                <div className="max-h-32 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-secondary/30 border border-border/60">
                  {selectedFilesToUpload.map((f, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground truncate max-w-xs">{f.name}</span>
                      <span className="font-mono text-muted-foreground text-[10px]">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>

                {/* Project Destination */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Assign to Project (Optional)</label>
                  <select
                    value={uploadProjectTarget}
                    onChange={(e) => setUploadProjectTarget(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="">No Project (Workspace General)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Client Destination */}
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Assign to Client (Optional)</label>
                  <select
                    value={uploadClientTarget}
                    onChange={(e) => setUploadClientTarget(e.target.value)}
                    className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value="">No Client Association</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 px-5 py-3 border-t border-border bg-secondary/20 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-muted-foreground hover:bg-secondary text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-sm hover:bg-primary/90 cursor-pointer"
                >
                  Confirm & Upload
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Client Modal */}
      <AnimatePresence>
        {isClientModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
            onClick={() => setIsClientModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="w-full max-w-md max-h-[85vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30 shrink-0">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Add New Client Account</h3>
                </div>
                <button
                  onClick={() => setIsClientModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-md cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateClient} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Client Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Health Corp"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Company Entity</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Health Global Inc."
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Contact Email</label>
                    <input
                      type="email"
                      placeholder="contact@client.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-1.5 text-xs text-foreground"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2 px-5 py-3 border-t border-border bg-secondary/20 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsClientModalOpen(false)}
                    className="px-3.5 py-1.5 rounded-xl text-muted-foreground hover:bg-secondary text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!clientName.trim() || !clientCompany.trim()}
                    className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
                  >
                    Create Client
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
              className="w-full max-w-3xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground flex flex-col max-h-[85vh] cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-secondary/40">
                <div className="flex items-center space-x-2 truncate max-w-md">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-xs font-bold text-foreground truncate">{previewFile.name}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ({formatBytes(previewFile.size)})
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadFile(previewFile)}
                    className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setPreviewFile(null)}
                    className="text-muted-foreground hover:text-foreground p-1 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Frame */}
              <div className="flex-1 overflow-auto p-6 flex flex-col items-center justify-center min-h-[400px] bg-secondary/10">
                {previewFile.url && previewFile.url.startsWith("data:image/") ? (
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-h-[500px] max-w-full rounded-lg object-contain shadow-md"
                  />
                ) : previewFile.type.includes("pdf") || previewFile.name.endsWith(".pdf") ? (
                  <div className="w-full h-[520px] rounded-lg overflow-hidden border border-border">
                    <iframe
                      src={previewFile.url}
                      className="w-full h-full"
                      title={previewFile.name}
                    />
                  </div>
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center text-primary mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{previewFile.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        File type: {previewFile.type || "Document"} • {formatBytes(previewFile.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadFile(previewFile)}
                      className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm"
                    >
                      Download to View Locally
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
