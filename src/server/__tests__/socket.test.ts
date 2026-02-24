/**
 * Socket.IO Integration Tests — SyncTracker
 *
 * Tests verify:
 *   1. Users can join a task room without errors.
 *   2. sync_updated broadcasts ONLY to the correct task room (isolation).
 *   3. help_requested emits correctly to the global user room.
 *   4. Multiple users in the same room all receive broadcasts.
 *
 * Strategy
 * ─────────
 * • Spins up a real Socket.IO server in-process on an OS-assigned free port.
 * • Uses ioredis-mock as a drop-in Redis replacement — zero external services.
 * • The `Emitter` simulates what the Next.js API routes do after a DB write
 *   (publish via Redis pub/sub → socket server fans out to room members).
 * • `beforeAll` / `afterAll` manage the full server & client lifecycle.
 */

import { createServer } from 'http';
import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import Client, { type Socket as ClientSocket } from 'socket.io-client';
import { Emitter } from '@socket.io/redis-emitter';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createRequire } from 'module';

const _require = createRequire(import.meta.url);
// Use require() for CJS packages that have default-export interop issues under vmForks
const RedisMock = _require('ioredis-mock');
const { createAdapter } = _require('@socket.io/redis-adapter');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a connected socket.io client, resolving once the connection is open. */
const createClient = (port: number): Promise<ClientSocket> =>
  new Promise((resolve) => {
    const socket = Client(`http://localhost:${port}`, { forceNew: true });
    socket.once('connect', () => resolve(socket));
  });

/**
 * Emits an event and waits 60 ms for the server to process it (e.g. room join).
 * Keeps tests readable without manual setTimeout chains.
 */
const emitAndWait = (socket: ClientSocket, event: string, payload: object): Promise<void> =>
  new Promise((resolve) => {
    socket.emit(event, payload);
    setTimeout(resolve, 60);
  });

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('SyncTracker — Socket.IO Integration', () => {
  let httpServer: HttpServer;
  let io: Server;
  let emitter: Emitter;
  let port: number;

  // Named participants make tests self-documenting
  let userAlice: ClientSocket; // joins task-room-A
  let userBob: ClientSocket;   // joins task-room-A
  let userCarla: ClientSocket; // joins task-room-B  ← the isolation "outsider"

  // ── Lifecycle ────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const pubClient = new RedisMock();
    const subClient = pubClient.duplicate();
    emitter = new Emitter(pubClient);

    // Minimal server that mirrors the room logic in server.ts
    httpServer = createServer();
    io = new Server(httpServer, {
      adapter: createAdapter(pubClient, subClient),
    });

    io.on('connection', (socket) => {
      socket.on('join_task', ({ taskId }: { taskId: string }) => {
        socket.join(`task:${taskId}`);
      });
      socket.on('join_user', ({ userId }: { userId: string }) => {
        socket.join(`user:${userId}`);
      });
    });

    // Port 0 → OS assigns a free port (avoids flaky port-collision failures)
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    port = (httpServer.address() as { port: number }).port;

    // Connect all three test clients in parallel
    [userAlice, userBob, userCarla] = await Promise.all([
      createClient(port),
      createClient(port),
      createClient(port),
    ]);
  }, 15_000); // generous timeout for CI environments

  afterAll(() => {
    userAlice?.disconnect();
    userBob?.disconnect();
    userCarla?.disconnect();
    io?.close();
  });

  // ── Test 1: Room Join ────────────────────────────────────────────────────

  it('users can join a specific task room', async () => {
    // Room membership is an internal server-side concept; we validate the
    // real effect (receiving broadcasts) in the isolation test below.
    // This test simply confirms the emit doesn't throw / timeout.
    await emitAndWait(userAlice, 'join_task', { taskId: 'task-A' });
    await emitAndWait(userBob,   'join_task', { taskId: 'task-A' });
    await emitAndWait(userCarla, 'join_task', { taskId: 'task-B' });

    expect(userAlice.connected).toBe(true);
    expect(userBob.connected).toBe(true);
    expect(userCarla.connected).toBe(true);
  });

  // ── Test 2: Sync Status Update — Room Isolation ──────────────────────────

  it('sync_updated broadcasts only to the target task room', () =>
    new Promise<void>((resolve, reject) => {
      // Carla is in task-B; she must NOT receive a task-A event
      const isolationViolation = () =>
        reject(new Error('ISOLATION BREACH: userCarla in task-B received a task-A broadcast'));

      userCarla.once('sync_updated', isolationViolation);

      // Alice (task-A) MUST receive it with the correct payload
      userAlice.once('sync_updated', (payload: Record<string, string>) => {
        try {
          expect(payload.taskId).toBe('task-A');
          expect(payload.userId).toBe('user-alice');
          expect(payload.status).toBe('NEEDS_UPDATE');
          expect(payload.oldStatus).toBe('IN_SYNC');
          expect(payload.timestamp).toBeDefined();
        } catch (assertionErr) {
          return reject(assertionErr);
        }

        // Give Carla's listener a 200 ms window to fire (it should not)
        setTimeout(() => {
          userCarla.off('sync_updated', isolationViolation);
          resolve();
        }, 200);
      });

      // Simulate the Next.js API publishing after the Prisma write
      emitter.to('task:task-A').emit('sync_updated', {
        taskId:    'task-A',
        userId:    'user-alice',
        status:    'NEEDS_UPDATE',
        oldStatus: 'IN_SYNC',
        logId:     'log-001',
        timestamp: new Date().toISOString(),
      });
    }));

  // ── Test 3: Help Request — Global User Room ───────────────────────────────

  it('help_requested delivers to the owner global user room', async () => {
    // Bob (the task owner) subscribes to his personal notification room
    await emitAndWait(userBob, 'join_user', { userId: 'owner-bob' });

    const payload = await new Promise<Record<string, string>>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error('Timeout: help_requested was not received within 3 s')),
        3000
      );

      userBob.once('help_requested', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      // Simulate the API emitting to the owner's personal global room
      emitter.to('user:owner-bob').emit('help_requested', {
        taskId:      'task-A',
        requestorId: 'user-alice',
        note:        'Blocked on missing env vars',
        timestamp:   new Date().toISOString(),
      });
    });

    expect(payload.taskId).toBe('task-A');
    expect(payload.requestorId).toBe('user-alice');
    expect(payload.note).toContain('Blocked');
  });

  // ── Test 4: Multiple Users — Shared Room Broadcast ───────────────────────

  it('all users in the same room receive the same broadcast', async () => {
    // Register listeners on Alice AND Bob before emitting (avoids race)
    const [alicePayload, bobPayload] = await Promise.all([
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error('Timeout: Alice did not receive milestone_updated')),
          3000
        );
        userAlice.once('milestone_updated', (data) => { clearTimeout(t); resolve(data); });
      }),
      new Promise<Record<string, unknown>>((resolve, reject) => {
        const t = setTimeout(
          () => reject(new Error('Timeout: Bob did not receive milestone_updated')),
          3000
        );
        userBob.once('milestone_updated', (data) => { clearTimeout(t); resolve(data); });
      }),
      // Emit after both listeners are in place (Promise.all runs concurrently)
      new Promise<void>((resolve) => {
        setTimeout(() => {
          emitter.to('task:task-A').emit('milestone_updated', {
            taskId:        'task-A',
            milestoneId:   'ms-42',
            isCompleted:   true,
            completedById: 'user-alice',
          });
          resolve();
        }, 20); // tiny delay to ensure listeners are registered first
      }),
    ]);

    // Alice assertions
    expect(alicePayload.milestoneId).toBe('ms-42');
    expect(alicePayload.isCompleted).toBe(true);
    expect(alicePayload.taskId).toBe('task-A');

    // Bob assertions — same event, independent delivery
    expect(bobPayload.milestoneId).toBe('ms-42');
    expect(bobPayload.isCompleted).toBe(true);
    expect(bobPayload.taskId).toBe('task-A');
  });
});
