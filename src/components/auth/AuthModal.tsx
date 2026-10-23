"use client";

import React, { useState } from "react";
import { useStore } from "@/context/StoreContext";
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
} from "lucide-react";
import { Role } from "@/types";
import { getRoleBadge } from "@/lib/permissions";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
}

export function AuthModal({ isOpen, onClose, defaultMode = "signin" }: AuthModalProps) {
  const {
    login,
    signup,
    demoLogin,
    currentUser,
    users,
  } = useStore();

  const [mode, setMode] = useState<"signin" | "signup">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [title, setTitle] = useState("Product Engineer");
  const [department, setDepartment] = useState("Engineering");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const success = await login(email, password);
      if (success) {
        setSuccessMessage("Logged in successfully!");
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 600);
      } else {
        setError("Invalid email or password. You can also use one-click demo login below.");
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!fullName.trim() || !email.trim() || !password.trim()) {
        setError("Please fill out all required fields.");
        setLoading(false);
        return;
      }
      const success = await signup({
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        role,
        title,
        department,
      });

      if (success) {
        setSuccessMessage("Account created successfully! Welcome to VinzFlow.");
        setTimeout(() => {
          onClose();
          setSuccessMessage(null);
        }, 800);
      }
    } catch (err: any) {
      setError(err?.message || "Sign up failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (userRole: Role) => {
    demoLogin(userRole);
    setSuccessMessage(`Switched session to ${userRole.replace("_", " ")}!`);
    setTimeout(() => {
      onClose();
      setSuccessMessage(null);
    }, 400);
  };

  const demoAccounts: { role: Role; name: string; title: string; avatar: string; email: string }[] = [
    {
      role: "owner",
      name: "Alex Morgan",
      title: "Engineering Lead & Owner",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      email: "alex.morgan@vinzmedia.com",
    },
    {
      role: "admin",
      name: "Elena Rostova",
      title: "Staff Product Designer & Admin",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
      email: "elena.rostova@vinzmedia.com",
    },
    {
      role: "project_manager",
      name: "Sarah Jenkins",
      title: "Lead Product Manager",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
      email: "sarah.jenkins@vinzmedia.com",
    },
    {
      role: "member",
      name: "Marcus Chen",
      title: "Senior Full Stack Dev",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      email: "marcus.chen@vinzmedia.com",
    },
    {
      role: "guest",
      name: "David Kim",
      title: "Auditor / Guest Viewer",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
      email: "guest.viewer@vinzmedia.com",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border shadow-2xl rounded-3xl overflow-hidden text-card-foreground animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Tabs */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-border/70 bg-secondary/30">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              VF
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                {mode === "signin" ? "Sign In to VinzFlow" : "Create Your Account"}
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {mode === "signin"
                  ? "Enter credentials or pick a demo persona"
                  : "Role-Based Access Control & Team Workspace"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-secondary/50 border-b border-border text-xs">
          <button
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
            className={`py-2 text-center font-semibold rounded-lg transition-colors ${
              mode === "signin" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode("signup");
              setError(null);
            }}
            className={`py-2 text-center font-semibold rounded-lg transition-colors ${
              mode === "signup" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account & Pick Role
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 max-h-[500px] overflow-y-auto">
          {/* Alerts */}
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center space-x-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Work Email</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Password</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {loading ? "Authenticating..." : "Sign In with Credentials"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Reed"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="jordan@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              {/* RBAC Role Selector with explanations */}
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>Assigned Role (RBAC) *</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground capitalize focus:outline-hidden focus:ring-1 focus:ring-primary"
                >
                  <option value="owner">Workspace Owner (Full Control & Billing)</option>
                  <option value="admin">Administrator (Manage members & all projects)</option>
                  <option value="project_manager">Project Manager (Create projects & tasks)</option>
                  <option value="member">Team Member (Create & update tasks/notes)</option>
                  <option value="guest">Guest / Viewer (Read-only access)</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {getRoleBadge(role).description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Job Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Frontend Dev"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Department</label>
                  <input
                    type="text"
                    placeholder="Engineering / Product / Design"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-secondary/30 border border-border rounded-xl px-3 py-2 text-xs text-foreground"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-all mt-2"
              >
                {loading ? "Creating Profile..." : "Sign Up & Join Workspace"}
              </button>
            </form>
          )}

          {/* Quick Demo Switcher Section */}
          <div className="pt-4 border-t border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                One-Click Role Demonstration
              </span>
              <span className="text-[10px] text-primary flex items-center space-x-1">
                <Sparkles className="w-3 h-3" />
                <span>Instant Switch</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map((account) => {
                const badge = getRoleBadge(account.role);
                const isCurrent = currentUser.role === account.role;
                return (
                  <button
                    key={account.role}
                    onClick={() => handleDemoLogin(account.role)}
                    className={`flex items-center space-x-2.5 p-2 rounded-xl border text-left transition-all ${
                      isCurrent
                        ? "bg-primary/10 border-primary/40 ring-1 ring-primary/30"
                        : "bg-secondary/40 border-border/70 hover:bg-secondary"
                    }`}
                  >
                    <img
                      src={account.avatar}
                      alt={account.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-border"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground truncate">
                          {account.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {account.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
