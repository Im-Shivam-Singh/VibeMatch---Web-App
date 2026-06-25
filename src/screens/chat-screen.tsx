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

export function ChatScreen() {
  const threadId = useAppStore((s) => s.selectedThreadId);
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);
  const qc = useQueryClient();

  const { socket, online } = useChatSocket(currentUser?.id);
  const [text, setText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
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
      const c = (content ?? text).trim();
      if (!c || !currentUser || !other) return;
      setText("");
      setShowEmoji(false);
      sendMutation.mutate(c);
    },
    [text, currentUser, other, sendMutation],
  );

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
      <div className="flex h-full flex-col">
        <ChatHeaderSkeleton />
        <div className="flex-1 space-y-3 p-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
            >
              <Skeleton className="h-10 w-40 rounded-2xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!other) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 glass border-b border-border/60 px-2 py-2 pt-[max(env(safe-area-inset-top),10px)]">
        <div className="flex items-center gap-2">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => toast.info("Profile view coming soon")}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
          >
            <UserAvatar name={other.name} src={other.avatarUrl} size={40} ring />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{other.name}</p>
              <p className="text-[11px] text-emerald-400">
                {isTyping ? "typing…" : online ? "online" : "last seen recently"}
              </p>
            </div>
          </button>
          <button
            onClick={() => toast.info("Calling coming soon")}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="Call"
          >
            <Phone className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => toast.info("Video coming soon")}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="Video"
          >
            <Video className="h-4 w-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => setSheetOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
            aria-label="More"
          >
            <MoreVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="fancy-scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-4"
      >
        {/* Intro banner */}
        <div className="mb-4 flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/40 p-4 text-center">
          <UserAvatar name={other.name} src={other.avatarUrl} size={56} ring />
          <div className="flex items-center gap-2">
            <p className="font-display font-semibold">{other.name}</p>
            <RatingPill rating={other.rating} />
          </div>
          {other.bio && (
            <p className="max-w-xs text-xs text-muted-foreground">{other.bio}</p>
          )}
          <p className="text-[11px] text-muted-foreground">
            You connected over a party. Be kind, be safe ✨
          </p>
        </div>

        {grouped.map(({ label, items }) => (
          <div key={label} className="space-y-1">
            <div className="my-3 flex justify-center">
              <span className="rounded-full bg-card/60 px-3 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
            </div>
            {items.map((m, i) => {
              const mine = m.senderId === currentUser?.id;
              const prev = items[i - 1];
              const showAvatar =
                !mine && (!prev || prev.senderId !== m.senderId);
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
                        name={other.name}
                        src={other.avatarUrl}
                        size={24}
                      />
                    ) : (
                      <span className="w-6" />
                    ))}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm",
                      mine
                        ? "rounded-br-md vibe-gradient-bg text-white"
                        : "rounded-bl-md border border-border/60 bg-card/70 text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-line break-words">{m.content}</p>
                    <div
                      className={cn(
                        "mt-0.5 flex items-center justify-end gap-1 text-[10px]",
                        mine ? "text-white/70" : "text-muted-foreground",
                      )}
                    >
                      {relativeTime(m.createdAt)}
                      {mine &&
                        (m.read ? (
                          <CheckCheck className="h-3 w-3 text-cyan-200" />
                        ) : (
                          <Check className="h-3 w-3" />
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-end gap-2">
            <UserAvatar name={other.name} src={other.avatarUrl} size={24} />
            <div className="flex gap-1 rounded-2xl rounded-bl-md border border-border/60 bg-card/70 px-3 py-2.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <footer className="relative border-t border-border/60 glass px-2 py-2 safe-bottom">
        {showEmoji && (
          <div className="absolute inset-x-2 bottom-full mb-2 flex gap-2 rounded-2xl border border-border/60 glass p-2">
            {QUICK_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  send(e);
                  setShowEmoji(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-white/5"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowEmoji((s) => !s)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full transition",
              showEmoji ? "bg-pink/15 text-pink" : "text-muted-foreground hover:bg-white/5",
            )}
            aria-label="Emoji"
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
            placeholder={`Message ${other.name.split(" ")[0]}…`}
            className="h-10 flex-1 rounded-full border-border/60 bg-background/60"
          />
          <button
            onClick={() => send()}
            disabled={!text.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full vibe-gradient-bg text-white shadow-[0_6px_20px_-6px_rgba(236,72,153,0.7)] transition active:scale-90 disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </footer>

      {/* More sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="mx-auto max-w-[480px] rounded-t-3xl border-border/60 bg-card/95"
        >
          <SheetHeader>
            <SheetTitle className="font-display">
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
        <DialogContent className="max-w-[420px] rounded-3xl border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="font-display">Report {other.name}?</DialogTitle>
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
                    ? "border-pink bg-pink/10"
                    : "border-border/60 hover:border-pink/40",
                )}
              >
                {r}
                {reportReason === r && <Check className="h-4 w-4 text-pink" />}
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
              className="rounded-full bg-rose-500 text-white hover:bg-rose-600"
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
        destructive ? "text-rose-400" : "text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ChatHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-20 glass border-b border-border/60 px-2 py-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2 w-16" />
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
