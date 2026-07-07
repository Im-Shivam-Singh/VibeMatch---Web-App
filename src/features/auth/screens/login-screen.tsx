"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Phone,
  ArrowRight,
  ChevronLeft,
  Sparkles,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { cn } from "@/lib/utils";

// ── Main Login Screen ─────────────────────────────────────────────────
export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [otpError, setOtpError] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
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
    }
  }, [otp]);

  const validatePhone = useCallback((): boolean => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 0) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (digits.length < 10) {
      setPhoneError(`Need ${10 - digits.length} more digit${digits.length === 9 ? "" : "s"}`);
      return false;
    }
    setPhoneError("");
    return true;
  }, [phone]);

  const validateName = useCallback((): boolean => {
    if (name.trim().length === 0) {
      setNameError("Tell us your name");
      return false;
    }
    if (name.trim().length < 2) {
      setNameError("Name must be at least 2 characters");
      return false;
    }
    setNameError("");
    return true;
  }, [name]);

  const sendOtp = useCallback(async () => {
    if (!validatePhone()) return;
    if (!validateName()) return;
    setLoading(true);
    try {
      const res = await api.sendOtp(fullPhone);
      setDevOtp(res.devOtp);
      setResendCountdown(30);
      setStep("otp");
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
      setOtpSuccess(true);
      setTimeout(() => {
        login(res.user);
        toast.success(`Welcome, ${res.user.name}!`, {
          description: "You're in. Let's find a vibe.",
        });
      }, 600);
    } catch (e) {
      setOtpError(true);
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
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden bg-[#0a0a0f] px-4">
      {/* Subtle background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(124,58,237,0.07),transparent_70%)]" />

      {/* Content wrapper with sticky footer */}
      <div className="relative z-10 flex min-h-[100dvh] w-full max-w-sm flex-col items-center justify-center py-12">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-purple-500/20">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            VibeMatch
          </h1>
        </div>

        {/* ── Card ── */}
        <Card className="w-full border-white/[0.06] bg-white/[0.02] shadow-2xl shadow-black/40 backdrop-blur-sm">
          {step === "phone" ? (
            <>
              {/* ── Step 1: Phone + Name ── */}
              <CardHeader className="items-center text-center">
                <p className="text-sm text-white/40">
                  Sign in to discover local parties
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Phone input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="phone-input"
                    className="text-xs font-medium text-white/50"
                  >
                    Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    <div className="pointer-events-none absolute left-9 top-1/2 flex -translate-y-1/2 items-center sm:left-10">
                      <span className="text-xs font-medium text-white/40">+91</span>
                      <span className="mx-1.5 h-4 w-px bg-white/10" />
                    </div>
                    <Input
                      id="phone-input"
                      inputMode="numeric"
                      autoFocus
                      placeholder="98765 43210"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          e.target.value.replace(/\D/g, "").slice(0, 10)
                        )
                      }
                      onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                      aria-invalid={!!phoneError}
                      className={cn(
                        "h-11 rounded-lg border bg-white/[0.03] pl-[4.5rem] pr-4 text-base text-white placeholder:text-white/20 transition-all duration-200 focus-visible:ring-1 sm:pl-20",
                        phoneError
                          ? "border-red-500/40 focus-visible:border-red-500/60 focus-visible:ring-red-500/30"
                          : "border-white/[0.08] hover:border-white/15 focus-visible:border-purple-400/50 focus-visible:ring-purple-400/30"
                      )}
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-400/90 transition-all duration-200">
                      {phoneError}
                    </p>
                  )}
                </div>

                {/* Name input */}
                <div className="space-y-2">
                  <Label
                    htmlFor="name-input"
                    className="text-xs font-medium text-white/50"
                  >
                    Your Name
                  </Label>
                  <Input
                    id="name-input"
                    placeholder="What should hosts call you?"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                    aria-invalid={!!nameError}
                    className={cn(
                      "h-11 rounded-lg border bg-white/[0.03] px-4 text-base text-white placeholder:text-white/20 transition-all duration-200 focus-visible:ring-1",
                      nameError
                        ? "border-red-500/40 focus-visible:border-red-500/60 focus-visible:ring-red-500/30"
                        : "border-white/[0.08] hover:border-white/15 focus-visible:border-purple-400/50 focus-visible:ring-purple-400/30"
                    )}
                  />
                  {nameError && (
                    <p className="text-xs text-red-400/90 transition-all duration-200">
                      {nameError}
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex-col">
                <Button
                  onClick={sendOtp}
                  disabled={loading}
                  className="h-11 w-full rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition-all duration-200 hover:from-violet-500 hover:to-purple-700 hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </CardFooter>
            </>
          ) : (
            <>
              {/* ── Step 2: OTP Verification ── */}
              <CardHeader className="items-center text-center">
                {/* Back button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setOtpSuccess(false);
                    setOtpError(false);
                  }}
                  className="absolute left-4 top-4 h-auto px-2 py-1 text-xs text-white/30 hover:text-white/60 hover:bg-transparent"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Change number
                </Button>
                <p className="text-lg font-semibold text-white">
                  Enter the code
                </p>
                <p className="text-sm text-white/35">
                  Sent to{" "}
                  <span className="font-medium text-white/60">
                    {fullPhone}
                  </span>
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* OTP Input */}
                <div className="flex justify-center py-1">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(v) => {
                      setOtp(v);
                      setOtpSuccess(false);
                    }}
                  >
                    <InputOTPGroup className="gap-2">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className={cn(
                            "h-12 w-10 rounded-lg border font-mono text-lg font-bold transition-all duration-200 sm:h-13 sm:w-11",
                            otpError
                              ? "border-red-500/40 bg-red-500/[0.06] text-red-300"
                              : otpSuccess
                              ? "border-emerald-400/50 bg-emerald-400/[0.08] text-emerald-300"
                              : "border-white/[0.08] bg-white/[0.03] text-white data-[active=true]:border-purple-400/60 data-[active=true]:bg-white/[0.06] data-[active=true]:ring-2 data-[active=true]:ring-purple-400/20"
                          )}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* OTP error */}
                {otpError && (
                  <p className="text-center text-xs text-red-400/90 transition-all duration-200">
                    Wrong code. Please try again.
                  </p>
                )}

                {/* Dev OTP */}
                {devOtp && (
                  <p className="text-center text-xs text-white/20">
                    Dev OTP:{" "}
                    <span className="font-mono text-purple-400/60">
                      {devOtp}
                    </span>
                  </p>
                )}
              </CardContent>

              <CardFooter className="flex-col gap-4">
                {/* Verify button */}
                <Button
                  onClick={verifyOtp}
                  disabled={loading || otp.length < 6}
                  className="h-11 w-full rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition-all duration-200 hover:from-violet-500 hover:to-purple-700 hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying...
                    </span>
                  ) : otpSuccess ? (
                    <span className="flex items-center gap-2 text-emerald-300">
                      <ShieldCheck className="h-4 w-4" />
                      Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Verify & Continue <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                {/* Resend OTP */}
                <div className="text-center">
                  {resendCountdown > 0 ? (
                    <p className="text-xs text-white/25">
                      Resend in{" "}
                      <span className="font-mono text-white/40">
                        {resendCountdown}s
                      </span>
                    </p>
                  ) : (
                    <button
                      onClick={() => {
                        sendOtp();
                      }}
                      className="text-xs text-white/30 transition-colors duration-200 hover:text-white/60"
                    >
                      Didn&apos;t get it?{" "}
                      <span className="font-medium text-purple-400/70 hover:text-purple-400">
                        Resend OTP
                      </span>
                    </button>
                  )}
                </div>
              </CardFooter>
            </>
          )}
        </Card>

        {/* Footer: Terms & Privacy */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="flex items-center gap-1.5 text-center text-[11px] text-white/15">
            <ShieldCheck className="h-3 w-3 text-white/20" />
            By continuing, you agree to our{" "}
            <button
              onClick={() => toast.info("Terms of Service — Coming soon")}
              className="text-white/25 transition-colors duration-200 hover:text-white/50 hover:underline"
            >
              Terms
            </button>{" "}
            &{" "}
            <button
              onClick={() => toast.info("Privacy Policy — Coming soon")}
              className="text-white/25 transition-colors duration-200 hover:text-white/50 hover:underline"
            >
              Privacy Policy
            </button>
          </p>
          <p className="text-[10px] text-white/10">
            Your number is never shared with anyone
          </p>
        </div>
      </div>
    </div>
  );
}
