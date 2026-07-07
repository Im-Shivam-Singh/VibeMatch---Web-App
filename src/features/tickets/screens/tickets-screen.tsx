"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Ticket as TicketIcon,
  RefreshCw,
  QrCode,
  MessageCircle,
  ChevronDown,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  Navigation,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  currencyForCity,
  formatDateLabel,
  formatTime,
  countdownTo,
  parseVibes,
  VIBE_COLORS,
  type OrderItem,
  type Ticket,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Separator } from "@/components/ui/separator";

/* ------------------------------------------------------------------ */
/*  QR placeholder — deterministic 7×7 grid with finder patterns      */
/* ------------------------------------------------------------------ */

const QR_N = 7;

function hashSeed(hash: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < hash.length; i++) {
    h ^= hash.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function finderZone(
  r: number,
  c: number,
): "tl" | "tr" | "bl" | null {
  if (r < 3 && c < 3) return "tl";
  if (r < 3 && c >= QR_N - 3) return "tr";
  if (r >= QR_N - 3 && c < 3) return "bl";
  return null;
}

function finderValue(r: number, c: number): boolean {
  const lr = r < 3 ? r : r - (QR_N - 3);
  const lc = c < 3 ? c : c - (QR_N - 3);
  const isOuter = lr === 0 || lr === 2 || lc === 0 || lc === 2;
  const isCenter = lr === 1 && lc === 1;
  return isOuter || isCenter;
}

function qrGrid(hash: string): boolean[][] {
  const seed = hashSeed(hash || "vm-ticket");
  const grid: boolean[][] = Array.from({ length: QR_N }, () =>
    Array<boolean>(QR_N).fill(false),
  );
  for (let r = 0; r < QR_N; r++) {
    for (let c = 0; c < QR_N; c++) {
      if (finderZone(r, c)) {
        grid[r][c] = finderValue(r, c);
      } else {
        const bit = (seed >>> ((r * QR_N + c) % 31)) & 1;
        grid[r][c] = bit === 1;
      }
    }
  }
  return grid;
}

function QRPlaceholder({ hash, size = 120 }: { hash: string; size?: number }) {
  const grid = useMemo(() => qrGrid(hash), [hash]);
  return (
    <div
      className="grid gap-[2px] rounded-xl bg-white p-2.5"
      style={{
        width: size,
        height: size,
        gridTemplateColumns: `repeat(${QR_N}, 1fr)`,
        gridTemplateRows: `repeat(${QR_N}, 1fr)`,
      }}
      role="img"
      aria-label="QR code"
    >
      {grid.flatMap((row, r) =>
        row.map((dark, c) => (
          <div
            key={`${r}-${c}`}
            className={cn(
              "rounded-[1px] transition-colors duration-300",
              dark ? "bg-foreground" : "bg-white",
            )}
          />
        )),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function preOrderItems(t: Ticket): OrderItem[] {
  const items = t.order?.items ?? [];
  return items.filter((it) => it.menuItemId !== null && it.menuItemId !== undefined);
}

function ticketStatus(t: Ticket): "valid" | "used" | "expired" {
  if (t.scannedAt) return "used";
  if (t.party) {
    const partyDate = t.party.date;
    const partyTime = t.party.time || "23:59";
    const end = new Date(`${partyDate}T${partyTime}:00`);
    end.setHours(end.getHours() + 4);
    if (new Date() > end) return "expired";
  }
  return "valid";
}

const STATUS_META: Record<
  string,
  { label: string; icon: React.ElementType; badgeVariant: "default" | "secondary" | "destructive" | "outline"; badgeClassName: string }
> = {
  valid: {
    label: "Valid",
    icon: CheckCircle2,
    badgeVariant: "outline",
    badgeClassName: "border-teal-500/30 bg-teal-500/10 text-teal-400",
  },
  used: {
    label: "Used",
    icon: CheckCircle2,
    badgeVariant: "secondary",
    badgeClassName: "bg-muted text-muted-foreground",
  },
  expired: {
    label: "Expired",
    icon: AlertCircle,
    badgeVariant: "destructive",
    badgeClassName: "",
  },
};

/* Accent strip color based on first vibe tag */
const STRIP_COLORS = [
  "from-purple-bright to-purple",
  "from-teal to-teal-bright",
  "from-amber to-amber-bright",
  "from-coral to-coral-bright",
  "from-purple-bright to-teal",
  "from-amber to-coral",
];

function stripColorForTicket(t: Ticket): string {
  const vibes = t.party ? parseVibes(t.party.vibes) : [];
  let h = 0;
  const seed = t.id;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const idx = vibes.length > 0 ? h % STRIP_COLORS.length : h % STRIP_COLORS.length;
  return STRIP_COLORS[idx];
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function TicketSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0 border-border/50">
      <Skeleton className="h-1.5 w-full rounded-none" />
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-20" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 flex-1 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Ticket card — using shadcn Card + Badge + Button                  */
/* ------------------------------------------------------------------ */

function TicketCard({ ticket }: { ticket: Ticket }) {
  const party = ticket.party;
  const addOns = preOrderItems(ticket);
  const sym = party ? currencyForCity(party.city) : "£";
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const [expanded, setExpanded] = useState(false);

  // Resolve party id (API should always include id, but fallback to partyId on ticket)
  const partyId = party?.id ?? ticket.partyId;

  const openGroupChat = () => {
    if (!party) return;
    setSelectedPartyId(partyId);
    setScreen("group-chat");
  };

  if (!party) return null;

  const status = ticketStatus(ticket);
  const statusMeta = STATUS_META[status];
  const StatusIcon = statusMeta.icon;
  const dateLabel = formatDateLabel(party.date);
  const timeLabel = formatTime(party.time);
  const countdown = countdownTo(party.date, party.time);
  const stripGrad = stripColorForTicket(ticket);
  const vibes = parseVibes(party.vibes);

  return (
    <Card className="gap-0 overflow-hidden py-0 border-border/50">
      {/* Gradient accent strip */}
      <div className={cn("h-1.5 bg-gradient-to-r", stripGrad)} />

      <CardContent className="p-5">
        {/* Header row: title + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-foreground leading-tight truncate">
              {party.title}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Hosted by {party.hostName}
            </p>
          </div>
          <Badge variant={statusMeta.badgeVariant} className={cn("gap-1 shrink-0", statusMeta.badgeClassName)}>
            <StatusIcon className="h-3 w-3" />
            {statusMeta.label}
          </Badge>
        </div>

        {/* Date / time / area row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-purple-bright/60" />
            {dateLabel} · {timeLabel}
          </span>
          {party.area && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-teal-bright/60" />
              {party.area}
            </span>
          )}
        </div>

        {/* Vibe tags (compact) */}
        {vibes.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {vibes.slice(0, 4).map((v) => (
              <Badge
                key={v}
                variant="outline"
                className={cn(
                  "px-2 py-0.5 text-[10px] font-medium",
                  VIBE_COLORS[v] || "bg-muted/50 text-muted-foreground border-border",
                )}
              >
                {v}
              </Badge>
            ))}
            {vibes.length > 4 && (
              <span className="text-[10px] text-muted-foreground">+{vibes.length - 4}</span>
            )}
          </div>
        )}

        {/* QR code + countdown (always visible) */}
        <div className="mt-4 flex items-center gap-4">
          <QRPlaceholder hash={ticket.qrHash} size={80} />
          <div className="flex flex-1 flex-col gap-2">
            {/* Countdown */}
            {status === "valid" && countdown !== "Ended" && (
              <div className="rounded-xl bg-purple-500/10 border border-purple-500/25 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-purple-bright/70 font-medium">
                  Starts {countdown}
                </p>
              </div>
            )}

            {/* Ticket number */}
            <div className="rounded-xl bg-muted/40 border border-border px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground font-medium">
                Ticket #{ticket.id.slice(-6).toUpperCase()}
              </p>
            </div>

            {/* Pre-order pills */}
            {addOns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {addOns.map((it) => (
                  <Badge
                    key={it.id}
                    variant="outline"
                    className="border-amber-500/25 bg-amber-500/10 text-amber-bright text-[10px] font-medium"
                  >
                    {it.emoji} {it.name} ×{it.quantity}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions row */}
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedPartyId(partyId);
              setScreen("detail");
            }}
            className="flex-1"
          >
            View Party
          </Button>
          <Button
            variant="outline"
            onClick={() => setExpanded(!expanded)}
            className={cn(
              "flex-1 gap-1.5",
              "border-purple-bright/25 bg-purple-bright/10 text-purple-bright hover:bg-purple-bright/20 hover:text-purple-bright",
            )}
          >
            <QrCode className="h-4 w-4" />
            {expanded ? "Hide QR" : "Show QR"}
          </Button>
        </div>
      </CardContent>

      {/* ---- Expanded detail ---- */}
      {expanded && (
        <>
          <Separator />
          <div className="px-5 py-5 space-y-4">
            {/* Full-size QR */}
            <div className="flex flex-col items-center gap-3">
              <QRPlaceholder hash={ticket.qrHash} size={140} />
              <p className="text-xs text-muted-foreground">
                Scan this QR code at the door
              </p>
            </div>

            {/* Full order details */}
            {addOns.length > 0 && (
              <Card className="gap-0 py-0 border-border/50">
                <CardContent className="p-4">
                  <h4 className="mb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
                    Your order at the door
                  </h4>
                  <ul className="space-y-2">
                    {addOns.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-foreground">
                          <span className="mr-1.5" aria-hidden>
                            {it.emoji}
                          </span>
                          {it.name} × {it.quantity}
                        </span>
                        <span className="shrink-0 font-semibold text-amber-bright">
                          {sym}
                          {(it.unitPrice * it.quantity).toFixed(2)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Guest list confirmation */}
            <div className="flex items-center gap-3 rounded-xl bg-teal-500/10 border border-teal-500/20 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15">
                <CheckCircle2 className="h-4 w-4 text-teal-bright" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-teal-bright">
                  You&apos;re on the guest list
                </p>
                <p className="text-xs text-muted-foreground">
                  Approved by host · spot confirmed
                </p>
              </div>
            </div>

            {/* CTA buttons */}
            <Button
              onClick={() => toast.success("Show this to your host 🎟️")}
              className="w-full bg-gradient-to-r from-purple-bright to-purple text-white shadow-[0_8px_24px_-8px_rgba(83,74,183,0.5)] hover:brightness-110"
            >
              <TicketIcon className="mr-2 h-4 w-4" />
              Ready · show QR to host
            </Button>

            <Button
              variant="outline"
              onClick={openGroupChat}
              className="w-full border-purple-500/25 text-purple-bright hover:bg-purple-500/10 hover:text-purple-200"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Open group chat
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/* ================================================================== */
/*  TICKETS SCREEN                                                     */
/* ================================================================== */

export function TicketsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["tickets", currentUser?.id],
    queryFn: () => api.listTickets(currentUser!.id),
    enabled: !!currentUser?.id,
  });

  const tickets = data?.tickets ?? [];
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");

  // Split tickets by status
  const filteredTickets = useMemo(() => {
    const now = new Date();
    return tickets.filter((t) => {
      if (!t.party) return filter === "upcoming";
      const end = new Date(`${t.party.date}T${t.party.time || "23:59"}:00`);
      end.setHours(end.getHours() + 4);
      const isPast = now > end || t.scannedAt;
      return filter === "upcoming" ? !isPast : isPast;
    });
  }, [tickets, filter]);

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 glass-strong border-b border-border px-4 py-3 pt-[max(env(safe-area-inset-top),12px)] max-w-2xl mx-auto w-full">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">My Tickets</span>
            <h1 className="mt-0.5 font-display text-xl font-bold text-foreground">
              Show QR at the door
            </h1>
          </div>
          {tickets.length > 0 && (
            <Badge variant="outline" className="border-purple-bright/25 bg-purple-bright/10 text-purple-bright">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </Badge>
          )}
        </div>

        {/* Filter tabs */}
        {tickets.length > 0 && (
          <div className="mt-3 flex gap-1 rounded-xl bg-muted/50 p-1">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-all duration-200",
                  filter === tab
                    ? "bg-purple-bright text-white shadow-lg shadow-purple/20"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Scrollable body */}
      <div className="fancy-scrollbar w-full flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 pb-32 max-w-lg mx-auto">
        {isLoading && (
          <>
            <TicketSkeleton />
            <TicketSkeleton />
          </>
        )}

        {!isLoading && isError && (
          <EmptyState
            icon={RefreshCw}
            title="Couldn't load tickets"
            description="Your connection might have dropped. Pull again."
            action={
              <Button onClick={() => refetch()} className="bg-purple-bright text-white hover:bg-purple-bright/90">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            }
          />
        )}

        {!isLoading && !isError && tickets.length === 0 && (
          <EmptyState
            icon={TicketIcon}
            title="No tickets yet"
            description="Join a party to get your entry QR code — it'll show up right here"
            action={
              <Button
                onClick={() => setScreen("home")}
                className="bg-purple-bright text-white hover:bg-purple-bright/90"
              >
                <Sparkles className="mr-1.5 h-4 w-4" />
                Find a party
              </Button>
            }
          />
        )}

        {!isLoading &&
          !isError &&
          tickets.length > 0 &&
          filteredTickets.length === 0 && (
            <EmptyState
              icon={TicketIcon}
              title={`No ${filter} tickets`}
              description={filter === "upcoming" ? "Your upcoming tickets will appear here" : "Your past tickets will appear here"}
            />
          )}

        {!isLoading &&
          !isError &&
          filteredTickets.map((t) => (
            <TicketCard key={t.id} ticket={t} />
          ))}
      </div>
    </div>
  );
}
