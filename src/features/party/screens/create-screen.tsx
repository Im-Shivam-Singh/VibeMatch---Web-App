"use client";

import { useRef, useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  Music,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  spotifyPlaylistUrl: string;
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
  spotifyPlaylistUrl: "",
  menuItems: [],
};

// ── Validation Errors ─────────────────────────────────────────────
interface FieldErrors {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  city?: string;
  area?: string;
  vibes?: string;
  fee?: string;
  general?: string;
}

function validateStep(step: number, form: FormState): FieldErrors {
  const errors: FieldErrors = {};
  switch (step) {
    case 0:
      if (!form.title.trim()) errors.title = "Party name is required";
      else if (form.title.trim().length < 3) errors.title = "Name must be at least 3 characters";
      break;
    case 1:
      if (!form.date) errors.date = "Date is required";
      if (!form.time) errors.time = "Start time is required";
      if (!form.city.trim()) errors.city = "City is required";
      if (!form.area.trim()) errors.area = "Area is required";
      else if (form.area.trim().length < 2) errors.area = "Area must be at least 2 characters";
      break;
    case 2:
      if (form.vibes.length === 0) errors.vibes = "Pick at least one vibe";
      if (form.fee < 0) errors.fee = "Fee cannot be negative";
      break;
    case 3:
      break;
  }
  return errors;
}

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Form setters ────────────────────────────────────────────────
  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
      // Clear field error on change
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof FieldErrors];
        return next;
      });
    },
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
        .catch((e: Error) => {
          toast.error(e instanceof Error ? e.message : "Upload failed");
          setFieldErrors({ general: "Upload failed. Please try again." });
        })
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
        spotifyPlaylistUrl: form.spotifyPlaylistUrl.trim() || undefined,
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
      setFieldErrors({ general: e.message || "Couldn't create party. Please try again." });
    },
  });

  // ── Step validation ─────────────────────────────────────────────
  const canProceed = (): boolean => {
    const errors = validateStep(step, form);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    const errors = validateStep(step, form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      createMutation.mutate();
    }
  };

  const handleBack = () => {
    setFieldErrors({});
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
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.vibes;
      return next;
    });
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

  const goToStep = (newStep: number) => {
    // Validate all steps up to the target
    setFieldErrors({});
    setStep(newStep);
  };

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3 max-w-xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 rounded-full border-border/40 bg-card/50"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h2 className="font-display text-base font-bold text-foreground">
              Create a Party
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Step {step + 1} of {STEPS.length} · {STEPS[step].label}
            </p>
          </div>
          <Badge
            variant="outline"
            className="h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 border-purple-500/30 text-purple-300 p-0"
          >
            {(() => {
              const Icon = STEPS[step].icon;
              return <Icon className="h-4 w-4" />;
            })()}
          </Badge>
        </div>

        {/* Progress bar using shadcn Progress */}
        <div className="mt-3">
          <Progress
            value={((step + (canProceed() ? 1 : 0)) / STEPS.length) * 100}
            className="h-1.5 bg-muted/40 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-purple-500 [&>[data-slot=progress-indicator]]:to-violet-400"
          />
        </div>
      </div>

      {/* ── Upload progress overlay ──────────────────────────────────── */}
      {uploadPct !== null && (
        <Card className="mx-4 mt-3 max-w-xl mx-auto border-purple-500/30 bg-purple-500/10 rounded-xl">
          <CardContent className="flex items-center gap-3 p-3">
            <UploadCloud className="h-5 w-5 shrink-0 text-purple-400 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <p className="text-xs font-medium text-purple-200">Uploading media…</p>
              <Progress value={uploadPct} className="h-1.5 bg-purple-500/20 [&>[data-slot=progress-indicator]]:bg-purple-400" />
            </div>
            <span className="text-xs font-bold text-purple-300 tabular-nums">{uploadPct}%</span>
          </CardContent>
        </Card>
      )}

      {/* ── General error display ────────────────────────────────────── */}
      {fieldErrors.general && (
        <Card className="mx-4 mt-3 max-w-xl mx-auto border-red-500/30 bg-red-500/10 rounded-xl">
          <CardContent className="flex items-center gap-3 p-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-200">{fieldErrors.general}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFieldErrors({})}
              className="ml-auto shrink-0 border-red-500/30 text-red-300 hover:bg-red-500/10"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step content ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          key={step}
          className="absolute inset-0 fancy-scrollbar overflow-y-auto overflow-x-hidden px-4 py-5 max-w-xl mx-auto"
        >
          {step === 0 && (
            <StepBasics form={form} set={set} coverPresets={COVER_PRESETS} fieldErrors={fieldErrors} />
          )}
          {step === 1 && (
            <StepWhenWhere form={form} set={set} currency={currency} fieldErrors={fieldErrors} />
          )}
          {step === 2 && (
            <StepVibeSettings
              form={form}
              set={set}
              toggleVibe={toggleVibe}
              currency={currency}
              fieldErrors={fieldErrors}
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
        </div>
      </div>

      {/* ── Upload overlay (file input) ──────────────────────────────── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(e) => handleFilePick(e.target.files)}
      />

      {/* ── Bottom bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-xl px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          {/* Step dots with Badge */}
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
          <Button
            onClick={handleNext}
            disabled={createMutation.isPending}
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
        </div>
      </div>
    </div>
  );
}

// ── Field Error Component ─────────────────────────────────────────
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

// ── Step 1: Basics ────────────────────────────────────────────────
function StepBasics({
  form,
  set,
  coverPresets,
  fieldErrors,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  coverPresets: string[];
  fieldErrors: FieldErrors;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      {/* Title */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Party name
          </Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Friday Night R&B Rooftop"
            className={cn(
              "h-14 rounded-2xl border-border/50 bg-card/40 text-lg font-bold placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20",
              fieldErrors.title && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
            )}
            maxLength={60}
          />
          <div className="flex items-center justify-between">
            <FieldError message={fieldErrors.title} />
            <p className="text-right text-[10px] text-muted-foreground ml-auto">
              {form.title.length}/60
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Description */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
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
        </CardContent>
      </Card>

      {/* Cover image */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-3">
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => set("coverUrl", "")}
                className="absolute right-3 top-3 h-8 w-8 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 border-0"
              >
                <X className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                className="absolute right-3 bottom-3 gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/70 border-0"
              >
                <Camera className="h-3 w-3" />
                Change
              </Button>
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
                  <button
                    key={i}
                    onClick={() => set("coverUrl", url)}
                    className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-border/40 transition hover:border-purple-500/40"
                  >
                    <img
                      src={url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Step 2: When & Where ──────────────────────────────────────────
function StepWhenWhere({
  form,
  set,
  currency,
  fieldErrors,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  currency: string;
  fieldErrors: FieldErrors;
}) {
  return (
    <div className="space-y-6">
      {/* Date */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Date
          </Label>
          <div className="relative">
            <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={cn(
                "h-12 rounded-2xl border-border/50 bg-card/40 pl-10 text-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20",
                fieldErrors.date && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              )}
            />
          </div>
          <FieldError message={fieldErrors.date} />
        </CardContent>
      </Card>

      {/* Time */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Start time
          </Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="time"
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              className={cn(
                "h-12 rounded-2xl border-border/50 bg-card/40 pl-10 text-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20",
                fieldErrors.time && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              )}
            />
          </div>
          <FieldError message={fieldErrors.time} />
        </CardContent>
      </Card>

      {/* City */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            City
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Enter city"
              className={cn(
                "h-12 w-full rounded-2xl border-border/50 bg-card/40 pl-10 text-sm focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20",
                fieldErrors.city && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              )}
              maxLength={60}
            />
          </div>
          <FieldError message={fieldErrors.city} />
        </CardContent>
      </Card>

      {/* Area/Address */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Area / Address
          </Label>
          <Input
            value={form.area}
            onChange={(e) => set("area", e.target.value)}
            placeholder="Kensington, London"
            className={cn(
              "h-12 rounded-2xl border-border/50 bg-card/40 text-sm placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20",
              fieldErrors.area && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
            )}
            maxLength={100}
          />
          <FieldError message={fieldErrors.area} />
          <p className="text-[10px] text-muted-foreground">
            Exact address is revealed to guests only after payment
          </p>
        </CardContent>
      </Card>

      {/* Map preview placeholder */}
      {form.city && form.area && (
        <Card className="border-border/40 bg-card/30 rounded-2xl">
          <CardContent className="p-4 text-center">
            <MapPin className="mx-auto h-8 w-8 text-purple-400" />
            <p className="mt-2 text-xs text-muted-foreground">
              📍 {formatLocation(form.area, form.city)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Pin preview will appear here
            </p>
          </CardContent>
        </Card>
      )}

      {/* Security add-on */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4">
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
            <div className="mt-3 rounded-xl bg-teal-500/5 border border-teal-500/20 p-3">
              <p className="text-[11px] text-teal-300/80 leading-relaxed">
                ✅ A verified security person will be on-site. Guests see a
                &quot;Safe&quot; badge on your party — major trust signal,
                especially for women.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Step 3: Vibe & Settings ───────────────────────────────────────
function StepVibeSettings({
  form,
  set,
  toggleVibe,
  currency,
  fieldErrors,
}: {
  form: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  toggleVibe: (v: string) => void;
  currency: string;
  fieldErrors: FieldErrors;
}) {
  return (
    <div className="space-y-6">
      {/* Vibe multi-select */}
      <Card className={cn(
        "border-border/40 bg-card/30 rounded-2xl",
        fieldErrors.vibes && "border-red-500/30"
      )}>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Pick your vibes
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {VIBE_TAGS.map((vibe) => {
              const active = form.vibes.includes(vibe);
              const emoji = VIBE_EMOJI[vibe] || "✨";
              const colorCls = VIBE_COLORS[vibe] || "bg-purple-500/15 text-purple-300 border-purple-500/45";
              return (
                <button
                  key={vibe}
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
                    <Badge variant="secondary" className="absolute right-2 top-2 h-5 w-5 p-0 rounded-full bg-white/20 hover:bg-white/20 text-[10px] flex items-center justify-center border-0">
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
          {fieldErrors.vibes && (
            <p className="flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3 w-3 shrink-0" />
              {fieldErrors.vibes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Max guests slider */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Max guests
            </Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  set("maxGuests", Math.max(2, form.maxGuests - 5))
                }
                className="h-7 w-7 rounded-lg border-border/40 bg-card/30"
              >
                <Minus className="h-3 w-3" />
              </Button>
              <Badge variant="outline" className="w-10 justify-center text-lg font-bold tabular-nums border-border/40">
                {form.maxGuests}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  set("maxGuests", Math.min(200, form.maxGuests + 5))
                }
                className="h-7 w-7 rounded-lg border-border/40 bg-card/30"
              >
                <Plus className="h-3 w-3" />
              </Button>
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
        </CardContent>
      </Card>

      {/* Entry fee */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
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
              className={cn(
                "h-12 rounded-2xl border-border/50 bg-card/40 pl-8 text-sm font-bold focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20",
                fieldErrors.fee && "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              )}
            />
          </div>
          <FieldError message={fieldErrors.fee} />
          <p className="text-[10px] text-muted-foreground">
            {form.fee === 0
              ? "Free entry — great for first-time hosts to build ratings"
              : `${currency}${form.fee} per guest · platform fee applies`}
          </p>
        </CardContent>
      </Card>

      {/* Approval toggle */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Accept walk-ins toggle */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4">
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
        </CardContent>
      </Card>

      {/* Spotify Playlist */}
      <Card className="border-border/40 bg-card/30 rounded-2xl">
        <CardContent className="p-4 space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Spotify Playlist
          </Label>
          <div className="relative">
            <Music className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-400" />
            <Input
              value={form.spotifyPlaylistUrl}
              onChange={(e) => set("spotifyPlaylistUrl", e.target.value)}
              placeholder="Paste a Spotify playlist link"
              className="h-12 rounded-2xl border-border/50 bg-card/40 pl-10 text-sm focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Optional — embed a playlist so guests can preview the vibes
          </p>
        </CardContent>
      </Card>
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
      <Card className="border-purple-500/20 bg-purple-500/5 rounded-2xl">
        <CardContent className="flex items-start gap-3 p-4">
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
        </CardContent>
      </Card>

      {/* Category tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
        {MENU_CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            variant={menuCat === cat.key ? "default" : "outline"}
            size="sm"
            onClick={() => setMenuCat(cat.key)}
            className={cn(
              "rounded-full text-xs font-semibold gap-1.5",
              menuCat === cat.key
                ? "bg-purple-500/15 text-purple-200 border-purple-500/50 hover:bg-purple-500/20"
                : "border-border/40 bg-card/30 text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Menu items */}
      <div className="space-y-3">
        {form.menuItems
          .filter((item) => item.category === menuCat)
          .map((item) => (
            <Card key={item.id} className="border-border/40 bg-card/30 rounded-2xl">
              <CardContent className="p-3 space-y-3">
                <div className="flex items-center gap-2">
                  {/* Emoji picker trigger */}
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setEmojiPickerOpen(
                        emojiPickerOpen === item.id ? null : item.id,
                      )
                    }
                    className="h-10 w-10 shrink-0 rounded-xl text-lg hover:border-purple-500/30"
                  >
                    {item.emoji}
                  </Button>
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
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeMenuItem(item.id)}
                    className="h-10 w-10 shrink-0 rounded-xl border-border/40 text-muted-foreground hover:text-red-400 hover:border-red-400/30"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Emoji picker dropdown */}
                {emojiPickerOpen === item.id && (
                  <div className="flex flex-wrap gap-1.5 overflow-hidden">
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
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Add item button */}
      <Button
        variant="outline"
        onClick={addMenuItem}
        className="w-full h-12 gap-2 rounded-2xl border-2 border-dashed border-border/50 bg-card/20 font-semibold text-muted-foreground hover:border-purple-500/30 hover:text-purple-300 hover:bg-purple-500/5"
      >
        <Plus className="h-4 w-4" />
        Add {MENU_CATEGORIES.find((c) => c.key === menuCat)?.label.slice(0, -1)} item
      </Button>

      {/* Menu preview */}
      {form.menuItems.length > 0 && (
        <Card className="border-border/40 bg-card/30 rounded-2xl">
          <CardContent className="p-3 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Menu preview
            </p>
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
                <Badge variant="outline" className="font-bold text-purple-300 border-purple-500/30">
                  {currency}{item.price}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
