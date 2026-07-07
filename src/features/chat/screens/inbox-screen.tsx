"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Inbox as InboxIcon,
  MessageCircle,
  Sparkles,
  Archive,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { relativeTime } from "@/lib/types";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Online Now — horizontal scrollable avatars with green dots                */
/* -------------------------------------------------------------------------- */

function OnlineNow({ threads }: { threads: any[] }) {
  // Simulate "online" from threads that had recent activity
  const onlineUsers = useMemo(() => {
    const now = Date.now();
    return threads
      .filter((t) => {
        if (!t.lastMessage) return false;
        const diff = now - new Date(t.lastMessage.createdAt).getTime();
        return diff < 30 * 60 * 1000; // last 30 min
      })
      .map((t) => ({
        id: t.otherUser?.id ?? t.id,
        name: t.otherUser?.name ?? "User",
        avatarUrl: t.otherUser?.avatarUrl ?? null,
      }))
      .slice(0, 8);
  }, [threads]);

  if (onlineUsers.length === 0) return null;

  return (
    <div className="px-4 pt-3 pb-1">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Online now
      </p>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-1 max-w-full">
        {onlineUsers.map((u) => (
          <div key={u.id} className="flex flex-col items-center gap-1">
            <div className="relative">
              <div className="rounded-full p-[2px] bg-gradient-to-br from-teal-400 to-purple-500">
                <UserAvatar name={u.name} src={u.avatarUrl} size={44} />
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-teal-400" />
            </div>
            <span className="max-w-[52px] truncate text-[10px] font-medium text-muted-foreground">
              {u.name.split(" ")[0]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Tab filter — "All" / "Unread" with animated underline                     */
/* -------------------------------------------------------------------------- */

type TabFilter = "all" | "unread";

function TabBar({
  active,
  onChange,
  unreadCount,
}: {
  active: TabFilter;
  onChange: (t: TabFilter) => void;
  unreadCount: number;
}) {
  return (
    <div className="relative flex gap-1 px-4 pt-3">
      {(["all", "unread"] as const).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "relative rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
            active === tab
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {tab === "unread" && unreadCount > 0 && (
            <Badge variant="destructive" className="mr-1 h-4 min-w-4 px-1 text-[9px]">
              {unreadCount}
            </Badge>
          )}
          {tab}
          {active === tab && (
            <div
              className="absolute inset-0 -z-10 rounded-full bg-purple-500/20 ring-1 ring-purple-500/40"
            />
          )}
        </button>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Thread card — using shadcn Card for proper layout                         */
/* -------------------------------------------------------------------------- */

function ThreadCard({
  thread,
  isMine,
  currentUser,
  onClick,
}: {
  thread: any;
  isMine: boolean;
  currentUser: any;
  onClick: () => void;
}) {
  const last = thread.lastMessage;
  const unread = (thread.unreadCount ?? 0) > 0;
  const isRecent = last
    ? Date.now() - new Date(last.createdAt).getTime() < 15 * 60 * 1000
    : false;

  return (
    <Card
      className={cn(
        "gap-0 py-0 cursor-pointer transition-all duration-200 hover:bg-muted/50",
        unread
          ? "border-purple-500/25 bg-purple-500/[0.06]"
          : "border-border/50 hover:border-border",
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3.5 p-3">
        {/* Avatar with online indicator */}
        <div className="relative shrink-0">
          <div
            className={cn(
              "rounded-full p-[1.5px]",
              unread
                ? "bg-gradient-to-br from-purple-500 via-amber-400 to-teal-400"
                : "bg-border",
            )}
          >
            <UserAvatar
              name={thread.otherUser?.name || "User"}
              src={thread.otherUser?.avatarUrl}
              size={48}
            />
          </div>
          {isRecent && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-teal-400" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={cn(
                "truncate text-[13px]",
                unread
                  ? "font-bold text-foreground"
                  : "font-medium text-foreground/85",
              )}
            >
              {thread.otherUser?.name || "Unknown"}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              {/* Party context badge */}
              {thread.partyId && (
                <Badge variant="outline" className="hidden sm:inline-flex border-purple-500/20 bg-purple-500/10 text-purple-300 text-[9px] gap-1 px-2">
                  <Sparkles className="h-2.5 w-2.5" />
                  Party
                </Badge>
              )}
              <span
                className={cn(
                  "text-[11px]",
                  unread ? "font-semibold text-amber-400" : "text-muted-foreground",
                )}
              >
                {last ? relativeTime(last.createdAt) : ""}
              </span>
            </div>
          </div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "line-clamp-2 break-words text-xs leading-relaxed",
                unread ? "text-foreground/70" : "text-muted-foreground",
              )}
            >
              {last
                ? `${isMine ? "You: " : ""}${last.content}`
                : "Say hi 👋"}
            </p>
            {unread && (
              <Badge className="shrink-0 h-5 min-w-5 px-1.5 text-[10px] font-bold bg-gradient-to-r from-amber-500 to-coral text-white border-0 shadow-[0_2px_8px_-2px_rgba(216,90,48,0.5)]">
                {thread.unreadCount}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shimmer skeleton for loading state                                        */
/* -------------------------------------------------------------------------- */

function InboxSkeleton() {
  return (
    <div className="space-y-2 px-4 pt-3">
      {/* Search skeleton */}
      <div className="mb-3">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
      {/* Online avatars skeleton */}
      <div className="flex gap-4 pb-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-2 w-8 rounded" />
          </div>
        ))}
      </div>
      {/* Thread cards skeleton */}
      {[0, 1, 2, 3, 4].map((i) => (
        <Card key={i} className="gap-0 py-0 border-border/50">
          <CardContent className="flex items-center gap-3.5 p-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-2.5 w-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Inbox Screen                                                         */
/* -------------------------------------------------------------------------- */

export function InboxScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setSelectedThreadId = useAppStore((s) => s.setSelectedThreadId);
  const setScreen = useAppStore((s) => s.setScreen);
  const [tab, setTab] = useState<TabFilter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["threads", currentUser?.id],
    queryFn: () => api.listThreads(currentUser!.id),
    enabled: !!currentUser,
    refetchInterval: 15_000,
  });

  const threads = useMemo(() => {
    let list = data?.threads ?? [];
    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.otherUser?.name?.toLowerCase().includes(q) ||
          t.lastMessage?.content?.toLowerCase().includes(q),
      );
    }
    // Tab filter
    if (tab === "unread") {
      list = list.filter((t) => (t.unreadCount ?? 0) > 0);
    }
    return list;
  }, [data?.threads, search, tab]);

  const totalUnread = useMemo(
    () =>
      (data?.threads ?? []).reduce(
        (sum, t) => sum + (t.unreadCount ?? 0),
        0,
      ),
    [data?.threads],
  );

  const openThread = (id: string) => {
    setSelectedThreadId(id);
    setScreen("chat");
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden flex-col animate-screen-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 shrink-0 glass-strong border-b border-border px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)] max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Messages
              </p>
              <h1 className="font-display text-2xl font-extrabold text-foreground">
                Inbox
              </h1>
            </div>
            {totalUnread > 0 && (
              <Badge className="h-6 min-w-6 px-2 text-[11px] font-bold bg-gradient-to-r from-amber-500 to-coral text-white border-0 shadow-[0_2px_10px_-2px_rgba(216,90,48,0.5)]">
                {totalUnread}
              </Badge>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages…"
            className="h-10 w-full min-w-0 rounded-xl border border-border bg-muted/50 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 overflow-y-auto overflow-x-hidden max-w-2xl mx-auto w-full">
        {isLoading && <InboxSkeleton />}

        {!isLoading && isError && (
          <div className="p-4">
            <EmptyState
              icon={RefreshCw}
              title="Couldn't load messages"
              description="Something went wrong. Please try again."
              action={
                <Button onClick={() => refetch()} className="bg-purple-bright text-white hover:bg-purple-bright/90">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              }
            />
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* Online now section */}
            <OnlineNow threads={data?.threads ?? []} />

            {/* Tabs */}
            <TabBar active={tab} onChange={setTab} unreadCount={totalUnread} />

            {/* Thread list */}
            <div className="space-y-1.5 px-3 pt-2 pb-24">
              {threads.length === 0 && (
                <EmptyState
                  icon={search ? Search : InboxIcon}
                  title={
                    search
                      ? "No results found"
                      : tab === "unread"
                        ? "All caught up!"
                        : "No messages yet"
                  }
                  description={
                    search
                      ? "Try a different search term"
                      : tab === "unread"
                        ? "You've read everything. Time to party! 🎉"
                        : "Find a party you love, send a request, and your chats with hosts will appear here."
                  }
                  action={
                    !search &&
                    tab === "all" && (
                      <Button
                        onClick={() => setScreen("home")}
                        className="bg-gradient-to-r from-purple-bright to-purple text-white hover:brightness-110"
                      >
                        Explore parties
                      </Button>
                    )
                  }
                />
              )}

              {threads.map((t) => {
                const last = t.lastMessage;
                const isMine = last?.senderId === currentUser?.id;
                return (
                  <ThreadCard
                    key={t.id}
                    thread={t}
                    isMine={isMine}
                    currentUser={currentUser}
                    onClick={() => openThread(t.id)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
