"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
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
              dark ? "bg-[#09080f]" : "bg-white",
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
  { label: string; icon: React.ElementType; color: string; bg: string }
> = {
  valid: {
    label: "Valid",
    icon: CheckCircle2,
    color: "text-teal-bright",
    bg: "bg-teal-500/10 border-teal-500/30",
  },
  used: {
    label: "Used",
    icon: CheckCircle2,
    color: "text-white/50",
    bg: "bg-white/[0.04] border-white/[0.08]",
  },
  expired: {
    label: "Expired",
    icon: AlertCircle,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
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
    <div className="space-y-3">
      <div className="h-72 animate-pulse rounded-2xl bg-white/[0.03] border border-white/[0.06] vibe-skeleton" />
      <div className="h-16 animate-pulse rounded-2xl bg-white/[0.03] border border-white/[0.06] vibe-skeleton" />
    </div>
  );
}

function EmptyTickets() {
  const setScreen = useAppStore((s) => s.setScreen);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center gap-5 px-6 py-20 text-center"
    >
      <div className="vibe-float">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl purple-foil glow-violet">
          <TicketIcon className="h-10 w-10 text-purple-bright" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-display text-2xl font-bold text-white">
          No tickets yet
        </p>
        <p className="mx-auto max-w-xs text-sm text-white/50">
          Join a party to get your entry QR code — it&apos;ll show up right here
        </p>
      </div>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setScreen("home")}
        className="rounded-full bg-purple-bright px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple/30 hover:brightness-110 transition"
      >
        <Sparkles className="mr-1.5 inline h-4 w-4" />
        Find a party
      </motion.button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ticket card — premium Dribbble quality                             */
/* ------------------------------------------------------------------ */

function TicketCard({ ticket }: { ticket: Ticket }) {
  const party = ticket.party;
  const addOns = preOrderItems(ticket);
  const sym = party ? currencyForCity(party.city) : "£";
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const setScreen = useAppStore((s) => s.setScreen);
  const [expanded, setExpanded] = useState(false);

  const openGroupChat = () => {
    if (!party) return;
    setSelectedPartyId(party.id);
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
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.06]"
    >
      {/* Gradient accent strip */}
      <div className={cn("h-1.5 bg-gradient-to-r", stripGrad)} />

      <div className="p-5">
        {/* Header row: title + status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-lg font-bold text-white leading-tight truncate">
              {party.title}
            </h3>
            <p className="mt-1 text-xs text-white/40">
              Hosted by {party.hostName}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border",
              statusMeta.bg,
              statusMeta.color,
            )}
          >
            <StatusIcon className="h-3 w-3" />
            {statusMeta.label}
          </span>
        </div>

        {/* Date / time / area row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/50">
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
              <span
                key={v}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                  VIBE_COLORS[v] || "bg-white/[0.04] text-white/40 border-white/[0.08]",
                )}
              >
                {v}
              </span>
            ))}
            {vibes.length > 4 && (
              <span className="text-[10px] text-white/30">+{vibes.length - 4}</span>
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
            <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.1em] text-white/30 font-medium">
                Ticket #{ticket.id.slice(-6).toUpperCase()}
              </p>
            </div>

            {/* Pre-order pills */}
            {addOns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {addOns.map((it) => (
                  <span
                    key={it.id}
                    className="rounded-full bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] text-amber-bright font-medium"
                  >
                    {it.emoji} {it.name} ×{it.quantity}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions row */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setSelectedPartyId(party.id);
              setScreen("detail");
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/[0.1] hover:text-white"
          >
            View Party
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setExpanded(!expanded)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-bright/15 border border-purple-bright/25 py-2.5 text-sm font-semibold text-purple-bright transition hover:bg-purple-bright/25"
          >
            <QrCode className="h-4 w-4" />
            {expanded ? "Hide QR" : "Show QR"}
          </motion.button>
        </div>
      </div>

      {/* ---- Expanded detail ---- */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-5 py-5 space-y-4">
              {/* Full-size QR */}
              <div className="flex flex-col items-center gap-3">
                <QRPlaceholder hash={ticket.qrHash} size={140} />
                <p className="text-xs text-white/40">
                  Scan this QR code at the door
                </p>
              </div>

              {/* Full order details */}
              {addOns.length > 0 && (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                  <h4 className="mb-2 text-[10px] uppercase tracking-[0.12em] text-white/40 font-semibold">
                    Your order at the door
                  </h4>
                  <ul className="space-y-2">
                    {addOns.map((it) => (
                      <li
                        key={it.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-white/80">
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
                </div>
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
                  <p className="text-xs text-white/40">
                    Approved by host · spot confirmed
                  </p>
                </div>
              </div>

              {/* CTA buttons */}
              <button
                onClick={() => toast.success("Show this to your host 🎟️")}
                className="vibe-gradient-bg flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(83,74,183,0.5)] hover:brightness-110 transition press-feedback"
              >
                <TicketIcon className="h-4 w-4" />
                Ready · show QR to host
              </button>

              <button
                onClick={openGroupChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.04] border border-purple-500/25 px-4 py-3 text-sm font-semibold text-white/80 transition hover:bg-purple-500/10 hover:text-purple-200"
              >
                <MessageCircle className="h-4 w-4 text-purple-bright" />
                Open group chat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ================================================================== */
/*  TICKETS SCREEN                                                     */
/* ================================================================== */

export function TicketsScreen() {
  const currentUser = useAppStore((s) => s.currentUser);

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
    <div className="flex h-full w-full max-w-[100vw] overflow-x-hidden flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 glass-strong border-b border-white/[0.06] px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center justify-between">
          <div>
            <span className="eyebrow">My Tickets</span>
            <h1 className="mt-0.5 font-display text-xl font-bold text-white">
              Show QR at the door
            </h1>
          </div>
          {tickets.length > 0 && (
            <span className="rounded-full bg-purple-bright/15 px-2.5 py-1 text-xs font-semibold text-purple-bright border border-purple-bright/25">
              {tickets.length} {tickets.length === 1 ? "ticket" : "tickets"}
            </span>
          )}
        </div>

        {/* Filter tabs */}
        {tickets.length > 0 && (
          <div className="mt-3 flex gap-1 rounded-xl bg-white/[0.04] p-1">
            {(["upcoming", "past"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-semibold uppercase tracking-[0.08em] transition-all duration-200",
                  filter === tab
                    ? "bg-purple-bright text-white shadow-lg shadow-purple/20"
                    : "text-white/40 hover:text-white/60",
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Scrollable body */}
      <div className="fancy-scrollbar w-full flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        {isLoading && (
          <>
            <TicketSkeleton />
            <TicketSkeleton />
          </>
        )}

        {!isLoading && isError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl coral-foil">
              <RefreshCw className="h-7 w-7 text-coral-bright" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-lg font-bold text-white">
                Couldn&apos;t load tickets
              </p>
              <p className="mx-auto max-w-xs text-sm text-white/50">
                Your connection might have dropped. Pull again.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="rounded-full bg-purple-bright px-5 py-2.5 text-sm font-semibold text-white hover:brightness-110 transition"
            >
              Retry
            </button>
          </motion.div>
        )}

        {!isLoading && !isError && tickets.length === 0 && <EmptyTickets />}

        {!isLoading &&
          !isError &&
          tickets.length > 0 &&
          filteredTickets.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center gap-3 py-12 text-center"
            >
              <p className="text-sm text-white/40">
                No {filter} tickets
              </p>
            </motion.div>
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
