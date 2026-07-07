"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  MapPin,
  Sparkles,
  PartyPopper,
  Crown,
  Compass,
} from "lucide-react";
import { VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = ["role", "vibes", "city", "done"] as const;
type Step = (typeof STEPS)[number];

// Vibe-specific unique color mapping (per vibe pill)
const VIBE_PILL_STYLES: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  "R&B":       { bg: "bg-purple-500/15",  border: "border-purple-500/40", text: "text-purple-300", glow: "shadow-[0_0_12px_-4px_rgba(127,119,221,0.4)]" },
  Bollywood:   { bg: "bg-emerald-500/15",  border: "border-emerald-500/40", text: "text-emerald-300", glow: "shadow-[0_0_12px_-4px_rgba(16,185,129,0.4)]" },
  Games:       { bg: "bg-teal-500/15",     border: "border-teal-500/40", text: "text-teal-300", glow: "shadow-[0_0_12px_-4px_rgba(20,184,166,0.4)]" },
  "Lo-fi":     { bg: "bg-violet-500/15",   border: "border-violet-500/40", text: "text-violet-300", glow: "shadow-[0_0_12px_-4px_rgba(139,92,246,0.4)]" },
  Chill:       { bg: "bg-cyan-500/15",     border: "border-cyan-500/40", text: "text-cyan-300", glow: "shadow-[0_0_12px_-4px_rgba(6,182,212,0.4)]" },
  EDM:         { bg: "bg-amber-500/15",    border: "border-amber-500/40", text: "text-amber-300", glow: "shadow-[0_0_12px_-4px_rgba(245,158,11,0.4)]" },
  Retro:       { bg: "bg-pink-500/15",     border: "border-pink-500/40", text: "text-pink-300", glow: "shadow-[0_0_12px_-4px_rgba(236,72,153,0.4)]" },
};

// ── Slide transition variants ─────────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 60 : -60,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 60 : -60,
    opacity: 0,
  }),
};

// ── Onboarding Screen ─────────────────────────────────────────────────────
export function OnboardingScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const setScreen = useAppStore((s) => s.setScreen);
  const setCityFilter = useAppStore((s) => s.setCityFilter);
  const setUserRole = useAppStore((s) => s.setUserRole);

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"host" | "partier" | null>(
    currentUser?.role ?? null
  );
  const [city, setCity] = useState<string>(currentUser?.city || "");
  const [picks, setPicks] = useState<string[]>([]);
  const [direction, setDirection] = useState(1);
  const [bouncingVibe, setBouncingVibe] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const toggle = (v: string) => {
    setPicks((p) =>
      p.includes(v) ? p.filter((x) => x !== v) : [...p, v]
    );
    // Trigger bounce animation
    setBouncingVibe(v);
    setTimeout(() => setBouncingVibe(null), 350);
  };

  const goNext = (nextStep: Step) => {
    setDirection(1);
    setStep(nextStep);
  };

  const goBack = (prevStep: Step) => {
    setDirection(-1);
    setStep(prevStep);
  };

  const finish = async () => {
    if (currentUser) {
      try {
        await api.updateUser(currentUser.id, {
          city,
          vibePrefs: picks.join(","),
          role: role ?? undefined,
        });
      } catch {
        /* non-blocking */
      }
    }
    if (role) {
      setUserRole(role);
    }
    setCityFilter(city);
    setOnboarded(true);
    setScreen("home");
    toast.success("You're all set! 🎉", {
      description: `Showing vibes in ${city}.`,
    });
  };

  const canContinue = useMemo(() => {
    switch (step) {
      case "role":
        return role !== null;
      case "vibes":
        return picks.length >= 2;
      case "city":
        return city !== "";
      case "done":
        return true;
    }
  }, [step, role, picks, city]);

  const handleContinue = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      goNext(STEPS[nextIdx]);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex-col overflow-hidden bg-[#09080f]">
      {/* Background ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-bokeh-1 absolute -left-20 top-[10%] h-72 w-72 rounded-full bg-purple-500/[0.06] blur-[100px]" />
        <div className="animate-bokeh-2 absolute -right-20 bottom-[15%] h-56 w-56 rounded-full bg-teal-400/[0.05] blur-[80px]" />
        <div className="animate-bokeh-3 absolute left-[30%] top-[60%] h-40 w-40 rounded-full bg-purple-400/[0.04] blur-[60px]" />
      </div>

      {/* Safe area top padding */}
      <div className="relative z-10 flex flex-1 flex-col px-4 sm:px-6 pb-8 pt-[max(env(safe-area-inset-top),20px)]">
        {/* Progress Dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {STEPS.map((s, i) => {
            const isCompleted = stepIndex > i;
            const isActive = stepIndex >= i;
            const isCurrent = stepIndex === i;
            return (
              <motion.div
                key={s}
                initial={false}
                animate={{
                  width: isCurrent ? 32 : isCompleted ? 24 : 12,
                  backgroundColor: isActive
                    ? "rgba(127, 119, 221, 1)"
                    : "rgba(255, 255, 255, 0.1)",
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "h-1.5 rounded-full",
                  isCurrent && "animate-dot-pulse"
                )}
              />
            );
          })}
        </div>

        {/* Step Content with slide transitions */}
        <div className="relative flex flex-1 flex-col justify-center overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {/* ──── Step 1: Role Selection ──── */}
            {step === "role" && (
              <motion.div
                key="role"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="space-y-6"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: 0.1,
                    }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_0_24px_-4px_rgba(127,119,221,0.5)]"
                  >
                    <Sparkles className="h-8 w-8 text-white" />
                  </motion.div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">
                    How will you{" "}
                    <span className="bg-gradient-to-r from-purple-300 to-teal-300 bg-clip-text text-transparent">
                      vibe?
                    </span>
                  </h2>
                  <p className="mt-2 text-sm text-white/40">
                    Choose your role — you can always change it later.
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Host Card */}
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => setRole("host")}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
                      role === "host"
                        ? "border-2 border-purple-400/70 bg-purple-500/10 card-glow-purple"
                        : "border border-white/[0.08] bg-white/[0.02] hover:border-purple-400/30 hover:bg-purple-500/5"
                    )}
                  >
                    {role === "host" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="animate-check-ring absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500"
                      >
                        <Check className="h-3.5 w-3.5 text-white" />
                      </motion.span>
                    )}
                    <div className="flex items-start gap-4">
                      <span
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300",
                          role === "host"
                            ? "bg-gradient-to-br from-purple-500/20 to-purple-700/20 ring-1 ring-purple-400/40"
                            : "bg-white/[0.04] ring-1 ring-white/[0.08]"
                        )}
                      >
                        <Crown
                          className={cn(
                            "h-6 w-6 transition-colors duration-300",
                            role === "host"
                              ? "text-purple-400"
                              : "text-white/40"
                          )}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg">🎉</p>
                        <p
                          className={cn(
                            "font-display text-lg font-bold transition-colors duration-300",
                            role === "host" ? "text-purple-300" : "text-white"
                          )}
                        >
                          I want to HOST parties
                        </p>
                        <p className="mt-1 text-sm text-white/35">
                          Create and manage events, approve guests, earn vibes
                        </p>
                      </div>
                    </div>
                    {/* Purple gradient overlay when selected */}
                    {role === "host" && (
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent" />
                    )}
                  </motion.button>

                  {/* Partier Card */}
                  <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    onClick={() => setRole("partier")}
                    className={cn(
                      "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300",
                      role === "partier"
                        ? "border-2 border-teal-400/70 bg-teal-500/10 card-glow-teal"
                        : "border border-white/[0.08] bg-white/[0.02] hover:border-teal-400/30 hover:bg-teal-500/5"
                    )}
                  >
                    {role === "partier" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="animate-check-ring absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500"
                      >
                        <Check className="h-3.5 w-3.5 text-white" />
                      </motion.span>
                    )}
                    <div className="flex items-start gap-4">
                      <span
                        className={cn(
                          "flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-300",
                          role === "partier"
                            ? "bg-gradient-to-br from-teal-500/20 to-teal-700/20 ring-1 ring-teal-400/40"
                            : "bg-white/[0.04] ring-1 ring-white/[0.08]"
                        )}
                      >
                        <Compass
                          className={cn(
                            "h-6 w-6 transition-colors duration-300",
                            role === "partier"
                              ? "text-teal-400"
                              : "text-white/40"
                          )}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg">🎊</p>
                        <p
                          className={cn(
                            "font-display text-lg font-bold transition-colors duration-300",
                            role === "partier"
                              ? "text-teal-300"
                              : "text-white"
                          )}
                        >
                          I want to ATTEND parties
                        </p>
                        <p className="mt-1 text-sm text-white/35">
                          Discover events, join the vibe, meet new people
                        </p>
                      </div>
                    </div>
                    {/* Teal gradient overlay when selected */}
                    {role === "partier" && (
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent" />
                    )}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ──── Step 2: Vibe Preferences ──── */}
            {step === "vibes" && (
              <motion.div
                key="vibes"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="space-y-5"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-[0_0_20px_-4px_rgba(139,92,246,0.5)]"
                  >
                    <Sparkles className="h-7 w-7 text-white" />
                  </motion.div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">
                    Pick your{" "}
                    <span className="bg-gradient-to-r from-violet-300 to-purple-300 bg-clip-text text-transparent">
                      vibes
                    </span>
                  </h2>
                  <p className="mt-2 text-sm text-white/40">
                    Choose at least 2 vibes you love — we&apos;ll tune your feed.
                  </p>
                </div>

                {/* Vibe Pills */}
                <div className="flex flex-wrap justify-center gap-2.5">
                  {VIBE_TAGS.map((v, i) => {
                    const active = picks.includes(v);
                    const style = VIBE_PILL_STYLES[v];
                    const isBouncing = bouncingVibe === v;
                    return (
                      <motion.button
                        key={v}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{
                          delay: i * 0.05,
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        onClick={() => toggle(v)}
                        className={cn(
                          "relative flex items-center gap-2 overflow-hidden rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-300",
                          active
                            ? `${style.bg} ${style.border} ${style.text} ${style.glow}`
                            : "border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white/60 hover:border-white/15",
                          isBouncing && "animate-vibe-bounce"
                        )}
                      >
                        <span className="text-lg">{VIBE_EMOJI[v]}</span>
                        <span>{v}</span>
                        {active && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 15,
                            }}
                            className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/20"
                          >
                            <Check className="h-2.5 w-2.5 text-current" />
                          </motion.span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Hint */}
                <p
                  className={cn(
                    "text-center text-xs transition-colors duration-300",
                    picks.length >= 2
                      ? "text-teal-400/60"
                      : "text-white/20"
                  )}
                >
                  {picks.length >= 2
                    ? `${picks.length} vibes selected — nice!`
                    : `Pick at least 2 vibes (${picks.length}/2)`}
                </p>
              </motion.div>
            )}

            {/* ──── Step 3: City Selection ──── */}
            {step === "city" && (
              <motion.div
                key="city"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="space-y-5"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                    }}
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_0_20px_-4px_rgba(127,119,221,0.5)]"
                  >
                    <MapPin className="h-7 w-7 text-white" />
                  </motion.div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">
                    Where are you{" "}
                    <span className="bg-gradient-to-r from-purple-300 to-teal-300 bg-clip-text text-transparent">
                      based?
                    </span>
                  </h2>
                  <p className="mt-2 text-sm text-white/40">
                    We&apos;ll show parties near you first.
                  </p>
                </div>

                {/* City Text Input */}
                <div className="space-y-3">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Enter your city"
                      className="h-14 w-full rounded-2xl border border-white/[0.08] bg-white/[0.04] pl-11 pr-4 text-base font-medium text-white placeholder:text-white/25 focus:border-purple-400/50 focus:outline-none focus:ring-2 focus:ring-purple-400/25 transition-all"
                    />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          () => {
                            setCity("Current Location");
                          },
                          () => {
                            toast.error("Could not get your location");
                          }
                        );
                      }
                    }}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-sm font-medium text-white/40 transition-all hover:border-purple-400/30 hover:text-white/60 active:scale-[0.97]"
                  >
                    <MapPin className="h-4 w-4" />
                    Use current location
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ──── Step 4: Done ──── */}
            {step === "done" && (
              <motion.div
                key="done"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: 0.35,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="space-y-5 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 15,
                    delay: 0.1,
                  }}
                  className="relative mx-auto mb-2 flex h-20 w-20 items-center justify-center"
                >
                  <div className="animate-logo-pulse-ring absolute inset-0 rounded-3xl" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 via-purple-600 to-teal-600 shadow-[0_0_40px_-8px_rgba(127,119,221,0.7)]">
                    <PartyPopper className="h-10 w-10 text-white" />
                  </div>
                </motion.div>

                <div>
                  <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">
                    You&apos;re{" "}
                    <span className="bg-gradient-to-r from-purple-300 to-teal-300 bg-clip-text text-transparent">
                      all set!
                    </span>
                  </h2>
                  <p className="mx-auto mt-2 max-w-xs text-sm text-white/40">
                    {picks.length > 0
                      ? `We've tuned your feed for ${city} with ${picks.length} vibe${picks.length > 1 ? "s" : ""}. Time to find your night out.`
                      : `We'll show you everything happening in ${city}. Let's go!`}
                  </p>
                </div>

                {/* Selected vibe tags */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {picks.map((v) => {
                    const style = VIBE_PILL_STYLES[v];
                    return (
                      <span
                        key={v}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium",
                          style?.bg,
                          style?.border,
                          style?.text
                        )}
                      >
                        {VIBE_EMOJI[v]} {v}
                      </span>
                    );
                  })}
                  {picks.length === 0 && (
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-xs text-white/30">
                      All vibes welcome
                    </span>
                  )}
                </div>

                {/* Enter VibeMatch button */}
                <motion.button
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                  onClick={finish}
                  className="btn-shimmer flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-teal-600 text-base font-bold text-white shadow-[0_0_24px_-6px_rgba(127,119,221,0.6)] transition-all active:scale-[0.97] hover:shadow-[0_0_32px_-4px_rgba(127,119,221,0.8)]"
                >
                  Enter VibeMatch <ArrowRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Bar */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="mt-4 flex gap-2"
        >
          {/* Back button (not on first step) */}
          {stepIndex > 0 && (
            <button
              onClick={() => goBack(STEPS[stepIndex - 1])}
              className="h-12 flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] font-medium text-white/50 transition-all hover:border-purple-400/30 hover:text-white/80 active:scale-[0.97]"
            >
              Back
            </button>
          )}

          {/* Continue / Skip button */}
          {step !== "done" && (
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "flex h-12 items-center justify-center gap-1.5 rounded-2xl font-semibold transition-all duration-300 active:scale-[0.97]",
                canContinue
                  ? "flex-[2] bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white shadow-[0_0_20px_-6px_rgba(127,119,221,0.5)] hover:shadow-[0_0_28px_-4px_rgba(127,119,221,0.7)]"
                  : "flex-[2] bg-white/[0.04] text-white/20 cursor-not-allowed"
              )}
            >
              {step === "vibes" && picks.length < 2
                ? `Pick ${2 - picks.length} more`
                : step === "vibes" && picks.length >= 2
                  ? "Looks good"
                  : "Continue"}
              {canContinue && <ArrowRight className="h-4 w-4" />}
            </button>
          )}

          {/* Skip option (for vibes step) */}
          {step === "vibes" && picks.length < 2 && (
            <button
              onClick={handleContinue}
              className="h-12 flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-sm font-medium text-white/30 transition-all hover:text-white/50 active:scale-[0.97]"
            >
              Skip for now
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
