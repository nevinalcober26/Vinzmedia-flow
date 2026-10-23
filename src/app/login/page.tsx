"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/context/StoreContext";
import { useToast } from "@/context/ToastContext";
import { Sparkles, Mail, Lock, ArrowRight, AlertCircle, Clock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStore();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsPendingApproval(false);

    if (!email.trim() || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        router.push("/");
      } else if (res.pendingApproval) {
        setIsPendingApproval(true);
        setErrorMsg("Your registration is pending administrator review. Once the workspace owner or admin approves your account, you will be able to log in.");
      } else {
        setErrorMsg(res.error || "Invalid email or password. Please verify your credentials or create an account.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred while signing in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-pink-500/5 blur-3xl pointer-events-none rounded-full" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/20 mb-2">
            VF
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Sign In to VinzFlow
          </h1>
          <p className="text-xs text-muted-foreground">
            Enter your email and password to access your projects and workspace
          </p>
        </div>

        {/* Card Frame */}
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-xl backdrop-blur-xs space-y-5">
          {errorMsg && (
            <div
              className={`p-3 rounded-xl border flex items-start space-x-2.5 text-xs ${
                isPendingApproval
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  : "bg-red-500/10 border-red-500/20 text-red-500"
              }`}
            >
              {isPendingApproval ? (
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
              )}
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Work Email</span>
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Password</span>
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-foreground text-xs placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold rounded-xl shadow-md transition-all disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Signup */}
          <div className="pt-4 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/signup"
                className="font-semibold text-primary hover:underline transition-colors"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
