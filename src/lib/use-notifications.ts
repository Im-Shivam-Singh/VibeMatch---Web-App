"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

export function useNotifications(userId: string | undefined) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?userId=${userId}&limit=30`);
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json() as Promise<{ notifications: AppNotification[]; unreadCount: number }>;
    },
    enabled: !!userId,
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications", userId] });
    },
  });

  // Socket.IO real-time notification listener
  useEffect(() => {
    if (!userId) return;

    let socket: Socket | null = null;
    const connectSocket = async () => {
      socket = io("/", {
        path: "/",
        query: { XTransformPort: "3003" },
      });

      socket.on("connect", () => {
        socket?.emit("identify", { userId });
      });

      socket.on("notification", (notification: AppNotification) => {
        // Update the query cache with the new notification
        qc.setQueryData<{ notifications: AppNotification[]; unreadCount: number }>(
          ["notifications", userId],
          (old) => {
            if (!old) return { notifications: [notification], unreadCount: 1 };
            return {
              notifications: [notification, ...old.notifications],
              unreadCount: old.unreadCount + 1,
            };
          }
        );
      });
    };

    connectSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId, qc]);

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    markAllRead: markAllRead.mutate,
  };
}