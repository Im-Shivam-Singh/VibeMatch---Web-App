"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Users,
  TrendingUp,
  Clock,
  ShoppingBag,
  ScanLine,
  Star,
  ShieldCheck,
  MessageCircle,
  Eye,
  Trophy,
  ArrowUpRight,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  currencyForCity,
  formatDateLabel,
  formatTime,
  type HostAnalytics,
  type JoinRequest,
  type MenuItem,
  type Order,
  type Party,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "bg-purple-500/25 text-purple-200 ring-purple-500/40",
  "bg-teal-500/25 text-teal-200 ring-teal-500/40",
  "bg-amber-500/25 text-amber-200 ring-amber-500/40",
  "bg-coral-500/25 text-coral-200 ring-coral-500/40",
];

interface PrepRow {
  name: string;
  emoji: string;
  unitPrice: number;
  totalQty: number;
}

const stagger = {
  initial: { opacity: 0, y: 16 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.06,
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export function HostDashboardScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const selectedPartyId = useAppStore((s) => s.selectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);

  // ── Data queries ───────────────────────────────────────────────
  const partyQuery = useQuery({
    queryKey: ["party", selectedPartyId],
    queryFn: () => api.getParty(selectedPartyId!),
    enabled: !!selectedPartyId,
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics", currentUser?.id],
    queryFn: () => api.getHostAnalytics(currentUser!.id),
    enabled: !!currentUser,
    staleTime: 30_000,
  });

  const ordersQuery = useQuery({
    queryKey: ["orders", "party", selectedPartyId],
    queryFn: () => api.listOrders({ partyId: selectedPartyId! }),
    enabled: !!selectedPartyId,
  });

  const menuQuery = useQuery({
    queryKey: ["menu", selectedPartyId],
    queryFn: () => api.listMenu(selectedPartyId!),
    enabled: !!selectedPartyId,
  });

  // ── Derived state ──
  const party = partyQuery.data?.party as Party | undefined;
  const analytics = analyticsQuery.data as HostAnalytics | undefined;
  const orders = (ordersQuery.data?.orders ?? []) as Order[];
  const menuItems = (menuQuery.data?.items ?? []) as MenuItem[];
  const requests = (partyQuery.data?.requests ?? []) as JoinRequest[];

  const acceptedRequests = useMemo(
    () => requests.filter((r) => r.status === "accepted"),
    [requests],
  );
  const pendingHereCount = useMemo(
    () => requests.filter((r) => r.status === "pending").length,
    [requests],
  );

  const prepList = useMemo<PrepRow[]>(() => {
    const map = new Map<string, PrepRow>();
    for (const o of orders) {
      for (const item of o.items) {
        if (item.name === "Entry ticket" || item.quantity <= 0) continue;
        const existing = map.get(item.name);
        if (existing) {
          existing.totalQty += item.quantity;
        } else {
          const menuItem = menuItems.find((m) => m.id === item.menuItemId);
          map.set(item.name, {
            name: item.name,
            emoji: item.emoji || menuItem?.emoji || "•",
            unitPrice: item.unitPrice || menuItem?.price || 0,
            totalQty: item.quantity,
          });
        }
      }
    }
    return Array.from(map.values());
  }, [orders, menuItems]);

  const preOrderCount = useMemo(
    () =>
      orders.reduce(
        (sum, o) =>
          sum +
          o.items
            .filter((i) => i.name !== "Entry ticket")
            .reduce((s, i) => s + i.quantity, 0),
        0,
      ),
    [orders],
  );

  const guestRows = useMemo(
    () =>
      acceptedRequests.map((req) => {
        const order = req.requesterId
          ? orders.find((o) => o.userId === req.requesterId)
          : undefined;
        const addOns = order
          ? order.items.filter(
              (i) => i.name !== "Entry ticket" && i.quantity > 0,
            )
          : [];
        return { request: req, addOns };
      }),
    [acceptedRequests, orders],
  );

  const confirmedGuests = party?.guestCount ?? 0;
  const capacity = party?.maxGuests ?? 0;
  const sym = party ? currencyForCity(party.city) : "£";
  const pending =
    requests.length > 0 ? pendingHereCount : (analytics?.pendingRequests ?? 0);
  const ticketRevenue = confirmedGuests * (party?.fee ?? 0);
  const menuProfit = prepList.reduce(
    (sum, p) => sum + p.totalQty * p.unitPrice,
    0,
  );
  const netProfit = ticketRevenue + menuProfit;
  const totalViews = analytics?.totalViews ?? 0;
  const avgRating = analytics?.avgRating ?? 0;

  const handleScan = () => {
    toast.success("QR scanner opening…", {
      description: "Scan a guest's QR code to check them in.",
    });
  };

  // ── Empty state: no party selected ─────────────────────────────
  if (!selectedPartyId) {
    return (
      <div className="flex h-full flex-col">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
        >
          <div className="flex items-center gap-3">
            <motion.button
              onClick={goBack}
              whileTap={{ scale: 0.9 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <span className="font-display text-lg font-bold text-foreground">Dashboard</span>
          </div>
        </motion.header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_30px_-8px_rgba(83,74,183,0.3)]">
            <Users className="h-7 w-7 text-purple-300" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            No party selected
          </h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Pick a party from My Parties to see live guest counts, prep list, and earnings.
          </p>
          <motion.button
            onClick={() => setScreen("my-parties")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]"
          >
            Go to My Parties
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────
  const isLoading =
    partyQuery.isLoading || ordersQuery.isLoading || menuQuery.isLoading;
  if (isLoading) {
    return <HostDashboardSkeleton />;
  }

  // ── Error state ─────────────────────────────────────────────────
  if (!party) {
    return (
      <div className="flex h-full flex-col">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
        >
          <div className="flex items-center gap-3">
            <motion.button
              onClick={goBack}
              whileTap={{ scale: 0.9 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80"
              aria-label="Back"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <span className="font-display text-lg font-bold text-foreground">Dashboard</span>
          </div>
        </motion.header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-coral/10 border border-coral/20">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Couldn&apos;t load dashboard
          </h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            {partyQuery.error instanceof Error
              ? partyQuery.error.message
              : "We couldn't load this party. Try again later."}
          </p>
          <motion.button
            onClick={() => partyQuery.refetch()}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
      >
        <div className="flex items-center gap-3">
          <motion.button
            onClick={goBack}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Dashboard
            </span>
            <h1 className="truncate font-display text-lg font-bold leading-tight text-foreground">
              {party.title}
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {formatDateLabel(party.date)} · {formatTime(party.time)} · {party.area}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Scrollable body */}
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto p-4 pb-32">
        {/* ── Summary stat cards (4-up) ──────────────────────────── */}
        <motion.section
          variants={stagger}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3"
        >
          <DashboardStat
            i={0}
            icon={Eye}
            tint="purple"
            value={totalViews.toLocaleString()}
            label="Total Views"
          />
          <DashboardStat
            i={1}
            icon={Users}
            tint="teal"
            value={`${confirmedGuests}/${capacity}`}
            label="Guests"
          />
          <DashboardStat
            i={2}
            icon={TrendingUp}
            tint="teal"
            value={`${sym}${netProfit.toFixed(0)}`}
            label="Revenue"
          />
          <DashboardStat
            i={3}
            icon={Star}
            tint="amber"
            value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
            label="Rating"
          />
        </motion.section>

        {/* ── Simple bar chart (guest fill per party) ────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Guest Capacity
            </span>
            <span className="text-xs font-medium text-purple-300">
              {confirmedGuests}/{capacity} filled
            </span>
          </div>
          {/* Bar */}
          <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${capacity > 0 ? Math.min(100, (confirmedGuests / capacity) * 100) : 0}%`,
              }}
              transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-purple-400 to-teal-400"
            />
          </div>
          <div className="mt-3 flex justify-between text-[10px] text-muted-foreground/50">
            <span>0</span>
            <span>{Math.round(capacity / 2)}</span>
            <span>{capacity}</span>
          </div>
        </motion.section>

        {/* ── Top parties list ───────────────────────────────────── */}
        {analytics && analytics.topParties.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className="space-y-3"
          >
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Top Parties
            </span>
            <div className="space-y-2">
              {analytics.topParties.slice(0, 3).map((p, idx) => {
                const rank = idx + 1;
                const isTop = rank === 1;
                return (
                  <motion.button
                    key={p.partyId}
                    onClick={() => {
                      setSelectedPartyId(p.partyId);
                      setScreen("detail");
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-left transition hover:border-purple-500/20 hover:bg-white/[0.06]"
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                        isTop
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-white/5 text-muted-foreground",
                      )}
                    >
                      {isTop ? <Trophy className="h-3.5 w-3.5" /> : rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {p.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.views} views · {p.requests} requests · {p.guests} guests
                      </p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* ── Recent activity (orders) ───────────────────────────── */}
        {orders.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="space-y-3"
          >
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Recent Activity
            </span>
            <div className="space-y-2">
              {orders.slice(0, 4).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15">
                    <ShoppingBag className="h-3.5 w-3.5 text-teal-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {o.items[0]?.emoji ?? "🎟️"} {o.items[0]?.name ?? "Order"}
                      {o.items.length > 1 && ` +${o.items.length - 1}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {sym}{o.totalAmount.toFixed(2)} · {o.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* ── Guest list ─────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Guest List
            </span>
            <span className="text-[11px] text-muted-foreground">
              {confirmedGuests} confirmed
            </span>
          </div>
          {guestRows.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center text-sm text-muted-foreground">
              No confirmed guests yet — approvals will land here.
            </div>
          ) : (
            <ul className="space-y-2">
              {guestRows.map(({ request, addOns }, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initial =
                  request.requesterName?.slice(0, 1).toUpperCase() ?? "?";
                return (
                  <motion.li
                    key={request.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04, duration: 0.3 }}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1",
                        color,
                      )}
                    >
                      {initial}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {request.requesterName}
                      </p>
                    </div>
                    {addOns.length > 0 ? (
                      <span className="shrink-0 rounded-lg bg-teal-500/10 border border-teal-500/20 px-2 py-1 text-[11px] font-medium text-teal-200">
                        {addOns
                          .map((a) => `${a.emoji}×${a.quantity}`)
                          .join(" · ")}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        Entry only
                      </span>
                    )}
                  </motion.li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* ── Trust rating section ────────────────────────────────── */}
        {acceptedRequests.length > 0 && (
          <TrustRatingSection
            partyId={selectedPartyId!}
            hostId={currentUser?.id ?? ""}
            guests={acceptedRequests.map((r) => ({
              guestId: r.requesterId ?? "",
              guestName: r.requesterName,
            }))}
          />
        )}

        {/* ── Prep list ──────────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="space-y-3"
        >
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
            Prep List — Buy Exactly This
          </span>
          {prepList.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 text-center text-sm text-muted-foreground">
              No pre-orders yet — once guests add drinks or snacks, the
              shopping list appears here.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden">
              <ul className="divide-y divide-white/[0.04]">
                {prepList.map((row) => {
                  const profit = row.totalQty * row.unitPrice;
                  return (
                    <li key={row.name} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-lg leading-none">{row.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {row.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.totalQty} ordered
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-teal-300">
                        +{sym}{profit.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.section>

        {/* ── Earnings card ───────────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Earnings
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Projected
            </span>
          </div>
          <div className="space-y-3">
            <EarningRow label="Ticket revenue" value={`${sym}${ticketRevenue.toFixed(2)}`} />
            <EarningRow label="Menu profit" value={`${sym}${menuProfit.toFixed(2)}`} />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3">
            <span className="text-sm font-semibold text-foreground">
              Est. net profit
            </span>
            <span className="font-display text-xl font-bold text-teal-300">
              {sym}{netProfit.toFixed(2)}
            </span>
          </div>
        </motion.section>

        {/* ── CTA: Scan guests ───────────────────────────────────── */}
        <motion.button
          onClick={handleScan}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-500 px-4 py-3.5 text-sm font-bold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]"
        >
          <ScanLine className="h-5 w-5" strokeWidth={2.5} />
          Scan guests in ▦
        </motion.button>

        {/* ── CTA: Group chat ────────────────────────────────────── */}
        {party.groupChatEnabled && (
          <motion.button
            onClick={() => {
              setSelectedPartyId(party.id);
              setScreen("group-chat");
            }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 0.4 }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-500/25 bg-teal-500/[0.06] px-4 py-3 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/15"
          >
            <MessageCircle className="h-4 w-4 text-teal-300" />
            Open group chat · {confirmedGuests} paid
          </motion.button>
        )}
      </div>
    </div>
  );
}

/* ─── Stat card ──────────────────────────────────────────────────────── */

function DashboardStat({
  i,
  icon: Icon,
  tint,
  value,
  label,
}: {
  i: number;
  icon: LucideIcon;
  tint: "purple" | "teal" | "amber";
  value: string;
  label: string;
}) {
  const tints: Record<string, { bg: string; icon: string; value: string; glow: string }> = {
    purple: {
      bg: "bg-purple-500/12",
      icon: "text-purple-300",
      value: "text-purple-200",
      glow: "shadow-[0_0_20px_-6px_rgba(83,74,183,0.2)]",
    },
    teal: {
      bg: "bg-teal-500/12",
      icon: "text-teal-300",
      value: "text-teal-200",
      glow: "shadow-[0_0_20px_-6px_rgba(29,158,117,0.2)]",
    },
    amber: {
      bg: "bg-amber-500/12",
      icon: "text-amber-300",
      value: "text-amber-200",
      glow: "shadow-[0_0_20px_-6px_rgba(239,159,39,0.2)]",
    },
  };
  const t = tints[tint];
  return (
    <motion.div
      variants={stagger}
      custom={i}
      className={cn(
        "rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4",
        t.glow,
      )}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", t.bg)}>
        <Icon className={cn("h-4 w-4", t.icon)} strokeWidth={2.25} />
      </div>
      <p className={cn("mt-3 font-display text-2xl font-bold leading-none", t.value)}>
        {value}
      </p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p>
    </motion.div>
  );
}

function EarningRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground/80">{value}</span>
    </div>
  );
}

/* ─── Skeleton ─────────────────────────────────────────────────────── */

function HostDashboardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-40 rounded-lg bg-white/[0.06] animate-pulse" />
            <div className="h-2.5 w-48 rounded-full bg-white/[0.04] animate-pulse" />
          </div>
        </div>
      </header>
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto p-4 pb-32">
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="h-9 w-9 rounded-xl bg-white/[0.06] animate-pulse" />
              <div className="mt-3 h-6 w-16 rounded-lg bg-white/[0.06] animate-pulse" />
              <div className="mt-2 h-3 w-20 rounded-full bg-white/[0.04] animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
          <div className="h-3 w-24 rounded-full bg-white/[0.06] animate-pulse mb-4" />
          <div className="h-3 w-full rounded-full bg-white/[0.06] animate-pulse" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/* ─── Trust rating section ──────────────────────────────────────── */

function TrustRatingSection({
  partyId,
  hostId,
  guests,
}: {
  partyId: string;
  hostId: string;
  guests: { guestId: string; guestName: string }[];
}) {
  const qc = useQueryClient();
  const [ratings, setRatings] = useState<Record<string, { score: number; saved: boolean }>>({});

  const mutation = useMutation({
    mutationFn: (input: { guestId: string; guestName: string; rating: number }) =>
      api.createTrustRating({
        partyId,
        hostId,
        guestId: input.guestId,
        rating: input.rating,
      }),
    onSuccess: (_data, vars) => {
      setRatings((prev) => ({
        ...prev,
        [vars.guestId]: { score: vars.rating, saved: true },
      }));
      qc.invalidateQueries({ queryKey: ["party", partyId] });
      toast.success(`TRUST rating saved for ${vars.guestName}`, {
        description: "Helps future hosts know they're reliable.",
        duration: 2500,
      });
    },
    onError: (err: Error) => {
      toast.error("Couldn't save rating", { description: err.message });
    },
  });

  const setScore = (guestId: string, guestName: string, score: number) => {
    setRatings((prev) => ({
      ...prev,
      [guestId]: { score, saved: false },
    }));
    mutation.mutate({ guestId, guestName, rating: score });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className="space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
          Rate guests · TRUST
        </span>
        <span className="text-[10px] text-muted-foreground">Hosts only</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground -mt-1">
        Give each guest a TRUST score. Helps future hosts know who&apos;s reliable.
      </p>
      <div className="space-y-2">
        {guests
          .filter((g) => g.guestId && g.guestId !== hostId)
          .map((g) => {
            const state = ratings[g.guestId];
            return (
              <div
                key={g.guestId}
                className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-sm font-bold text-teal-200">
                  {g.guestName?.slice(0, 1).toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {g.guestName}
                  </p>
                  {state?.saved && (
                    <p className="text-[10px] text-teal-300">✓ Rated</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (state?.score ?? 0) >= star;
                    return (
                      <button
                        key={star}
                        onClick={() => setScore(g.guestId, g.guestName, star)}
                        disabled={mutation.isPending}
                        aria-label={`Rate ${g.guestName} ${star} stars`}
                        className="p-0.5 transition active:scale-90 disabled:opacity-50"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4 transition",
                            active
                              ? "fill-teal-400 text-teal-400"
                              : "text-muted-foreground/30 hover:text-teal-400/50",
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </div>
    </motion.section>
  );
}
