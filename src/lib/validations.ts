import { z } from "zod";

// --- Custom Enums matching Prisma ---
export const ParticipantRoleEnum = z.enum(["CONTRIBUTOR", "HELPER", "REVIEWER", "OBSERVER"]);
export const SyncStatusEnum = z.enum(["IN_SYNC", "NEEDS_UPDATE", "BLOCKED", "HELP_REQUESTED"]);

// --- Task Payloads ---
export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title is too long"),
  description: z.string().optional(),
  // Allow ownerId to be omitted on the wire; the API will default it to the
  // authenticated user. When provided, validate as a CUID.
  ownerId: z.string().cuid("Invalid owner ID").optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// --- Participant Payloads ---
export const addParticipantSchema = z.object({
  identifier: z.string().min(1, "Identifier is required"),
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
// --- Milestone Payloads ---
export const createMilestoneSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().optional(),
  order: z.number().int().default(0),
});

export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  order: z.number().int().optional(),
});
