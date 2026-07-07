"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, X, MessageSquare, Users, CreditCard, Star, MapPin, PartyPopper } from "lucide-react";
import { useNotifications, type AppNotification } from "@/lib/use-notifications";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/types";

const TYPE_ICON: Record<string, React.ReactNode> = {
  message: <MessageSquare className="h-4 w-4 text-purple-400" />,
  spot_request: <Users className="h-4 w-4 text-teal-400" />,
  spot_accepted: <Check className="h-4 w-4 text-green-400" />,
  spot_rejected: <X className="h-4 w-4 text-red-400" />,
  payment_received: <CreditCard className="h-4 w-4 text-amber-400" />,
  new_party_nearby: <MapPin className="h-4 w-4 text-coral-400" />,
  review: <Star className="h-4 w-4 text-yellow-400" />,
  party_reminder: <PartyPopper className="h-4 w-4 text-purple-300" />,
};

export function NotificationBell({ className = "" }: { className?: string }) {
  const currentUser = useAppStore((s) => s.currentUser);
  const { notifications, unreadCount, markAllRead } = useNotifications(currentUser?.id);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && unreadCount > 0) {
      markAllRead();
    }
    setOpen(!open);
  };

  return (
    <div className={cn("relative", className)} ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors hover:text-foreground"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 z-50 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  className="text-[11px] font-medium text-primary hover:text-primary/80"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto overflow-x-hidden">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 border-b border-border/50 px-4 py-3 transition hover:bg-muted/50",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted">
                      {TYPE_ICON[n.type] || <Bell className="h-4 w-4 text-muted-foreground" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm", !n.read ? "font-semibold text-foreground" : "text-foreground/80")}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">{n.body}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground/60">{relativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}