"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Rotating avatar palette — purple / teal / amber / coral (per spec slide 8)
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

  // ── Derived state (all hooks must run before any conditional return) ──
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

  // Prep list — aggregate OrderItems across all orders (exclude "Entry ticket")
  const prepList = useMemo<PrepRow[]>(() => {
    const map = new Map<string, PrepRow>();
    for (const o of orders) {
      for (const item of o.items) {
        if (item.name === "Entry ticket" || item.quantity <= 0) continue;
        const existing = map.get(item.name);
        if (existing) {
          existing.totalQty += item.quantity;
        } else {
          // Fall back to menu item for emoji/price if the order line is sparse
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

  // Match each accepted guest to their order (for the pre-order badge)
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

  // Derived numbers
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

  const handleScan = () => {
    toast.success("QR scanner opening…", {
      description: "Scan a guest's QR code to check them in.",
    });
  };

  // ── Empty state: no party selected ─────────────────────────────
  if (!selectedPartyId) {
    return (
      <div className="flex h-full flex-col animate-screen-in">
        <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="eyebrow">Host dashboard</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl purple-foil">
            <Users className="h-7 w-7 text-purple-300" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            No party selected
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Pick a party from My Parties to see live guest counts, prep list,
            and projected earnings.
          </p>
          <button
            onClick={() => setScreen("my-parties")}
            className="press-feedback glow-violet mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go to My Parties
          </button>
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

  // ── Error state: party failed to load ───────────────────────────
  if (!party) {
    return (
      <div className="flex h-full flex-col animate-screen-in">
        <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="eyebrow">Host dashboard</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl coral-foil">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Couldn’t load dashboard
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {partyQuery.error instanceof Error
              ? partyQuery.error.message
              : "We couldn’t load this party. Try again later."}
          </p>
          <button
            onClick={() => partyQuery.refetch()}
            className="press-feedback glow-violet mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col animate-screen-in">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <span className="eyebrow">Host dashboard</span>
          <h1 className="truncate font-display text-base font-bold leading-tight text-foreground">
            {party.title}
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {formatDateLabel(party.date)} · {formatTime(party.time)} ·{" "}
            {party.area}
          </p>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto p-4 pb-32">
        {/* ── Stat grid 2×2 ─────────────────────────────────────── */}
        <section className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Users}
            tint="purple"
            value={`${confirmedGuests}/${capacity}`}
            label="Confirmed"
          />
          <StatCard
            icon={TrendingUp}
            tint="teal"
            value={`${sym}${netProfit.toFixed(0)}`}
            label="Est. net profit"
          />
          <StatCard
            icon={Clock}
            tint="amber"
            value={String(pending)}
            label="Pending"
          />
          <StatCard
            icon={ShoppingBag}
            tint="purple"
            value={String(preOrderCount)}
            label="Pre-orders"
          />
        </section>

        {/* ── Guest list ────────────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Guest list</span>
            <span className="text-[11px] text-muted-foreground">
              {confirmedGuests} confirmed
            </span>
          </div>
          {guestRows.length === 0 ? (
            <div className="rounded-2xl glass p-4 text-center text-sm text-muted-foreground">
              No confirmed guests yet — approvals will land here.
            </div>
          ) : (
            <ul className="space-y-2">
              {guestRows.map(({ request, addOns }, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initial =
                  request.requesterName?.slice(0, 1).toUpperCase() ?? "?";
                return (
                  <li
                    key={request.id}
                    className="flex items-center gap-3 rounded-2xl glass p-3"
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
                      <span className="teal-foil shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium text-teal-200">
                        {addOns
                          .map((a) => `${a.emoji}×${a.quantity}`)
                          .join(" · ")}
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                        Entry only
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Rate guests TRUST ───────────────────────────────────────
            Hosts give each guest a TRUST score (1..5) after the party.
            This is the "assurity" signal for future hosts. */}
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

        {/* ── Prep list ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <span className="eyebrow">Prep list — buy exactly this</span>
          {prepList.length === 0 ? (
            <div className="rounded-2xl glass p-4 text-center text-sm text-muted-foreground">
              No pre-orders yet — once guests add drinks or snacks, the
              shopping list appears here.
            </div>
          ) : (
            <div className="glass rounded-2xl p-2">
              <ul className="divide-y divide-white/5">
                {prepList.map((row) => {
                  const profit = row.totalQty * row.unitPrice;
                  return (
                    <li
                      key={row.name}
                      className="flex items-center gap-3 px-2 py-3"
                    >
                      <span className="text-lg leading-none">
                        {row.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {row.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.totalQty} ordered
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-teal-300">
                        +{sym}
                        {profit.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* ── Earnings card ─────────────────────────────────────── */}
        <section className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">Earnings</span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
              Projected
            </span>
          </div>
          <div className="space-y-2.5">
            <EarningRow
              label="Ticket revenue"
              value={`${sym}${ticketRevenue.toFixed(2)}`}
            />
            <EarningRow
              label="Menu profit"
              value={`${sym}${menuProfit.toFixed(2)}`}
            />
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <span className="text-sm font-semibold text-foreground">
              Est. net profit
            </span>
            <span className="font-display text-lg font-bold text-teal-300">
              {sym}
              {netProfit.toFixed(2)}
            </span>
          </div>
        </section>

        {/* ── CTA: Scan guests in ───────────────────────────────── */}
        <button
          onClick={handleScan}
          className="vibe-gradient-bg glow-violet press-feedback flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-bold text-white"
        >
          <ScanLine className="h-5 w-5" strokeWidth={2.5} />
          Scan guests in ▦
        </button>

        {/* ── CTA: Open group chat (only when unlocked) ──────────────
            Once the first guest pays, the group chat unlocks. The host can
            jump straight into coordination with all paid guests from here. */}
        {party.groupChatEnabled && (
          <button
            onClick={() => {
              setSelectedPartyId(party.id);
              setScreen("group-chat");
            }}
            className="press-feedback glass flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white ring-1 ring-teal-500/40 transition hover:bg-teal-500/10 hover:text-teal-200"
          >
            <MessageCircle className="h-4 w-4 text-teal-300" />
            Open group chat · {confirmedGuests} paid
          </button>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function StatCard({
  icon: Icon,
  tint,
  value,
  label,
}: {
  icon: LucideIcon;
  tint: "purple" | "teal" | "amber";
  value: string;
  label: string;
}) {
  const tints: Record<
    "purple" | "teal" | "amber",
    { bg: string; icon: string; value: string }
  > = {
    purple: {
      bg: "bg-purple-500/15",
      icon: "text-purple-300",
      value: "text-purple-300",
    },
    teal: {
      bg: "bg-teal-500/15",
      icon: "text-teal-300",
      value: "text-teal-300",
    },
    amber: {
      bg: "bg-amber-500/15",
      icon: "text-amber-300",
      value: "text-amber-300",
    },
  };
  const t = tints[tint];
  return (
    <div className="glass rounded-2xl p-4">
      <div
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg",
          t.bg,
        )}
      >
        <Icon className={cn("h-4 w-4", t.icon)} strokeWidth={2.25} />
      </div>
      <p
        className={cn(
          "mt-3 font-display text-2xl font-bold leading-none",
          t.value,
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EarningRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground/90">{value}</span>
    </div>
  );
}

function HostDashboardSkeleton() {
  return (
    <div className="flex h-full flex-col animate-screen-in">
      <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="h-9 w-9" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-24 vibe-skeleton" />
          <Skeleton className="h-4 w-40 vibe-skeleton" />
          <Skeleton className="h-2.5 w-48 vibe-skeleton" />
        </div>
      </header>
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto p-4 pb-32">
        {/* Stat grid skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-4">
              <Skeleton className="h-8 w-8 rounded-lg vibe-skeleton" />
              <Skeleton className="mt-3 h-6 w-16 vibe-skeleton" />
              <Skeleton className="mt-2 h-3 w-20 vibe-skeleton" />
            </div>
          ))}
        </div>

        {/* Guest list skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded-full vibe-skeleton" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl glass p-3"
            >
              <Skeleton className="h-9 w-9 rounded-full vibe-skeleton" />
              <Skeleton className="h-3 flex-1 vibe-skeleton" />
              <Skeleton className="h-5 w-20 rounded-full vibe-skeleton" />
            </div>
          ))}
        </div>

        {/* Prep list skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-40 rounded-full vibe-skeleton" />
          <div className="glass rounded-2xl p-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-3">
                <Skeleton className="h-5 w-5 vibe-skeleton" />
                <Skeleton className="h-3 flex-1 vibe-skeleton" />
                <Skeleton className="h-4 w-12 vibe-skeleton" />
              </div>
            ))}
          </div>
        </div>

        {/* Earnings skeleton */}
        <div className="glass space-y-3 rounded-2xl p-4">
          <Skeleton className="h-3 w-20 rounded-full vibe-skeleton" />
          <Skeleton className="h-4 w-full vibe-skeleton" />
          <Skeleton className="h-4 w-full vibe-skeleton" />
          <Skeleton className="h-6 w-full vibe-skeleton" />
        </div>

        {/* CTA skeleton */}
        <Skeleton className="h-12 w-full rounded-2xl vibe-skeleton" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// TrustRatingSection — hosts rate each guest's TRUST (1..5) after a party.
// The rating is persisted via POST /api/trust-ratings and aggregated on the
// guest's profile as an assurity signal for future hosts.
// ─────────────────────────────────────────────────────────────────────
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
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="eyebrow inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-400" />
          Rate guests · TRUST
        </span>
        <span className="text-[10px] text-muted-foreground">Hosts only</span>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground -mt-1">
        Give each guest a TRUST score. This helps future hosts know who's
        reliable — your assurity signal to the community.
      </p>
      <div className="space-y-2">
        {guests
          .filter((g) => g.guestId && g.guestId !== hostId)
          .map((g) => {
            const state = ratings[g.guestId];
            return (
              <div
                key={g.guestId}
                className="flex items-center gap-3 rounded-2xl glass p-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-sm font-bold text-teal-200">
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
                              : "text-muted-foreground/40 hover:text-teal-400/60",
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
    </section>
  );
}
