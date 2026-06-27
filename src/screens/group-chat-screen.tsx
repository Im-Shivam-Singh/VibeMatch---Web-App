"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Send,
  Users,
  Gift,
  Lock,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  REFERRAL_BRANDS,
  relativeTime,
  type GroupChatMessage,
} from "@/lib/types";
import { UserAvatar } from "@/components/vibe/user-avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function dayLabel(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function groupByDay(messages: GroupChatMessage[]) {
  const groups: { label: string; items: GroupChatMessage[] }[] = [];
  for (const m of messages) {
    const d = new Date(m.createdAt);
    const label = dayLabel(d);
    const last = groups[groups.length - 1];
    if (last && last.label === label) {
      last.items.push(m);
    } else {
      groups.push({ label, items: [m] });
    }
  }
  return groups;
}

/* -------------------------------------------------------------------------- */
/*  Referral offer card — festive gradient border, brand emoji + offer + CTA   */
/* -------------------------------------------------------------------------- */

function OfferCard({ msg }: { msg: GroupChatMessage }) {
  const brand = REFERRAL_BRANDS.find((b) => b.id === msg.offerBrand);
  if (!brand) {
    // Unknown brand — render as a plain festive card with the raw content.
    return (
      <div className="my-1 flex justify-center px-2">
        <div className="vibe-gradient-border w-full max-w-[88%] rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-300" />
            <p className="text-sm text-white/90">{msg.content}</p>
          </div>
        </div>
      </div>
    );
  }

  const open = () => {
    toast(`Opening ${brand.name} offer…`, {
      description: "Referral link — you get a discount, the host gets credit.",
    });
  };

  return (
    <div className="my-2 flex justify-center px-2">
      <div className="relative w-full max-w-[92%] overflow-hidden rounded-2xl p-[1.5px] bg-gradient-to-br from-purple-500/70 via-pink-500/40 to-teal-400/60 shadow-[0_6px_24px_-10px_rgba(83,74,183,0.7)]">
        <div className="rounded-[14px] bg-card/95 p-3.5">
          <div className="flex items-start gap-3">
            {/* Brand emoji bubble */}
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl ring-1",
                brand.color,
              )}
            >
              <span aria-hidden>{brand.emoji}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-purple-300" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-purple-300">
                  Group perk
                </span>
              </div>
              <p className="mt-0.5 font-display text-sm font-bold text-white">
                {brand.name}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/80">
                {msg.content || brand.offer}
              </p>

              <button
                onClick={open}
                className={cn(
                  "press-feedback mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                  brand.color,
                  "hover:brightness-110",
                )}
              >
                Open offer
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Members avatar stack in header (first 5 + "+N")                            */
/* -------------------------------------------------------------------------- */

function MembersStack({
  members,
  currentUserId,
}: {
  members: { id: string; userId: string; name: string; avatarUrl?: string | null }[];
  currentUserId: string;
}) {
  const visible = members.slice(0, 5);
  const extra = members.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((m) => {
        const isMe = m.userId === currentUserId;
        return (
          <div
            key={m.id}
            className="rounded-full ring-2 ring-background"
            title={isMe ? `${m.name} (you)` : m.name}
          >
            <UserAvatar name={m.name} src={m.avatarUrl} size={24} />
          </div>
        );
      })}
      {extra > 0 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-card text-[10px] font-semibold text-white/80 ring-2 ring-background">
          +{extra}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeletons                                                                  */
/* -------------------------------------------------------------------------- */

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-20 glass-strong border-b border-white/10 px-2 py-2 pt-[max(env(safe-area-inset-top),10px)]">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full vibe-skeleton" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-40 vibe-skeleton" />
          <Skeleton className="h-2.5 w-20 vibe-skeleton" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full vibe-skeleton" />
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty / locked state — group chat unlocks after first guest pays           */
/* -------------------------------------------------------------------------- */

function LockedState() {
  const goBack = useAppStore((s) => s.goBack);
  return (
    <div className="flex h-full flex-col animate-screen-in">
      <header className="sticky top-0 z-20 glass-strong border-b border-white/10 px-2 py-2 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              Group chat
            </p>
            <p className="text-[11px] text-white/50">Locked</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
        <div className="vibe-float">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl purple-foil glow-violet">
            <Lock className="h-9 w-9 text-purple-bright" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="font-display text-xl font-bold text-white">
            Group chat is locked
          </p>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">
            Group chat unlocks after the first guest pays. Be the one to kick
            it off 🎉
          </p>
        </div>
        <button
          onClick={goBack}
          className="press-feedback vibe-gradient-bg rounded-full px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110"
        >
          Back to party
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main screen                                                                */
/* -------------------------------------------------------------------------- */

export function GroupChatScreen() {
  const partyId = useAppStore((s) => s.selectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const qc = useQueryClient();

  const [text, setText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch the party for the title + member count.
  const partyQuery = useQuery({
    queryKey: ["party", partyId],
    queryFn: () => api.getParty(partyId!),
    enabled: !!partyId,
    staleTime: 60_000,
  });

  // Fetch the group chat — 404 means it isn't unlocked yet.
  const groupChatQuery = useQuery({
    queryKey: ["group-chat", partyId, currentUser?.id],
    queryFn: () => api.getGroupChat(partyId!, currentUser!.id),
    enabled: !!partyId && !!currentUser?.id,
    refetchInterval: 8_000,
    // 404 / 403 are state errors (chat not unlocked / not a member), not
    // transient failures — keep retry attempts minimal.
    retry: 0,
  });

  const groupChat = groupChatQuery.data?.groupChat;
  const messages = useMemo(() => groupChat?.messages ?? [], [groupChat]);
  const members = useMemo(() => groupChat?.members ?? [], [groupChat]);
  const grouped = useMemo(() => groupByDay(messages), [messages]);

  // Auto-scroll to bottom when messages change.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, groupChat?.id]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.sendGroupMessage(groupChat!.id, currentUser!.id, content),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["group-chat", partyId, currentUser?.id],
      });
    },
    onError: (err: Error) => {
      toast.error("Couldn't send message", { description: err.message });
    },
  });

  const send = useCallback(() => {
    const c = text.trim();
    if (!c || !groupChat || !currentUser || sendMutation.isPending) return;
    setText("");
    sendMutation.mutate(c);
  }, [text, groupChat, currentUser, sendMutation]);

  // -------- Render states --------

  if (groupChatQuery.isLoading || partyQuery.isLoading) {
    return (
      <div className="flex h-full flex-col animate-screen-in">
        <HeaderSkeleton />
        <div className="flex-1 space-y-3 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
            >
              <Skeleton
                className={cn(
                  "h-12 rounded-2xl vibe-skeleton",
                  i % 2 === 0 ? "w-56" : "w-44",
                )}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 404 → group chat not enabled yet. Show the locked empty state with a back
  // button.
  if (groupChatQuery.isError && !groupChat) {
    return <LockedState />;
  }

  if (!groupChat || !currentUser) {
    return <LockedState />;
  }

  const party = partyQuery.data?.party;
  const memberCount = members.length;

  return (
    <div className="flex h-full flex-col animate-screen-in">
      {/* Header */}
      <header className="sticky top-0 z-20 glass-strong border-b border-white/10 px-2 py-2 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {party?.title || "Group chat"}
            </p>
            <p className="flex items-center gap-1 text-[11px] text-white/55">
              <Users className="h-3 w-3" />
              {memberCount} {memberCount === 1 ? "member" : "members"}
            </p>
          </div>

          {/* Members preview stack */}
          <div className="flex items-center gap-2">
            {members.length > 0 && (
              <MembersStack members={members} currentUserId={currentUser.id} />
            )}
            <button
              onClick={() =>
                groupChatQuery.refetch().then(() =>
                  toast.success("Refreshed"),
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-white"
              aria-label="Refresh"
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  groupChatQuery.isFetching && "animate-spin",
                )}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="fancy-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {/* Welcome banner */}
        <div className="mb-4 flex flex-col items-center gap-2 rounded-2xl glass border border-white/10 p-4 text-center vibe-float">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl purple-foil">
            <Sparkles className="h-5 w-5 text-purple-bright" />
          </div>
          <p className="font-display text-sm font-bold text-white">
            {party?.title ? party.title : "Party group chat"}
          </p>
          <p className="text-[12px] leading-relaxed text-foreground/75">
            Coordinate with the host &amp; other paid guests. Watch for{" "}
            <span className="font-semibold text-purple-300">group perks</span> —
            referral offers from Swiggy, Blinkit &amp; more.
          </p>
        </div>

        {grouped.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hi 👋
            </p>
          </div>
        )}

        {grouped.map(({ label, items }) => (
          <div key={label} className="space-y-1">
            <div className="my-3 flex justify-center">
              <span className="rounded-full glass px-3 py-1 text-[10px] uppercase tracking-wide text-white/50">
                {label}
              </span>
            </div>
            {items.map((m, i) => {
              if (m.kind === "system") {
                return (
                  <div key={m.id} className="my-2 flex justify-center">
                    <span className="glass px-3 py-1 text-[11px] text-white/60 rounded-full">
                      {m.content}
                    </span>
                  </div>
                );
              }

              if (m.kind === "offer") {
                return <OfferCard key={m.id} msg={m} />;
              }

              // text bubble
              const mine = m.senderId === currentUser.id;
              const prev = items[i - 1];
              const showAvatar =
                !mine && (!prev || prev.senderId !== m.senderId);
              const senderName = m.sender?.name ?? "Guest";
              const senderAvatar = m.sender?.avatarUrl ?? null;

              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex items-end gap-2",
                    mine ? "justify-end" : "justify-start",
                  )}
                >
                  {!mine &&
                    (showAvatar ? (
                      <UserAvatar
                        name={senderName}
                        src={senderAvatar}
                        size={24}
                      />
                    ) : (
                      <span className="w-6" />
                    ))}
                  <div className="max-w-[78%]">
                    {!mine && showAvatar && (
                      <p className="mb-0.5 ml-1 text-[10px] font-medium text-purple-300">
                        {senderName}
                      </p>
                    )}
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2 text-sm transition",
                        mine
                          ? "bg-purple-500 text-black rounded-[12px_4px_12px_12px]"
                          : "glass text-white rounded-[4px_12px_12px_12px] ring-1 ring-white/10",
                      )}
                    >
                      <p className="whitespace-pre-line break-words">
                        {m.content}
                      </p>
                      <div
                        className={cn(
                          "mt-0.5 text-right text-[10px]",
                          mine ? "text-black/60" : "text-muted-foreground",
                        )}
                      >
                        {relativeTime(m.createdAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {sendMutation.isPending && (
          <div className="flex items-end justify-end gap-2">
            <div className="rounded-2xl bg-purple-500/40 px-3 py-2 text-sm text-black/70 rounded-[12px_4px_12px_12px]">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/50 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/50 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/50" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <footer className="relative border-t border-white/10 glass-strong px-2 py-2 safe-bottom">
        <div className="flex items-center gap-1.5">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message the group…"
            className="h-10 flex-1 rounded-full border-white/10 bg-card focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:border-purple-500"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sendMutation.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-black transition active:scale-90 disabled:opacity-40 disabled:shadow-none"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
