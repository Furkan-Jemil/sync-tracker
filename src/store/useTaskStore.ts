import { create } from 'zustand';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SyncStatus = 'IN_SYNC' | 'NEEDS_UPDATE' | 'BLOCKED' | 'HELP_REQUESTED';

export interface Participant {
  userId: string;
  name: string;
  role: string;          // e.g. "Responsible Owner", "Contributor", "Helper", "Reviewer"
  syncStatus: SyncStatus;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  participants: Participant[];
  milestones?: any[];
}

// ─── Store Interface ─────────────────────────────────────────────────────────

interface TaskStore {
  tasks: Task[];

  /** Replace the entire task list (e.g. after an API fetch). */
  setTasks: (tasks: Task[]) => void;

  /**
   * Update a single participant's syncStatus inside a specific task.
   * No-ops silently if the task or participant is not found.
   */
  updateSyncStatus: (taskId: string, userId: string, newStatus: SyncStatus) => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useTaskStore = create<TaskStore>((set) => ({
  tasks: [],

  setTasks: (tasks) => set({ tasks }),

  updateSyncStatus: (taskId, userId, newStatus) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              participants: task.participants.map((p) =>
                p.userId === userId ? { ...p, syncStatus: newStatus } : p
              ),
            }
          : task
      ),
    })),
}));
