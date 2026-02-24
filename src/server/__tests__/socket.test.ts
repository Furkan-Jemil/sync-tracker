import { createServer } from 'http';
import { Server } from 'socket.io';
import Client, { Socket as ClientSocket } from 'socket.io-client';
import { createAdapter } from '@socket.io/redis-adapter';
const RedisMock = require('ioredis-mock');
import { Emitter } from '@socket.io/redis-emitter';

async function runSocketTests() {
  console.log("Starting Socket.IO Integration Tests...");
  
  // 1. Setup Phase
  console.log("Setting up Redis Sub/Pub and Socket Servers...");
  const pubClient = new RedisMock();
  const subClient = pubClient.duplicate();
  const emitter = new Emitter(pubClient);

  const httpServer = createServer();
  const io = new Server(httpServer, {
    adapter: createAdapter(pubClient, subClient)
  });

  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let clientSocket3: ClientSocket;

  await new Promise<void>((resolve) => {
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port;
      
      io.on('connection', (socket) => {
        socket.on('join_task', ({ taskId }) => {
          socket.join(`task:${taskId}`);
        });

        socket.on('join_user', ({ userId }) => {
          socket.join(`user:${userId}`);
        });
      });

      clientSocket1 = Client(`http://localhost:${port}`);
      clientSocket2 = Client(`http://localhost:${port}`);
      clientSocket3 = Client(`http://localhost:${port}`);

      clientSocket1.on('connect', () => {
        clientSocket2.on('connect', () => {
          clientSocket3.on('connect', () => resolve());
        });
      });
    });
  });

  console.log("Servers connected. Running Test 1...");

  // Test 1: Room Join & Isolation
  await new Promise<void>((resolve, reject) => {
    clientSocket1.emit('join_task', { taskId: 'task-A' });
    clientSocket2.emit('join_task', { taskId: 'task-A' });
    clientSocket3.emit('join_task', { taskId: 'task-B' });

    setTimeout(() => {
      clientSocket1.on('sync_updated', (data) => {
        if (data.status !== 'NEEDS_UPDATE' || data.taskId !== 'task-A') {
          reject(new Error("Test 1 Failed: Incorrect payload received"));
        } else {
          console.log("✅ Test 1 Passed: Client 1 received isolated room event");
          resolve();
        }
      });

      clientSocket3.on('sync_updated', () => {
        reject(new Error('Test 1 Failed: Client 3 in task-B erroneously received task-A event'));
      });

      // Simulate API Route Emission
      emitter.to('task:task-A').emit('sync_updated', {
        taskId: 'task-A',
        userId: 'user-1',
        status: 'NEEDS_UPDATE'
      });
    }, 100);
  });

  // Test 2: Global User Help Request Emits
  console.log("Running Test 2...");
  await new Promise<void>((resolve, reject) => {
    clientSocket2.emit('join_user', { userId: 'assigner-1' });

    setTimeout(() => {
      clientSocket2.on('help_requested', (data) => {
        if (data.taskId !== 'task-X' || data.requestorId !== 'user-99') {
          reject(new Error("Test 2 Failed: Incorrect payload on global emission"));
        } else {
          console.log("✅ Test 2 Passed: Client 2 received global user help event");
          resolve();
        }
      });

      emitter.to('user:assigner-1').emit('help_requested', {
        taskId: 'task-X',
        requestorId: 'user-99',
        note: 'I am stuck'
      });
    }, 100);
  });

  console.log("🎉 All Socket Integration Tests Passed Successfully.");

  // Teardown
  io.close();
  clientSocket1!.disconnect();
  clientSocket2!.disconnect();
  clientSocket3!.disconnect();
  pubClient.quit();
  subClient.quit();
}

runSocketTests().catch((e) => {
  console.error("❌ Test Failed:", e);
  process.exit(1);
});
