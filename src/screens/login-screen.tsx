"use client";

import { useState } from "react";
import { Phone, ArrowRight, ShieldCheck, Sparkles, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

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
      setStep("otp");
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
    if (otp.length !== 5) {
      toast.error("Enter the 5-digit OTP");
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
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-pink/20 blur-3xl vibe-float" />
        <div className="absolute top-1/3 -left-20 h-72 w-72 rounded-full bg-violet/25 blur-3xl vibe-float" style={{ animationDelay: "0.6s" }} />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-cyan/15 blur-3xl vibe-float" style={{ animationDelay: "1.2s" }} />
      </div>

      {/* Header / brand */}
      <div className="flex flex-1 flex-col justify-center px-6 pt-16">
        <div className="mb-8 animate-slide-up text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl vibe-gradient-bg shadow-[0_15px_50px_-10px_rgba(236,72,153,0.6)] vibe-pulse">
            <Sparkles className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            <span className="vibe-gradient-text">VibeMatch</span>
          </h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Find local parties. Connect with hosts. Build your night out.
          </p>
        </div>

        {/* Card */}
        <div className="animate-slide-up rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl vibe-gradient-border" style={{ animationDelay: "0.08s" }}>
          {step === "phone" ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Phone number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    +91
                  </span>
                  <Input
                    inputMode="numeric"
                    autoFocus
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    onKeyDown={(e) => e.key === "Enter" && sendOtp()}
                    className="rounded-xl border-border/60 bg-background/60 pl-16 h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Your name <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <Input
                  placeholder="What should hosts call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border-border/60 bg-background/60 h-12"
                />
              </div>

              <Button
                onClick={sendOtp}
                disabled={loading}
                className="h-12 w-full rounded-xl vibe-gradient-bg text-base font-semibold shadow-[0_10px_30px_-8px_rgba(236,72,153,0.6)] hover:opacity-95"
              >
                {loading ? "Sending…" : "Send OTP"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>

              <SocialLogin />
            </div>
          ) : (
            <div className="space-y-5">
              <button
                onClick={() => setStep("phone")}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Change number
              </button>

              <div className="space-y-1.5 text-center">
                <h2 className="font-display text-xl font-semibold">Verify it's you</h2>
                <p className="text-sm text-muted-foreground">
                  We sent a 5-digit code to{" "}
                  <span className="font-medium text-foreground">{fullPhone}</span>
                </p>
              </div>

              <div className="flex justify-center">
                <InputOTP
                  maxLength={5}
                  value={otp}
                  onChange={(v) => setOtp(v)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {devOtp && (
                <p className="text-center text-[11px] text-muted-foreground">
                  Dev OTP: <span className="font-mono text-pink">{devOtp}</span> (auto-fill in dev)
                </p>
              )}

              <Button
                onClick={verifyOtp}
                disabled={loading}
                className="h-12 w-full rounded-xl vibe-gradient-bg text-base font-semibold"
              >
                {loading ? "Verifying…" : "Verify & Continue"}
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>

              <button
                onClick={sendOtp}
                className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Didn't get it? Resend OTP
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-violet" />
          By continuing you agree to be respectful & follow community guidelines.
        </p>
      </div>
    </div>
  );
}

function SocialLogin() {
  return (
    <div className="space-y-3 pt-2">
      <div className="relative flex items-center">
        <div className="h-px flex-1 bg-border" />
        <span className="px-3 text-[11px] text-muted-foreground">
          or continue with
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-xl border-border/60 bg-background/40"
          onClick={() => toast.info("Google login is UI-only for now")}
        >
          <GoogleIcon className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button
          variant="outline"
          className="h-11 rounded-xl border-border/60 bg-background/40"
          onClick={() => toast.info("Instagram login is UI-only for now")}
        >
          <InstagramIcon className="mr-2 h-4 w-4" />
          Instagram
        </Button>
      </div>
    </div>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.46-1.7 4.28-5.5 4.28-3.31 0-6-2.74-6-6.12s2.69-6.12 6-6.12c1.88 0 3.14.8 3.86 1.49l2.63-2.53C16.96 3.55 14.7 2.5 12 2.5 6.75 2.5 2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c5.48 0 9.1-3.85 9.1-9.27 0-.62-.07-1.1-.16-1.58H12z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="url(#ig)" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig)" />
      <defs>
        <linearGradient id="ig" x1="3" y1="3" x2="21" y2="21">
          <stop stopColor="#feda75" />
          <stop offset="0.3" stopColor="#fa7e1e" />
          <stop offset="0.6" stopColor="#d62976" />
          <stop offset="1" stopColor="#962fbf" />
        </linearGradient>
      </defs>
    </svg>
  );
}
