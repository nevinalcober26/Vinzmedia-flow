"use client";

import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { UserAvatar } from "@/components/common/UserAvatar";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  Trash2,
  Sparkles,
  User,
  AtSign,
  Mail,
  Briefcase,
  Building,
  Activity,
  Check,
  Camera,
  Image as ImageIcon,
} from "lucide-react";
import { UserStatus } from "@/types";

export function EditProfileModal() {
  const {
    currentUser,
    isProfileModalOpen,
    setIsProfileModalOpen,
    updateUserProfile,
  } = useStore();

  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(currentUser.full_name || "");
  const [username, setUsername] = useState(currentUser.username || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser.avatar_url || null);
  const [title, setTitle] = useState(currentUser.title || "");
  const [department, setDepartment] = useState(currentUser.department || "Executive");
  const [status, setStatus] = useState<UserStatus>(currentUser.status || "online");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isProfileModalOpen) {
      setFullName(currentUser.full_name || "");
      setUsername(currentUser.username || "");
      setAvatarUrl(currentUser.avatar_url || null);
      setTitle(currentUser.title || "");
      setDepartment(currentUser.department || "Executive");
      setStatus(currentUser.status || "online");
    }
  }, [isProfileModalOpen, currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File", "Please select a PNG, JPG, or WEBP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Profile picture must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        toast.success("Image Loaded", "Preview updated. Click Save Changes to apply.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Name Required", "Please enter your full name.");
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateUserProfile({
        full_name: fullName.trim(),
        username: username.trim().toLowerCase().replace(/^@/, ""),
        avatar_url: avatarUrl || undefined,
        title: title.trim(),
        department: department.trim(),
        status,
      });

      if (success) {
        setIsProfileModalOpen(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcut: Escape to close modal
  useEffect(() => {
    if (!isProfileModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProfileModalOpen, setIsProfileModalOpen]);

  return (
    <AnimatePresence>
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md cursor-pointer"
          onClick={() => setIsProfileModalOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="w-full max-w-lg max-h-[88vh] flex flex-col bg-card border border-border shadow-2xl rounded-2xl overflow-hidden text-card-foreground cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Edit Profile & Avatar</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Customize your personal information and profile picture
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 sm:p-5 space-y-3.5 text-xs overflow-y-auto flex-1">
                {/* Avatar Section */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 flex items-center space-x-4">
                <div className="relative group">
                  <UserAvatar
                    name={fullName}
                    avatarUrl={avatarUrl}
                    size="xl"
                    showStatus
                    status={status}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change picture"
                    className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2 flex-1">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Profile Picture</h4>
                    <p className="text-[11px] text-muted-foreground">
                      PNG, JPG, or WEBP (Max 5MB)
                    </p>
                  </div>

                  <div className="flex items-center space-x-2.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-xs hover:bg-primary/90 transition-all flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Photo</span>
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl(null)}
                        className="text-xs text-muted-foreground hover:text-rose-500 font-medium transition-colors cursor-pointer flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Full Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Vinz Media"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                    <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Username</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    placeholder="vinzmedia"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all font-mono"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/50 text-muted-foreground text-xs cursor-not-allowed"
                />
              </div>

              {/* Title & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Job Title</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Founder & Workspace Owner"
                    className="w-full px-3.5 py-2 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                    <Building className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Department</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-secondary/30 text-foreground text-xs focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="Executive">Executive Leadership</option>
                    <option value="Product">Product & Design</option>
                    <option value="Engineering">Engineering & Development</option>
                    <option value="Marketing">Marketing & Growth</option>
                    <option value="Operations">Operations & HR</option>
                    <option value="Sales">Sales & Client Relations</option>
                  </select>
                </div>
              </div>

              {/* Live Presence Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Availability Status</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: "online", label: "Online", color: "bg-emerald-500" },
                      { id: "busy", label: "Busy", color: "bg-rose-500" },
                      { id: "away", label: "Away", color: "bg-amber-500" },
                      { id: "offline", label: "Offline", color: "bg-slate-400" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatus(s.id)}
                      className={`py-2 px-2.5 rounded-xl border flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                        status === s.id
                          ? "bg-primary/10 border-primary text-foreground font-bold shadow-xs"
                          : "border-border/60 bg-secondary/20 text-muted-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.color}`} />
                      <span className="capitalize text-[11px]">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end space-x-2 px-5 py-3 border-t border-border bg-secondary/20 shrink-0">
              <button
                type="button"
                onClick={() => setIsProfileModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </form>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
