"use client";

import { useState } from "react";
import { ArrowRight, Check, MapPin, Sparkles, PartyPopper, Crown, Users } from "lucide-react";
import { CITIES, VIBE_TAGS, VIBE_EMOJI } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = ["role", "city", "vibes", "done"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const setScreen = useAppStore((s) => s.setScreen);
  const setCityFilter = useAppStore((s) => s.setCityFilter);
  const setUserRole = useAppStore((s) => s.setUserRole);

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"host" | "partier" | null>(currentUser?.role ?? null);
  const [city, setCity] = useState<string>(currentUser?.city || "Mumbai");
  const [picks, setPicks] = useState<string[]>([]);

  const toggle = (v: string) =>
    setPicks((p) =>
      p.includes(v) ? p.filter((x) => x !== v) : [...p, v],
    );

  const finish = async () => {
    // persist role, city + vibe preferences to the user's profile
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

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-black px-6 pb-8 pt-[max(env(safe-area-inset-top),24px)] animate-screen-in">
      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const active = STEPS.indexOf(step) >= i;
          return (
            <span
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all",
                active ? "w-8 bg-amber-400" : "w-4 bg-white/15",
              )}
            />
          );
        })}
      </div>

      <div className="flex flex-1 flex-col justify-center">
        {step === "role" && (
          <div className="animate-slide-up space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400">
                <Sparkles className="h-8 w-8 text-black" />
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white">
                How will you <span className="text-amber-400">vibe?</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose your role — you can always change it later.
              </p>
            </div>

            <div className="space-y-3">
              {/* Host card */}
              <button
                onClick={() => setRole("host")}
                className={cn(
                  "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200",
                  role === "host"
                    ? "border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_24px_-4px_rgba(251,191,36,0.4)]"
                    : "border border-white/10 bg-card hover:border-amber-400/50 hover:bg-amber-400/5",
                )}
              >
                {role === "host" && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400">
                    <Check className="h-3.5 w-3.5 text-black" />
                  </span>
                )}
                <div className="flex items-start gap-4">
                  <span className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-colors",
                    role === "host"
                      ? "bg-amber-400/15 ring-amber-400/50"
                      : "bg-white/5 ring-white/10",
                  )}>
                    <Crown className={cn("h-6 w-6", role === "host" ? "text-amber-400" : "text-white/60")} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg">🎉</p>
                    <p className={cn(
                      "font-display text-lg font-bold",
                      role === "host" ? "text-amber-400" : "text-white",
                    )}>
                      I want to HOST parties
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Create and manage events, approve guests, earn vibes
                    </p>
                  </div>
                </div>
              </button>

              {/* Partier card */}
              <button
                onClick={() => setRole("partier")}
                className={cn(
                  "group relative w-full overflow-hidden rounded-2xl border p-5 text-left transition-all duration-200",
                  role === "partier"
                    ? "border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_24px_-4px_rgba(251,191,36,0.4)]"
                    : "border border-white/10 bg-card hover:border-amber-400/50 hover:bg-amber-400/5",
                )}
              >
                {role === "partier" && (
                  <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400">
                    <Check className="h-3.5 w-3.5 text-black" />
                  </span>
                )}
                <div className="flex items-start gap-4">
                  <span className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-xl ring-1 transition-colors",
                    role === "partier"
                      ? "bg-amber-400/15 ring-amber-400/50"
                      : "bg-white/5 ring-white/10",
                  )}>
                    <Users className={cn("h-6 w-6", role === "partier" ? "text-amber-400" : "text-white/60")} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg">🎊</p>
                    <p className={cn(
                      "font-display text-lg font-bold",
                      role === "partier" ? "text-amber-400" : "text-white",
                    )}>
                      I want to ATTEND parties
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Discover events, join the vibe, meet new people
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                if (role) setStep("city");
              }}
              disabled={!role}
              className={cn(
                "flex h-12 w-full items-center justify-center gap-1.5 rounded-xl font-semibold text-black transition active:scale-95",
                role
                  ? "bg-amber-400 vibe-pulse"
                  : "bg-white/10 text-white/30 cursor-not-allowed",
              )}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "city" && (
          <div className="animate-slide-up space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400">
                <MapPin className="h-8 w-8 text-black" />
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white">
                Let&apos;s set your <span className="text-amber-400">vibe</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick your city — we&apos;ll show parties near you first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CITIES.map((c) => {
                const isActive = city === c;
                return (
                  <button
                    key={c}
                    onClick={() => setCity(c)}
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-4 text-left transition press-feedback",
                      isActive
                        ? "border-2 border-amber-400 bg-amber-400/10"
                        : "border border-white/10 bg-card hover:border-amber-400/50",
                    )}
                  >
                    <span className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
                      isActive ? "bg-amber-400/15 ring-amber-400/50" : "bg-white/5 ring-white/10",
                    )}>
                      <MapPin className={cn("h-5 w-5", isActive ? "text-amber-400" : "text-white/60")} />
                    </span>
                    <p className={cn("mt-2 font-display text-lg font-bold", isActive ? "text-amber-400" : "text-white")}>
                      {c}
                    </p>
                    {isActive && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400">
                        <Check className="h-3 w-3 text-black" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("role")}
                className="h-12 flex-1 rounded-xl bg-card font-medium text-white/70 ring-1 ring-white/10 transition hover:ring-amber-400/40 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => setStep("vibes")}
                className="flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-amber-400 font-semibold text-black vibe-pulse transition active:scale-95"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "vibes" && (
          <div className="animate-slide-up space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400">
                <Sparkles className="h-8 w-8 text-black" />
              </div>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white">
                Your <span className="text-amber-400">vibe?</span>
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a few vibes you love. We&apos;ll tune your feed. (Optional)
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {VIBE_TAGS.map((v) => {
                const active = picks.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggle(v)}
                    className={cn(
                      "relative flex items-center gap-2 overflow-hidden rounded-2xl border px-3 py-3 text-sm font-semibold transition press-feedback",
                      active
                        ? "border-2 border-amber-400 bg-amber-400/15 text-amber-300"
                        : "border border-white/10 bg-white/5 text-white/60 hover:text-white hover:border-amber-400/40",
                    )}
                  >
                    <span className="relative text-2xl">{VIBE_EMOJI[v]}</span>
                    <span className="relative">{v}</span>
                    {active && (
                      <span className="relative ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-400">
                        <Check className="h-3 w-3 text-black" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("city")}
                className="h-12 flex-1 rounded-xl bg-card font-medium text-white/70 ring-1 ring-white/10 transition hover:ring-amber-400/40 hover:text-white"
              >
                Back
              </button>
              <button
                onClick={() => setStep("done")}
                className="flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl bg-amber-400 font-semibold text-black transition active:scale-95"
              >
                {picks.length > 0 ? "Looks good" : "Skip for now"}{" "}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="animate-slide-up space-y-5 text-center">
            <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400 vibe-pulse">
              <PartyPopper className="h-10 w-10 text-black" />
            </div>
            <div>
              <h1 className="font-display text-3xl font-extrabold leading-tight text-white">
                You&apos;re <span className="text-amber-400">all set!</span>
              </h1>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
                {picks.length > 0
                  ? `We've tuned your feed for ${city} with ${picks.length} vibe${picks.length > 1 ? "s" : ""}. Time to find your night out.`
                  : `We'll show you everything happening in ${city}. Let's go!`}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {picks.map((v) => (
                <span
                  key={v}
                  className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-300 ring-1 ring-amber-400/40"
                >
                  {VIBE_EMOJI[v]} {v}
                </span>
              ))}
              {picks.length === 0 && (
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-muted-foreground ring-1 ring-white/10">
                  All vibes welcome
                </span>
              )}
            </div>
            <button
              onClick={finish}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl bg-amber-400 font-semibold text-black vibe-pulse transition active:scale-95"
            >
              Enter VibeMatch <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
