import { Emitter } from "@socket.io/redis-emitter";
import { redis } from "./redis";

const globalForEmitter = global as unknown as { socketEmitter: Emitter };

export const socketEmitter =
  globalForEmitter.socketEmitter || new Emitter(redis);

if (process.env.NODE_ENV !== "production") globalForEmitter.socketEmitter = socketEmitter;
