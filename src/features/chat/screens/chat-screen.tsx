"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  MoreVertical,
  Send,
  ShieldAlert,
  Flag,
  Ban,
  Check,
  CheckCheck,
  Sparkles,
  Lock,
  Play,
  CreditCard,
  Clock,
  Camera,
  MessageSquarePlus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useChatSocket, type ChatMessageEvent } from "@/lib/hooks/use-chat-socket";
import { relativeTime, type ChatMessage, formatFee } from "@/lib/types";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RatingPill } from "@/components/shared/rating-pill";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*  Constants                                                                  */
/* -------------------------------------------------------------------------- */

const QUICK_REPLIES = [
  "I'm in! 🎉",
  "What time should I reach?",
  "Can I bring a +1?",
  "Is parking available?",
  "Sounds amazing 🔥",
];

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

function groupByDay(messages: ChatMessage[]) {
  const groups: { label: string; items: ChatMessage[] }[] = [];
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
/*  Message bubble — Dribbble quality                                         */
/* -------------------------------------------------------------------------- */

const MessageBubble = React.memo(function MessageBubble({
  m,
  mine,
  showAvatar,
  otherName,
  otherAvatar,
  isLast,
}: {
  m: ChatMessage;
  mine: boolean;
  showAvatar: boolean;
  otherName: string;
  otherAvatar?: string | null;
  isLast: boolean;
}) {
  const kind = (m.kind ?? "text") as "text" | "video" | "system" | "payment";

  // System messages: centered, muted text
  if (kind === "system") {
    return (
      <div className="my-3 flex justify-center">
        <Badge variant="outline" className="max-w-[85%] gap-1.5 rounded-full bg-muted/50 px-3.5 py-1.5 text-center text-[11px] leading-relaxed text-muted-foreground font-normal">
          <Clock className="h-3 w-3 shrink-0 text-purple-400/70" />
          {m.content}
        </Badge>
      </div>
    );
  }

  // Text + video bubbles
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        mine ? "justify-end" : "justify-start",
      )}
    >
      {!mine &&
        (showAvatar ? (
          <UserAvatar name={otherName} src={otherAvatar} size={28} />
        ) : (
          <span className="w-7" />
        ))}
      <div className="max-w-[85%]">
        {/* Video bubble */}
        {kind === "video" && m.mediaUrl ? (
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl",
              mine
                ? "rounded-br-sm bg-gradient-to-br from-purple-500 to-purple-600"
                : "rounded-bl-sm bg-muted/50 ring-1 ring-border",
            )}
          >
            <div className="relative">
              <video
                src={m.mediaUrl}
                controls
                playsInline
                className="max-w-full h-44 w-full min-w-[180px] bg-black object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                  <Play className="h-4 w-4 text-white" fill="white" />
                </div>
              </div>
            </div>
            <p className="break-words overflow-wrap-anywhere px-3 py-1.5 text-[12px] text-foreground/80">
              {m.content}
            </p>
            <div className="flex items-center justify-end gap-1 px-3 pb-1.5 text-[10px] text-muted-foreground">
              {relativeTime(m.createdAt)}
              {mine &&
                (m.read ? (
                  <CheckCheck className="h-3 w-3 text-teal-400" />
                ) : (
                  <Check className="h-3 w-3 text-muted-foreground" />
                ))}
            </div>
          </div>
        ) : (
          /* Text bubble */
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
                mine ? "text-white/50" : "text-muted-foreground",
              )}
            >
              {relativeTime(m.createdAt)}
              {mine &&
                (m.read ? (
                  <CheckCheck className="h-3 w-3 text-teal-400" />
                ) : (
                  <Check className="h-3 w-3 text-muted-foreground" />
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';

/* -------------------------------------------------------------------------- */
/*  Payment CTA card — WhatsApp-style                                         */
/* -------------------------------------------------------------------------- */

function PaymentCard({
  m,
  paid,
  requestId,
  partyId,
  onPay,
  mine,
}: {
  m: ChatMessage;
  paid: boolean;
  requestId?: string | null;
  partyId: string | null;
  onPay: () => void;
  mine: boolean;
}) {
  const isPaid = paid && m.requestId === requestId;

  return (
    <div className={cn("my-3 flex", mine ? "justify-start" : "justify-end")}>
      {isPaid ? (
        <Card className="w-[80%] gap-0 py-0 border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-purple-500/5 shadow-[0_4px_20px_-6px_rgba(29,158,117,0.3)] overflow-hidden">
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
                <Check className="h-5 w-5" strokeWidth={3} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Ticket confirmed! 🎉
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.content}
                </p>
              </div>
              <Badge className="bg-teal-500 text-black hover:bg-teal-400 border-0 font-bold">✓ Paid</Badge>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-teal-300/70">
              <Sparkles className="h-3 w-3" />
              Spot locked · group chat unlocked
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card
          className="w-[80%] gap-0 py-0 border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-purple-500/5 shadow-[0_4px_20px_-6px_rgba(29,158,117,0.2)] overflow-hidden cursor-pointer hover:border-teal-400/50 hover:shadow-[0_4px_24px_-6px_rgba(29,158,117,0.3)] transition active:scale-[0.99]"
          onClick={onPay}
        >
          <CardContent className="p-3.5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-teal-400">
                <CreditCard className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  Payment approved
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {m.content}
                </p>
              </div>
              <Button size="sm" className="bg-teal-500 text-black hover:bg-teal-400 font-bold border-0">
                Pay
              </Button>
            </div>
            <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Tap to pay · spot locks after checkout
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Typing indicator                                                          */
/* -------------------------------------------------------------------------- */

function TypingIndicator({ name, avatar, avatarUrl }: { name: string; avatar?: boolean; avatarUrl?: string | null }) {
  return (
    <div className="flex items-end gap-2">
      {avatar && <UserAvatar name={name} src={avatarUrl} size={28} />}
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted/50 px-4 py-2.5 ring-1 ring-border">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sheet button                                                              */
/* -------------------------------------------------------------------------- */

function SheetButton({
  icon,
  label,
  onClick,
  destructive,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-muted/50",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Loading skeleton                                                         */
/* -------------------------------------------------------------------------- */

function ChatSkeleton() {
  return (
    <div className="flex min-h-[100dvh] w-full overflow-hidden flex-col animate-screen-in">
      <header className="sticky top-0 z-20 glass-strong border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-2.5 w-16" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </header>
      <div className="flex-1 space-y-3 p-4">
        <Skeleton className="h-32 rounded-2xl" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "flex",
              i % 2 === 0 ? "justify-start" : "justify-end",
            )}
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

/* -------------------------------------------------------------------------- */
/*  Main Chat Screen                                                          */
/* -------------------------------------------------------------------------- */

export function ChatScreen() {
  const threadId = useAppStore((s) => s.selectedThreadId);
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const qc = useQueryClient();

  const { socket, online } = useChatSocket(currentUser?.id);
  const [text, setText] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["thread", threadId, currentUser?.id],
    queryFn: () => api.getThread(threadId!, currentUser!.id),
    enabled: !!threadId && !!currentUser,
    refetchInterval: 30_000,
  });

  const messages = data?.messages ?? [];
  const other = data?.otherUser ?? { id: "", name: "Unknown User", vibes: 0, hosted: 0, rating: 0, ratingCount: 0 } as any;
  const partyId = data?.thread?.partyId ?? null;
  const request = data?.request ?? null;
  const paid = data?.paid ?? false;
  const hasRequest = !!request;
  const requestStatus = request?.status;
  const composerLocked = hasRequest && !paid;

  // Contextual lock hint
  const lockHint = !hasRequest || paid
    ? null
    : requestStatus === "pending"
      ? {
          icon: Clock,
          text: "Waiting for host approval — chat unlocks after payment",
          tint: "amber" as const,
        }
      : requestStatus === "accepted"
        ? {
            icon: CreditCard,
            text: "Pay to unlock chat — tap the payment card above",
            tint: "teal" as const,
          }
        : requestStatus === "rejected"
          ? {
              icon: Lock,
              text: "Request declined — chat locked",
              tint: "rose" as const,
            }
          : null;

  // live messages via socket
  useEffect(() => {
    if (!socket) return;
    const onMessage = (m: ChatMessageEvent) => {
      if (m.threadId !== threadId) return;
      qc.invalidateQueries({ queryKey: ["thread", threadId, currentUser?.id] });
      qc.invalidateQueries({ queryKey: ["threads", currentUser?.id] });
    };
    const onTyping = (e: { threadId: string; isTyping: boolean }) => {
      if (e.threadId !== threadId) return;
      setIsTyping(e.isTyping);
    };
    socket.on("chat:message", onMessage);
    socket.on("chat:typing", onTyping);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("chat:typing", onTyping);
    };
  }, [socket, threadId, currentUser?.id, qc]);

  // auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, isTyping]);

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.sendMessage({
        threadId: threadId!,
        senderId: currentUser!.id,
        receiverId: other?.id || "",
        content,
      }),
    onSuccess: (msg) => {
      socket?.emit("chat:message", {
        threadId: msg.threadId,
        senderId: msg.senderId,
        receiverId: msg.receiverId,
        content: msg.content,
        createdAt: msg.createdAt,
        id: msg.id,
      });
      qc.invalidateQueries({
        queryKey: ["thread", threadId, currentUser?.id],
      });
      qc.invalidateQueries({ queryKey: ["threads", currentUser?.id] });
    },
  });

  const send = useCallback(
    (content?: string) => {
      if (composerLocked) return;
      const c = (content ?? text).trim();
      if (!c || !currentUser || !other?.id) return;
      setText("");
      sendMutation.mutate(c);
    },
    [text, currentUser, other, sendMutation, composerLocked],
  );

  const onType = (v: string) => {
    setText(v);
    if (!socket || !other?.id) return;
    socket.emit("chat:typing", {
      threadId,
      toUserId: other.id,
      isTyping: true,
    });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit("chat:typing", {
        threadId,
        toUserId: other.id,
        isTyping: false,
      });
    }, 1500);
  };

  const confirmReport = () => {
    if (!reportReason) {
      toast.error("Pick a reason");
      return;
    }
    toast.success("Report submitted", {
      description: "Our team will review this shortly. Thanks for keeping VibeMatch safe.",
    });
    setReportOpen(false);
    setReportReason(null);
  };

  const confirmBlock = () => {
    toast.success(`${other?.name ?? "Unknown User"} has been blocked`, {
      description: "You won't receive messages from them anymore.",
    });
    setSheetOpen(false);
    setScreen("inbox");
  };

  /* ── Render states ──────────────────────────────────────────── */

  if (isLoading || !data) {
    return <ChatSkeleton />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-3 overflow-hidden p-6 text-center">
        <EmptyState
          icon={RefreshCw}
          title="Couldn't load chat"
          description="Something went wrong loading this conversation."
          action={
            <Button onClick={() => refetch()} className="bg-purple-bright text-white hover:bg-purple-bright/90">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          }
        />
        <Button variant="outline" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  if (!other) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-3 overflow-hidden p-6 text-center">
        <EmptyState
          icon={MessageSquarePlus}
          title="Conversation not found"
          description="This conversation couldn't be loaded."
          action={
            <Button variant="outline" onClick={goBack}>
              Go back
            </Button>
          }
        />
      </div>
    );
  }

  const grouped = groupByDay(messages);

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

          <button
            onClick={() => toast.info("Profile view coming soon")}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <div className="relative">
              <div className="rounded-full p-[1.5px] bg-gradient-to-br from-purple-500 to-teal-400">
                <UserAvatar name={other.name ?? "Unknown User"} src={other.avatarUrl} size={38} />
              </div>
              {online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-teal-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
                  {other.name ?? "Unknown User"}
                </p>
                <RatingPill rating={other.rating} />
              </div>
              <p
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  isTyping
                    ? "text-purple-400"
                    : online
                      ? "text-teal-400"
                      : "text-muted-foreground",
                )}
              >
                {isTyping ? (
                  "typing…"
                ) : (
                  <>
                    {online && (
                      <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                    )}
                    {online ? "Online now" : "Active recently"}
                  </>
                )}
              </p>
            </div>
          </button>

          {/* Party context pill */}
          {partyId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedPartyId(partyId);
                setScreen("detail");
              }}
              className="gap-1 rounded-full bg-purple-500/10 px-2.5 text-[10px] font-medium text-purple-300 ring-1 ring-purple-500/25 hover:bg-purple-500/20"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Party
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSheetOpen(true)}
            className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="More"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Messages ────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        className="fancy-scrollbar flex-1 min-h-0 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-4"
      >
        {/* Intro card */}
        <Card className="gap-0 py-0 mb-5 border-border/50 bg-gradient-to-br from-purple-500/[0.08] to-teal-500/[0.04] overflow-hidden">
          <CardContent className="p-5 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 ring-1 ring-purple-500/25">
              <span className="relative block">
                <UserAvatar name={other.name ?? "Unknown User"} src={other.avatarUrl} size={52} />
              </span>
            </div>
            <p className="font-display text-base font-semibold text-foreground">
              {other.name ?? "Unknown User"}
            </p>
            {other.bio && (
              <p className="mx-auto mt-1 max-w-[240px] text-[12px] leading-relaxed text-muted-foreground">
                {other.bio}
              </p>
            )}
            <Badge variant="outline" className="mt-3 gap-1.5 border-purple-500/20 bg-purple-500/10 text-purple-300">
              <Sparkles className="h-3 w-3 text-purple-400" />
              You connected over a party. Be kind, be safe.
            </Badge>
          </CardContent>
        </Card>

        {/* Day groups */}
        {grouped.map(({ label, items }) => (
          <div key={label} className="space-y-1">
            <div className="my-3 flex justify-center">
              <Badge variant="outline" className="rounded-full bg-muted/50 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground font-normal border-border">
                {label}
              </Badge>
            </div>
            {items.map((m, i) => {
              const mine = m.senderId === currentUser?.id;
              const prev = items[i - 1];
              const showAvatar =
                !mine && (!prev || prev.senderId !== m.senderId);
              const isLast = i === items.length - 1;
              const kind = (m.kind ?? "text") as "text" | "video" | "system" | "payment";

              if (kind === "payment") {
                return (
                  <PaymentCard
                    key={m.id}
                    m={m}
                    paid={paid}
                    requestId={request?.id}
                    partyId={partyId}
                    onPay={() => {
                      if (!partyId) {
                        toast.error("Couldn't open payment");
                        return;
                      }
                      setSelectedPartyId(partyId);
                      setScreen("payment");
                    }}
                    mine={mine}
                  />
                );
              }

              return (
                <MessageBubble
                  key={m.id}
                  m={m}
                  mine={mine}
                  showAvatar={showAvatar}
                  otherName={other.name ?? "Unknown User"}
                  otherAvatar={other.avatarUrl}
                  isLast={isLast}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
          {isTyping && (
            <TypingIndicator
              name={other.name ?? "Unknown User"}
              avatar
              avatarUrl={other.avatarUrl}
            />
          )}

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
      <footer className="relative z-10 shrink-0 w-full max-w-full border-t border-border glass-strong px-3 py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
        {/* Quick reply suggestions */}
        {!composerLocked && messages.length < 6 && (
          <div className="no-scrollbar mb-2 flex max-w-full gap-1.5 overflow-x-auto px-0.5">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 rounded-full bg-muted/50 px-3 py-1.5 text-[11px] text-muted-foreground ring-1 ring-border transition hover:bg-purple-500/10 hover:text-purple-300 hover:ring-purple-500/25"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Lock hint */}
          {lockHint && (
            <div className="overflow-hidden">
              <div
                className={cn(
                  "mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium ring-1",
                  lockHint.tint === "amber" &&
                    "bg-amber-500/10 text-amber-300 ring-amber-500/20",
                  lockHint.tint === "teal" &&
                    "bg-teal-500/10 text-teal-300 ring-teal-500/20",
                  lockHint.tint === "rose" &&
                    "bg-rose-500/10 text-rose-300 ring-rose-500/20",
                )}
                role="status"
              >
                <lockHint.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 leading-tight">{lockHint.text}</span>
              </div>
            </div>
          )}

        {/* Request to join quick-action */}
        {composerLocked && requestStatus === "pending" && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-purple-500/[0.06] px-3 py-2 ring-1 ring-purple-500/20">
            <MessageSquarePlus className="h-4 w-4 text-purple-400" />
            <span className="text-[11px] text-purple-300">
              Join request sent — waiting for host
            </span>
          </div>
        )}

        {/* Input bar — frosted glass container */}
        <div className="flex w-full items-center gap-2 overflow-hidden rounded-2xl bg-muted/50 p-1.5 ring-1 ring-border backdrop-blur-sm">
          <button
            disabled={composerLocked}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
              composerLocked
                ? "cursor-not-allowed text-muted-foreground/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-label="Attach"
          >
            <Camera className="h-4.5 w-4.5" />
          </button>
          <input
            value={text}
            onChange={(e) => onType(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={composerLocked}
            placeholder={
              composerLocked
                ? "Chat locked until payment"
                : `Message ${(other.name ?? "Unknown User").split(" ")[0]}…`
            }
            className={cn(
              "h-9 min-w-0 flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none",
              composerLocked && "cursor-not-allowed opacity-50",
            )}
          />
          <button
            onClick={() => send()}
            disabled={composerLocked || !text.trim()}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
              text.trim() && !composerLocked
                ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_2px_10px_-2px_rgba(83,74,183,0.5)]"
                : "bg-muted text-muted-foreground/30",
            )}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* ── More sheet ──────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-h-[70vh] max-w-[480px] rounded-t-3xl border-border glass-strong"
        >
          <SheetHeader>
            <SheetTitle className="font-display text-purple-400">
              {other.name ?? "Unknown User"}
            </SheetTitle>
            <SheetDescription className="sr-only">
              Chat options
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-1 px-2 pb-6">
            <SheetButton
              icon={<Flag className="h-4 w-4" />}
              label="Report conversation"
              onClick={() => {
                setSheetOpen(false);
                setReportOpen(true);
              }}
            />
            <SheetButton
              icon={<Ban className="h-4 w-4" />}
              label="Block user"
              destructive
              onClick={confirmBlock}
            />
            <SheetButton
              icon={<ShieldAlert className="h-4 w-4" />}
              label="Safety tips"
              onClick={() => {
                setSheetOpen(false);
                toast.info("Safety tips", {
                  description:
                    "Meet in public first, tell a friend, trust your gut.",
                });
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Report dialog ───────────────────────────────────── */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[420px] rounded-3xl border-border glass-strong">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              Report <span className="text-purple-400">{other.name ?? "Unknown User"}</span>?
            </DialogTitle>
            <DialogDescription>
              Help us keep VibeMatch safe. Our team reviews every report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[
              "Spam or scam",
              "Harassment or threats",
              "Inappropriate content",
              "Fake profile",
              "Something else",
            ].map((r) => (
              <button
                key={r}
                onClick={() => setReportReason(r)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition",
                  reportReason === r
                    ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
                    : "border-border bg-muted/30 hover:border-purple-500/30 hover:bg-muted/50",
                )}
              >
                {r}
                {reportReason === r && <Check className="h-4 w-4 text-purple-400" />}
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setReportOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReport}
              className="rounded-full bg-destructive text-white hover:bg-destructive/90"
            >
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
