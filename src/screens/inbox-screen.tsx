"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageCircle, Search, Inbox as InboxIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { relativeTime } from "@/lib/types";
import { UserAvatar } from "@/components/vibe/user-avatar";
import { EmptyState } from "@/components/vibe/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function InboxScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data, isLoading } = useQuery({
    queryKey: ["threads", currentUser?.id],
    queryFn: () => api.listThreads(currentUser!.id),
    enabled: !!currentUser,
    refetchInterval: 15_000,
  });

  const threads = data?.threads ?? [];

  const openThread = (id: string) => {
    setSelectedThreadId(id);
    setScreen("chat");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 glass border-b border-border/60 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Messages
            </p>
            <h1 className="font-display text-2xl font-extrabold">
              <span className="vibe-gradient-text">Inbox</span>
            </h1>
          </div>
          <button
            onClick={() => setScreen("home")}
            className="flex h-10 items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 text-xs font-medium"
          >
            <Search className="h-4 w-4" /> Find
          </button>
        </div>
      </header>

      <div className="fancy-scrollbar flex-1 overflow-y-auto px-2 py-3">
        {isLoading && (
          <div className="space-y-2 px-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-2xl p-3"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && threads.length === 0 && (
          <EmptyState
            icon={InboxIcon}
            title="No conversations yet"
            description="Find a party you love, send a request, and your chats with hosts will appear here."
            action={
              <button
                onClick={() => setScreen("home")}
                className="rounded-full vibe-gradient-bg px-4 py-2 text-sm font-semibold text-white"
              >
                Explore parties
              </button>
            }
          />
        )}

        {!isLoading && threads.length > 0 && (
          <ul className="space-y-1">
            {threads.map((t) => {
              const last = t.lastMessage;
              const isMine = last?.senderId === currentUser?.id;
              return (
                <li key={t.id}>
                  <button
                    onClick={() => openThread(t.id)}
                    className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-card/60"
                  >
                    <div className="relative">
                      <UserAvatar
                        name={t.otherUser?.name || "User"}
                        src={t.otherUser?.avatarUrl}
                        size={52}
                      />
                      {(t.unreadCount ?? 0) > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
                          {t.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            (t.unreadCount ?? 0) > 0
                              ? "font-bold"
                              : "font-semibold",
                          )}
                        >
                          {t.otherUser?.name || "Unknown"}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {last ? relativeTime(last.createdAt) : ""}
                        </span>
                      </div>
                      <p
                        className={cn(
                          "truncate text-xs",
                          (t.unreadCount ?? 0) > 0
                            ? "text-foreground/90"
                            : "text-muted-foreground",
                        )}
                      >
                        {last
                          ? `${isMine ? "You: " : ""}${last.content}`
                          : "Say hi 👋"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
