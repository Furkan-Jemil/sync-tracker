import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTaskStore, Task, Participant } from "@/store/useTaskStore";

export function useTasks() {
  const { setTasks } = useTaskStore();

  const query = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const data = await res.json();
      
      // Transform Prisma response to frontend Task type if necessary
      // Based on prisma schema and current Task interface:
      return data.tasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        participants: [
          {
            userId: t.ownerId,
            name: t.owner.name,
            role: "Responsible Owner",
            syncStatus: t.ownerAcceptedAt ? "IN_SYNC" : "NEEDS_UPDATE"
          },
          ...t.participants.map((p: any) => ({
            userId: p.userId,
            name: p.user.name,
            role: p.role,
            syncStatus: p.syncStatus
          }))
        ],
        milestones: t.milestones || [],
        syncLogs: t.syncLogs?.map((l: any) => ({
          ...l,
          user: l.user // Include user info for the logs
        })) || []
      })) as Task[];
    },
  });

  useEffect(() => {
    if (query.data) {
      setTasks(query.data);
    }
  }, [query.data, setTasks]);

  return query;
}
