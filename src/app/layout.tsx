import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/context/StoreContext";
import { ToastProvider } from "@/context/ToastContext";

export const metadata: Metadata = {
  title: "VinzFlow — Modern Project Management & Team Collaboration",
  description:
    "Production-ready Project Management and Team Collaboration SaaS Platform combining Linear, Notion, ClickUp and Asana.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <ToastProvider>
          <StoreProvider>{children}</StoreProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
