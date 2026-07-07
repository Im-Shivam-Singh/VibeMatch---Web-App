"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Send,
  Users,
  Gift,
  Sparkles,
  ArrowRight,
  Lock,
  Info,
  Camera,
  CheckCheck,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  REFERRAL_BRANDS,
  relativeTime,
  type GroupChatMessage,
  type GroupChatMember,
} from "@/lib/types";
import { UserAvatar } from "@/components/shared/user-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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

// Deterministic color per sender id — 6 warm/cool hues matching VibeMatch palette
const SENDER_COLORS = [
  "text-purple-300",
  "text-teal-300",
  "text-amber-300",
  "text-coral-400",
  "text-green-300",
  "text-pink-300",
];

function senderColor(senderId: string): string {
  let h = 0;
  for (let i = 0; i < senderId.length; i++) h = (h * 31 + senderId.charCodeAt(i)) >>> 0;
  return SENDER_COLORS[h % SENDER_COLORS.length];
}

/* -------------------------------------------------------------------------- */
/*  Offer card — festive gradient border, brand emoji + offer + CTA           */
/* -------------------------------------------------------------------------- */

function OfferCard({ msg }: { msg: GroupChatMessage }) {
  const brand = REFERRAL_BRANDS.find((b) => b.id === msg.offerBrand);
  if (!brand) {
    return (
      <div className="my-2 flex justify-center px-2">
        <Card className="w-full max-w-[88%] gap-0 py-0 border-border/50 overflow-hidden">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-purple-300" />
              <p className="text-sm text-foreground/80">{msg.content}</p>
            </div>
          </CardContent>
        </Card>
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
      <div className="relative w-full max-w-[92%] overflow-hidden rounded-2xl p-[1px] bg-gradient-to-br from-purple-500/60 via-pink-500/30 to-teal-400/50 shadow-[0_6px_24px_-10px_rgba(83,74,183,0.5)]">
        <Card className="gap-0 py-0 border-0 rounded-[14px] bg-card/95 backdrop-blur-sm">
          <CardContent className="p-3.5">
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
                <p className="mt-0.5 font-display text-sm font-bold text-foreground">
                  {brand.name}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground/70">
                  {msg.content || brand.offer}
                </p>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={open}
                  className={cn(
                    "mt-2.5 gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:brightness-110",
                    brand.color,
                  )}
                >
                  Get deal
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Members avatar stack in header                                            */
/* -------------------------------------------------------------------------- */

function MembersStack({
  members,
  currentUserId,
}: {
  members: GroupChatMember[];
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
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background">
          +{extra}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Members sheet                                                             */
/* -------------------------------------------------------------------------- */

function MembersSheet({
  open,
  onOpenChange,
  members,
  currentUserId,
  partyTitle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  members: GroupChatMember[];
  currentUserId: string;
  partyTitle: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[70vh] max-w-[480px] rounded-t-3xl border-border glass-strong"
      >
        <SheetHeader>
          <SheetTitle className="font-display text-purple-400">
            {partyTitle} — Members
          </SheetTitle>
          <SheetDescription className="sr-only">
            Group chat members
          </SheetDescription>
        </SheetHeader>
        <div className="max-h-[50vh] space-y-1 overflow-y-auto px-2 pb-6 fancy-scrollbar">
          {members.map((m) => {
            const isMe = m.userId === currentUserId;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/50"
              >
                <UserAvatar name={m.name} src={m.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.name}
                    {isMe && (
                      <span className="ml-1.5 text-[10px] font-normal text-purple-400">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Joined {relativeTime(m.joinedAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/*  Skeletons                                                                  */
/* -------------------------------------------------------------------------- */

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-20 glass-strong border-b border-border px-3 py-2 pt-[max(env(safe-area-inset-top),10px)]">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <Skeleton className="h-7 w-20 rounded-full" />
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty / locked state                                                      */
/* -------------------------------------------------------------------------- */

function LockedState() {
  const goBack = useAppStore((s) => s.goBack);
  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden flex-col animate-screen-in">
      <header className="sticky top-0 z-20 shrink-0 glass-strong border-b border-border px-3 py-2 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="h-9 w-9 rounded-full text-foreground/70 hover:bg-muted/50 hover:text-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Group chat
            </p>
            <p className="text-[11px] text-muted-foreground">Locked</p>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <EmptyState
          icon={Lock}
          title="Group chat is locked"
          description="Group chat unlocks after the first guest pays. Be the one to kick it off 🎉"
          action={
            <Button
              onClick={goBack}
              className="bg-gradient-to-r from-purple-bright to-purple text-white shadow-[0_4px_16px_-4px_rgba(83,74,183,0.5)] hover:brightness-110"
            >
              Back to party
            </Button>
          }
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Message bubble — group chat version with sender name                      */
/* -------------------------------------------------------------------------- */

function GroupMessageBubble({
  m,
  mine,
  showAvatar,
  currentUser,
}: {
  m: GroupChatMessage;
  mine: boolean;
  showAvatar: boolean;
  currentUser: any;
}) {
  const senderName = m.sender?.name ?? "Guest";
  const senderAvatar = m.sender?.avatarUrl ?? null;
  const color = senderColor(m.senderId);

  return (
    <div
      className={cn(
        "flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
      )}
    >
      {!mine &&
        (showAvatar ? (
          <UserAvatar name={senderName} src={senderAvatar} size={28} />
        ) : (
          <span className="w-7" />
        ))}
      <div className="max-w-[85%]">
        {!mine && showAvatar && (
          <p className={cn("mb-0.5 ml-1 text-[10px] font-semibold", color)}>
            {senderName}
          </p>
        )}
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed",
            mine
              ? "rounded-br-sm bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_4px_16px_-6px_rgba(83,74,183,0.5)]"
              : "rounded-bl-sm bg-muted/50 text-foreground/90 ring-1 ring-border backdrop-blur-sm",
          )}
        >
          <p className="whitespace-pre-line break-words overflow-wrap-anywhere">{m.content}</p>
          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10px]",
              mine ? "text-white/40" : "text-muted-foreground",
            )}
          >
            {relativeTime(m.createdAt)}
            {mine && (
              <CheckCheck className="h-3 w-3 text-teal-400/70" />
            )}
          </div>
        </div>
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
  const [membersOpen, setMembersOpen] = useState(false);
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
      <div className="flex min-h-[100dvh] w-full overflow-hidden flex-col animate-screen-in">
        <HeaderSkeleton />
        <div className="flex-1 space-y-3 p-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
            >
              <Skeleton
                className={cn(
                  "h-12 rounded-2xl",
                  i % 2 === 0 ? "w-56" : "w-44",
                )}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error loading party
  if (partyQuery.isError && !partyQuery.data) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-hidden flex-col animate-screen-in">
        <header className="sticky top-0 z-20 shrink-0 glass-strong border-b border-border px-3 py-2 pt-[max(env(safe-area-inset-top),10px)]">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goBack} className="h-9 w-9 rounded-full" aria-label="Back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground">Error</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <EmptyState
            icon={RefreshCw}
            title="Couldn't load party"
            description="Something went wrong loading the party details."
            action={
              <Button onClick={() => partyQuery.refetch()} className="bg-purple-bright text-white hover:bg-purple-bright/90">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  if (groupChatQuery.isError && !groupChat) {
    return <LockedState />;
  }

  if (!groupChat || !currentUser) {
    return <LockedState />;
  }

  const party = partyQuery.data?.party;
  const memberCount = members.length;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden animate-screen-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 shrink-0 glass-strong border-b border-border px-3 py-2 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
            className="h-9 w-9 rounded-full text-foreground/70 hover:bg-muted/50 hover:text-foreground"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                {party?.title || "Group chat"}
              </p>
              <Badge variant="outline" className="gap-1 border-purple-500/20 bg-purple-500/10 text-purple-300 text-[10px] px-2">
                <Users className="h-2.5 w-2.5" />
                {memberCount}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Group Chat</p>
          </div>

          {/* Members preview stack */}
          <div className="flex items-center gap-2">
            {members.length > 0 && (
              <MembersStack members={members} currentUserId={currentUser.id} />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMembersOpen(true)}
              className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              aria-label="Member list"
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Messages ────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="fancy-scrollbar flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4"
      >
        {/* Welcome banner */}
        <Card className="gap-0 py-0 mb-4 border-border/50 bg-gradient-to-br from-purple-500/[0.08] to-teal-500/[0.04] overflow-hidden">
          <CardContent className="p-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/25">
              <Sparkles className="h-5 w-5 text-purple-400" />
            </div>
            <p className="font-display text-sm font-bold text-foreground">
              {party?.title ? party.title : "Party group chat"}
            </p>
            <p className="mx-auto mt-1 max-w-[260px] text-[12px] leading-relaxed text-muted-foreground">
              Coordinate with the host &amp; other paid guests. Watch for{" "}
              <span className="font-semibold text-purple-300">group perks</span> —
              referral offers from Swiggy, Blinkit &amp; more.
            </p>
          </CardContent>
        </Card>

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
              <Badge variant="outline" className="rounded-full bg-muted/50 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-normal border-border">
                {label}
              </Badge>
            </div>
            {items.map((m, i) => {
              if (m.kind === "system") {
                return (
                  <div key={m.id} className="my-2 flex justify-center">
                    <Badge variant="outline" className="max-w-[85%] gap-1.5 rounded-full bg-muted/50 px-3.5 py-1.5 text-center text-[11px] leading-relaxed text-muted-foreground font-normal border-border">
                      {m.content}
                    </Badge>
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

              return (
                <GroupMessageBubble
                  key={m.id}
                  m={m}
                  mine={mine}
                  showAvatar={showAvatar}
                  currentUser={currentUser}
                />
              );
            })}
          </div>
        ))}

        {/* Sending indicator */}
        {sendMutation.isPending && (
          <div className="flex items-end justify-end gap-2">
            <div className="rounded-2xl rounded-br-sm bg-purple-500/30 px-3.5 py-2 shadow-[0_4px_12px_-4px_rgba(83,74,183,0.3)]">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-300 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-300 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-300" />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Composer ────────────────────────────────────────── */}
      <footer className="relative z-10 shrink-0 w-full border-t border-border glass-strong px-3 py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        <div className="flex w-full items-center gap-2 overflow-hidden rounded-2xl bg-muted/50 p-1.5 ring-1 ring-border backdrop-blur-sm">
          <button
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Attach"
          >
            <Camera className="h-4.5 w-4.5" />
          </button>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Message the group…"
            className="h-9 min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!text.trim() || sendMutation.isPending}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
              text.trim() && !sendMutation.isPending
                ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_2px_10px_-2px_rgba(83,74,183,0.5)]"
                : "bg-muted text-muted-foreground/30",
            )}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* ── Members sheet ───────────────────────────────────── */}
      <MembersSheet
        open={membersOpen}
        onOpenChange={setMembersOpen}
        members={members}
        currentUserId={currentUser.id}
        partyTitle={party?.title ?? "Group Chat"}
      />
    </div>
  );
}
