"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, MapPin, Sparkles, PartyPopper } from "lucide-react";
import { CITIES, VIBE_TAGS, VIBE_EMOJI } from "@/lib/types";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STEPS = ["city", "vibes", "done"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingScreen() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const setScreen = useAppStore((s) => s.setScreen);
  const setCityFilter = useAppStore((s) => s.setCityFilter);

  const [step, setStep] = useState<Step>("city");
  const [city, setCity] = useState<string>(currentUser?.city || "Mumbai");
  const [picks, setPicks] = useState<string[]>([]);

  const toggle = (v: string) =>
    setPicks((p) =>
      p.includes(v) ? p.filter((x) => x !== v) : [...p, v],
    );

  const finish = async () => {
    // persist city + vibe preferences to the user's profile
    if (currentUser) {
      try {
        await api.updateUser(currentUser.id, {
          city,
          vibePrefs: picks.join(","),
        });
      } catch {
        /* non-blocking */
      }
    }
    setCityFilter(city);
    setOnboarded(true);
    setScreen("home");
    toast.success("You're all set! 🎉", {
      description: `Showing vibes in ${city}.`,
    });
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden px-6 pb-8 pt-[max(env(safe-area-inset-top),24px)]">
      {/* Background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-16 -right-10 h-64 w-64 rounded-full bg-pink/20 blur-3xl vibe-float" />
        <div className="absolute bottom-0 -left-16 h-64 w-64 rounded-full bg-violet/25 blur-3xl vibe-float" style={{ animationDelay: "0.8s" }} />
      </div>

      {/* Progress dots */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => {
          const active = STEPS.indexOf(step) >= i;
          return (
            <span
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all",
                active ? "w-8 vibe-gradient-bg" : "w-4 bg-border",
              )}
            />
          );
        })}
      </div>

      <div className="flex flex-1 flex-col justify-center">
        {step === "city" && (
          <div className="animate-slide-up space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl vibe-gradient-bg shadow-[0_12px_40px_-10px_rgba(236,72,153,0.6)]">
                <MapPin className="h-8 w-8 text-white" />
              </div>
              <h1 className="font-display text-2xl font-extrabold">
                Where do you <span className="vibe-gradient-text">party?</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick your city — we'll show parties near you first.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCity(c)}
                  className={cn(
                    "relative rounded-2xl border p-4 text-left transition",
                    city === c
                      ? "border-pink bg-pink/10 shadow-[0_8px_30px_-12px_rgba(236,72,153,0.5)]"
                      : "border-border/60 bg-card/40 hover:border-pink/40",
                  )}
                >
                  <MapPin
                    className={cn(
                      "h-5 w-5",
                      city === c ? "text-pink" : "text-muted-foreground",
                    )}
                  />
                  <p className="mt-2 font-display font-semibold">{c}</p>
                  {city === c && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full vibe-gradient-bg">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("vibes")}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl vibe-gradient-bg font-semibold shadow-[0_10px_30px_-8px_rgba(236,72,153,0.6)]"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === "vibes" && (
          <div className="animate-slide-up space-y-5">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl vibe-gradient-bg shadow-[0_12px_40px_-10px_rgba(236,72,153,0.6)]">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h1 className="font-display text-2xl font-extrabold">
                Your <span className="vibe-gradient-text">vibe?</span>
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a few vibes you love. We'll tune your feed. (Optional)
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              {VIBE_TAGS.map((v) => {
                const active = picks.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggle(v)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition",
                      active
                        ? "border-transparent vibe-gradient-bg text-white shadow-[0_6px_20px_-8px_rgba(236,72,153,0.6)]"
                        : "border-border/60 bg-card/40 text-muted-foreground hover:text-foreground hover:border-pink/40",
                    )}
                  >
                    <span>{VIBE_EMOJI[v]}</span>
                    {v}
                    {active && <Check className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("city")}
                className="h-12 flex-1 rounded-xl border border-border/60 bg-card/40 font-medium"
              >
                Back
              </button>
              <button
                onClick={() => setStep("done")}
                className="flex h-12 flex-[2] items-center justify-center gap-1.5 rounded-xl vibe-gradient-bg font-semibold"
              >
                {picks.length > 0 ? "Looks good" : "Skip for now"}{" "}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="animate-slide-up space-y-5 text-center">
            <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-3xl vibe-gradient-bg shadow-[0_15px_50px_-10px_rgba(236,72,153,0.7)] vibe-pulse">
              <PartyPopper className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold">
                You're <span className="vibe-gradient-text">all set!</span>
              </h1>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                {picks.length > 0
                  ? `We've tuned your feed for ${city} with ${picks.length} vibe${picks.length > 1 ? "s" : ""}. Time to find your night out.`
                  : `We'll show you everything happening in ${city}. Let's go!`}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {picks.map((v) => (
                <span
                  key={v}
                  className="rounded-full bg-card/60 border border-border/60 px-3 py-1 text-xs"
                >
                  {VIBE_EMOJI[v]} {v}
                </span>
              ))}
              {picks.length === 0 && (
                <span className="rounded-full bg-card/60 border border-border/60 px-3 py-1 text-xs text-muted-foreground">
                  All vibes welcome
                </span>
              )}
            </div>
            <button
              onClick={finish}
              className="flex h-12 w-full items-center justify-center gap-1.5 rounded-xl vibe-gradient-bg font-semibold shadow-[0_10px_30px_-8px_rgba(236,72,153,0.6)]"
            >
              Enter VibeMatch <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
