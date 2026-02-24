import { PrismaClient } from '@prisma/client';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const prisma = new PrismaClient();

describe('SyncTracker Prisma Schema Validation', () => {
  // Setup a clean state if needed, or rely on a dedicated test database
  beforeAll(async () => {
    // CAUTION: This clears the database for isolation!
    await prisma.syncLog.deleteMany();
    await prisma.responsibilityTransfer.deleteMany();
    await prisma.taskParticipant.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('1. should require an Assigner and Responsible Owner for a Task', async () => {
    const assigner = await prisma.user.create({
      data: { email: 'assigner@test.com', name: 'Assigner', passwordHash: 'hash' }
    });

    const owner = await prisma.user.create({
      data: { email: 'owner@test.com', name: 'Owner', passwordHash: 'hash' }
    });

    const task = await prisma.task.create({
      data: {
        title: 'Build Sync Graph',
        assignerId: assigner.id,
        ownerId: owner.id,
        // ownerAcceptedAt is intentionally omitted. It defaults to null.
      }
    });

    expect(task.id).toBeDefined();
    expect(task.ownerAcceptedAt).toBeNull(); // Explicit acceptance is strictly tracked.
    expect(task.assignerId).toBe(assigner.id);
    expect(task.ownerId).toBe(owner.id);
  });

  it('2. should enforce SyncStatus enum integrity & track Participants', async () => {
    const task = await prisma.task.findFirst({ where: { title: 'Build Sync Graph' } });
    const helper = await prisma.user.create({
      data: { email: 'helper@test.com', name: 'Helper', passwordHash: 'hash' }
    });

    const participant = await prisma.taskParticipant.create({
      data: {
        taskId: task!.id,
        userId: helper.id,
        role: 'HELPER', // Enforced by ParticipantRole enum
        syncStatus: 'IN_SYNC' // Enforced by SyncStatus enum
      }
    });

    expect(participant.role).toBe('HELPER');
    expect(participant.syncStatus).toBe('IN_SYNC');

    // Update the sync status to HELP_REQUESTED
    const updated = await prisma.taskParticipant.update({
      where: { id: participant.id },
      data: { syncStatus: 'HELP_REQUESTED' }
    });

    expect(updated.syncStatus).toBe('HELP_REQUESTED');
  });

  it('3. should track responsibility transfer events and map correctly via relations', async () => {
    const task = await prisma.task.findFirst({ where: { title: 'Build Sync Graph' } });
    const currentOwner = await prisma.user.findUnique({ where: { email: 'owner@test.com' } });
    const nextOwner = await prisma.user.findUnique({ where: { email: 'helper@test.com' } });

    // Ensure the transfer is explicitly logged in the ResponsibilityTransfer table
    const transfer = await prisma.responsibilityTransfer.create({
      data: {
        taskId: task!.id,
        fromUserId: currentOwner!.id,
        toUserId: nextOwner!.id,
        status: 'PENDING'
      }
    });

    expect(transfer.status).toBe('PENDING');

    // Write a sync log referencing the event
    const syncLog = await prisma.syncLog.create({
      data: {
        taskId: task!.id,
        userId: currentOwner!.id,
        logType: 'RESPONSIBILITY_TRANSFER', // Enforced by LogType enum
        content: `Initiated transfer to ${nextOwner!.name}`,
      }
    });

    expect(syncLog.logType).toBe('RESPONSIBILITY_TRANSFER');

    // Fetch the task and physically verify its cascading relationships
    const populatedTask = await prisma.task.findUnique({
      where: { id: task!.id },
      include: {
        participants: true,
        syncLogs: true,
        transfers: true
      }
    });

    expect(populatedTask!.transfers.length).toBe(1);
    expect(populatedTask!.syncLogs.length).toBe(1);
    expect(populatedTask!.participants.length).toBe(1);
  });

  it('4. should cascade deletes when a task is removed', async () => {
    const task = await prisma.task.findFirst({ where: { title: 'Build Sync Graph' } });
    
    // Deleting the task should Cascade to Participants, Logs, and Transfers
    await prisma.task.delete({ where: { id: task!.id } });

    const participants = await prisma.taskParticipant.findMany({ where: { taskId: task!.id } });
    const logs = await prisma.syncLog.findMany({ where: { taskId: task!.id } });
    const transfers = await prisma.responsibilityTransfer.findMany({ where: { taskId: task!.id } });

    expect(participants.length).toBe(0);
    expect(logs.length).toBe(0);
    expect(transfers.length).toBe(0);
  });
});
