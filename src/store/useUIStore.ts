import { create } from 'zustand';

export interface UIState {
  isSidePanelOpen: boolean;
  selectedNodeId: string | null;
  openSidePanel: (nodeId: string) => void;
  closeSidePanel: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  isSidePanelOpen: false,
  selectedNodeId: null,
  openSidePanel: (nodeId) => set({ isSidePanelOpen: true, selectedNodeId: nodeId }),
  closeSidePanel: () => set({ isSidePanelOpen: false, selectedNodeId: null }),
}));
