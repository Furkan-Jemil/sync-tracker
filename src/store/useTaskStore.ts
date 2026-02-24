import { create } from 'zustand';

export type SyncStatus = 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED';

export interface TreeNodeData {
  id: string;
  name: string;
  role: string;
  status: SyncStatus;
  children?: TreeNodeData[];
}

interface TaskStore {
  treeData: TreeNodeData | null;
  setTreeData: (data: TreeNodeData) => void;
}

// Mock initial state based on requirements
export const useTaskStore = create<TaskStore>((set) => ({
  treeData: {
    id: 'task-1',
    name: 'Refactor Core Engine',
    role: 'Task',
    status: 'IN_SYNC',
    children: [
      {
        id: 'owner-1',
        name: 'Sarah Chen',
        role: 'Responsible Owner',
        status: 'IN_SYNC',
        children: [
          {
            id: 'contrib-1',
            name: 'Alex Doe',
            role: 'Contributor',
            status: 'NEEDS_UPDATE',
          },
          {
            id: 'contrib-2',
            name: 'Jamie Smith',
            role: 'Helper',
            status: 'HELP_REQUESTED',
          }
        ]
      },
      {
        id: 'reviewer-1',
        name: 'Dr. Review',
        role: 'Reviewer',
        status: 'BLOCKED',
      }
    ]
  },
  setTreeData: (data) => set({ treeData: data }),
}));
