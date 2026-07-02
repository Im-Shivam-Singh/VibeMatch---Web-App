"use client";

import { useState, useEffect } from "react";
import { Phone, ArrowRight, ChevronLeft, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const fullPhone = phone.startsWith("+") ? phone : `+91${phone.replace(/^0+/, "")}`;

  async function sendOtp() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOtp(fullPhone);
      setDevOtp(res.devOtp);
      setTimeout(() => setStep("otp"), 150);
      toast.success("OTP sent!", {
        description: res.devOtp ? `Dev OTP: ${res.devOtp}` : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await api.verifyOtp(fullPhone, otp, name || undefined);
      login(res.user);
      toast.success(`Welcome, ${res.user.name}!`, {
        description: "You're in. Let's find a vibe.",
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-purple-950/40 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(168,85,247,0.08),transparent_50%)]" />

      {/* Animated orbs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-purple-500/10 blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-purple-500/8 blur-[100px]" />

      <div className={cn(
        "relative flex flex-1 flex-col justify-center px-6 pt-16 transition-all duration-500",
        animateIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}>
        {/* Brand / Logo */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-[0_0_40px_-8px_rgba(168,85,247,0.6)] vibe-pulse">
            <Sparkles className="h-12 w-12 text-white" />
          </div>
          <h1 className="font-display text-6xl font-extrabold tracking-tight bg-gradient-to-r from-purple-300 via-purple-400 to-purple-300 bg-clip-text text-transparent">
            VibeMatch
          </h1>
          <p className="mx-auto mt-3 max-w-xs text-base text-white/60">
            Find local parties. Connect with hosts. Build your night out.
          </p>
        </div>

        {/* Card — premium glass with glow */}
        <div
          className="rounded-3xl border border-purple-400/30 bg-white/[0.04] p-6 shadow-[0_0_30px_-10px_rgba(168,85,247,0.3)] backdrop-blur-xl"
        >
          <div className={cn(
            "transition-all duration-300",
            step === "otp" ? "animate-in fade-in-0 slide-in-from-right-4" : ""
          )}>
            {step === "phone" ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-300/90">
                    Enter your phone number
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-300/60 transition-colors group-focus-within:text-purple-400" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-purple-300/70">+91</span>
                    <Input
                      inputMode="numeric"
                      autoFocus
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      className="h-14 rounded-2xl border-white/10 bg-white/[0.06] pl-16 text-lg text-white outline-none placeholder:text-white/30 focus:border-purple-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-purple-400/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-purple-300/90">
                    Your name <span className="text-white/30">(optional)</span>
                  </label>
                  <Input
                    placeholder="What should hosts call you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-14 rounded-2xl border-white/10 bg-white/[0.06] text-lg text-white outline-none placeholder:text-white/30 focus:border-purple-400/60 focus:bg-white/[0.08] focus:ring-2 focus:ring-purple-400/20 transition-all"
                  />
                </div>

                <Button
                  onClick={sendOtp}
                  disabled={loading}
                  className="h-14 w-full rounded-2xl bg-gradient-to-r from-purple-400 to-purple-500 text-base font-bold text-white shadow-[0_0_20px_-4px_rgba(168,85,247,0.5)] transition-all active:scale-[0.98] hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.7)] hover:from-purple-400 hover:to-purple-500"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {loading ? "Sending…" : "Send OTP"}
                  {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={() => setStep("phone")}
                  className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" /> Change number
                </button>

                <div className="space-y-2 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-400/15">
                    <Phone className="h-6 w-6 text-purple-400" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Verify it&apos;s you
                  </h2>
                  <p className="text-sm text-white/50">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-purple-300">{fullPhone}</span>
                  </p>
                </div>

                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => setOtp(v)}
                  >
                    <InputOTPGroup className="gap-2.5">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="h-14 w-12 rounded-xl border border-purple-400/30 bg-white/[0.06] font-mono text-xl font-bold text-purple-300 shadow-[0_0_10px_-3px_rgba(168,85,247,0.15)] transition-all focus:border-purple-400/70 focus:shadow-[0_0_16px_-3px_rgba(168,85,247,0.4)]"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {devOtp && (
                  <p className="text-center text-xs text-white/40">
                    Dev OTP: <span className="font-mono text-purple-400">{devOtp}</span>
                  </p>
                )}

                <Button
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 6}
                  className="h-14 w-full rounded-2xl bg-gradient-to-r from-purple-400 to-purple-500 text-base font-bold text-white shadow-[0_0_20px_-4px_rgba(168,85,247,0.5)] transition-all active:scale-[0.98] hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.7)] disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  {loading ? "Verifying…" : "Verify & Continue"}
                  {!loading && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>

                <button
                  onClick={sendOtp}
                  className="block w-full text-center text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Didn&apos;t get it? <span className="font-medium text-purple-300/80">Resend OTP</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-white/30">
          <ShieldCheck className="h-3.5 w-3.5 text-purple-400/60" />
          By continuing, you agree to our{" "}
          <span className="text-purple-300/70">Terms</span> &{" "}
          <span className="text-purple-300/70">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
