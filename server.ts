import "dotenv/config";
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Use our resilient singleton
import { redis as pubClient } from "./src/lib/redis";
let subClient: any = null;
try {
  subClient = pubClient.duplicate();
} catch (e) {
  console.warn("> Failed to duplicate Redis client. Sub-client will be null.");
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    // Only apply adapter if Redis is actually present
    adapter: (pubClient && subClient) ? createAdapter(pubClient, subClient) : undefined
  });

  io.use(async (socket, next) => {
    try {
      const { auth } = await import("./src/lib/auth");
      const session = await auth.api.getSession({
        headers: socket.request.headers as any,
      });

      if (!session) {
        return next(new Error("Authentication error: No active session"));
      }

      // Attach user info to socket for later use
      (socket as any).user = session.user;
      next();
    } catch (err) {
      console.error("[SOCKET_AUTH_ERROR]", err);
      return next(new Error("Authentication error: Invalid session"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join_task", ({ taskId }: { taskId: string }) => {
      socket.join(`task:${taskId}`);
      console.log(`Socket ${socket.id} joined task:${taskId}`);
    });

    socket.on("leave_task", ({ taskId }: { taskId: string }) => {
      socket.leave(`task:${taskId}`);
      console.log(`Socket ${socket.id} left task:${taskId}`);
    });

    socket.on("join_user", ({ userId }: { userId: string }) => {
      socket.join(`user:${userId}`);
      console.log(`Socket ${socket.id} bound to global user:${userId}`);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Redis singleton initialized. Event communication active.`);
    });

  // ─── Graceful Shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    console.log(`\n> Received ${signal}. Shutting down gracefully...`);
    
    // Stop accepting new connections
    httpServer.close(() => {
      console.log("> HTTP server closed.");
    });

    // Close Socket.IO
    io.close(() => {
      console.log("> Socket.IO server closed.");
    });

    // Close Redis connections
    try {
      await pubClient.quit();
      console.log("> Redis pub client disconnected.");
      await subClient.quit();
      console.log("> Redis sub client disconnected.");
    } catch (err) {
      console.error("> Error during Redis disconnect:", err);
    }

    console.log("> Shutdown complete.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
});
