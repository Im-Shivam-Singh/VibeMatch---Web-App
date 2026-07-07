"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  RefreshCw,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";

export function ConfirmationScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const selectedOrderId = useAppStore((s) => s.selectedOrderId);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["orders", currentUser?.id],
    queryFn: () => api.listOrders({ userId: currentUser!.id }),
    enabled: !!currentUser,
  });

  const orders: Order[] = data?.orders ?? [];
  const order = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : undefined;

  // ── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </header>
        <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 pb-32">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack} className="h-10 w-10 rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Confirmed</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <EmptyState
            icon={RefreshCw}
            title="Couldn't load order"
            description="Something went wrong. Please try again."
            action={
              <Button onClick={() => refetch()} className="bg-purple-bright text-white hover:bg-purple-bright/90">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // ── Order not found ─────────────────────────────────────────────
  if (!order || !order.party) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={goBack} className="h-10 w-10 rounded-xl">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Confirmed</span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center p-6">
          <EmptyState
            icon={Ticket}
            title="Order not found"
            description="We couldn't find that order. It may have been removed, or your session may have changed."
            action={
              <Button onClick={() => setScreen("home")} className="bg-purple-bright text-white hover:bg-purple-bright/90">
                Back to home
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const party: Party = order.party;
  const sym = currencyForCity(party.city);
  const guestCount = (party.guestCount || 0) + 1;

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={goBack} className="h-10 w-10 rounded-xl">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Confirmed</span>
            <h1 className="font-display text-lg font-bold leading-tight text-foreground">You&apos;re in!</h1>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* ── Success banner with checkmark ─────────────────────── */}
        <Card className="gap-0 py-0 border-teal-500/20 bg-teal-500/[0.06] overflow-hidden">
          <CardContent className="p-5 text-center">
            {/* Animated checkmark */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/20 shadow-[0_0_30px_-8px_rgba(29,158,117,0.4)]">
              <Check className="h-8 w-8 text-teal-300" strokeWidth={3} />
            </div>

            <h2 className="font-display text-2xl font-bold text-teal-200">
              You&apos;re in!
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground/80">
              {party.title} · {formatDateLabel(party.date)} · {formatTime(party.time)}
            </p>
            <p className="mt-1 text-xs text-teal-300/70">
              Group chat is now unlocked
            </p>
          </CardContent>
        </Card>

        {/* ── Ticket preview with QR ───────────────────────────── */}
        <Card className="gap-0 py-0 border-border/50 overflow-hidden">
          {/* Ticket header */}
          <div className="p-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-purple-300" />
                <span className="text-xs font-semibold text-foreground">Your Ticket</span>
              </div>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                {order.status}
              </Badge>
            </div>
          </div>

          <Separator />

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
            <Separator className="my-3" />
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Total paid</span>
              <span className="font-display text-base font-bold text-foreground">
                {sym}{order.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <Separator />

          {/* QR code section */}
          <div className="p-4 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-border bg-muted/40 shadow-[0_0_20px_-6px_rgba(83,74,183,0.15)]">
              <span className="text-[32px] leading-none">▦</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-foreground">Your entry QR</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Show at the door · host scans to check in
            </p>
          </div>
        </Card>

        {/* ── Countdown to party start ─────────────────────────── */}
        <Card className="gap-0 py-0 border-border/50">
          <CardContent className="p-4">
            <CountdownDisplay date={party.date} time={party.time} />
          </CardContent>
        </Card>

        {/* ── Group chat preview ───────────────────────────────── */}
        <Card className="gap-0 py-0 border-purple-500/20 bg-purple-500/[0.06]">
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-semibold text-foreground">Group chat · {guestCount} people</span>
              </div>
              <Badge variant="outline" className="border-purple-500/25 bg-purple-500/10 text-purple-300 text-[10px]">
                Unlocked
              </Badge>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-end gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-500/30 text-[10px] font-bold text-purple-200">
                  {party.hostName?.slice(0, 1).toUpperCase() ?? "H"}
                </div>
                <div className="max-w-[78%] rounded-[4px_12px_12px_12px] bg-muted/50 px-3 py-2 text-sm text-foreground">
                  Welcome to the group! Doors open at {formatTime(party.time)} 🎉
                </div>
              </div>
              <div className="flex items-end justify-end gap-2">
                <div className="max-w-[78%] rounded-[12px_4px_12px_12px] bg-purple-500/30 px-3 py-2 text-sm text-purple-100">
                  See you there 🙌
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── CTAs ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => {
              setSelectedPartyId(party.id);
              setScreen("group-chat");
            }}
            className="bg-purple-500 text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400"
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Open chat
          </Button>
          <Button
            variant="outline"
            onClick={() => setScreen("tickets")}
            className="border-purple-500/25 text-purple-300 hover:bg-purple-500/10 hover:text-purple-200"
          >
            <QrCode className="mr-2 h-4 w-4" />
            View QR
          </Button>
        </div>

        {/* Share with friends */}
        <Button
          variant="outline"
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: party.title,
                text: `I'm going to ${party.title} on ${formatDateLabel(party.date)}! Join me 🎉`,
              }).catch(() => {});
            }
          }}
          className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share with friends
        </Button>
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
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">
        Countdown to party
      </p>
      <div className="grid grid-cols-4 gap-2">
        {units.map((u) => (
          <div key={u.label} className="flex flex-col items-center rounded-xl border border-border bg-muted/40 py-3">
            <span className="font-display text-2xl font-bold tabular-nums text-foreground">
              {String(u.value).padStart(u.label === "Days" ? 1 : 2, "0")}
            </span>
            <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
              {u.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
