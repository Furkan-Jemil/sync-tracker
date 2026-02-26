"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Zap } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isInitializing, checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    const isPublicPath = pathname.startsWith("/login") || pathname.startsWith("/register");
    if (!isInitializing && !isAuthenticated && !isPublicPath) {
      router.push("/login");
    }
  }, [isAuthenticated, isInitializing, pathname, router]);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white from-indigo-500 to-violet-600 animate-pulse shadow-lg shadow-indigo-500/30">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <p className="text-slate-400 font-mono text-sm tracking-widest uppercase">Initializing SyncTracker</p>
        </div>
      </div>
    );
  }

  // Only render children if authenticated or if on a public page
  const isPublicPath = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (!isAuthenticated && !isPublicPath) {
    return null; // Don't flash protected content before redirect
  }

  return <>{children}</>;
};
