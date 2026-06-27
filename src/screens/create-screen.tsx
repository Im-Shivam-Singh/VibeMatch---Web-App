"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ImagePlus, Video, Play, X, CalendarDays, Clock, IndianRupee, Users, Check, Sparkles, ShieldCheck, Info } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  CITIES,
  VIBE_TAGS,
  VIBE_EMOJI,
  formatDateLabel,
  formatFee,
  formatTime,
  type PartyCreateInput,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1483452389744-eaaf621f05cb?w=800&q=80&auto=format&fit=crop",
];

// Preset stock videos from Pexels CDN — used in the media picker so hosts
// can attach a short clip alongside photos without needing to upload.
const VIDEO_PRESETS = [
  {
    url: "https://videos.pexels.com/video-files/2022395/2022395-uhd_3840_2160_24fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=400&q=60&auto=format&fit=crop",
  },
  {
    url: "https://videos.pexels.com/video-files/2795750/2795750-uhd_3840_2160_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400&q=60&auto=format&fit=crop",
  },
  {
    url: "https://videos.pexels.com/video-files/4234119/4234119-hd_1920_1080_30fps.mp4",
    poster:
      "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=400&q=60&auto=format&fit=crop",
  },
];

const MAX_MEDIA = 6;

type MediaItem = { url: string; type: "image" | "video"; caption?: string };

const ENTRY_TYPES = [
  { label: "Free", value: 0 },
  { label: "Cover", value: 500 },
  { label: "Premium", value: 1200 },
];

export function CreateScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const currentUser = useAppStore((s) => s.currentUser);
  const qc = useQueryClient();

  const [form, setForm] = useState<PartyCreateInput>({
    title: "",
    city: currentUser?.city || "Mumbai",
    area: "",
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    time: "21:00",
    fee: 0,
    maxGuests: 20,
    vibes: [],
    description: "",
    hostName: currentUser?.name || "You",
    coverUrl: COVER_PRESETS[0],
    // Pre-seed the gallery with the first preset so the live preview + the
    // detail-screen carousel always have something to show.
    media: [{ url: COVER_PRESETS[0], type: "image" }],
    securityBooked: false,
    securityFee: 0,
  });

  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Security fee is city-dependent: £40-60 for UK, ₹800-1500 for India.
  // We pick the midpoint of the range as the default when the host toggles
  // the bouncer add-on on.
  const isIndia = ["Delhi", "Mumbai", "Bangalore", "Goa", "Pune"].includes(
    form.city,
  );
  const securityFeeDefault = isIndia ? 1000 : 50;
  const securityFeeMin = isIndia ? 800 : 40;
  const securityFeeMax = isIndia ? 1500 : 60;
  const currency = isIndia ? "₹" : "£";
  const platformFeePct = 18; // 15-20% — we show 18% as the midpoint

  const set = <K extends keyof PartyCreateInput>(k: K, v: PartyCreateInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleVibe = (v: string) =>
    setForm((f) => ({
      ...f,
      vibes: f.vibes.includes(v)
        ? f.vibes.filter((x) => x !== v)
        : [...f.vibes, v],
    }));

  // ── Media gallery helpers ────────────────────────────────────────────
  // The first item in `media` is always the cover (drives the legacy
  // coverUrl field + party-card rendering). Adding/removing reorders and
  // re-syncs coverUrl so the two never drift.
  const media: MediaItem[] = form.media ?? [];
  const mediaFull = media.length;

  const syncCoverFromMedia = (items: MediaItem[]) => ({
    coverUrl: items.length > 0 ? items[0].url : form.coverUrl,
    media: items,
  });

  const addMedia = (item: MediaItem) => {
    setForm((f) => {
      const current = f.media ?? [];
      if (current.length >= MAX_MEDIA) {
        toast.error(`Up to ${MAX_MEDIA} photos or videos`);
        return f;
      }
      // Skip exact-duplicate URLs (e.g. tapping the same preset twice).
      if (current.some((m) => m.url === item.url)) return f;
      const next = [...current, item];
      return { ...f, ...syncCoverFromMedia(next) };
    });
  };

  const removeMediaAt = (index: number) => {
    setForm((f) => {
      const current = f.media ?? [];
      const next = current.filter((_, i) => i !== index);
      return { ...f, ...syncCoverFromMedia(next) };
    });
  };

  const makeCoverAt = (index: number) => {
    setForm((f) => {
      const current = f.media ?? [];
      if (index <= 0 || index >= current.length) return f;
      const next = [
        current[index],
        ...current.filter((_, i) => i !== index),
      ];
      return { ...f, ...syncCoverFromMedia(next) };
    });
  };

  const createMutation = useMutation({
    mutationFn: (input: PartyCreateInput) => api.createParty(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["parties"] });
      toast.success("Vibe launched! 🚀", {
        description: "Your party is now live on Explore.",
      });
      setSelectedPartyId(data.party.id);
      setScreen("detail");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to launch"),
  });

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("Give your party a title");
      return;
    }
    if (!form.area.trim()) {
      toast.error("Add an area / neighbourhood");
      return;
    }
    if (form.vibes.length === 0) {
      toast.error("Pick at least one vibe");
      return;
    }
    setSubmitting(true);
    createMutation.mutate(form, {
      onSettled: () => setSubmitting(false),
    });
  };

  return (
    <div className="flex h-full flex-col animate-screen-in">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-white/10 glass px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-10 w-10 items-center justify-center rounded-full glass border border-white/10 text-white hover:bg-purple-400/10 active:scale-95 transition"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-lg font-bold leading-tight">
            Launch a <span className="text-purple-400">Vibe</span>
          </h1>
          <p className="text-[11px] text-muted-foreground">
            Fill the details and go live in seconds
          </p>
        </div>
      </header>

      <div className="fancy-scrollbar flex-1 overflow-y-auto p-4">
        <div className="glass-strong rounded-3xl border border-purple-400/40 p-4 space-y-6">
          {/* Photos & videos gallery uploader */}
          <section className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <Label className="text-xs uppercase tracking-wide text-white flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
                Photos &amp; videos
              </Label>
              <span className="text-[10px] text-muted-foreground">
                {mediaFull}/{MAX_MEDIA} · first one becomes the cover
              </span>
            </div>

            {/* Preview tiles — horizontally scrollable list with add tile at end */}
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {media.map((m, i) => (
                <div
                  key={`${m.url}-${i}`}
                  className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-purple-400/30"
                >
                  {m.type === "image" ? (
                    <img
                      src={m.url}
                      alt={i === 0 ? "Cover" : `Media ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <>
                      <img
                        src={
                          VIDEO_PRESETS.find((v) => v.url === m.url)?.poster ||
                          m.url
                        }
                        alt={`Video ${i + 1}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </span>
                    </>
                  )}
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-md bg-purple-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                      COVER
                    </span>
                  )}
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeMediaAt(i)}
                    aria-label={`Remove media ${i + 1}`}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/65 text-white transition hover:bg-coral/80 active:scale-90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  {/* Make-cover button (only for non-first items) */}
                  {i > 0 && (
                    <button
                      type="button"
                      onClick={() => makeCoverAt(i)}
                      className="absolute bottom-1 right-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white/90 transition hover:bg-purple-500/80 active:scale-95"
                    >
                      Use as cover
                    </button>
                  )}
                </div>
              ))}

              {/* Add tile */}
              {mediaFull < MAX_MEDIA && (
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-purple-400/45 bg-purple-400/5 text-purple-300 transition hover:border-purple-400/80 hover:bg-purple-400/10 active:scale-95"
                  aria-label="Add photo or video"
                >
                  <ImagePlus className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">Add</span>
                </button>
              )}
            </div>

            {/* Quick inline picker button (secondary affordance) */}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-400/40 bg-purple-400/10 px-3 py-1.5 text-[11px] font-medium text-purple-200 transition hover:bg-purple-400/15 active:scale-95"
            >
              <Sparkles className="h-3 w-3" />
              Pick from presets
            </button>
          </section>

          {/* Title */}
          <section className="space-y-1.5">
            <Label htmlFor="title" className="text-white flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
              Party title
            </Label>
            <Input
              id="title"
              placeholder="e.g. Neon Rooftop: Techno Till Dawn"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              className="h-12 rounded-xl border-white/10 bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              maxLength={80}
            />
          </section>

          {/* City + Area */}
          <section className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
                City
              </Label>
              <select
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-card px-3 text-sm text-foreground outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c} className="bg-card">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area" className="text-white flex items-center gap-1.5">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
                Area
              </Label>
              <Input
                id="area"
                placeholder="Bandra West"
                value={form.area}
                onChange={(e) => set("area", e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              />
            </div>
          </section>

          {/* Date + Time */}
          <section className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-white">
                <CalendarDays className="h-3.5 w-3.5 text-purple-400" /> Date
              </Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-card text-foreground focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-white">
                <Clock className="h-3.5 w-3.5 text-purple-400" /> Time
              </Label>
              <Input
                type="time"
                value={form.time}
                onChange={(e) => set("time", e.target.value)}
                className="h-12 rounded-xl border-white/10 bg-card text-foreground focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              />
            </div>
          </section>

          {/* Entry type quick */}
          <section className="space-y-2">
            <Label className="text-white flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
              Entry type
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {ENTRY_TYPES.map((t) => {
                const active = form.fee === t.value;
                return (
                  <button
                    key={t.label}
                    onClick={() => set("fee", t.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-left transition active:scale-95",
                      active
                        ? "border-purple-400 bg-purple-400/10"
                        : "border-white/10 bg-card hover:border-purple-400/40",
                    )}
                  >
                    <div className="text-xs font-semibold">{t.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t.value === 0 ? "No charge" : `~₹${t.value}`}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
              <Input
                type="number"
                min={0}
                value={form.fee}
                onChange={(e) => set("fee", Number(e.target.value) || 0)}
                className="h-11 rounded-xl border-white/10 bg-card pl-9 text-foreground focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              />
            </div>
          </section>

          {/* Max guests */}
          <section className="space-y-2">
            <Label className="flex items-center gap-1.5 text-white">
              <Users className="h-3.5 w-3.5 text-purple-400" /> Max guests
            </Label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5}
                max={100}
                step={1}
                value={form.maxGuests}
                onChange={(e) => set("maxGuests", Number(e.target.value))}
                className="vibe-slider h-2 flex-1"
                style={
                  {
                    background: `linear-gradient(to right, #ffcb05 0%, #e0a800 ${
                      ((form.maxGuests - 5) / 95) * 100
                    }%, rgba(255,203,5,0.18) ${
                      ((form.maxGuests - 5) / 95) * 100
                    }%)`,
                  } as React.CSSProperties
                }
              />
              <span className="w-12 rounded-lg border border-white/10 bg-card py-1.5 text-center text-sm font-semibold text-purple-400">
                {form.maxGuests}
              </span>
            </div>
          </section>

          {/* ── Security / Bouncer booking add-on ──────────────────────
              Hosts can opt in to add a verified security person for the
              night. £40-60 (UK) / ₹800-1500 (India) for 4 hours. Platform
              takes 15-20% booking fee; bouncer gets the rest after the event.
              This is a major trust signal — especially for women guests. */}
          <section className="space-y-2">
            <Label className="text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-400" />
              Security add-on (optional)
            </Label>
            <button
              type="button"
              onClick={() => {
                const next = !form.securityBooked;
                setForm((f) => ({
                  ...f,
                  securityBooked: next,
                  securityFee: next ? securityFeeDefault : 0,
                }));
              }}
              aria-pressed={form.securityBooked}
              className={cn(
                "w-full rounded-2xl border p-3.5 text-left transition active:scale-[0.98]",
                form.securityBooked
                  ? "border-teal-500/50 bg-teal-500/10 ring-1 ring-teal-500/30"
                  : "border-white/10 bg-white/5 hover:border-teal-500/40",
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    form.securityBooked
                      ? "bg-teal-500/20 text-teal-300"
                      : "bg-white/5 text-muted-foreground",
                  )}
                >
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      Add a verified security person
                    </p>
                    <span
                      className={cn(
                        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                        form.securityBooked ? "bg-teal-500" : "bg-secondary",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform",
                          form.securityBooked && "translate-x-5",
                        )}
                      />
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {currency}{securityFeeMin}–{currency}{securityFeeMax} for 4 hours ·
                    platform takes {platformFeePct}% · bouncer paid after event
                  </p>
                </div>
              </div>
            </button>

            {form.securityBooked && (
              <div className="animate-screen-in rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 space-y-3">
                {/* Why this matters */}
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                  <p className="text-[11px] leading-relaxed text-teal-200/80">
                    <span className="font-semibold">Why add security?</span> A
                    verified bouncer lets you confidently host 20-25 guests
                    instead of capping at 12. Women guests especially trust
                    parties with on-site security — it could be the difference
                    between someone joining or not.
                  </p>
                </div>

                {/* Fee slider */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Security fee
                    </span>
                    <span className="text-sm font-semibold text-teal-300 tabular-nums">
                      {currency}{form.securityFee || securityFeeDefault}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={securityFeeMin}
                    max={securityFeeMax}
                    step={isIndia ? 50 : 5}
                    value={form.securityFee || securityFeeDefault}
                    onChange={(e) =>
                      set("securityFee", Number(e.target.value))
                    }
                    aria-label="Security fee"
                    className="mt-2 h-1.5 w-full cursor-pointer accent-teal-500"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>{currency}{securityFeeMin}</span>
                    <span>{currency}{securityFeeMax}</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="rounded-xl bg-white/5 p-2.5 text-[11px] space-y-1">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Security fee</span>
                    <span className="tabular-nums">
                      {currency}{form.securityFee || securityFeeDefault}
                    </span>
                  </div>
                  <div className="flex justify-between text-coral/80">
                    <span>Platform booking fee ({platformFeePct}%)</span>
                    <span className="tabular-nums">
                      −{currency}
                      {Math.round((form.securityFee || securityFeeDefault) * platformFeePct / 100)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold text-teal-300 border-t border-white/10 pt-1">
                    <span>Bouncer payout (after event)</span>
                    <span className="tabular-nums">
                      {currency}
                      {Math.round((form.securityFee || securityFeeDefault) * (100 - platformFeePct) / 100)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  🔒 Verified & licensed · paid out after the event ·
                  refundable if you cancel the party
                </p>
              </div>
            )}
          </section>

          {/* Vibe chips multi-select */}
          <section className="space-y-2">
            <Label className="text-white flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
              Vibes (pick what fits)
            </Label>
            <div className="flex flex-wrap gap-2">
              {VIBE_TAGS.map((v) => {
                const active = form.vibes.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggleVibe(v)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95",
                      active
                        ? "scale-110 border-purple-400/50 bg-purple-400/15 text-purple-300"
                        : "border-white/10 bg-white/5 text-white/60 hover:text-foreground hover:border-purple-400/40",
                    )}
                  >
                    <span aria-hidden>{VIBE_EMOJI[v]}</span>
                    {v}
                    {active && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Description */}
          <section className="space-y-1.5">
            <Label htmlFor="desc" className="text-white flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
              Description
            </Label>
            <Textarea
              id="desc"
              rows={4}
              placeholder="Set the scene: music, vibe, dress code, what to bring, house rules…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="rounded-xl border-white/10 bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
              maxLength={600}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {form.description.length}/600
            </p>
          </section>

          {/* Host name */}
          <section className="space-y-1.5">
            <Label htmlFor="host" className="text-white flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" aria-hidden />
              Host name
            </Label>
            <Input
              id="host"
              value={form.hostName}
              onChange={(e) => set("hostName", e.target.value)}
              className="h-12 rounded-xl border-white/10 bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25"
            />
          </section>

          {/* Live preview — how the party card will look */}
          <section className="space-y-2">
            <Label className="text-white flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              Live preview
            </Label>
            <div className="overflow-hidden rounded-2xl glass border border-purple-400/40">
              <div className="relative aspect-[16/9] w-full">
                {(() => {
                  const first = media[0];
                  if (first?.type === "image" && first.url) {
                    return (
                      <img
                        src={first.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    );
                  }
                  if (first?.type === "video") {
                    const poster =
                      VIDEO_PRESETS.find((v) => v.url === first.url)?.poster ||
                      form.coverUrl ||
                      "";
                    return (
                      <>
                        {poster ? (
                          <img
                            src={poster}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-purple-400/40" />
                        )}
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="h-7 w-7 fill-white text-white" />
                        </span>
                      </>
                    );
                  }
                  if (form.coverUrl) {
                    return (
                      <img
                        src={form.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    );
                  }
                  return <div className="h-full w-full bg-purple-400 opacity-60" />;
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                <span className="absolute right-2 top-2 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold text-purple-400 backdrop-blur">
                  {formatFee(form.fee)}
                </span>
              </div>
              <div className="space-y-2 p-3">
                <p className="font-display text-sm font-bold leading-tight">
                  {form.title.trim() || (
                    <span className="text-muted-foreground">Your party title</span>
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDateLabel(form.date)} · {formatTime(form.time)} ·{" "}
                  {form.area || "Area"}, {form.city}
                </p>
                {form.vibes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.vibes.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 rounded-full border border-purple-400/50 bg-purple-400/15 px-2 py-0.5 text-[10px] font-medium text-purple-300"
                      >
                        {VIBE_EMOJI[v]} {v}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[11px] text-foreground/70">
                  Hosted by{" "}
                  <span className="font-semibold text-purple-400">
                    {form.hostName || "You"}
                  </span>{" "}
                  · up to {form.maxGuests} guests
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer CTA */}
      <footer className="sticky bottom-0 z-20 border-t border-white/10 glass px-4 py-3 safe-bottom">
        <Button
          onClick={submit}
          disabled={submitting}
          className={cn(
            "h-12 w-full rounded-xl bg-purple-400 text-base font-semibold text-black transition active:scale-95 disabled:opacity-60",
            !submitting && "vibe-pulse",
          )}
        >
          {submitting ? (
            "Launching…"
          ) : (
            <>
              <Sparkles className="mr-1.5 h-4 w-4" /> Launch Vibe
            </>
          )}
        </Button>
      </footer>

      {/* Media picker dialog — preset cover images + stock videos */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[85vh] w-full max-w-[440px] gap-3 rounded-3xl border-purple-400/20 bg-card/95 p-5 backdrop-blur-xl"
        >
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 font-display text-base">
              <ImagePlus className="h-4 w-4 text-purple-400" />
              Add photo or video
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground">
              Pick from presets · {mediaFull}/{MAX_MEDIA} added
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto fancy-scrollbar pr-1">
            {/* Preset cover images */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-purple-300">
                <ImagePlus className="h-3 w-3" /> Photos
              </div>
              <div className="grid grid-cols-3 gap-2">
                {COVER_PRESETS.map((url) => {
                  const selected = media.some((m) => m.url === url);
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => {
                        addMedia({ url, type: "image" });
                      }}
                      disabled={selected || mediaFull >= MAX_MEDIA}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-lg border transition active:scale-95",
                        selected
                          ? "border-purple-400 ring-2 ring-purple-400/50"
                          : "border-white/10 hover:border-purple-400/40",
                        mediaFull >= MAX_MEDIA && !selected && "opacity-40",
                      )}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      {selected && (
                        <span className="absolute inset-0 flex items-center justify-center bg-purple-400/40">
                          <Check className="h-4 w-4 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preset stock videos */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-purple-300">
                <Video className="h-3 w-3" /> Short clips
              </div>
              <div className="grid grid-cols-3 gap-2">
                {VIDEO_PRESETS.map((v) => {
                  const selected = media.some((m) => m.url === v.url);
                  return (
                    <button
                      key={v.url}
                      type="button"
                      onClick={() => addMedia({ url: v.url, type: "video" })}
                      disabled={selected || mediaFull >= MAX_MEDIA}
                      className={cn(
                        "relative aspect-square overflow-hidden rounded-lg border transition active:scale-95",
                        selected
                          ? "border-purple-400 ring-2 ring-purple-400/50"
                          : "border-white/10 hover:border-purple-400/40",
                        mediaFull >= MAX_MEDIA && !selected && "opacity-40",
                      )}
                    >
                      <img
                        src={v.poster}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                        <Play className="h-5 w-5 fill-white text-white" />
                      </span>
                      {selected && (
                        <span className="absolute inset-0 flex items-center justify-center bg-purple-400/40">
                          <Check className="h-4 w-4 text-white" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Videos play inline on the party detail screen. First media item
                becomes the cover photo in the feed.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground">
              {mediaFull} of {MAX_MEDIA} used
            </span>
            <Button
              type="button"
              size="sm"
              onClick={() => setPickerOpen(false)}
              className="h-9 rounded-xl bg-purple-400 px-4 text-xs font-semibold text-black hover:bg-purple-300"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        .vibe-slider { -webkit-appearance: none; appearance: none; border-radius: 999px; outline: none; }
        .vibe-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; border: 3px solid #ffcb05;
          box-shadow: 0 2px 8px rgba(255,203,5,0.6); cursor: pointer;
        }
        .vibe-slider::-moz-range-thumb {
          width: 20px; height: 20px; border-radius: 50%;
          background: #fff; border: 3px solid #ffcb05; cursor: pointer;
        }
      `}</style>
    </div>
  );
}
