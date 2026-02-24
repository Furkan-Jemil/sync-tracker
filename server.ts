import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Use our resilient singleton
import { redis as pubClient } from "./src/lib/redis";
const subClient = pubClient.duplicate();

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
    // Only apply adapter if we're not in a mock state or if we want to force it
    // For single-process local dev, we can actually skip it if Redis is missing
    adapter: createAdapter(pubClient, subClient)
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
});
