"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  AtSign,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { inviteService } from "@/lib/services/inviteService";
import { WorkspaceInvite } from "@/types";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [invite, setInvite] = useState<WorkspaceInvite | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      return;
    }

    const loadInvite = async () => {
      try {
        const found = await inviteService.getInviteByToken(token);
        if (found) {
          setInvite(found);
          if (found.email) setEmail(found.email);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsValidating(false);
      }
    };

    loadInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim() || !username.trim() || !email.trim() || !password) {
      setErrorMsg("Please fill in all required fields.");
      return;
    }

    if (username.length < 3) {
      setErrorMsg("Username must be at least 3 characters.");
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inviteService.submitRegistration(
        token,
        fullName.trim(),
        username.trim(),
        email.trim(),
        password
      );

      if (res.success) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {}
        setIsSubmitted(true);
      } else {
        setErrorMsg(res.error || "Failed to submit registration. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">
            Verifying invitation link...
          </p>
        </div>
      </div>
    );
  }

  if (!invite) return <main className="min-h-screen flex items-center justify-center p-8"><div className="space-y-4 text-center"><h1 className="text-xl font-semibold">Invitation unavailable</h1><p>This link is invalid, expired, already used, or could not be verified. Ask your administrator for a new invitation.</p><Link href="/login" className="text-primary">Go to sign in</Link></div></main>;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-lg relative z-10">
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="invite-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Team Member Invitation</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                  Join VinzMedia Workspace
                </h1>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Set up your username and password below. Once submitted, an administrator will approve your account to activate your invited role.
                </p>
              </div>

              {/* Registration Card */}
              <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-6 md:p-8 shadow-2xl space-y-5">
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-2.5 text-xs text-rose-500"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Username */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                      <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Username</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-mono text-xs">
                        @
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="janedoe"
                        value={username}
                        onChange={(e) =>
                          setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                        }
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="jane@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    />
                  </div>

                  {/* Password & Confirm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Password</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Confirm Password</span>
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/30 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-[11px] text-muted-foreground flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      After submitting, your profile will be placed in the <strong>Pending Approvals</strong> queue for Administrator review. Once approved, you can access the workspace with your approved role.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit for Administrator Approval</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="pt-4 border-t border-border/60 text-center">
                  <p className="text-xs text-muted-foreground">
                    Already an approved member?{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      Sign In here
                    </Link>
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="submitted-success"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="rounded-3xl border border-border bg-card/95 backdrop-blur-md p-8 md:p-10 shadow-2xl text-center space-y-6"
            >
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Registration Submitted!
                </h2>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Welcome aboard, <strong className="text-foreground">{fullName}</strong> (<code>@{username}</code>). Your registration has been dispatched to the workspace administrator.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left text-xs text-amber-500 space-y-1.5">
                <div className="flex items-center space-x-2 font-semibold">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Awaiting Administrator / Owner Approval</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-normal pl-6">
                  Workspace Owner (Vinz Media) will verify and approve your request in the Team Panel. Once approved, your invited role will become active and you will be able to log in.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => router.push("/login")}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs shadow-md hover:bg-primary/90 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <span>Go to Login Screen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <InviteContent />
    </Suspense>
  );
}
