"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Check,
  ShieldAlert,
  Users,
  Minus,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { JoinRequest, Party } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Rotating avatar palette — purple / teal / amber / coral (per spec slide 9)
const AVATAR_COLORS = [
  "bg-purple-500/25 text-purple-200 ring-purple-500/40",
  "bg-teal-500/25 text-teal-200 ring-teal-500/40",
  "bg-amber-500/25 text-amber-200 ring-amber-500/40",
  "bg-coral-500/25 text-coral-200 ring-coral-500/40",
];

/* ─────────────────────────── Toggle ─────────────────────────── */

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-purple-400/60",
        checked ? "bg-purple-500" : "bg-secondary",
      )}
    >
      <span
        className={cn(
          "absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked && "translate-x-6",
        )}
      />
    </button>
  );
}

/* ─────────────────────────── Screen ─────────────────────────── */

export function AdminScreen() {
  const selectedPartyId = useAppStore((s) => s.selectedPartyId);
  const goBack = useAppStore((s) => s.goBack);

  const qc = useQueryClient();

  // ── Party + requests query ──────────────────────────────────────
  const partyQuery = useQuery({
    queryKey: ["party", selectedPartyId],
    queryFn: () => api.getParty(selectedPartyId!),
    enabled: !!selectedPartyId,
  });

  const party = partyQuery.data?.party as Party | undefined;
  const requests = (partyQuery.data?.requests ?? []) as JoinRequest[];

  // ── Split requests into pending / confirmed ─────────────────────
  const pending = useMemo(
    () => requests.filter((r) => r.status === "pending"),
    [requests],
  );
  const confirmed = useMemo(
    () => requests.filter((r) => r.status === "accepted"),
    [requests],
  );

  // ── Local control state (overrides party defaults once user toggles) ──
  // Using `undefined` until the user interacts lets the displayed value
  // stay in sync with server data on first paint, without a useEffect.
  const [approvalRequired, setApprovalRequired] = useState<
    boolean | undefined
  >(undefined);
  const [acceptJoiners, setAcceptJoiners] = useState<boolean | undefined>(
    undefined,
  );
  const [menuOpen, setMenuOpen] = useState<boolean | undefined>(undefined);
  const [guestCap, setGuestCap] = useState<number | undefined>(undefined);

  // Derived display values — fall back to party defaults when untouched.
  const approval = approvalRequired ?? (party?.approvalRequired ?? true);
  const joiners = acceptJoiners ?? (party?.acceptJoiners ?? true);
  const menu = menuOpen ?? (party?.menuOpen ?? true);
  const cap = guestCap ?? (party?.maxGuests ?? 15);

  // ── Approve / decline mutation ──────────────────────────────────
  const actMutation = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "accepted" | "rejected";
    }) => api.updateRequest(id, status),
    onSuccess: (_data, vars) => {
      toast.success(
        vars.status === "accepted"
          ? "Guest approved ✅"
          : "Request declined",
        {
          description:
            vars.status === "accepted"
              ? "A chat thread has been opened with this guest."
              : "The slot has been released.",
        },
      );
      qc.invalidateQueries({
        queryKey: ["party", selectedPartyId],
      });
      qc.invalidateQueries({ queryKey: ["parties"] });
      qc.invalidateQueries({ queryKey: ["requests"] });
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Action failed"),
  });

  // ── Empty state: no party selected ──────────────────────────────
  if (!selectedPartyId) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col animate-screen-in">
        <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="eyebrow">Admin controls</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl purple-foil">
            <Users className="h-7 w-7 text-purple-300" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Select a party
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Pick a party from My Parties to manage guest approvals, removals,
            and live party controls.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────
  if (partyQuery.isLoading) {
    return <AdminSkeleton />;
  }

  // ── Error state ─────────────────────────────────────────────────
  if (!party) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col animate-screen-in">
        <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <button
            onClick={goBack}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="eyebrow">Admin controls</span>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-3xl coral-foil">
            <span className="text-2xl">⚠</span>
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Couldn’t load admin controls
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
  const pendingCount = pending.length;

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col animate-screen-in">
      {/* ── Sticky header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:bg-white/10"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <span className="eyebrow">Admin controls</span>
          <h1 className="truncate font-display text-base font-bold leading-tight text-foreground">
            Guest management
          </h1>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {party.title}
          </p>
        </div>
      </header>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* ── Pending approval warning banner ────────────────────── */}
        {pendingCount > 0 && (
          <div className="amber-foil flex items-center gap-2 rounded-2xl p-3">
            <span className="text-base leading-none">⚠</span>
            <p className="text-sm font-medium text-purple-300">
              {pendingCount} {pendingCount === 1 ? "guest" : "guests"} waiting
              for approval
            </p>
          </div>
        )}

        {/* ── Pending requests section ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Pending requests</span>
            {pendingCount > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {pendingCount} waiting
              </span>
            )}
          </div>
          {pending.length === 0 ? (
            <div className="rounded-2xl glass p-4 text-center text-sm text-muted-foreground">
              No pending requests — you’re all caught up.
            </div>
          ) : (
            <ul className="space-y-2">
              {pending.map((req, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initial =
                  req.requesterName?.slice(0, 1).toUpperCase() ?? "?";
                const sub =
                  req.introMessage?.trim().length > 0
                    ? req.introMessage.length > 60
                      ? req.introMessage.slice(0, 60) + "…"
                      : req.introMessage
                    : "Wants to join";
                const busy =
                  actMutation.isPending &&
                  actMutation.variables?.id === req.id;
                return (
                  <li
                    key={req.id}
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
                        {req.requesterName}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {sub}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() =>
                          actMutation.mutate({
                            id: req.id,
                            status: "accepted",
                          })
                        }
                        disabled={busy}
                        className="press-feedback rounded-lg border border-teal-500/40 bg-teal-500/15 px-4 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-500/25 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          actMutation.mutate({
                            id: req.id,
                            status: "rejected",
                          })
                        }
                        disabled={busy}
                        className="press-feedback rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/25 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Confirmed guests section ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Confirmed guests</span>
            <span className="text-[11px] text-muted-foreground">
              {confirmed.length} confirmed
            </span>
          </div>
          {confirmed.length === 0 ? (
            <div className="rounded-2xl glass p-4 text-center text-sm text-muted-foreground">
              No confirmed guests yet — approved guests land here.
            </div>
          ) : (
            <ul className="space-y-2">
              {confirmed.map((req, idx) => {
                const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const initial =
                  req.requesterName?.slice(0, 1).toUpperCase() ?? "?";
                return (
                  <li
                    key={req.id}
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
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                        <span className="truncate">
                          {req.requesterName}
                        </span>
                        <Check
                          className="h-3.5 w-3.5 shrink-0 text-teal-400"
                          strokeWidth={3}
                        />
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        toast.success("Guest removed", {
                          description:
                            "Full refund sent automatically · removed from chat.",
                        });
                        qc.invalidateQueries({
                          queryKey: ["party", selectedPartyId],
                        });
                      }}
                      className="press-feedback shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Party controls card ────────────────────────────────── */}
        <section className="glass rounded-2xl p-4">
          <span className="eyebrow">Party controls</span>
          <div className="mt-3 space-y-1 divide-y divide-white/5">
            <ToggleRow
              label="Approval required"
              hint="New joiners need your OK"
              checked={approval}
              onChange={setApprovalRequired}
            />
            <ToggleRow
              label="Accept new joiners"
              hint="Let guests request to join"
              checked={joiners}
              onChange={setAcceptJoiners}
            />
            <ToggleRow
              label="Menu ordering open"
              hint="Guests can add drinks & snacks"
              checked={menu}
              onChange={setMenuOpen}
            />
          </div>

          {/* Guest cap stepper */}
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <div>
              <p className="text-sm font-medium text-foreground">Guest cap</p>
              <p className="text-[11px] text-muted-foreground">
                Max guests allowed in
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setGuestCap((c) => Math.max(1, (c ?? cap) - 1))}
                disabled={cap <= 1}
                className="press-feedback flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground transition hover:bg-white/10 disabled:opacity-40"
                aria-label="Decrease guest cap"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-display text-lg font-bold text-foreground">
                {cap}
              </span>
              <button
                onClick={() => setGuestCap((c) => Math.min(999, (c ?? cap) + 1))}
                className="press-feedback flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground transition hover:bg-white/10"
                aria-label="Increase guest cap"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* ── Danger zone — remove-guest card ────────────────────── */}
        <section className="red-foil rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-300" />
            <h3 className="text-sm font-semibold text-red-300">
              Remove guest · pick a reason
            </h3>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-red-300/70">
            Full refund sent automatically · removed from chat
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Use the Remove button next to any confirmed guest above. Every
            removal is logged for audit.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ─────────────────────────── helpers ─────────────────────────── */

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0 pr-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && (
          <p className="text-[11px] text-muted-foreground">{hint}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col animate-screen-in">
      <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/10 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="h-9 w-9" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-28 vibe-skeleton" />
          <Skeleton className="h-4 w-40 vibe-skeleton" />
          <Skeleton className="h-2.5 w-32 vibe-skeleton" />
        </div>
      </header>
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* Warning banner skeleton */}
        <Skeleton className="h-12 w-full rounded-2xl vibe-skeleton" />

        {/* Pending requests skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-full vibe-skeleton" />
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl glass p-3"
            >
              <Skeleton className="h-9 w-9 rounded-full vibe-skeleton" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-24 vibe-skeleton" />
                <Skeleton className="h-2.5 w-40 vibe-skeleton" />
              </div>
              <Skeleton className="h-6 w-16 rounded-lg vibe-skeleton" />
              <Skeleton className="h-6 w-16 rounded-lg vibe-skeleton" />
            </div>
          ))}
        </div>

        {/* Confirmed guests skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 rounded-full vibe-skeleton" />
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl glass p-3"
            >
              <Skeleton className="h-9 w-9 rounded-full vibe-skeleton" />
              <Skeleton className="h-3 flex-1 vibe-skeleton" />
              <Skeleton className="h-6 w-20 rounded-lg vibe-skeleton" />
            </div>
          ))}
        </div>

        {/* Party controls skeleton */}
        <div className="glass rounded-2xl p-4">
          <Skeleton className="h-3 w-28 rounded-full vibe-skeleton" />
          <div className="mt-3 space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-32 vibe-skeleton" />
                  <Skeleton className="h-2.5 w-44 vibe-skeleton" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full vibe-skeleton" />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20 vibe-skeleton" />
              <Skeleton className="h-2.5 w-32 vibe-skeleton" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-full vibe-skeleton" />
              <Skeleton className="h-6 w-10 vibe-skeleton" />
              <Skeleton className="h-9 w-9 rounded-full vibe-skeleton" />
            </div>
          </div>
        </div>

        {/* Danger zone skeleton */}
        <Skeleton className="h-24 w-full rounded-2xl vibe-skeleton" />
      </div>
    </div>
  );
}
