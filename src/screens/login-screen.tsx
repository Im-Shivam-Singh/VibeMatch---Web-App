"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  User,
  Lock,
  Search,
  Users,
  PartyPopper,
  RefreshCw,
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

// ── Animated counter for social proof ─────────────────────────────────────
function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const startTime = Date.now();
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return <span>{count.toLocaleString()}</span>;
}

// ── Step progress dots ────────────────────────────────────────────────────
function StepDots({ step, otpSuccess }: { step: "phone" | "otp"; otpSuccess: boolean }) {
  const steps = ["Phone", "Verify", "Done"];
  const currentIndex = step === "phone" ? 0 : otpSuccess ? 2 : 1;

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((label, i) => {
        const isCompleted = i < currentIndex;
        const isActive = i === currentIndex;

        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all duration-500",
                  isCompleted
                    ? "bg-teal-400/20 text-teal-300 animate-step-complete"
                    : isActive
                    ? "bg-purple-400/20 text-purple-300 animate-dot-pulse ring-2 ring-purple-400/40"
                    : "bg-white/[0.06] text-white/20"
                )}
              >
                {isCompleted ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors duration-300",
                  isCompleted
                    ? "text-teal-300/60"
                    : isActive
                    ? "text-purple-300/70"
                    : "text-white/15"
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 transition-all duration-500 sm:w-8",
                  i < currentIndex
                    ? "bg-teal-400/30"
                    : "bg-white/[0.06]"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Feature highlights ────────────────────────────────────────────────────
function FeatureHighlights() {
  const features = [
    { icon: Search, label: "Discover", desc: "Find local parties", color: "text-purple-400", bg: "bg-purple-400/10" },
    { icon: Users, label: "Connect", desc: "Meet like-minded people", color: "text-teal-400", bg: "bg-teal-400/10" },
    { icon: PartyPopper, label: "Celebrate", desc: "Create unforgettable nights", color: "text-amber-400", bg: "bg-amber-400/10" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mt-8 grid grid-cols-3 gap-3 sm:gap-4"
    >
      {features.map((f, i) => (
        <div key={f.label} className="flex flex-col items-center text-center">
          <div
            className={cn(
              "animate-feature-float mb-2 flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12",
              f.bg
            )}
            style={{ animationDelay: `${i * 0.4}s` }}
          >
            <f.icon className={cn("h-5 w-5 sm:h-6 sm:w-6", f.color)} />
          </div>
          <span className="text-xs font-semibold text-white/60 sm:text-sm">{f.label}</span>
          <span className="mt-0.5 text-[10px] text-white/25 sm:text-[11px]">{f.desc}</span>
        </div>
      ))}
    </motion.div>
  );
}

// ── Main Login Screen ─────────────────────────────────────────────────────
export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [shakePhone, setShakePhone] = useState(false);
  const [shakeOtp, setShakeOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");

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

  // Clear errors when user types
  useEffect(() => {
    if (phone.length > 0) setPhoneError("");
  }, [phone]);

  useEffect(() => {
    if (name.length > 0) setNameError("");
  }, [name]);

  useEffect(() => {
    if (otp.length > 0) {
      setOtpError(false);
      setShakeOtp(false);
    }
  }, [otp]);

  const validatePhone = useCallback((): boolean => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) {
      setPhoneError("Phone number is required");
      setShakePhone(true);
      setTimeout(() => setShakePhone(false), 600);
      return false;
    }
    if (digits.length < 10) {
      setPhoneError(`Need ${10 - digits.length} more digit${digits.length === 9 ? "" : "s"}`);
      setShakePhone(true);
      setTimeout(() => setShakePhone(false), 600);
      return false;
    }
    setPhoneError("");
    return true;
  }, [phone]);

  const validateName = useCallback((): boolean => {
    if (mode === "signup") {
      if (name.trim().length === 0) {
        setNameError("Tell us your name to sign up");
        return false;
      }
      if (name.trim().length < 2) {
        setNameError("Name must be at least 2 characters");
        return false;
      }
    }
    setNameError("");
    return true;
  }, [mode, name]);

  const sendOtp = useCallback(async () => {
    if (!validatePhone()) return;
    if (!validateName()) return;
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
  }, [phone, fullPhone, validatePhone, validateName]);

  async function verifyOtp() {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setOtpError(false);
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
      setOtpError(true);
      setShakeOtp(true);
      setTimeout(() => setShakeOtp(false), 600);
      // Clear OTP on error so user can retry
      setTimeout(() => {
        setOtp("");
        setOtpError(false);
      }, 1500);
      toast.error(e instanceof Error ? e.message : "Invalid OTP", {
        description: "Please try again",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex-col overflow-hidden">
      {/* Animated mesh gradient bg */}
      <MeshGradient />

      {/* Radial top glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-5%,rgba(127,119,221,0.18),transparent)]" />
      {/* Radial bottom glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_50%_105%,rgba(93,202,165,0.06),transparent)]" />

      {/* Floating bokeh particles */}
      <BokehParticles />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 sm:px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
        {/* Logo + Brand */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 text-center sm:mb-8"
        >
          {/* Logo icon with premium entrance + pulse ring */}
          <div className="animate-logo-premium relative mx-auto mb-4 flex h-18 w-18 items-center justify-center sm:mb-5 sm:h-20 sm:w-20">
            {/* Outer pulse ring */}
            <div className="animate-logo-pulse-ring absolute inset-0 rounded-2xl" />
            {/* Inner glow */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-400/20 to-teal-400/10 blur-xl" />
            {/* Logo surface */}
            <div className="relative flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 shadow-[0_0_40px_-8px_rgba(127,119,221,0.7)] sm:h-20 sm:w-20">
              <Sparkles className="h-9 w-9 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] sm:h-10 sm:w-10" />
            </div>
          </div>

          {/* VibeMatch heading with gradient shimmer */}
          <h1
            className="font-display text-4xl font-extrabold tracking-tight animate-gradient-text bg-gradient-to-r from-purple-300 via-purple-200 to-teal-300 bg-clip-text text-transparent sm:text-5xl"
            style={{ backgroundSize: "200% auto" }}
          >
            VibeMatch
          </h1>

          {/* Staggered tagline */}
          <p className="mx-auto mt-2 max-w-[260px] text-xs leading-relaxed text-white/50 sm:mt-3 sm:text-sm">
            <StaggeredTagline text="Find local parties. Connect with hosts. Build your night out." />
          </p>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-3 flex items-center justify-center gap-1.5 sm:mt-4"
          >
            <div className="flex -space-x-1.5">
              {["🟣", "🟢", "🟠"].map((emoji, i) => (
                <span
                  key={i}
                  className="animate-counter-in inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/[0.06] text-[10px] ring-1 ring-white/10"
                  style={{ animationDelay: `${0.8 + i * 0.1}s` }}
                >
                  {emoji}
                </span>
              ))}
            </div>
            <span className="text-[11px] text-white/30 sm:text-xs">
              Join <span className="font-semibold text-purple-300/60 animate-counter-in" style={{ animationDelay: "1s" }}><AnimatedCounter target={2400} /></span>+ party lovers
            </span>
          </motion.div>
        </motion.div>

        {/* Premium Glass Card with animated gradient border */}
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.6,
            delay: 0.15,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="animate-gradient-border glass-premium rounded-3xl p-4 sm:p-6"
        >
          {/* Step progress dots */}
          <div className="mb-5">
            <StepDots step={step} otpSuccess={otpSuccess} />
          </div>

          <AnimatePresence mode="wait">
            {step === "phone" ? (
              <motion.div
                key="phone-step"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-4 sm:space-y-5"
              >
                {/* Sign Up / Log In tab toggle */}
                <div className="relative flex rounded-xl bg-white/[0.04] p-1">
                  <div
                    className={cn(
                      "absolute top-1 bottom-1 rounded-lg bg-purple-500/20 transition-all duration-300 ease-out",
                      mode === "signup" ? "left-1 w-[calc(50%-4px)]" : "left-[calc(50%+2px)] w-[calc(50%-4px)]"
                    )}
                  />
                  <button
                    onClick={() => setMode("signup")}
                    className={cn(
                      "relative z-10 flex-1 rounded-lg py-2 text-xs font-semibold transition-colors duration-300 sm:text-sm",
                      mode === "signup" ? "text-purple-300" : "text-white/35 hover:text-white/50"
                    )}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => setMode("login")}
                    className={cn(
                      "relative z-10 flex-1 rounded-lg py-2 text-xs font-semibold transition-colors duration-300 sm:text-sm",
                      mode === "login" ? "text-purple-300" : "text-white/35 hover:text-white/50"
                    )}
                  >
                    Log In
                  </button>
                </div>

                {/* Phone input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-purple-300/80 sm:text-xs">
                    Phone Number
                  </label>
                  <div
                    className={cn(
                      "relative group transition-all duration-300",
                      shakePhone && "animate-shake",
                      phoneError && !shakePhone && "animate-otp-shake"
                    )}
                  >
                    <Phone
                      className={cn(
                        "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300 sm:left-4",
                        phoneFocused
                          ? "text-purple-400"
                          : phoneError
                          ? "text-red-400/70"
                          : "text-white/30"
                      )}
                    />
                    {/* Country code badge with flag */}
                    <div className="absolute left-9 top-1/2 -translate-y-1/2 flex items-center sm:left-10">
                      <span className="text-sm" role="img" aria-label="India flag">🇮🇳</span>
                      <span className="ml-1 text-xs font-semibold text-purple-300/70 sm:text-sm">+91</span>
                      <span className="mx-1.5 h-4 w-px bg-white/10 sm:mx-2" />
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
                        "h-12 rounded-2xl border bg-white/[0.04] pl-[5.5rem] pr-4 text-base text-white outline-none placeholder:text-white/25 transition-all duration-300 sm:h-14 sm:pl-[6.5rem] sm:text-lg",
                        phoneError
                          ? "border-red-400/50 bg-red-400/[0.05] focus:border-red-400/70"
                          : phoneFocused
                          ? "border-purple-400/60 bg-white/[0.07] input-glow-focus"
                          : "border-white/[0.08] hover:border-white/15"
                      )}
                    />
                  </div>
                  {/* Inline error message */}
                  <AnimatePresence>
                    {phoneError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="animate-error-in text-[11px] text-red-400/80 sm:text-xs"
                      >
                        {phoneError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Name input — prominent in signup, optional/hidden in login */}
                <AnimatePresence>
                  {(mode === "signup" || name.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-1.5 overflow-hidden"
                    >
                      <label className="text-[10px] font-semibold uppercase tracking-widest text-purple-300/80 sm:text-xs">
                        Your Name{" "}
                        {mode === "login" && (
                          <span className="normal-case tracking-normal text-white/30 font-normal">
                            (optional)
                          </span>
                        )}
                      </label>
                      <div className="relative group">
                        <User
                          className={cn(
                            "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-300 sm:left-4",
                            nameFocused
                              ? "text-purple-400"
                              : nameError
                              ? "text-red-400/70"
                              : "text-white/30"
                          )}
                        />
                        <Input
                          placeholder={
                            mode === "signup"
                              ? "What should hosts call you?"
                              : "Your name (optional)"
                          }
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setNameFocused(true)}
                          onBlur={() => setNameFocused(false)}
                          onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                          className={cn(
                            "h-12 rounded-2xl border bg-white/[0.04] pl-10 pr-4 text-base text-white outline-none placeholder:text-white/25 transition-all duration-300 sm:h-14 sm:pl-11 sm:text-lg",
                            nameError
                              ? "border-red-400/50 bg-red-400/[0.05] focus:border-red-400/70"
                              : nameFocused
                              ? "border-purple-400/60 bg-white/[0.07] input-glow-focus"
                              : "border-white/[0.08] hover:border-white/15"
                          )}
                        />
                      </div>
                      {/* Inline error message */}
                      <AnimatePresence>
                        {nameError && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="animate-error-in text-[11px] text-red-400/80 sm:text-xs"
                          >
                            {nameError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Send OTP button */}
                <Button
                  onClick={sendOtp}
                  disabled={loading}
                  className="btn-shimmer h-12 w-full rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-sm font-bold text-white shadow-[0_0_24px_-6px_rgba(127,119,221,0.6)] transition-all duration-300 active:scale-[0.97] hover:shadow-[0_0_32px_-4px_rgba(127,119,221,0.8)] hover:from-purple-500 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed sm:h-14 sm:text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      Sending <LoadingDots />
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {mode === "signup" ? "Create Account" : "Continue"}{" "}
                      <ArrowRight className="h-4 w-4" />
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
                className="space-y-4 sm:space-y-6"
              >
                {/* Back button */}
                <button
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setOtpSuccess(false);
                    setOtpError(false);
                  }}
                  className="inline-flex items-center gap-1 text-xs text-white/40 transition-colors hover:text-white/70 sm:text-sm"
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
                  <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                    Verify it&apos;s you
                  </h2>
                  <p className="text-xs text-white/40 sm:text-sm">
                    We sent a 6-digit code to{" "}
                    <span className="font-medium text-purple-300">
                      {fullPhone}
                    </span>
                  </p>
                </div>

                {/* OTP Input */}
                <div
                  className={cn(
                    "flex justify-center py-2",
                    shakeOtp && "animate-otp-shake"
                  )}
                >
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      setOtpSuccess(false);
                    }}
                  >
                    <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className={cn(
                            "h-12 w-9 rounded-xl border font-mono text-lg font-bold transition-all duration-300 sm:h-14 sm:w-11 md:w-12",
                            otpError
                              ? "border-red-400/50 bg-red-400/[0.06] text-red-300 shadow-[0_0_12px_-3px_rgba(220,38,38,0.3)]"
                              : otpSuccess
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

                {/* OTP error try-again state */}
                <AnimatePresence>
                  {otpError && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex items-center justify-center gap-2"
                    >
                      <span className="text-[11px] text-red-400/80 sm:text-xs">Wrong code. Please try again.</span>
                      <button
                        onClick={() => {
                          setOtp("");
                          setOtpError(false);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-300/70 transition-colors hover:text-purple-300 sm:text-xs"
                      >
                        <RefreshCw className="h-3 w-3" /> Retry
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                  className="btn-shimmer h-12 w-full rounded-2xl bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 text-sm font-bold text-white shadow-[0_0_24px_-6px_rgba(127,119,221,0.6)] transition-all duration-300 active:scale-[0.97] hover:shadow-[0_0_32px_-4px_rgba(127,119,221,0.8)] disabled:opacity-40 disabled:cursor-not-allowed sm:h-14 sm:text-base"
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
                    <p className="text-xs text-white/30 sm:text-sm">
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
                      className="text-xs text-white/40 transition-colors hover:text-white/70 sm:text-sm"
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

        {/* Feature highlights */}
        <FeatureHighlights />

        {/* Terms & Privacy + Privacy lock */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="mt-5 flex flex-col items-center gap-2 sm:mt-6"
        >
          {/* Terms & Privacy — clickable */}
          <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-white/20 sm:text-[11px]">
            <ShieldCheck className="h-3 w-3 text-purple-400/40" />
            By continuing, you agree to our{" "}
            <button
              onClick={() => toast.info("Terms of Service — Coming soon")}
              className="text-purple-300/50 transition-colors hover:text-purple-300/80 hover:underline"
            >
              Terms
            </button>{" "}
            &{" "}
            <button
              onClick={() => toast.info("Privacy Policy — Coming soon")}
              className="text-purple-300/50 transition-colors hover:text-purple-300/80 hover:underline"
            >
              Privacy Policy
            </button>
          </p>
          {/* Privacy lock notice */}
          <div className="flex items-center gap-1.5 text-[10px] text-white/15">
            <Lock className="h-3 w-3 text-teal-400/30" />
            Your number is never shared
          </div>
        </motion.div>
      </div>
    </div>
  );
}
