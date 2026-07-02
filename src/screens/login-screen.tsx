"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

// ── Floating Bokeh Particles (CSS-driven, rendered as divs) ──────────────
function BokehParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Large purple orb */}
      <div className="animate-bokeh-1 absolute -left-16 top-[8%] h-64 w-64 rounded-full bg-purple-500/[0.07] blur-[80px]" />
      {/* Teal orb */}
      <div className="animate-bokeh-2 absolute right-[-10%] top-[25%] h-48 w-48 rounded-full bg-teal-400/[0.06] blur-[70px]" />
      {/* Small bright purple */}
      <div className="animate-bokeh-3 absolute bottom-[20%] left-[10%] h-36 w-36 rounded-full bg-purple-400/[0.09] blur-[60px]" />
      {/* Dim coral */}
      <div className="animate-bokeh-4 absolute bottom-[5%] right-[15%] h-40 w-40 rounded-full bg-pink-400/[0.05] blur-[64px]" />
      {/* Tiny bright accent */}
      <div className="animate-bokeh-1 absolute left-[60%] top-[5%] h-20 w-20 rounded-full bg-purple-300/[0.1] blur-[40px]" />
      <div className="animate-bokeh-3 absolute left-[20%] bottom-[45%] h-24 w-24 rounded-full bg-teal-300/[0.06] blur-[50px]" />

      {/* CSS-only bokeh circles (no blur — small bright dots) */}
      <div className="animate-bokeh-2 absolute left-[15%] top-[18%] h-2 w-2 rounded-full bg-purple-300/30" />
      <div className="animate-bokeh-4 absolute left-[70%] top-[12%] h-1.5 w-1.5 rounded-full bg-teal-300/25" />
      <div className="animate-bokeh-1 absolute left-[45%] top-[55%] h-1 w-1 rounded-full bg-purple-200/20" />
      <div className="animate-bokeh-3 absolute left-[80%] bottom-[35%] h-2 w-2 rounded-full bg-pink-300/20" />
      <div className="animate-bokeh-2 absolute left-[30%] bottom-[15%] h-1.5 w-1.5 rounded-full bg-purple-300/25" />
    </div>
  );
}

// ── Animated Mesh Gradient Background ─────────────────────────────────────
function MeshGradient() {
  return (
    <div className="absolute inset-0 animate-mesh-gradient bg-gradient-to-br from-[#0a0612] via-[#160e30] via-40% to-[#0a1212]" />
  );
}

// ── Staggered tagline words ───────────────────────────────────────────────
function StaggeredTagline({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span className="inline-flex flex-wrap justify-center gap-x-1.5">
      {words.map((word, i) => (
        <span
          key={i}
          className="animate-word"
          style={{ animationDelay: `${0.3 + i * 0.1}s` }}
        >
          {word}
        </span>
      ))}
    </span>
  );
}

// ── Loading dots ──────────────────────────────────────────────────────────
function LoadingDots() {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="loading-dot" />
      <span className="loading-dot" />
      <span className="loading-dot" />
    </span>
  );
}

// ── Main Login Screen ─────────────────────────────────────────────────────
export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [shakePhone, setShakePhone] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const fullPhone = phone.startsWith("+")
    ? phone
    : `+91${phone.replace(/^0+/, "")}`;

  // Resend countdown
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Auto-verify OTP when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && step === "otp") {
      // Small delay for visual satisfaction
      const t = setTimeout(verifyOtp, 400);
      return () => clearTimeout(t);
    }
  }, [otp]);

  const sendOtp = useCallback(async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) {
      setShakePhone(true);
      setTimeout(() => setShakePhone(false), 500);
      toast.error("Enter a valid 10-digit phone number");
      return;
    }
    setLoading(true);
    try {
      const res = await api.sendOtp(fullPhone);
      setDevOtp(res.devOtp);
      setResendCountdown(30);
      setTimeout(() => setStep("otp"), 200);
      toast.success("OTP sent!", {
        description: res.devOtp ? `Dev OTP: ${res.devOtp}` : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }, [phone, fullPhone]);

  async function verifyOtp() {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await api.verifyOtp(fullPhone, otp, name || undefined);
      // Show success animation briefly
      setOtpSuccess(true);
      setTimeout(() => {
        login(res.user);
        toast.success(`Welcome, ${res.user.name}!`, {
          description: "You're in. Let's find a vibe.",
        });
      }, 600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden">
      {/* Animated mesh gradient bg */}
      <MeshGradient />

      {/* Radial top glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-5%,rgba(127,119,221,0.18),transparent)]" />
      {/* Radial bottom glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_105%,rgba(93,202,165,0.06),transparent)]" />

      {/* Floating bokeh particles */}
      <BokehParticles />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 pt-12 pb-8">
        {/* Logo + Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 text-center"
        >
          {/* Logo icon with pulse ring */}
          <div className="relative mx-auto mb-5 flex h-20 w-20 items-center justify-center">
            {/* Outer pulse ring */}
            <div className="animate-logo-pulse-ring absolute inset-0 rounded-2xl" />
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 to-teal-400/10 blur-xl" />
            {/* Logo surface */}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 shadow-[0_0_40px_-8px_rgba(127,119,221,0.7)]">
              <Sparkles className="h-10 w-10 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]" />
            </div>
          </div>

          {/* VibeMatch heading with gradient shimmer */}
          <h1
            className="font-display text-5xl font-extrabold tracking-tight animate-gradient-text bg-gradient-to-r from-purple-300 via-purple-200 to-teal-300 bg-clip-text text-transparent"
            style={{ backgroundSize: "200% auto" }}
          >
            VibeMatch
          </h1>

          {/* Staggered tagline */}
          <p className="mx-auto mt-3 max-w-[260px] text-sm leading-relaxed text-white/50">
            <StaggeredTagline text="Find local parties. Connect with hosts. Build your night out." />
          </p>
        </motion.div>

        {/* Premium Glass Card */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="glass-premium rounded-3xl p-6"
        >
          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5"
              >
                {/* Phone input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-purple-300/80">
                    Phone Number
                  </label>
                  <div
                    className={cn(
                      "relative group transition-all duration-300",
                      shakePhone && "animate-shake"
                    )}
                  >
                    <Phone
                      className={cn(
                        "absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300",
                        phoneFocused
                          ? "text-purple-400"
                          : "text-white/30"
                      )}
                    />
                    {/* Country code badge */}
                    <div className="absolute left-10 top-1/2 -translate-y-1/2 flex items-center">
                      <span className="text-sm font-semibold text-purple-300/70">
                        +91
                      </span>
                      <span className="mx-2 h-4 w-px bg-white/10" />
                    </div>
                    <Input
                      inputMode="numeric"
                      autoFocus
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      onFocus={() => setPhoneFocused(true)}
                      onBlur={() => setPhoneFocused(false)}
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      className={cn(
                        "h-14 rounded-2xl border bg-white/[0.04] pl-[6.5rem] pr-4 text-lg text-white outline-none placeholder:text-white/25 transition-all duration-300",
                        phoneFocused
                          ? "border-purple-400/60 bg-white/[0.07] input-glow-focus"
                          : "border-white/[0.08] hover:border-white/15"
                      )}
                    />
                  </div>
                </div>

                {/* Name input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-purple-300/80">
                    Your Name{" "}
                    <span className="normal-case tracking-normal text-white/30 font-normal">
                      (optional)
                    </span>
                  </label>
                  <div className="relative group">
                    <User
                      className={cn(
                        "absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300",
                        nameFocused
                          ? "text-purple-400"
                          : "text-white/30"
                      )}
                    />
                    <Input
                      placeholder="What should hosts call you?"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      className={cn(
                        "h-14 rounded-2xl border bg-white/[0.04] pl-11 pr-4 text-lg text-white outline-none placeholder:text-white/25 transition-all duration-300",
                        nameFocused
                          ? "border-purple-400/60 bg-white/[0.07] input-glow-focus"
                          : "border-white/[0.08] hover:border-white/15"
                      )}
                    />
                  </div>
                </div>

                {/* Send OTP button */}
                <Button
                  onClick={sendOtp}
                  disabled={loading}
                  className="btn-shimmer h-14 w-full rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-base font-bold text-white shadow-[0_0_24px_-6px_rgba(127,119,221,0.6)] transition-all duration-300 active:scale-[0.97] hover:shadow-[0_0_32px_-4px_rgba(127,119,221,0.8)] hover:from-purple-500 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      Sending <LoadingDots />
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Send OTP <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                {/* Back button */}
                <button
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setOtpSuccess(false);
                  }}
                  className="inline-flex items-center gap-1 text-sm text-white/40 transition-colors hover:text-white/70"
                >
                  <ChevronLeft className="h-4 w-4" /> Change number
                </button>

                {/* Verify header */}
                <div className="space-y-2 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      delay: 0.1,
                    }}
                    className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-400/15"
                  >
                    <Phone className="h-6 w-6 text-purple-400" />
                  </motion.div>
                  <h2 className="font-display text-2xl font-bold text-white">
                    Verify it&apos;s you
                  </h2>
                  <p className="text-sm text-white/40">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-purple-300">
                      {fullPhone}
                    </span>
                  </p>
                </div>

                {/* OTP Input */}
                <div className="flex justify-center py-2">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      setOtpSuccess(false);
                    }}
                  >
                    <InputOTPGroup className="gap-2.5">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className={cn(
                            "h-14 w-11 rounded-xl border font-mono text-xl font-bold transition-all duration-300 sm:w-12",
                            otpSuccess
                              ? "otp-slot-success border-teal-400/60 bg-teal-400/10 text-teal-300 shadow-[0_0_16px_-3px_rgba(29,158,117,0.4)]"
                              : "border-purple-400/30 bg-white/[0.05] text-purple-300 shadow-[0_0_10px_-3px_rgba(127,119,221,0.12)] focus:border-purple-400/70 focus:bg-white/[0.08] focus:shadow-[0_0_16px_-3px_rgba(127,119,221,0.4)]"
                          )}
                          style={{
                            animation: `otp-slot-enter 0.35s cubic-bezier(0.22, 1, 0.36, 1) ${
                              i * 0.06
                            }s both`,
                          }}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* Dev OTP */}
                {devOtp && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-[11px] text-white/25"
                  >
                    Dev OTP:{" "}
                    <span className="font-mono text-purple-400/70">
                      {devOtp}
                    </span>
                  </motion.p>
                )}

                {/* Verify button */}
                <Button
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 6}
                  className="btn-shimmer h-14 w-full rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-base font-bold text-white shadow-[0_0_24px_-6px_rgba(127,119,221,0.6)] transition-all duration-300 active:scale-[0.97] hover:shadow-[0_0_32px_-4px_rgba(127,119,221,0.8)] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      Verifying <LoadingDots />
                    </span>
                  ) : otpSuccess ? (
                    <span className="flex items-center gap-2 text-teal-300">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Verify & Continue{" "}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                {/* Resend OTP */}
                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <p className="text-sm text-white/30">
                      Resend in{" "}
                      <span className="font-mono text-purple-300/60">
                        {resendCountdown}s
                      </span>
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        sendOtp();
                      }}
                      className="text-sm text-white/40 transition-colors hover:text-white/70"
                    >
                      Didn&apos;t get it?{" "}
                      <span className="font-medium text-purple-300/80">
                        Resend OTP
                      </span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Terms & Privacy */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/20"
        >
          <ShieldCheck className="h-3 w-3 text-purple-400/40" />
          By continuing, you agree to our{" "}
          <span className="text-purple-300/50">Terms</span> &{" "}
          <span className="text-purple-300/50">Privacy Policy</span>
        </motion.p>
      </div>
    </div>
  );
}
