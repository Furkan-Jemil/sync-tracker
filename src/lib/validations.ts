import { z } from "zod";

// --- Custom Enums matching Prisma ---
export const ParticipantRoleEnum = z.enum(["CONTRIBUTOR", "HELPER", "REVIEWER", "OBSERVER"]);
export const SyncStatusEnum = z.enum(["IN_SYNC", "NEEDS_UPDATE", "BLOCKED", "HELP_REQUESTED"]);

// --- Task Payloads ---
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().optional(),
  ownerId: z.string().cuid("Invalid owner ID"), // the person who will be responsible
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// --- Participant Payloads ---
export const addParticipantSchema = z.object({
  userId: z.string().cuid("Invalid user ID"),
  role: ParticipantRoleEnum,
});

// --- Sync Log Payloads ---
export const syncUpdateSchema = z.object({
  taskId: z.string().cuid("Invalid task ID"),
  newStatus: SyncStatusEnum,
  content: z.string().optional(), // detail of progress, blocker, or help request
});

// --- Transfer Payloads ---
export const requestTransferSchema = z.object({
  taskId: z.string().cuid("Invalid task ID"),
  toUserId: z.string().cuid("Invalid target user ID"),
});

export const resolveTransferSchema = z.object({
  action: z.enum(["ACCEPT", "REJECT", "CANCEL"]),
});

// --- Time Log Payloads ---
export const logTimeSchema = z.object({
  taskId: z.string().cuid("Invalid task ID"),
  durationMinutes: z.number().int().positive("Duration must be a positive integer"),
  description: z.string().optional(),
});
