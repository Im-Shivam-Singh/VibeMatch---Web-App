"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Send,
  ShieldAlert,
  Flag,
  Ban,
  Smile,
  Check,
  CheckCheck,
  Sparkles,
  Lock,
  Play,
  CreditCard,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useChatSocket, type ChatMessageEvent } from "@/lib/use-chat-socket";
import { relativeTime, type ChatMessage } from "@/lib/types";
import { UserAvatar } from "@/components/vibe/user-avatar";
import { RatingPill } from "@/components/vibe/rating-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const QUICK_EMOJIS = ["🔥", "💜", "🎉", "🍻", "👀", "😂"];

const QUICK_REPLIES = [
  "I'm in! 🎉",
  "What time should I reach?",
  "Can I bring a +1?",
  "Is parking available?",
  "Sounds amazing 🔥",
];

const MESSAGE_REACTIONS = ["🔥", "💜", "🎉", "😂", "👀"];

export function ChatScreen() {
  const threadId = useAppStore((s) => s.selectedThreadId);
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const qc = useQueryClient();

  const { socket, online } = useChatSocket(currentUser?.id);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  // messageId -> emoji -> count (local-only reactions for demo)
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  const [reactingFor, setReactingFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["thread", threadId, currentUser?.id],
    queryFn: () => api.getThread(threadId!, currentUser!.id),
    enabled: !!threadId && !!currentUser,
    refetchInterval: 10_000,
  });

  const messages = data?.messages ?? [];
  const other = data?.otherUser ?? null;
  // The thread's party context — needed so the "Pay" CTA can route the guest
  // to the payment screen with the right party selected.
  const partyId = data?.thread?.partyId ?? null;

  // ── Purchase-flow lock ──────────────────────────────────────────────
  // "When a person sends a request to the host, no other msg is allowed
  //  until payment is processed." The composer is locked for BOTH the host
  // and the guest until the guest pays. The `paid` flag is computed server-
  // side (GET /api/threads/[id]) by checking for a paid Order on this party
  // by the requesting guest. Once paid, the lock lifts and a "✅ Payment
  // confirmed" system message appears in the thread.
  const request = data?.request ?? null;
  const paid = data?.paid ?? false;
  const hasRequest = !!request;
  const requestStatus = request?.status;
  const composerLocked = hasRequest && !paid;

  // Contextual lock hint shown above the composer. `null` when unlocked.
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
      // broadcast via socket
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
      if (!c || !currentUser || !other) return;
      setText("");
      setShowEmoji(false);
      sendMutation.mutate(c);
    },
    [text, currentUser, other, sendMutation, composerLocked],
  );

  const react = useCallback((messageId: string, emoji: string) => {
    setReactions((prev) => {
      const msgReactions = { ...(prev[messageId] || {}) };
      msgReactions[emoji] = (msgReactions[emoji] || 0) + 1;
      return { ...prev, [messageId]: msgReactions };
    });
    setReactingFor(null);
  }, []);

  const onType = (v: string) => {
    setText(v);
    if (!socket || !other) return;
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
    toast.success(`${other?.name} has been blocked`, {
      description: "You won't receive messages from them anymore.",
    });
    setSheetOpen(false);
    setScreen("inbox");
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-full flex-col animate-screen-in">
        <ChatHeaderSkeleton />
        <div className="flex-1 space-y-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
            >
              <Skeleton className="h-10 w-40 rounded-2xl vibe-skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!other) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center animate-screen-in">
        <p className="text-sm text-muted-foreground">
          This conversation couldn't be loaded.
        </p>
        <Button variant="outline" onClick={goBack}>
          Go back
        </Button>
      </div>
    );
  }

  // group messages by day
  const grouped = groupByDay(messages);

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
          <button
            onClick={() => toast.info("Profile view coming soon")}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <span className="relative block rounded-full ring-2 ring-purple-500/60">
              <UserAvatar name={other.name} src={other.avatarUrl} size={40} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{other.name}</p>
              <p
                className={cn(
                  "flex items-center gap-1 text-[11px] font-medium",
                  isTyping
                    ? "text-purple-500"
                    : online
                      ? "text-purple-500"
                      : "text-white/50",
                )}
              >
                {isTyping ? (
                  "typing…"
                ) : (
                  <>
                    {online && (
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    )}
                    {online ? "Online now" : "Active recently"}
                  </>
                )}
              </p>
            </div>
          </button>
          <button
            onClick={() => toast.info("Calling coming soon")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-white"
            aria-label="Call"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={() => toast.info("Video coming soon")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-white"
            aria-label="Video"
          >
            <Video className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-white"
            aria-label="More"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="fancy-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {/* Intro banner */}
        <div className="mb-5 flex flex-col items-center gap-2.5 rounded-2xl glass border border-white/10 p-5 text-center vibe-float">
          <span className="relative block rounded-full ring-2 ring-purple-500/60">
            <UserAvatar name={other.name} src={other.avatarUrl} size={64} />
          </span>
          <div className="flex items-center gap-2">
            <p className="font-display text-base font-semibold text-white">{other.name}</p>
            <RatingPill rating={other.rating} />
          </div>
          {other.bio && (
            <p className="max-w-xs text-[13px] leading-relaxed text-foreground/80">
              {other.bio}
            </p>
          )}
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-3 py-1 text-[11px] font-medium text-purple-300 ring-1 ring-purple-500/30">
            <Sparkles className="h-3 w-3 text-purple-500" />
            You connected over a party. Be kind, be safe.
          </p>
        </div>

        {grouped.map(({ label, items }) => (
          <div key={label} className="space-y-1">
            <div className="my-3 flex justify-center">
              <span className="rounded-full glass px-3 py-1 text-[10px] uppercase tracking-wide text-white/50">
                {label}
              </span>
            </div>
            {items.map((m, i) => {
              const mine = m.senderId === currentUser?.id;
              const prev = items[i - 1];
              const showAvatar =
                !mine && (!prev || prev.senderId !== m.senderId);
              const msgReactions = reactions[m.id] || {};
              const reactionEntries = Object.entries(msgReactions).filter(
                ([, c]) => c > 0,
              );
              const kind = (m.kind ?? "text") as
                | "text"
                | "video"
                | "system"
                | "payment";

              // ── System messages: centered pill (approval status notices) ──
              if (kind === "system") {
                return (
                  <div key={m.id} className="my-2 flex justify-center">
                    <span className="inline-flex max-w-[85%] items-center gap-1.5 rounded-full glass px-3 py-1.5 text-center text-[11px] leading-relaxed text-white/70 ring-1 ring-white/10">
                      <Clock className="h-3 w-3 shrink-0 text-purple-400" />
                      {m.content}
                    </span>
                  </div>
                );
              }

              // ── Payment CTA: WhatsApp-style "Pay {amount}" card ──────────
              if (kind === "payment") {
                // Once the guest has paid for this party, render the CTA in a
                // "✓ Paid" state (non-clickable) so the chat reflects reality.
                const isPaid = paid && m.requestId === request?.id;
                return (
                  <div
                    key={m.id}
                    className={cn(
                      "my-2 flex",
                      mine ? "justify-start" : "justify-end",
                    )}
                  >
                    {isPaid ? (
                      <div className="w-[78%] rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-500/15 to-purple-500/10 p-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                            <Check className="h-4 w-4" strokeWidth={3} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-300">
                              Payment confirmed
                            </p>
                            <p className="truncate text-sm font-semibold text-foreground">
                              {m.content}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-teal-500 px-3 py-1.5 text-[11px] font-bold text-black">
                            ✓ Paid
                          </span>
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-[10px] text-teal-300/80">
                          <Check className="h-2.5 w-2.5" /> Spot locked · group
                          chat unlocked
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!partyId) {
                            toast.error("Couldn't open payment");
                            return;
                          }
                          setSelectedPartyId(partyId);
                          setScreen("payment");
                        }}
                        className="w-[78%] rounded-2xl border border-teal-500/40 bg-gradient-to-br from-teal-500/15 to-purple-500/10 p-3.5 text-left transition active:scale-[0.99] hover:border-teal-400/70"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                            <CreditCard className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-300">
                              Payment approved
                            </p>
                            <p className="truncate text-sm font-semibold text-foreground">
                              {m.content}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-teal-500 px-3 py-1.5 text-[11px] font-bold text-black">
                            Pay
                          </span>
                        </div>
                        <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lock className="h-2.5 w-2.5" /> Tap to pay · spot locks
                          after checkout
                        </p>
                      </button>
                    )}
                  </div>
                );
              }

              // ── Video + text bubbles ──────────────────────────────────────
              return (
                <div
                  key={m.id}
                  className={cn(
                    "group relative flex items-end gap-2",
                    mine ? "justify-end" : "justify-start",
                  )}
                >
                  {!mine &&
                    (showAvatar ? (
                      <UserAvatar
                        name={other.name}
                        src={other.avatarUrl}
                        size={24}
                      />
                    ) : (
                      <span className="w-6" />
                    ))}
                  <div className="relative max-w-[75%]">
                    {kind === "video" && m.mediaUrl ? (
                      <div
                        onClick={() =>
                          setReactingFor((cur) => (cur === m.id ? null : m.id))
                        }
                        className={cn(
                          "relative cursor-pointer overflow-hidden rounded-2xl transition",
                          mine
                            ? "rounded-br-md bg-purple-500"
                            : "rounded-bl-md glass ring-1 ring-white/10",
                          reactingFor === m.id && "ring-2 ring-purple-500/70",
                        )}
                      >
                        <video
                          src={m.mediaUrl}
                          controls
                          playsInline
                          className="h-44 w-full min-w-[180px] bg-black object-cover"
                        />
                        <p className="px-3 py-1.5 text-[11px] text-white/80">
                          {m.content}
                        </p>
                        <div className="flex items-center justify-end gap-1 px-3 pb-1.5 text-[10px] text-black/60">
                          {relativeTime(m.createdAt)}
                          {mine &&
                            (m.read ? (
                              <CheckCheck className="h-3 w-3 text-purple-700" />
                            ) : (
                              <Check className="h-3 w-3" />
                            ))}
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() =>
                          setReactingFor((cur) => (cur === m.id ? null : m.id))
                        }
                        className={cn(
                          "cursor-pointer rounded-2xl px-3 py-2 text-sm transition",
                          mine
                            ? "rounded-br-md bg-purple-500 text-black"
                            : "rounded-bl-md glass text-white ring-1 ring-white/10",
                          reactingFor === m.id && "ring-2 ring-purple-500/70",
                        )}
                      >
                        <p className="whitespace-pre-line break-words">
                          {m.content}
                        </p>
                        <div
                          className={cn(
                            "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                            mine ? "text-black/60" : "text-muted-foreground",
                          )}
                        >
                          {relativeTime(m.createdAt)}
                          {mine &&
                            (m.read ? (
                              <CheckCheck className="h-3 w-3 text-purple-700" />
                            ) : (
                              <Check className="h-3 w-3" />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Reaction chips under bubble */}
                    {reactionEntries.length > 0 && (
                      <div
                        className={cn(
                          "mt-1 flex flex-wrap gap-1",
                          mine ? "justify-end" : "justify-start",
                        )}
                      >
                        {reactionEntries.map(([emoji, count]) => (
                          <span
                            key={emoji}
                            className="inline-flex items-center gap-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-[11px]"
                          >
                            {emoji} {count > 1 && count}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Reaction picker popover */}
                    {reactingFor === m.id && (
                      <div
                        className={cn(
                          "absolute -top-10 z-10 flex gap-0.5 rounded-full border border-border/60 glass px-1.5 py-1 shadow-lg",
                          mine ? "right-0" : "left-0",
                        )}
                      >
                        {MESSAGE_REACTIONS.map((e) => (
                          <button
                            key={e}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              react(m.id, e);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full text-base transition hover:scale-125 hover:bg-white/10"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <UserAvatar name={other.name} src={other.avatarUrl} size={24} />
            <div className="flex gap-1 rounded-2xl rounded-bl-md glass px-3 py-2.5 ring-1 ring-white/10">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-500" />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <footer className="relative border-t border-white/10 glass-strong px-2 py-2 safe-bottom">
        {/* Quick reply suggestions — shown when the conversation is short
            AND the composer is unlocked. NOTE: we intentionally do NOT tie
            this to `!text.trim()` — that caused the input to jump up/down
            as the user typed (the row appeared/disappeared on every
            keystroke). Keeping it stable fixes the "input moves with text"
            bug. */}
        {!composerLocked && messages.length < 6 && (
          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-1">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="shrink-0 rounded-full glass px-3 py-1.5 text-xs text-white/80 ring-1 ring-white/10 transition hover:ring-purple-500/50 hover:text-purple-300"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {showEmoji && !composerLocked && (
          <div className="absolute inset-x-2 bottom-full mb-2 flex gap-2 rounded-2xl glass-strong p-2 ring-1 ring-white/10">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  send(e);
                  setShowEmoji(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg transition hover:scale-125 hover:bg-purple-500/15"
              >
                {e}
              </button>
            ))}
          </div>
        )}

        {/* Lock hint banner — shown above the input row when the composer
            is locked (pre-payment). Gives the user a clear reason + next step. */}
        {lockHint && (
          <div
            className={cn(
              "mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-medium ring-1",
              lockHint.tint === "amber" &&
                "bg-amber-500/10 text-amber-300 ring-amber-500/30",
              lockHint.tint === "teal" &&
                "bg-teal-500/10 text-teal-300 ring-teal-500/30",
              lockHint.tint === "rose" &&
                "bg-rose-500/10 text-rose-300 ring-rose-500/30",
            )}
            role="status"
          >
            <lockHint.icon className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 leading-tight">{lockHint.text}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEmoji((s) => !s)}
            disabled={composerLocked}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition",
              composerLocked
                ? "cursor-not-allowed text-muted-foreground/40"
                : showEmoji
                  ? "bg-purple-500/15 text-purple-300"
                  : "text-muted-foreground hover:bg-white/10 hover:text-white",
            )}
            aria-label="Emoji"
            aria-disabled={composerLocked}
          >
            <Smile className="h-5 w-5" />
          </button>
          <Input
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
                : `Message ${other.name.split(" ")[0]}…`
            }
            className={cn(
              "h-10 flex-1 rounded-full border-white/10 bg-card focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:border-purple-500",
              composerLocked && "cursor-not-allowed opacity-60",
            )}
          />
          <button
            onClick={() => send()}
            disabled={composerLocked || !text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-black transition active:scale-90 disabled:opacity-40 disabled:shadow-none"
            aria-label="Send"
            aria-disabled={composerLocked || !text.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* More sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[480px] rounded-t-3xl border-white/10 glass-strong"
        >
          <SheetHeader>
            <SheetTitle className="font-display text-purple-500">
              {other.name}
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

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-[420px] rounded-3xl border-white/10 glass-strong">
          <DialogHeader>
            <DialogTitle className="font-display text-white">
              Report <span className="text-purple-500">{other.name}</span>?
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
                  "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition glass",
                  reportReason === r
                    ? "border-purple-500 ring-1 ring-purple-500/50 text-purple-300"
                    : "border-white/10 hover:border-purple-500/40",
                )}
              >
                {r}
                {reportReason === r && <Check className="h-4 w-4 text-purple-500" />}
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
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition hover:bg-white/5",
        destructive ? "text-destructive" : "text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ChatHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-20 glass-strong border-b border-white/10 px-2 py-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full vibe-skeleton" />
        <Skeleton className="h-10 w-10 rounded-full vibe-skeleton" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-24 vibe-skeleton" />
          <Skeleton className="h-2 w-16 vibe-skeleton" />
        </div>
      </div>
    </header>
  );
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

function dayLabel(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
