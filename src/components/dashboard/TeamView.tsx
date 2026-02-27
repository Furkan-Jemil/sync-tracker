"use client";

import React, { useMemo, useState } from "react";
import { Users, Search, Mail, Shield, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export function TeamView() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch team");
      return data.users;
    }
  });

  const [query, setQuery] = useState("");

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((user: any) => {
      return (
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    });
  }, [users, query]);

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-950">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Organization Team</h2>
          <p className="text-sm text-slate-400 mt-1">Directory of sync-aware personnel and roles.</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search members..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-64 h-10 bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 text-sm text-slate-300 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse" />
          ))
        ) : filteredUsers.map((user: any) => (
          <div key={user.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all group border-t-2 border-t-transparent hover:border-t-indigo-500">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20 group-hover:scale-110 transition-transform">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">Active</span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{user.name}</h3>
            <div className="space-y-3 mt-4">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Mail size={14} className="text-slate-600" />
                {user.email}
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Shield size={14} className="text-slate-600" />
                Resource ID: <span className="font-mono text-[10px] text-slate-500">{user.id.slice(0, 12)}...</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-800 flex items-center justify-between">
              <button className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                <Zap size={10} /> View Flow
              </button>
              <span className="text-[10px] text-slate-500 font-mono">v0.1.0-NODE</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
