"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Check,
  MapPin,
  MessageCircle,
  ArrowRight,
  Bell,
  Clock,
  CalendarClock,
  Navigation,
  Share2,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  countdownTo,
  formatDateLabel,
  formatTime,
  type Party,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type StepState = "done" | "active" | "pending";

interface TrackerStep {
  number: number;
  title: string;
  subtitle?: string;
}

const STEPS: TrackerStep[] = [
  { number: 1, title: "Spot confirmed", subtitle: "Receipt sent to email" },
  { number: 2, title: "Group chat unlocked", subtitle: "Meet everyone before arriving" },
  { number: 3, title: "Reminders coming", subtitle: "24hr + 2hr push notifications" },
  { number: 4, title: "Location drops day-of", subtitle: "Map pin at {time} on {day}" },
  { number: 5, title: "Arrive · scan QR · collect order" },
];

function stepStateFor(stepNumber: number, activeStep: number): StepState {
  if (stepNumber < activeStep) return "done";
  if (stepNumber === activeStep) return "active";
  return "pending";
}

function StepDot({ number, state }: { number: number; state: StepState }) {
  if (state === "done") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-500/20 shadow-[0_0_12px_-3px_rgba(29,158,117,0.4)]">
        <Check className="h-4 w-4 text-teal-300" strokeWidth={3} />
      </div>
    );
  }
  if (state === "active") {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20 shadow-[0_0_12px_-3px_rgba(83,74,183,0.4)] text-purple-200">
        <span className="text-xs font-bold">{number}</span>
      </div>
    );
  }
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-muted-foreground/40">
      <span className="text-xs font-medium">{number}</span>
    </div>
  );
}

function StepRow({ step, state, isLast }: { step: TrackerStep; state: StepState; isLast: boolean }) {
  const titleClass =
    state === "done" ? "text-foreground"
      : state === "active" ? "text-purple-200"
        : "text-muted-foreground/50";
  const subtitleClass =
    state === "active" ? "text-purple-300/60" : "text-muted-foreground/40";

  return (
    <li className="relative flex gap-3.5 pb-5 last:pb-0">
      <StepDot number={step.number} state={state} />
      {!isLast && (
        <span
          aria-hidden
          className={cn(
            "absolute left-[13.5px] top-7 h-[calc(100%-1.25rem)] w-px",
            state === "done" ? "bg-teal-500/25" : "bg-white/[0.06]",
          )}
        />
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className={cn("text-sm font-medium leading-tight", titleClass)}>
          {step.title}
        </p>
        {step.subtitle && (
          <p className={cn("mt-0.5 text-xs leading-snug", subtitleClass)}>
            {step.subtitle}
          </p>
        )}
      </div>
    </li>
  );
}

function CountdownSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-16 rounded-full bg-white/[0.06] animate-pulse" />
            <div className="h-4 w-32 rounded-lg bg-white/[0.06] animate-pulse" />
          </div>
          <div className="h-6 w-20 rounded-full bg-white/[0.06] animate-pulse" />
        </div>
      </header>
      <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        <div className="h-40 rounded-2xl bg-white/[0.03] animate-pulse" />
        <div className="h-20 rounded-2xl bg-white/[0.03] animate-pulse" />
        <div className="h-24 rounded-2xl bg-white/[0.03] animate-pulse" />
        <div className="h-44 rounded-2xl bg-white/[0.03] animate-pulse" />
      </div>
    </div>
  );
}

function EmptyState({ goBack }: { goBack: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <motion.button onClick={goBack} whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80">
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Countdown</span>
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-[0_0_30px_-8px_rgba(83,74,183,0.3)]">
          <CalendarClock className="h-7 w-7 text-purple-300" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">No party selected</h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          Pick a party from the feed to see what happens between paying and arriving.
        </p>
        <motion.button
          onClick={() => useAppStore.getState().setScreen("home")}
          whileTap={{ scale: 0.97 }}
          className="rounded-2xl bg-purple-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)]"
        >
          Browse parties
        </motion.button>
      </div>
    </div>
  );
}

export function CountdownScreen() {
  const id = useAppStore((s) => s.selectedPartyId);
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setScreen = useAppStore((s) => s.setScreen);

  const { data: partyData, isLoading, isError } = useQuery({
    queryKey: ["party", id],
    queryFn: () => api.getParty(id!),
    enabled: !!id,
  });

  const { data: ticketsData } = useQuery({
    queryKey: ["tickets", currentUser?.id],
    queryFn: () => api.listTickets(currentUser!.id),
    enabled: !!currentUser && !!id,
  });

  if (isLoading) return <CountdownSkeleton />;
  if (isError || !id || !partyData?.party) return <EmptyState goBack={goBack} />;

  const party: Party = partyData.party;
  const userTickets = ticketsData?.tickets ?? [];
  const hasTicket = userTickets.some((t) => t.partyId === id);

  const now = Date.now();
  const partyStart = new Date(`${party.date}T${party.time}:00`).getTime();
  const revealAt = party.locationRevealAt
    ? new Date(party.locationRevealAt).getTime()
    : partyStart - 3 * 3600 * 1000;

  let activeStep = 3;
  if (now > revealAt) activeStep = 5;
  else if (now > partyStart - 24 * 3600 * 1000) activeStep = 4;

  const msUntilReveal = revealAt - now;
  const hoursUntilReveal = Math.max(0, Math.ceil(msUntilReveal / 3_600_000));
  const revealDropped = msUntilReveal <= 0;

  const revealDate = new Date(revealAt);
  const revealHour = String(revealDate.getHours()).padStart(2, "0");
  const revealMin = String(revealDate.getMinutes()).padStart(2, "0");
  const revealTimeStr = formatTime(`${revealHour}:${revealMin}`);
  const revealDay = revealDate.toLocaleDateString("en-GB", { weekday: "short" });

  const steps = STEPS.map((s) =>
    s.number === 4 ? { ...s, subtitle: `Map pin at ${revealTimeStr} on ${revealDay}` } : s,
  );

  const guestCount = Math.max(1, (party.guestCount || 0) + 1);
  const partyCountdown = countdownTo(party.date, party.time);

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
          <motion.button onClick={goBack} whileTap={{ scale: 0.9 }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80">
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Countdown</span>
            <h1 className="truncate font-display text-base font-bold leading-tight text-foreground">{party.title}</h1>
          </div>
          <span className="shrink-0 rounded-lg border border-teal-500/25 bg-teal-500/[0.08] px-3 py-1 text-xs font-medium text-teal-300">
            {partyCountdown}
          </span>
        </div>
      </motion.header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        {/* No-ticket banner */}
        {!hasTicket && currentUser && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <Bell className="h-4 w-4 text-amber-300" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-amber-200">
                  You haven&apos;t secured a spot yet
                </p>
                <p className="text-xs text-muted-foreground">
                  This is a preview. Grab a spot to unlock reminders, the group chat, and the day-of location drop.
                </p>
                <button
                  onClick={() => setScreen("detail")}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-500/15 border border-amber-500/25 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-500/25"
                >
                  View party & get a spot
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Step tracker */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">Your night, mapped</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40">Step {activeStep}/5</span>
          </div>
          <ol className="relative">
            {steps.map((step, i) => (
              <StepRow
                key={step.number}
                step={step}
                state={stepStateFor(step.number, activeStep)}
                isLast={i === steps.length - 1}
              />
            ))}
          </ol>
        </motion.section>

        {/* Location-drop alert */}
        {!revealDropped && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-2xl border border-coral/20 bg-coral/[0.06] p-4"
          >
            <div className="flex items-start gap-3">
              <span className="text-base leading-none mt-0.5">📍</span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-semibold text-orange-200">
                  Location drops in {hoursUntilReveal} {hoursUntilReveal === 1 ? "hour" : "hours"}
                </p>
                <p className="text-xs leading-snug text-orange-300/50">
                  Map pin will appear in your group chat at {revealTimeStr} on {revealDay}. Only visible to confirmed guests.
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* Location card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-4"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 shadow-[0_0_16px_-4px_rgba(83,74,183,0.2)]">
              <MapPin className="h-5 w-5 text-purple-300" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-purple-200">
                {party.area}{party.city ? `, ${party.city}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {revealDropped ? "Exact address is in your group chat" : "Exact address arriving soon"}
              </p>
              <button
                onClick={() => setScreen("map")}
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-purple-500/15 border border-purple-500/25 px-3 py-1.5 text-xs font-semibold text-purple-200 transition hover:bg-purple-500/25"
              >
                <Navigation className="h-3.5 w-3.5" />
                Get directions
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.section>

        {/* Party chat preview */}
        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          onClick={() => setScreen("inbox")}
          className="block w-full rounded-2xl border border-purple-500/20 bg-purple-500/[0.06] p-4 text-left"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-300" />
              <span className="text-sm font-semibold text-foreground">Party chat · {guestCount} people 🔥</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-purple-300/60">Tap to open</span>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-end gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[10px] font-bold text-amber-200">R</div>
              <div className="max-w-[78%] rounded-[4px_12px_12px_12px] bg-white/[0.06] px-3 py-2 text-sm text-foreground">
                Anyone else getting hyped?? 🎵
              </div>
            </div>
            <div className="flex items-end justify-end gap-2">
              <div className="max-w-[78%] rounded-[12px_4px_12px_12px] bg-purple-500/30 px-3 py-2 text-sm text-purple-100">
                So ready for this 🙌
              </div>
            </div>
          </div>
          <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 opacity-70">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="flex-1 text-xs text-muted-foreground">
              {formatDateLabel(party.date)} · {formatTime(party.time)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </motion.button>

        {/* Invite friends */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: party.title,
                text: `Join me at ${party.title} on ${formatDateLabel(party.date)}! 🎉`,
              }).catch(() => {});
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-muted-foreground transition hover:text-foreground hover:bg-white/[0.06]"
        >
          <Share2 className="h-4 w-4" />
          Invite friends
        </motion.button>
      </div>
    </div>
  );
}
