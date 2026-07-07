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
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import type { JoinRequest, Party } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

// Rotating avatar palette — purple / teal / amber / coral
const AVATAR_COLORS = [
  "bg-purple-500/25 text-purple-200 ring-purple-500/40",
  "bg-teal-500/25 text-teal-200 ring-teal-500/40",
  "bg-amber-500/25 text-amber-200 ring-amber-500/40",
  "bg-coral-500/25 text-coral-200 ring-coral-500/40",
];

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
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goBack}
              aria-label="Back"
              className="rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Admin controls
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_30px_-8px_rgba(83,74,183,0.3)]">
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
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={goBack}
              aria-label="Back"
              className="rounded-xl"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Admin controls
            </span>
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coral/10 border border-coral/20">
            <RefreshCw className="h-5 w-5 text-coral" />
          </div>
          <h2 className="font-display text-lg font-bold text-foreground">
            Couldn&apos;t load admin controls
          </h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            {partyQuery.error instanceof Error
              ? partyQuery.error.message
              : "We couldn't load this party. Try again later."}
          </p>
          <Button
            onClick={() => partyQuery.refetch()}
            className="gap-2 rounded-2xl bg-purple-500 hover:bg-purple-400"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────
  const pendingCount = pending.length;

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* ── Sticky header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            aria-label="Back"
            className="rounded-xl"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Admin controls
            </span>
            <h1 className="truncate font-display text-base font-bold leading-tight text-foreground">
              Guest management
            </h1>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {party.title}
            </p>
          </div>
        </div>
      </header>

      {/* ── Scrollable body ──────────────────────────────────────── */}
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* ── Pending approval warning banner ────────────────────── */}
        {pendingCount > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/[0.06] py-0 gap-0">
            <CardContent className="flex items-center gap-2 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-300">
                {pendingCount} {pendingCount === 1 ? "guest" : "guests"} waiting
                for approval
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Pending requests section ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Pending requests
            </span>
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px]">
                {pendingCount} waiting
              </Badge>
            )}
          </div>
          {pending.length === 0 ? (
            <Card className="py-0 gap-0 border-border/40">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                No pending requests — you're all caught up.
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0 gap-0 border-border/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead className="hidden sm:table-cell">Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1",
                                color,
                              )}
                            >
                              {initial}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {req.requesterName}
                              </p>
                              <p className="truncate text-[11px] text-muted-foreground sm:hidden">
                                {sub}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <p className="truncate text-sm text-muted-foreground max-w-[200px]">
                            {sub}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex shrink-0 items-center justify-end gap-1.5">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  className="border-teal-500/40 bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 disabled:opacity-50"
                                >
                                  Approve
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Approve {req.requesterName}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    A chat thread will be opened with this guest. They will be added as a confirmed guest.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => actMutation.mutate({ id: req.id, status: "accepted" })}
                                    className="bg-teal-600 hover:bg-teal-500"
                                  >
                                    Approve
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busy}
                                  className="border-destructive/40 bg-destructive/15 text-red-300 hover:bg-destructive/25 disabled:opacity-50"
                                >
                                  Decline
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Decline {req.requesterName}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    The slot will be released. They can request again later.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => actMutation.mutate({ id: req.id, status: "rejected" })}
                                    className="bg-destructive hover:bg-destructive/90"
                                  >
                                    Decline
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </section>

        {/* ── Confirmed guests section ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Confirmed guests
            </span>
            <Badge variant="outline" className="text-[11px]">
              {confirmed.length} confirmed
            </Badge>
          </div>
          {confirmed.length === 0 ? (
            <Card className="py-0 gap-0 border-border/40">
              <CardContent className="p-4 text-center text-sm text-muted-foreground">
                No confirmed guests yet — approved guests land here.
              </CardContent>
            </Card>
          ) : (
            <Card className="py-0 gap-0 border-border/40 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmed.map((req, idx) => {
                    const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                    const initial =
                      req.requesterName?.slice(0, 1).toUpperCase() ?? "?";
                    return (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1",
                                color,
                              )}
                            >
                              {initial}
                            </span>
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
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-destructive/30 bg-destructive/10 text-red-300 hover:bg-destructive/20"
                              >
                                Remove
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove {req.requesterName}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Full refund will be sent automatically. They will be removed from the group chat.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    toast.success("Guest removed", {
                                      description: "Full refund sent automatically · removed from chat.",
                                    });
                                    qc.invalidateQueries({
                                      queryKey: ["party", selectedPartyId],
                                    });
                                  }}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </section>

        {/* ── Party controls card ────────────────────────────────── */}
        <Card className="py-0 gap-0 border-border/40">
          <CardContent className="p-4">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Party controls
            </span>
            <div className="mt-3 space-y-1 divide-y divide-border/40">
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
            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
              <div>
                <p className="text-sm font-medium text-foreground">Guest cap</p>
                <p className="text-[11px] text-muted-foreground">
                  Max guests allowed in
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setGuestCap((c) => Math.max(1, (c ?? cap) - 1))}
                  disabled={cap <= 1}
                  aria-label="Decrease guest cap"
                  className="h-9 w-9 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center font-display text-lg font-bold text-foreground">
                  {cap}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setGuestCap((c) => Math.min(999, (c ?? cap) + 1))}
                  aria-label="Increase guest cap"
                  className="h-9 w-9 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Danger zone ────────────────────────────────────────── */}
        <Card className="border-destructive/20 bg-destructive/[0.04] py-0 gap-0">
          <CardContent className="p-4">
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
          </CardContent>
        </Card>
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
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        aria-label={label}
      />
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      <header className="sticky top-0 z-20 border-b border-border/40 bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-28 rounded-full" />
            <Skeleton className="h-4 w-40 rounded-lg" />
            <Skeleton className="h-2.5 w-32 rounded-full" />
          </div>
        </div>
      </header>
      <div className="fancy-scrollbar flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* Warning banner skeleton */}
        <Skeleton className="h-12 w-full rounded-2xl" />

        {/* Pending requests skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded-full" />
          <Card className="py-0 gap-0 border-border/40">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Skeleton className="h-3 w-16" /></TableHead>
                    <TableHead className="hidden sm:table-cell"><Skeleton className="h-3 w-16" /></TableHead>
                    <TableHead className="text-right"><Skeleton className="h-3 w-16 ml-auto" /></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[0, 1].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-2.5 w-40" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Skeleton className="h-3 w-32" />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Skeleton className="h-6 w-16 rounded-lg" />
                          <Skeleton className="h-6 w-16 rounded-lg" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Confirmed guests skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-32 rounded-full" />
          <Card className="py-0 gap-0 border-border/40">
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  {[0, 1].map((i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Skeleton className="h-6 w-20 rounded-lg ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Party controls skeleton */}
        <Card className="py-0 gap-0 border-border/40">
          <CardContent className="p-4">
            <Skeleton className="h-3 w-28 rounded-full" />
            <div className="mt-3 space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2"
                >
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-44" />
                  </div>
                  <Skeleton className="h-6 w-11 rounded-full" />
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger zone skeleton */}
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
