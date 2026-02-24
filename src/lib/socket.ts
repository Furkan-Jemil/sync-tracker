/**
 * src/lib/socket.ts
 *
 * Singleton Socket.IO client for the SyncTracker Next.js app.
 *
 * Usage:
 *   import { socket } from '@/lib/socket';
 *   socket.emit('join_task', { taskId: '...' });
 *   socket.on('sync_updated', (payload) => { ... });
 *
 * The instance is created once and shared across all imports.
 * `withCredentials: true` ensures the HttpOnly JWT cookie is
 * automatically included in the WebSocket handshake request,
 * so the server-side middleware can authenticate the connection.
 */

import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

if (!BACKEND_URL && typeof window !== 'undefined') {
  console.warn(
    '[socket] NEXT_PUBLIC_API_URL is not set. ' +
    'Socket.IO will attempt to connect to the current origin.'
  );
}

/**
 * The singleton Socket.IO client instance.
 *
 * • `autoConnect: false` — prevents an immediate connection on module load.
 *   Call `socket.connect()` explicitly when the user is authenticated
 *   (e.g., inside a `useEffect` after the JWT cookie is set).
 *
 * • `withCredentials: true` — sends the HttpOnly cookie on every request,
 *   including the initial HTTP upgrade handshake.
 *
 * • `path: '/socket.io'` — matches the custom server.ts mount path.
 */
export const socket: Socket = io(BACKEND_URL, {
  path: '/socket.io',
  withCredentials: true,
  autoConnect: false,         // connect explicitly after authentication
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket'],  // skip long-polling for lower latency
});

// ─── Dev-mode lifecycle logging ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  socket.on('connect', () => {
    console.log(`[socket] Connected ✓  id=${socket.id}  url=${BACKEND_URL || 'current origin'}`);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] Connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[socket] Disconnected:', reason);
  });
}
