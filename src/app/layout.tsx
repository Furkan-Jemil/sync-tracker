import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncTracker — Execution Visibility & Responsibility Graph",
  description:
    "Real-time task synchronization, responsibility tracking, and execution visibility for teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-slate-950 text-slate-100`}>
        <Providers>
          <ProtectedRoute>
            {children}
          </ProtectedRoute>
        </Providers>
      </body>
    </html>
  );
}
