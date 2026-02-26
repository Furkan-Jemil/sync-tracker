import { create } from 'zustand';

export type DashboardTab = "dashboard" | "team" | "tasks" | "logs";

export interface UIState {
  isSidePanelOpen: boolean;
  selectedNodeId: string | null;
  activeTab: DashboardTab;
  openSidePanel: (nodeId: string) => void;
  closeSidePanel: () => void;
  setTab: (tab: DashboardTab) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidePanelOpen: false,
  selectedNodeId: null,
  activeTab: "dashboard",
  openSidePanel: (nodeId) => set({ isSidePanelOpen: true, selectedNodeId: nodeId }),
  closeSidePanel: () => set({ isSidePanelOpen: false, selectedNodeId: null }),
  setTab: (tab) => set({ activeTab: tab }),
}));
