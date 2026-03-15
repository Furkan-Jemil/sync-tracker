import { create } from "zustand";
import { authClient } from "@/lib/auth-client";

export interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setUser: (user: User | null) => void;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  setUser: (user) => set({ user, isAuthenticated: !!user, isInitializing: false }),
  checkSession: async () => {
    try {
      const { data: session } = await authClient.getSession();
      if (session) {
        set({ 
            user: { id: session.user.id, email: session.user.email, name: session.user.name || "" }, 
            isAuthenticated: true, 
            isInitializing: false 
        });
      } else {
        set({ user: null, isAuthenticated: false, isInitializing: false });
      }
    } catch (error) {
      set({ user: null, isAuthenticated: false, isInitializing: false });
    }
  },
  logout: async () => {
    try {
      await authClient.signOut();
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error("Logout failed", error);
    }
  },
}));
