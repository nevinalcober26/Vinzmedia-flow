import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/context/StoreContext";

export const metadata: Metadata = {
  title: "VinzFlow — Modern Project Management & Team Collaboration",
  description:
    "Production-ready Project Management and Team Collaboration SaaS Platform combining Linear, Notion, ClickUp and Asana.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
