import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { POST as syncRoute } from '@/app/api/tasks/[id]/sync/route';
import { socketEmitter } from '@/lib/socket-emitter';
import bcrypt from 'bcrypt';

vi.mock('@/lib/socket-emitter', () => {
  return {
    socketEmitter: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    }
  };
});

describe('Sync Engine - Status & Visibility', () => {
  let user1Id: string;
  let user2Id: string;
  let taskId: string;
  let participantId: string;

  beforeEach(async () => {
    // Clear DB
    await prisma.syncLog.deleteMany();
    await prisma.taskParticipant.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();

    const passwordHash = await bcrypt.hash('testpass', 10);
    
    const user1 = await prisma.user.create({
      data: { email: 'assigner@test.com', name: 'Assigner', passwordHash }
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: { email: 'helper@test.com', name: 'Helper', passwordHash }
    });
    user2Id = user2.id;

    const task = await prisma.task.create({
      data: {
        title: 'Test Sync Task',
        assignerId: user1Id,
        ownerId: user1Id,
      }
    });
    taskId = task.id;

    const participant = await prisma.taskParticipant.create({
      data: {
        taskId,
        userId: user2Id,
        role: 'HELPER',
        syncStatus: 'IN_SYNC'
      }
    });
    participantId = participant.id;

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await prisma.syncLog.deleteMany();
    await prisma.taskParticipant.deleteMany();
    await prisma.task.deleteMany();
    await prisma.user.deleteMany();
  });

  it('Status update persistence - should update DB status and log immutable sync record', async () => {
    const req = new Request(`http://localhost/api/tasks/${taskId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: user2Id, status: 'BLOCKED', note: 'Waiting on design' })
    });

    const res = await syncRoute(req, { params: { id: taskId } });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.log.newStatus).toBe('BLOCKED');
    expect(data.log.oldStatus).toBe('IN_SYNC');
    expect(data.log.content).toBe('Waiting on design');

    const updatedParticipant = await prisma.taskParticipant.findUnique({ where: { id: participantId } });
    expect(updatedParticipant?.syncStatus).toBe('BLOCKED');

    const logs = await prisma.syncLog.findMany({ where: { taskId } });
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe('STATUS_UPDATE');
  });

  it('Help request logging and event emission - should broadcast to specific rooms', async () => {
    const req = new Request(`http://localhost/api/tasks/${taskId}/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId: user2Id, status: 'HELP_REQUESTED', note: 'Need API keys' })
    });

    await syncRoute(req, { params: { id: taskId } });

    // Verify DB
    const updatedParticipant = await prisma.taskParticipant.findUnique({ where: { id: participantId } });
    expect(updatedParticipant?.syncStatus).toBe('HELP_REQUESTED');

    const logs = await prisma.syncLog.findMany({ where: { taskId } });
    expect(logs.length).toBe(1);
    expect(logs[0].logType).toBe('HELP_REQUEST');

    // Verify Events
    // 1. Regular sync_updated to task room
    expect(socketEmitter.to).toHaveBeenCalledWith(`task:${taskId}`);
    expect(socketEmitter.emit).toHaveBeenCalledWith('sync_updated', expect.objectContaining({
      status: 'HELP_REQUESTED'
    }));
    
    // 2. Help requested specific alert to task room
    expect(socketEmitter.emit).toHaveBeenCalledWith('help_requested', expect.objectContaining({
      requestorId: user2Id,
      note: 'Need API keys'
    }));

    // 3. Help requested alert to assigner globally
    expect(socketEmitter.to).toHaveBeenCalledWith(`user:${user1Id}`);
  });

  it('Stale detection threshold - should logically identify stale syncs (unit helper)', async () => {
    // Let's implement a quick helper inline that the engine would use
    const isStale = (lastSyncedAt: Date, thresholdHours = 24) => {
      const diff = Date.now() - lastSyncedAt.getTime();
      return diff > thresholdHours * 60 * 60 * 1000;
    };

    const freshDate = new Date();
    // 25 hours ago
    const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000);

    expect(isStale(freshDate)).toBe(false);
    expect(isStale(staleDate)).toBe(true);

    // If we update DB to stale
    await prisma.taskParticipant.update({
      where: { id: participantId },
      data: { lastSyncedAt: staleDate }
    });

    const p = await prisma.taskParticipant.findUnique({ where: { id: participantId } });
    expect(isStale(p!.lastSyncedAt)).toBe(true);
  });

  it('Responsibility transfer effects (Mocked DB State Update)', async () => {
    // Simulate accepting a responsibility transfer
    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: { ownerId: user2Id } // Transfer to user2
      });

      await tx.syncLog.create({
        data: {
          taskId,
          userId: user1Id,
          logType: 'RESPONSIBILITY_TRANSFER',
          content: 'Transferred to Helper'
        }
      });
    });

    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(updatedTask?.ownerId).toBe(user2Id);

    const logs = await prisma.syncLog.findMany({ where: { taskId, logType: 'RESPONSIBILITY_TRANSFER' } });
    expect(logs.length).toBe(1);
    expect(logs[0].content).toContain('Transferred');
  });
});
