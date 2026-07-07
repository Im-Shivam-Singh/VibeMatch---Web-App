"use client";

import { useState, useMemo } from "react";
import {
  ArrowRight,
  Check,
  MapPin,
  Sparkles,
  PartyPopper,
  Crown,
  Compass,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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

// ── Onboarding Screen ─────────────────────────────────────────────
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
  const [bouncingVibe, setBouncingVibe] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const toggle = (v: string) => {
    setPicks((p) =>
      p.includes(v) ? p.filter((x) => x !== v) : [...p, v]
    );
    setBouncingVibe(v);
    setTimeout(() => setBouncingVibe(null), 350);
  };

  const goNext = (nextStep: Step) => {
    setError(null);
    setStep(nextStep);
  };

  const goBack = (prevStep: Step) => {
    setError(null);
    setStep(prevStep);
  };

  // ── Step validation ──
  const validateStep = (): string | null => {
    switch (step) {
      case "role":
        return role === null ? "Please choose a role to continue" : null;
      case "vibes":
        return picks.length < 2 ? "Pick at least 2 vibes to continue" : null;
      case "city":
        return city.trim() === "" ? "Please enter your city" : null;
      case "done":
        return null;
    }
  };

  const canContinue = useMemo(() => {
    return validateStep() === null;
  }, [step, role, picks, city]);

  const handleContinue = () => {
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const nextIdx = stepIndex + 1;
    if (nextIdx < STEPS.length) {
      goNext(STEPS[nextIdx]);
    }
  };

  const finish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (currentUser) {
        await api.updateUser(currentUser.id, {
          city,
          vibePrefs: picks.join(","),
          role: role ?? undefined,
        });
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
    } catch {
      setError("Something went wrong saving your preferences. Tap to try again.");
      toast.error("Could not save preferences");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full overflow-x-hidden flex-col overflow-hidden bg-[#09080f]">
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
            const isCurrent = stepIndex === i;
            return (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  isCurrent
                    ? "w-8 bg-gradient-to-r from-purple-400 to-teal-400 animate-dot-pulse"
                    : isCompleted
                      ? "w-4 bg-purple-500"
                      : "w-4 bg-white/10"
                )}
              />
            );
          })}
        </div>

        {/* Step Content */}
        <div className="relative flex flex-1 flex-col justify-center overflow-hidden">
          {/* ──── Step 1: Role Selection ──── */}
          {step === "role" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_0_24px_-4px_rgba(127,119,221,0.5)]">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
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
                <Card
                  onClick={() => { setRole("host"); setError(null); }}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg",
                    role === "host"
                      ? "border-purple-400/70 bg-purple-500/10 shadow-[0_0_20px_-6px_rgba(127,119,221,0.3)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-purple-400/30 hover:bg-purple-500/5"
                  )}
                >
                  {role === "host" && (
                    <span className="animate-check-ring absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 z-10">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </span>
                  )}
                  <CardContent className="flex items-start gap-4 p-5">
                    <span
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                        role === "host"
                          ? "bg-gradient-to-br from-purple-500/20 to-purple-700/20 ring-1 ring-purple-400/40"
                          : "bg-white/[0.04] ring-1 ring-white/[0.08]"
                      )}
                    >
                      <Crown
                        className={cn(
                          "h-6 w-6 transition-colors duration-300",
                          role === "host" ? "text-purple-400" : "text-white/40"
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
                  </CardContent>
                </Card>

                {/* Partier Card */}
                <Card
                  onClick={() => { setRole("partier"); setError(null); }}
                  className={cn(
                    "group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg",
                    role === "partier"
                      ? "border-teal-400/70 bg-teal-500/10 shadow-[0_0_20px_-6px_rgba(20,184,166,0.3)]"
                      : "border-white/[0.08] bg-white/[0.02] hover:border-teal-400/30 hover:bg-teal-500/5"
                  )}
                >
                  {role === "partier" && (
                    <span className="animate-check-ring absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 z-10">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </span>
                  )}
                  <CardContent className="flex items-start gap-4 p-5">
                    <span
                      className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                        role === "partier"
                          ? "bg-gradient-to-br from-teal-500/20 to-teal-700/20 ring-1 ring-teal-400/40"
                          : "bg-white/[0.04] ring-1 ring-white/[0.08]"
                      )}
                    >
                      <Compass
                        className={cn(
                          "h-6 w-6 transition-colors duration-300",
                          role === "partier" ? "text-teal-400" : "text-white/40"
                        )}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg">🎊</p>
                      <p
                        className={cn(
                          "font-display text-lg font-bold transition-colors duration-300",
                          role === "partier" ? "text-teal-300" : "text-white"
                        )}
                      >
                        I want to ATTEND parties
                      </p>
                      <p className="mt-1 text-sm text-white/35">
                        Discover events, join the vibe, meet new people
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ──── Step 2: Vibe Preferences ──── */}
          {step === "vibes" && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-[0_0_20px_-4px_rgba(139,92,246,0.5)]">
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
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
                {VIBE_TAGS.map((v) => {
                  const active = picks.includes(v);
                  const style = VIBE_PILL_STYLES[v];
                  const isBouncing = bouncingVibe === v;
                  return (
                    <button
                      key={v}
                      onClick={() => { toggle(v); setError(null); }}
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
                        <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 rounded-full bg-white/20 hover:bg-white/20 text-[10px] flex items-center justify-center border-0">
                          <Check className="h-2.5 w-2.5 text-current" />
                        </Badge>
                      )}
                    </button>
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
            </div>
          )}

          {/* ──── Step 3: City Selection ──── */}
          {step === "city" && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-[0_0_20px_-4px_rgba(127,119,221,0.5)]">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
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

              {/* City Input */}
              <Card className="border-white/[0.08] bg-white/[0.02] rounded-2xl">
                <CardContent className="p-4 space-y-3">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <Input
                      type="text"
                      value={city}
                      onChange={(e) => { setCity(e.target.value); setError(null); }}
                      placeholder="Enter your city"
                      className="h-14 w-full rounded-xl border-white/[0.08] bg-white/[0.04] pl-10 pr-4 text-base font-medium text-white placeholder:text-white/25 focus:border-purple-400/50 focus:ring-2 focus:ring-purple-400/25"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          () => {
                            setCity("Current Location");
                            setError(null);
                          },
                          () => {
                            setError("Could not get your location. Please enter your city manually.");
                          }
                        );
                      }
                    }}
                    className="h-12 w-full gap-2 rounded-xl border-white/[0.08] bg-white/[0.02] text-white/40 hover:text-white/60 hover:border-purple-400/30 hover:bg-white/[0.04]"
                  >
                    <MapPin className="h-4 w-4" />
                    Use current location
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ──── Step 4: Done ──── */}
          {step === "done" && (
            <div className="space-y-5 text-center">
              <div className="relative mx-auto mb-2 flex h-20 w-20 items-center justify-center">
                <div className="animate-logo-pulse-ring absolute inset-0 rounded-3xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-500 via-purple-600 to-teal-600 shadow-[0_0_40px_-8px_rgba(127,119,221,0.7)]">
                  <PartyPopper className="h-10 w-10 text-white" />
                </div>
              </div>

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
                    <Badge
                      key={v}
                      variant="outline"
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        style?.bg,
                        style?.border,
                        style?.text
                      )}
                    >
                      {VIBE_EMOJI[v]} {v}
                    </Badge>
                  );
                })}
                {picks.length === 0 && (
                  <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.02] text-white/30">
                    All vibes welcome
                  </Badge>
                )}
              </div>

              {/* Error display */}
              {error && (
                <Card className="border-red-500/30 bg-red-500/10 rounded-2xl">
                  <CardContent className="flex items-center gap-3 p-4">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
                    <p className="text-sm text-red-200">{error}</p>
                  </CardContent>
                </Card>
              )}

              {/* Enter VibeMatch button */}
              <Button
                onClick={finish}
                disabled={submitting}
                className="btn-shimmer h-12 w-full gap-2 rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-teal-600 text-base font-bold text-white shadow-[0_0_24px_-6px_rgba(127,119,221,0.6)] hover:shadow-[0_0_32px_-4px_rgba(127,119,221,0.8)] transition-all active:scale-[0.97]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Setting up…
                  </>
                ) : (
                  <>
                    Enter VibeMatch <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Error Display (for steps 1-3) */}
        {error && step !== "done" && (
          <Card className="border-red-500/30 bg-red-500/10 rounded-2xl mt-4">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Bottom Navigation Bar */}
        <div className="mt-4 flex gap-2">
          {/* Back button */}
          {stepIndex > 0 && (
            <Button
              variant="outline"
              onClick={() => goBack(STEPS[stepIndex - 1])}
              className="h-12 flex-1 rounded-2xl border-white/[0.08] bg-white/[0.02] font-medium text-white/50 hover:text-white/80 hover:border-purple-400/30"
            >
              Back
            </Button>
          )}

          {/* Continue / Skip button */}
          {step !== "done" && (
            <Button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "flex h-12 items-center justify-center gap-1.5 rounded-2xl font-semibold transition-all duration-300",
                canContinue
                  ? "flex-[2] bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-white shadow-[0_0_20px_-6px_rgba(127,119,221,0.5)] hover:shadow-[0_0_28px_-4px_rgba(127,119,221,0.7)]"
                  : "flex-[2] bg-white/[0.04] text-white/20 cursor-not-allowed hover:bg-white/[0.04]"
              )}
            >
              {step === "vibes" && picks.length < 2
                ? `Pick ${2 - picks.length} more`
                : step === "vibes" && picks.length >= 2
                  ? "Looks good"
                  : "Continue"}
              {canContinue && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}

          {/* Skip option (for vibes step) */}
          {step === "vibes" && picks.length < 2 && (
            <Button
              variant="outline"
              onClick={() => {
                setPicks([]);
                goNext("city");
              }}
              className="h-12 flex-1 rounded-2xl border-white/[0.08] bg-white/[0.02] text-sm font-medium text-white/30 hover:text-white/50"
            >
              Skip for now
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
