"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Check,
  MessageCircle,
  QrCode,
  Share2,
  Ticket,
  Clock,
  Calendar,
  MapPin,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  currencyForCity,
  formatDateLabel,
  formatTime,
  countdownTo,
  type Order,
  type Party,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function ConfirmationScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const selectedOrderId = useAppStore((s) => s.selectedOrderId);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["orders", currentUser?.id],
    queryFn: () => api.listOrders({ userId: currentUser!.id }),
    enabled: !!currentUser,
  });

  const orders: Order[] = data?.orders ?? [];
  const order = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : undefined;

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
              <div className="h-4 w-24 rounded-lg bg-white/[0.06] animate-pulse" />
            </div>
          </div>
        </header>
        <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 pb-32">
          <div className="h-40 rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="h-48 rounded-2xl bg-white/[0.03] animate-pulse" />
          <div className="h-36 rounded-2xl bg-white/[0.03] animate-pulse" />
        </div>
      </div>
    );
  }

  // ── Error / not found ───────────────────────────────────────────
  if (isError || !order || !order.party) {
    return (
      <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <motion.button onClick={goBack} whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80">
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Confirmed</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral/10 border border-coral/20">
            <span className="text-2xl">🧾</span>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Order not found</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            We couldn&apos;t find that order. It may have been removed, or your session may have changed.
          </p>
          <motion.button
            onClick={() => setScreen("home")}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]"
          >
            Back to home
          </motion.button>
        </div>
      </div>
    );
  }

  const party: Party = order.party;
  const sym = currencyForCity(party.city);
  const guestCount = (party.guestCount || 0) + 1;

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
      >
        <div className="flex items-center gap-3">
          <motion.button onClick={goBack} whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80">
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Confirmed</span>
            <h1 className="font-display text-lg font-bold leading-tight text-foreground">You&apos;re in!</h1>
          </div>
        </div>
      </motion.header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* ── Success banner with checkmark ─────────────────────── */}
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.06] p-5 text-center"
        >
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.2 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20 shadow-[0_0_30px_-8px_rgba(29,158,117,0.4)]"
          >
            <Check className="h-8 w-8 text-teal-300" strokeWidth={3} />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="font-display text-2xl font-bold text-teal-200"
          >
            You&apos;re in!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-1 text-sm font-medium text-foreground/80"
          >
            {party.title} · {formatDateLabel(party.date)} · {formatTime(party.time)}
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="mt-1 text-xs text-teal-300/70"
          >
            Group chat is now unlocked
          </motion.p>
        </motion.section>

        {/* ── Ticket preview with QR ───────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm overflow-hidden"
        >
          {/* Ticket header */}
          <div className="p-4 pb-3 border-b border-dashed border-white/[0.08]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-purple-300" />
                <span className="text-xs font-semibold text-foreground">Your Ticket</span>
              </div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground/50">
                {order.status}
              </span>
            </div>
          </div>

          {/* Receipt items */}
          <div className="px-4 pt-3 pb-2">
            <ul className="space-y-2.5">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <span className="text-base leading-none">{it.emoji}</span>
                    <span className="truncate font-medium">{it.name}</span>
                    <span className="shrink-0 text-muted-foreground">× {it.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium text-foreground/80">
                    {sym}{(it.unitPrice * it.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
              <span className="text-sm font-semibold text-foreground">Total paid</span>
              <span className="font-display text-base font-bold text-purple-200">
                {sym}{order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* QR code section */}
          <div className="border-t border-dashed border-white/[0.08] p-4 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] shadow-[0_0_20px_-6px_rgba(83,74,183,0.15)]">
              <span className="text-[32px] leading-none">▦</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">Your entry QR</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Show at the door · host scans to check in
            </p>
          </div>
        </motion.section>

        {/* ── Countdown to party start ─────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <CountdownDisplay date={party.date} time={party.time} />
        </motion.section>

        {/* ── Group chat preview ───────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-semibold text-foreground">Group chat · {guestCount} people</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-purple-300/70">Unlocked</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-end gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/30 text-[10px] font-bold text-purple-200">
                {party.hostName?.slice(0, 1).toUpperCase() ?? "H"}
              </div>
              <div className="max-w-[78%] rounded-[4px_12px_12px_12px] bg-white/[0.06] px-3 py-2 text-sm text-foreground">
                Welcome to the group! Doors open at {formatTime(party.time)} 🎉
              </div>
            </div>
            <div className="flex items-end justify-end gap-2">
              <div className="max-w-[78%] rounded-[12px_4px_12px_12px] bg-purple-500/30 px-3 py-2 text-sm text-purple-100">
                See you there 🙌
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── CTAs ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="grid grid-cols-2 gap-3"
        >
          <motion.button
            onClick={() => {
              setSelectedPartyId(party.id);
              setScreen("group-chat");
            }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]"
          >
            <MessageCircle className="h-4 w-4" />
            Open chat
          </motion.button>
          <motion.button
            onClick={() => setScreen("tickets")}
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center gap-2 rounded-2xl border border-purple-500/25 bg-transparent px-4 py-3 text-sm font-semibold text-purple-300 transition hover:bg-purple-500/10"
          >
            <QrCode className="h-4 w-4" />
            View QR
          </motion.button>
        </motion.div>

        {/* Share with friends */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: party.title,
                text: `I'm going to ${party.title} on ${formatDateLabel(party.date)}! Join me 🎉`,
              }).catch(() => {});
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground hover:bg-white/[0.06]"
        >
          <Share2 className="h-4 w-4" />
          Share with friends
        </motion.button>
      </div>
    </div>
  );
}

/* ── Countdown display component ──────────────────────────────────── */

function CountdownDisplay({ date, time }: { date: string; time: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(`${date}T${time}:00`).getTime();
  const diff = start - now;

  if (diff <= 0) {
    return (
      <div className="text-center py-2">
        <p className="font-display text-lg font-bold text-teal-300">The party is live! 🎉</p>
      </div>
    );
  }

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  const units = [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Min", value: minutes },
    { label: "Sec", value: seconds },
  ];

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-3">
        Countdown to party
      </p>
      <div className="grid grid-cols-4 gap-2">
        {units.map((u) => (
          <div key={u.label} className="flex flex-col items-center rounded-xl border border-white/[0.06] bg-white/[0.04] py-3">
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">
              {String(u.value).padStart(u.label === "Days" ? 1 : 2, "0")}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground/60">
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
