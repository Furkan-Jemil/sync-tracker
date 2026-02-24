"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// Global socket instance to prevent multiple connections per browser session
let socketInstance: Socket | null = null;

export const useSocket = (taskId?: string, userId?: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socketInstance) {
      // Connect to the custom server running on the same port
      socketInstance = io(process.env.NEXT_PUBLIC_SITE_URL || "", {
        path: "/socket.io",
      });
    }

    setSocket(socketInstance);

    const onConnect = () => {
      setIsConnected(true);
      
      // Bind presence immediately upon connection
      if (taskId) {
        socketInstance?.emit("join_task", { taskId });
      }
      if (userId) {
        socketInstance?.emit("join_user", { userId });
      }
    };

    const onDisconnect = () => setIsConnected(false);

    if (socketInstance.connected) onConnect();

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    return () => {
      socketInstance?.off("connect", onConnect);
      socketInstance?.off("disconnect", onDisconnect);
    };
  }, [taskId, userId]);

  return { socket, isConnected };
};
