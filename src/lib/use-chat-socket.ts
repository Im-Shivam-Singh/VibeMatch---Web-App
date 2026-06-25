"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

function getSocket(): Socket {
  if (socket) return socket;
  // Path "/" + XTransformPort=3003 so Caddy forwards to the chat mini-service.
  socket = io("/", {
    path: "/",
    query: { XTransformPort: "3003" },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionDelay: 800,
    reconnectionAttempts: 20,
  });
  return socket;
}

export interface ChatMessageEvent {
  threadId: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  id?: string;
}

export function useChatSocket(userId: string | null | undefined) {
  const [online, setOnline] = useState(false);
  const identified = useRef(false);

  useEffect(() => {
    if (!userId) return;
    const s = getSocket();

    const onConnect = () => {
      setOnline(true);
      if (!identified.current) {
        s.emit("identify", { userId });
        s.once("identified", () => {
          identified.current = true;
        });
      }
    };
    const onDisconnect = () => setOnline(false);

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    if (s.connected) onConnect();

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
    };
  }, [userId]);

  return { socket: typeof window !== "undefined" ? getSocket() : null, online };
}
