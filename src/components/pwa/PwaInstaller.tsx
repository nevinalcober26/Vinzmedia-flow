"use client";

import React, { useEffect, useState } from "react";
import { Download, Laptop, Smartphone, CheckCircle2, X, Sparkles } from "lucide-react";
import { useToast } from "@/context/ToastContext";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed PWA)
    if (typeof window !== "undefined") {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);

      // Check local storage for dismissal
      const dismissed = localStorage.getItem("vinzflow_pwa_dismissed");
      if (dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }

    // 2. Register Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            // Check for updates
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (
                    installingWorker.state === "installed" &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log("[PWA] New version available!");
                  }
                };
              }
            };
          })
          .catch((err) => {
            console.warn("[PWA] Service worker registration failed:", err);
          });
      });
    }

    // 3. Listen for BeforeInstallPrompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // 4. Listen for AppInstalled event
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success(
        "VinzFlow Installed!",
        "VinzFlow is now installed on your device as a standalone app."
      );
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const handleCustomTrigger = () => {
      setIsDismissed(false);
      handleInstallClick();
    };
    window.addEventListener("trigger-pwa-install", handleCustomTrigger);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("trigger-pwa-install", handleCustomTrigger);
    };
  }, [toast, deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // iOS / Safari instruction or manual hint
      toast.info(
        "Install App",
        "On iPhone / iPad, tap the Share button and select 'Add to Home Screen'. On Mac Safari, select File > Add to Dock."
      );
      return;
    }

    setIsInstalling(true);
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Installing App", "VinzFlow is being added to your applications.");
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.error("[PWA] Install error:", err);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("vinzflow_pwa_dismissed", String(Date.now()));
    }
  };

  // If already running standalone or dismissed, don't show prompt banner
  if (isStandalone || isDismissed || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-sm w-full mx-4 sm:mx-0">
      <div className="bg-card/95 backdrop-blur-md border border-primary/30 rounded-2xl p-4 shadow-2xl text-card-foreground flex items-start space-x-3.5 relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-blue-500 to-indigo-500" />
        
        <div className="p-2.5 rounded-xl bg-primary/10 text-primary shrink-0 border border-primary/20">
          <Download className="w-5 h-5 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center space-x-1.5 mb-1">
            <span className="text-xs font-bold text-foreground">Install VinzFlow App</span>
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
              PWA
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug mb-3">
            Install on your desktop or mobile home screen for lightning-fast launch and offline capability.
          </p>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleInstallClick}
              disabled={isInstalling}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isInstalling ? "Installing..." : "Install Now"}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
            >
              Later
            </button>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
