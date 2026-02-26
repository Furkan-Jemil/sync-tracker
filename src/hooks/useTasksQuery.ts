"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTaskStore, Task, SyncStatus } from "@/store/useTaskStore";

// ─── Fetcher ─────────────────────────────────────────────────────────────────

async function fetchTasks(): Promise<Task[]> {
  const res = await fetch("/api/tasks", { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
  const json = await res.json();
  return json.tasks;
}

// ─── Mutation Payload ────────────────────────────────────────────────────────

interface UpdateSyncStatusInput {
  taskId: string;
  userId: string;
  status: SyncStatus;
  note?: string;
}

async function postSyncStatus(input: UpdateSyncStatusInput) {
  const res = await fetch(`/api/tasks/${input.taskId}/sync`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: input.userId,
      status: input.status,
      note: input.note,
    }),
  });
  if (!res.ok) throw new Error(`Sync status update failed: ${res.status}`);
  return res.json();
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTasksQuery() {
  const setTasks = useTaskStore((s) => s.setTasks);
  const queryClient = useQueryClient();

  // Query: fetch all tasks and hydrate Zustand on success
  const { data: tasks = [], isLoading, error } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    staleTime: 30_000,           // consider data fresh for 30 s
    refetchOnWindowFocus: true,  // re-sync when user returns to tab
    select: (data) => {
      // Hydrate Zustand store every time fresh data arrives
      setTasks(data);
      return data;
    },
  });

  // Mutation: update a participant's sync status
  const updateSyncStatusMutation = useMutation({
    mutationFn: postSyncStatus,

    // Optimistic update: immediately reflect the change in the Zustand store
    onMutate: async (input) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot the previous state for rollback
      const previousTasks = queryClient.getQueryData<Task[]>(["tasks"]);

      // Optimistically update Zustand
      useTaskStore.getState().updateSyncStatus(input.taskId, input.userId, input.status);

      return { previousTasks };
    },

    onError: (_err, _input, context) => {
      // Rollback to the previous state
      if (context?.previousTasks) {
        setTasks(context.previousTasks);
        queryClient.setQueryData(["tasks"], context.previousTasks);
      }
    },

    onSettled: () => {
      // Refetch to ensure server state is canonical
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  return {
    tasks,
    isLoading,
    error,
    updateSyncStatus: updateSyncStatusMutation.mutate,
    isUpdating: updateSyncStatusMutation.isPending,
  };
}
