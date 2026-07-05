"use client";

import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ImagePlus,
  Video,
  Play,
  X,
  CalendarDays,
  Clock,
  Users,
  Check,
  Sparkles,
  ShieldCheck,
  Info,
  UploadCloud,
  Loader2,
  Camera,
  MapPin,
  DollarSign,
  Plus,
  Minus,
  GripVertical,
  ArrowRight,
  ArrowLeft,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  CITIES,
  VIBE_TAGS,
  VIBE_EMOJI,
  VIBE_COLORS,
  currencyForCity,
  formatDateLabel,
  formatFee,
  formatTime,
  type PartyCreateInput,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn, formatLocation } from "@/lib/utils";

// ── Preset cover images ───────────────────────────────────────────
const COVER_PRESETS = [
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1483452389744-eaaf621f05cb?w=800&q=80&auto=format&fit=crop",
];

const VIDEO_PRESETS = [
  "https://player.vimeo.com/external/518607353.sd.mp4?s=0c8e1e2e2e5e5e5e5e5e5e5e5e5e5e5e5e5e1&profile=v",
];

// ── Emoji picker for menu items ───────────────────────────────────
const MENU_EMOJIS = [
  "🍹", "🍺", "🍷", "🥃", "🥂", "🍸", "🍾",
  "🍕", "🌮", "🍔", "🍿", "🥨", "🌭", "🍟",
  "🥤", "☕", "🧃", "🧊", "🍵", "🥛",
];

const MENU_CATEGORIES = [
  { key: "drink", label: "Drinks", emoji: "🍹" },
  { key: "snack", label: "Snacks", emoji: "🍿" },
  { key: "soft", label: "Soft", emoji: "🥤" },
] as const;

// ── Step definitions ──────────────────────────────────────────────
const STEPS = [
  { key: "basics", label: "Basics", icon: Sparkles },
  { key: "when", label: "When & Where", icon: CalendarDays },
  { key: "vibe", label: "Vibe & Settings", icon: Users },
  { key: "menu", label: "Menu", icon: Plus },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

// ── Form state ────────────────────────────────────────────────────
interface FormState {
  title: string;
  description: string;
  coverUrl: string;
  mediaFiles: { url: string; type: "image" | "video"; caption?: string }[];
  date: string;
  time: string;
  city: string;
  area: string;
  securityBooked: boolean;
  vibes: string[];
  maxGuests: number;
  fee: number;
  approvalRequired: boolean;
  acceptJoiners: boolean;
  menuItems: {
    id: string;
    name: string;
    price: number;
    emoji: string;
    category: "drink" | "snack" | "soft";
  }[];
}

const defaultForm: FormState = {
  title: "",
  description: "",
  coverUrl: "",
  mediaFiles: [],
  date: "",
  time: "",
  city: "",
  area: "",
  securityBooked: false,
  vibes: [],
  maxGuests: 20,
  fee: 0,
  approvalRequired: false,
  acceptJoiners: true,
  menuItems: [],
};

// ── Main Component ────────────────────────────────────────────────
export function CreateScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedPartyId = useAppStore((s) => s.setSelectedPartyId);
  const currentUser = useAppStore((s) => s.currentUser);
  const qc = useQueryClient();

  const [form, setForm] = useState<FormState>(defaultForm);
  const [step, setStep] = useState<number>(0);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Form setters ────────────────────────────────────────────────
  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  // ── Cover image upload ──────────────────────────────────────────
  const handleFilePick = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setUploadPct(0);
      api
        .uploadMedia(Array.from(fileList), (pct) => setUploadPct(pct))
        .then((res) => {
          for (const f of res.files) {
            if (f.type === "image" && !form.coverUrl) {
              set("coverUrl", f.url);
            }
            setForm((prev) => ({
              ...prev,
              mediaFiles: [
                ...prev.mediaFiles,
                { url: f.url, type: f.type, caption: "" },
              ],
              coverUrl:
                f.type === "image" && !prev.coverUrl ? f.url : prev.coverUrl,
            }));
          }
          toast.success("Media uploaded!");
        })
        .catch((e: Error) =>
          toast.error(e instanceof Error ? e.message : "Upload failed"),
        )
        .finally(() => setUploadPct(null));
      if (fileRef.current) fileRef.current.value = "";
    },
    [form.coverUrl],
  );

  // ── Create party ────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error("Sign in to create a party");
      const input: PartyCreateInput = {
        title: form.title.trim(),
        description: form.description.trim(),
        city: form.city,
        area: form.area.trim(),
        date: form.date,
        time: form.time,
        fee: form.fee,
        maxGuests: form.maxGuests,
        vibes: form.vibes,
        hostName: currentUser.name,
        coverUrl: form.coverUrl || undefined,
        securityBooked: form.securityBooked,
        securityFee: form.securityBooked ? 25 : undefined,
        media:
          form.mediaFiles.length > 0 ? form.mediaFiles : undefined,
      };
      const res = await api.createParty(input);
      return res.party;
    },
    onSuccess: (party) => {
      toast.success("Party created! 🎉", {
        description: "Your vibe is live. Let's get the word out.",
      });
      qc.invalidateQueries({ queryKey: ["parties"] });
      setSelectedPartyId(party.id);
      setScreen("detail");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Couldn't create party");
    },
  });

  // ── Step validation ─────────────────────────────────────────────
  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return form.title.trim().length >= 3;
      case 1:
        return form.date !== "" && form.time !== "" && form.city !== "" && form.area.trim().length >= 2;
      case 2:
        return form.vibes.length > 0;
      case 3:
        return true; // menu is optional
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      createMutation.mutate();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
    else goBack();
  };

  // ── Toggle vibe ─────────────────────────────────────────────────
  const toggleVibe = (vibe: string) => {
    setForm((f) => ({
      ...f,
      vibes: f.vibes.includes(vibe)
        ? f.vibes.filter((x) => x !== vibe)
        : [...f.vibes, vibe],
    }));
  };

  // ── Menu item helpers ───────────────────────────────────────────
  const addMenuItem = () => {
    const id = `menu-${Date.now()}`;
    setForm((f) => ({
      ...f,
      menuItems: [
        ...f.menuItems,
        { id, name: "", price: 0, emoji: "🍹", category: "drink" },
      ],
    }));
  };

  const updateMenuItem = (
    id: string,
    patch: Partial<FormState["menuItems"][0]>,
  ) => {
    setForm((f) => ({
      ...f,
      menuItems: f.menuItems.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  };

  const removeMenuItem = (id: string) => {
    setForm((f) => ({
      ...f,
      menuItems: f.menuItems.filter((item) => item.id !== id),
    }));
  };

  const currency = form.city ? currencyForCity(form.city) : "£";

  // ── Animation variants ──────────────────────────────────────────
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  const [direction, setDirection] = useState(0);

  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  return (
    <div className="flex h-full w-full max-w-[100vw] overflow-x-hidden flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleBack}
            whileTap={{ scale: 0.9 }}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border/40 bg-card/50 text-foreground transition hover:bg-card"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
          <div className="flex-1">
            <h2 className="font-display text-base font-bold text-foreground">
              Create a Party
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Step {step + 1} of {STEPS.length} · {STEPS[step].label}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 text-purple-300">
            {(() => {
              const Icon = STEPS[step].icon;
              return <Icon className="h-4 w-4" />;
            })()}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => i < step && goToStep(i)}
              className="flex-1 group"
              disabled={i > step}
            >
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40 transition-all">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    i < step
                      ? "bg-purple-500"
                      : i === step
                        ? "bg-gradient-to-r from-purple-500 to-violet-400"
                        : "bg-transparent",
                  )}
                  animate={{ width: i <= step ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Step content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 fancy-scrollbar overflow-y-auto px-4 py-5 max-w-full"
          >
            {step === 0 && (
              <StepBasics form={form} set={set} coverPresets={COVER_PRESETS} />
            )}
            {step === 1 && (
              <StepWhenWhere form={form} set={set} />
            )}
            {step === 2 && (
              <StepVibeSettings
                form={form}
                set={set}
                toggleVibe={toggleVibe}
                currency={currency}
              />
            )}
            {step === 3 && (
              <StepMenu
                form={form}
                addMenuItem={addMenuItem}
                updateMenuItem={updateMenuItem}
                removeMenuItem={removeMenuItem}
                currency={currency}
                emojiPickerOpen={emojiPickerOpen}
                setEmojiPickerOpen={setEmojiPickerOpen}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Upload overlay ──────────────────────────────────────────── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => handleFilePick(e.target.files)}
      />
      {uploadPct !== null && (
        <div className="fixed inset-x-0 top-0 z-50 h-1">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-violet-400"
            animate={{ width: `${uploadPct}%` }}
            transition={{ duration: 0.2 }}
          />
        </div>
      )}

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Step dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                onClick={() => i <= step && goToStep(i)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-bold transition",
                  i < step
                    ? "border-purple-500/40 bg-purple-500/10 text-purple-300"
                    : i === step
                      ? "border-purple-500/50 bg-purple-500/20 text-purple-200"
                      : "border-border/40 bg-card/30 text-muted-foreground",
                )}
              >
                {i < step ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span>{i + 1}</span>
                )}
                <span className="hidden md:inline">{s.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Back */}
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => goToStep(step - 1)}
              className="rounded-xl gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
          )}

          {/* Next / Create */}
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || createMutation.isPending}
              className={cn(
                "rounded-xl gap-1.5 font-bold",
                step === STEPS.length - 1
                  ? "bg-gradient-to-r from-purple-600 via-purple-500 to-violet-500 shadow-[0_4px_20px_-4px_rgba(139,92,246,0.5)] hover:shadow-[0_6px_24px_-4px_rgba(139,92,246,0.65)] text-white"
                  : "bg-primary text-primary-foreground",
              )}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : step === STEPS.length - 1 ? (
                <>
                  <PartyPopper className="h-4 w-4" />
                  Create Party
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Basics ────────────────────────────────────────────────
function StepBasics({
  form,
  set,
  coverPresets,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  coverPresets: string[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Party name
        </Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Friday Night R&B Rooftop"
          className="h-14 rounded-2xl border-border/50 bg-card/40 text-lg font-bold placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          maxLength={60}
        />
        <p className="text-right text-[10px] text-muted-foreground">
          {form.title.length}/60
        </p>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Description
        </Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Tell guests what to expect — music, crowd vibe, dress code, what to bring…"
          rows={4}
          className="rounded-2xl border-border/50 bg-card/40 text-sm placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          maxLength={500}
        />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            Be specific — hosts with detailed descriptions get 3× more requests
          </p>
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {form.description.length}/500
          </p>
        </div>
      </div>

      {/* Cover image */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Cover image
        </Label>

        {/* Upload zone */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const files = e.target.files;
            if (!files || files.length === 0) return;
            try {
              const res = await api.uploadMedia(Array.from(files));
              if (res.files[0]) {
                set("coverUrl", res.files[0].url);
                toast.success("Cover uploaded!");
              }
            } catch {
              toast.error("Upload failed");
            }
            if (fileRef.current) fileRef.current.value = "";
          }}
        />
        {form.coverUrl ? (
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={form.coverUrl}
              alt="Cover preview"
              className="h-48 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <button
              onClick={() => set("coverUrl", "")}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/70"
            >
              <Camera className="h-3 w-3" />
              Change
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border/60 bg-card/20 p-8 text-center transition hover:border-purple-500/40 hover:bg-purple-500/5 active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/10">
              <ImagePlus className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Upload cover image
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Drag & drop or click · JPG, PNG, WebP
              </p>
            </div>
          </button>
        )}

        {/* Preset covers */}
        {!form.coverUrl && (
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Or pick a preset
            </p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 max-w-full">
              {coverPresets.map((url, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => set("coverUrl", url)}
                  className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-border/40 transition hover:border-purple-500/40"
                >
                  <img
                    src={url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Step 2: When & Where ──────────────────────────────────────────
function StepWhenWhere({
  form,
  set,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Date */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Date
        </Label>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="date"
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="h-12 rounded-2xl border-border/50 bg-card/40 pl-10 text-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* Time */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Start time
        </Label>
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="time"
            value={form.time}
            onChange={(e) => set("time", e.target.value)}
            className="h-12 rounded-2xl border-border/50 bg-card/40 pl-10 text-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
      </div>

      {/* City */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          City
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className="h-12 w-full rounded-2xl border border-border/50 bg-card/40 pl-10 pr-4 text-sm text-foreground appearance-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
          >
            <option value="" disabled>
              Select city
            </option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Area/Address */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Area / Address
        </Label>
        <Input
          value={form.area}
          onChange={(e) => set("area", e.target.value)}
          placeholder="Kensington, London"
          className="h-12 rounded-2xl border-border/50 bg-card/40 text-sm placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          maxLength={100}
        />
        <p className="text-[10px] text-muted-foreground">
          Exact address is revealed to guests only after payment
        </p>
      </div>

      {/* Map preview placeholder */}
      {form.city && form.area && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-2xl border border-border/40 bg-card/30 p-4 text-center"
        >
          <MapPin className="mx-auto h-8 w-8 text-purple-400" />
          <p className="mt-2 text-xs text-muted-foreground">
            📍 {formatLocation(form.area, form.city)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground">
            Pin preview will appear here
          </p>
        </motion.div>
      )}

      {/* Security add-on */}
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10">
              <ShieldCheck className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Security add-on
              </p>
              <p className="text-[11px] text-muted-foreground">
                Licensed bouncer · {currency}25
              </p>
            </div>
          </div>
          <Switch
            checked={form.securityBooked}
            onCheckedChange={(v) => set("securityBooked", v)}
          />
        </div>
        {form.securityBooked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 rounded-xl bg-teal-500/5 border border-teal-500/20 p-3"
          >
            <p className="text-[11px] text-teal-300/80 leading-relaxed">
              ✅ A verified security person will be on-site. Guests see a
              &quot;Safe&quot; badge on your party — major trust signal,
              especially for women.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Step 3: Vibe & Settings ───────────────────────────────────────
function StepVibeSettings({
  form,
  set,
  toggleVibe,
  currency,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleVibe: (v: string) => void;
  currency: string;
}) {
  return (
    <div className="space-y-6">
      {/* Vibe multi-select */}
      <div className="space-y-3">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Pick your vibes
        </Label>
        <div className="grid grid-cols-2 gap-2">
          {VIBE_TAGS.map((vibe) => {
            const active = form.vibes.includes(vibe);
            const emoji = VIBE_EMOJI[vibe] || "✨";
            const colorCls = VIBE_COLORS[vibe] || "bg-purple-500/15 text-purple-300 border-purple-500/45";
            return (
              <motion.button
                key={vibe}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleVibe(vibe)}
                className={cn(
                  "relative flex items-center gap-2 rounded-2xl border p-3 text-left transition-all",
                  active
                    ? colorCls + " ring-2 ring-purple-400/50"
                    : "border-border/40 bg-card/30 text-foreground/60 hover:border-border/60",
                )}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-sm font-semibold truncate">{vibe}</span>
                {active && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/20"
                  >
                    <Check className="h-3 w-3" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
        {form.vibes.length === 0 && (
          <p className="text-[11px] text-amber-400">
            Pick at least one vibe so guests can find your party
          </p>
        )}
      </div>

      {/* Max guests slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Max guests
          </Label>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                set("maxGuests", Math.max(2, form.maxGuests - 5))
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 bg-card/30 text-foreground transition hover:bg-card/50"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-10 text-center text-lg font-bold text-foreground tabular-nums">
              {form.maxGuests}
            </span>
            <button
              onClick={() =>
                set("maxGuests", Math.min(200, form.maxGuests + 5))
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 bg-card/30 text-foreground transition hover:bg-card/50"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
        <Slider
          value={[form.maxGuests]}
          onValueChange={([v]) => set("maxGuests", v)}
          min={2}
          max={200}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Intimate (2)</span>
          <span>Massive (200)</span>
        </div>
      </div>

      {/* Entry fee */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Entry fee
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-300">
            {currency}
          </span>
          <Input
            type="number"
            min={0}
            value={form.fee || ""}
            onChange={(e) => set("fee", Math.max(0, Number(e.target.value)))}
            placeholder="0"
            className="h-12 rounded-2xl border-border/50 bg-card/40 pl-8 text-sm font-bold focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20"
          />
        </div>
        <p className="text-[10px] text-muted-foreground">
          {form.fee === 0
            ? "Free entry — great for first-time hosts to build ratings"
            : `${currency}${form.fee} per guest · platform fee applies`}
        </p>
      </div>

      {/* Approval toggle */}
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Approval required
            </p>
            <p className="text-[11px] text-muted-foreground">
              Guests must send an intro before joining
            </p>
          </div>
          <Switch
            checked={form.approvalRequired}
            onCheckedChange={(v) => set("approvalRequired", v)}
          />
        </div>
      </div>

      {/* Accept walk-ins toggle */}
      <div className="rounded-2xl border border-border/40 bg-card/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Accept walk-ins
            </p>
            <p className="text-[11px] text-muted-foreground">
              Let guests show up without pre-booking
            </p>
          </div>
          <Switch
            checked={form.acceptJoiners}
            onCheckedChange={(v) => set("acceptJoiners", v)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Menu (optional) ───────────────────────────────────────
function StepMenu({
  form,
  addMenuItem,
  updateMenuItem,
  removeMenuItem,
  currency,
  emojiPickerOpen,
  setEmojiPickerOpen,
}: {
  form: FormState;
  addMenuItem: () => void;
  updateMenuItem: (
    id: string,
    patch: Partial<FormState["menuItems"][0]>,
  ) => void;
  removeMenuItem: (id: string) => void;
  currency: string;
  emojiPickerOpen: string | null;
  setEmojiPickerOpen: (id: string | null) => void;
}) {
  const [menuCat, setMenuCat] = useState<string>("drink");

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Menu is optional
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
              Add drinks, snacks, and soft beverages guests can pre-order.
              Skip this step if your party doesn&apos;t have a menu.
            </p>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {MENU_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setMenuCat(cat.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
              menuCat === cat.key
                ? "border-purple-500/50 bg-purple-500/15 text-purple-200"
                : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground",
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-3">
        {form.menuItems
          .filter((item) => item.category === menuCat)
          .map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-2xl border border-border/40 bg-card/30 p-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                {/* Emoji picker trigger */}
                <button
                  onClick={() =>
                    setEmojiPickerOpen(
                      emojiPickerOpen === item.id ? null : item.id,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-card/50 text-lg hover:border-purple-500/30 transition"
                >
                  {item.emoji}
                </button>
                <Input
                  value={item.name}
                  onChange={(e) =>
                    updateMenuItem(item.id, { name: e.target.value })
                  }
                  placeholder="Item name"
                  className="h-10 flex-1 rounded-xl border-border/40 bg-card/40 text-sm"
                />
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-purple-300">
                    {currency}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={item.price || ""}
                    onChange={(e) =>
                      updateMenuItem(item.id, {
                        price: Math.max(0, Number(e.target.value)),
                      })
                    }
                    placeholder="0"
                    className="h-10 w-20 rounded-xl border-border/40 bg-card/40 pl-7 text-sm"
                  />
                </div>
                <button
                  onClick={() => removeMenuItem(item.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-card/30 text-muted-foreground transition hover:text-coral hover:border-coral/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Emoji picker dropdown */}
              <AnimatePresence>
                {emojiPickerOpen === item.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-1.5 overflow-hidden"
                  >
                    {MENU_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          updateMenuItem(item.id, { emoji });
                          setEmojiPickerOpen(null);
                        }}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg text-base transition hover:bg-purple-500/15",
                          item.emoji === emoji &&
                            "bg-purple-500/20 ring-1 ring-purple-400/50",
                        )}
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
      </div>

      {/* Add item button */}
      <button
        onClick={addMenuItem}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/50 bg-card/20 p-3.5 text-sm font-semibold text-muted-foreground transition hover:border-purple-500/30 hover:text-purple-300 hover:bg-purple-500/5"
      >
        <Plus className="h-4 w-4" />
        Add {MENU_CATEGORIES.find((c) => c.key === menuCat)?.label.slice(0, -1)} item
      </button>

      {/* Menu preview */}
      {form.menuItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Menu preview
          </p>
          <div className="rounded-2xl border border-border/40 bg-card/30 p-3 space-y-2">
            {form.menuItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{item.emoji}</span>
                  <span className="font-medium text-foreground">
                    {item.name || "Unnamed"}
                  </span>
                </span>
                <span className="font-bold text-purple-300">
                  {currency}
                  {item.price}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
