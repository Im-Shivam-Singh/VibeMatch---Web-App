"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  Inbox,
  CheckCircle,
  Star,
  Trophy,
  TrendingUp,
  Users,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { HostAnalytics as HostAnalyticsType } from "@/lib/types";

/**
 * Host Analytics dashboard — surfaces aggregate stats for a host
 * (views, requests, acceptance rate, rating, capacity, funnel, top parties).
 * Intended to be embedded at the top of the MyPartiesScreen.
 */
export function HostAnalytics({ hostId }: { hostId: string }) {
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", hostId],
    queryFn: () => api.getHostAnalytics(hostId),
    enabled: !!hostId,
    staleTime: 30_000,
  });

  if (isLoading) return <HostAnalyticsSkeleton />;

  const a = data as HostAnalyticsType | undefined;
  if (!a) return null;

  // Empty state — no parties yet
  if (a.partyCount === 0) {
    return (
      <section className="flex flex-col items-center rounded-3xl border border-white/10 bg-card p-6 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10">
          <TrendingUp className="h-6 w-6 text-amber-400" />
        </div>
        <p className="text-sm font-semibold">No analytics yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Launch your first vibe to see stats
        </p>
      </section>
    );
  }

  const capacityPct =
    a.totalCapacity > 0
      ? Math.min(100, Math.round((a.totalGuests / a.totalCapacity) * 100))
      : 0;
  const ratingDisplay = a.avgRating > 0 ? a.avgRating.toFixed(1) : "—";

  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-card p-4">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold">
          <TrendingUp className="h-4 w-4 text-amber-400" />
          <span className="text-amber-400">Analytics</span>
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {a.partyCount} {a.partyCount === 1 ? "party" : "parties"}
        </span>
      </div>

      {/* A. Stats grid (2x2) */}
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<Eye className="h-4 w-4 text-amber-400" />}
          iconBg="bg-amber-400/10"
          value={a.totalViews.toLocaleString()}
          label="Total views"
        />
        <StatCard
          icon={<Inbox className="h-4 w-4 text-amber-400" />}
          iconBg="bg-amber-400/10"
          value={a.totalRequests.toLocaleString()}
          label="Total requests"
        />
        <StatCard
          icon={<CheckCircle className="h-4 w-4 text-amber-400" />}
          iconBg="bg-amber-400/10"
          value={`${a.acceptanceRate}%`}
          label="Acceptance rate"
        />
        <StatCard
          icon={<Star className="h-4 w-4 text-amber-400" />}
          iconBg="bg-amber-400/10"
          value={ratingDisplay}
          label="Avg rating"
        />
      </div>

      {/* B. Capacity utilization */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <Users className="h-3.5 w-3.5 text-amber-400" /> Capacity filled
          </span>
          <span className="text-muted-foreground">
            {a.totalGuests} / {a.totalCapacity} guests confirmed
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-amber-400 transition-all duration-700 ease-out"
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      {/* C. Request funnel */}
      <div>
        <p className="mb-1.5 px-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
          Request funnel
        </p>
        <div className="grid grid-cols-3 gap-2">
          <FunnelPill
            count={a.pendingRequests}
            label="Pending"
            color="amber"
          />
          <FunnelPill
            count={a.acceptedRequests}
            label="Accepted"
            color="emerald"
          />
          <FunnelPill
            count={a.rejectedRequests}
            label="Rejected"
            color="rose"
          />
        </div>
      </div>

      {/* D. Top parties (max 3) */}
      {a.topParties.length > 0 && (
        <div>
          <p className="mb-1.5 px-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
            Top parties
          </p>
          <div className="space-y-1.5">
            {a.topParties.slice(0, 3).map((p, idx) => {
              const rank = idx + 1;
              const isTop = rank === 1;
              return (
                <button
                  key={p.partyId}
                  onClick={() => {
                    setSelectedPartyId(p.partyId);
                    setScreen("detail");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/40 bg-card/40 p-2 text-left transition hover:border-border/70 hover:bg-card/70 active:scale-[0.99]"
                >
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                      isTop
                        ? "bg-amber-400 text-black"
                        : "bg-white/5 text-muted-foreground",
                    )}
                  >
                    {isTop ? <Trophy className="h-3 w-3" /> : rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.views} {p.views === 1 ? "view" : "views"} ·{" "}
                      {p.requests} {p.requests === 1 ? "request" : "requests"}
                    </p>
                  </div>
                  <Eye className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- helpers ---------- */

function StatCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string | number;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-3 transition hover:border-border/70 hover:bg-card/60">
      <div
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg",
          iconBg,
        )}
      >
        {icon}
      </div>
      <p className="mt-2 font-display text-xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function FunnelPill({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: "amber" | "emerald" | "rose";
}) {
  // Bumble single-accent: pending & accepted use yellow (varied opacity),
  // rejected is muted grey (terminal/negative state).
  const styles: Record<typeof color, string> = {
    amber: "border-amber-400/30 bg-amber-400/5 text-amber-300/80",
    emerald: "border-amber-400/50 bg-amber-400/15 text-amber-300",
    rose: "border-white/10 bg-white/5 text-muted-foreground",
  };
  return (
    <div
      className={cn(
        "rounded-xl border p-2 text-center transition hover:scale-[1.02]",
        styles[color],
      )}
    >
      <p className="font-display text-lg font-bold leading-none">{count}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </p>
    </div>
  );
}

function HostAnalyticsSkeleton() {
  return (
    <section className="space-y-4 rounded-3xl border border-white/10 bg-card p-4">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-3 w-12 rounded-full" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/40 bg-card/40 p-3"
          >
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="mt-2 h-5 w-14" />
            <Skeleton className="mt-2 h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Capacity bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      {/* Funnel pills */}
      <div>
        <Skeleton className="mb-1.5 h-3 w-20 rounded-full" />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>
    </section>
  );
}
