"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  Check,
  Camera,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PROFESSIONS, VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS, parseVibes } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn } from "@/lib/utils";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80&auto=format&fit=crop",
];

const BIO_MAX = 150;
const NAME_MAX = 40;

export function EditProfileScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const qc = useQueryClient();

  const [name, setName] = useState(currentUser?.name || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [city, setCity] = useState(currentUser?.city || "");
  const [profession, setProfession] = useState(currentUser?.profession || "");
  const [instagram, setInstagram] = useState(currentUser?.instagram || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || AVATAR_PRESETS[0]);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Vibe prefs from user data
  const initialVibes = useMemo(
    () => parseVibes(currentUser?.vibePrefs || ""),
    [currentUser?.vibePrefs],
  );
  const [selectedVibes, setSelectedVibes] = useState<string[]>(initialVibes);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Check for changes
  const hasChanges = useMemo(() => {
    if (!currentUser) return false;
    return (
      name !== (currentUser.name || "") ||
      username !== (currentUser.username || "") ||
      bio !== (currentUser.bio || "") ||
      city !== (currentUser.city || "Mumbai") ||
      profession !== (currentUser.profession || "") ||
      instagram !== (currentUser.instagram || "") ||
      avatarUrl !== (currentUser.avatarUrl || AVATAR_PRESETS[0]) ||
      selectedVibes.sort().join(",") !== initialVibes.sort().join(",")
    );
  }, [name, username, bio, city, profession, instagram, avatarUrl, selectedVibes, currentUser, initialVibes]);

  // Form validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (name.length > NAME_MAX) {
      newErrors.name = `Name must be ${NAME_MAX} characters or less`;
    }
    if (bio.length > BIO_MAX) {
      newErrors.bio = `Bio must be ${BIO_MAX} characters or less`;
    }
    if (username && !/^[a-z0-9_]+$/.test(username)) {
      newErrors.username = "Username can only contain lowercase letters, numbers, and underscores";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!validate()) {
        throw new Error("Please fix the validation errors");
      }
      return api.updateUser(currentUser!.id, {
        name,
        username,
        bio,
        city,
        profession: profession || undefined,
        instagram,
        avatarUrl,
        vibePrefs: selectedVibes.join(","),
      });
    },
    onSuccess: (data) => {
      setCurrentUser(data.user);
      qc.invalidateQueries({ queryKey: ["user", currentUser?.id] });
      toast.success("Profile updated ✨");
      goBack();
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Failed to save";
      // If it's a validation error, we already showed it in the form
      if (msg !== "Please fix the validation errors") {
        toast.error(msg);
      }
    },
  });

  const toggleVibe = (tag: string) => {
    setSelectedVibes((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag],
    );
  };

  if (!currentUser) return null;

  return (
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col animate-screen-in">
      {/* ---- Sticky header ---- */}
      <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-border px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <Button
          variant="ghost"
          size="icon"
          onClick={goBack}
          className="h-9 w-9 rounded-full text-foreground/70 hover:bg-muted/50 hover:text-foreground"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="flex-1 font-display text-lg font-bold text-foreground">
          Edit Profile
        </h1>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !hasChanges}
          size="sm"
          className={cn(
            "rounded-full font-semibold transition-all",
            hasChanges
              ? "bg-purple-bright text-white hover:bg-purple-bright/90 shadow-lg shadow-purple/30"
              : "bg-muted text-muted-foreground",
          )}
        >
          {saveMutation.isPending ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
          ) : (
            <>
              <Check className="mr-1 h-4 w-4" /> Save
            </>
          )}
        </Button>
      </header>

      {/* ---- Scrollable body ---- */}
      <div className="fancy-scrollbar flex-1 space-y-6 overflow-y-auto overflow-x-hidden p-4 pb-12">
        {/* ---- Avatar section ---- */}
        <section className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="rounded-full bg-gradient-to-br from-purple-bright via-purple to-teal p-[3px]">
              <div className="rounded-full bg-background p-[2px]">
                <UserAvatar name={name || "You"} src={avatarUrl} size={100} />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-purple-bright ring-4 ring-background shadow-lg shadow-purple/30">
              <Camera className="h-4 w-4 text-white" />
            </span>
          </div>

          {/* Avatar picker */}
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto px-2">
            {AVATAR_PRESETS.map((u) => (
              <button
                key={u}
                onClick={() => setAvatarUrl(u)}
                className={cn(
                  "h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 transition-all duration-200",
                  avatarUrl === u
                    ? "border-purple-bright shadow-lg shadow-purple/30 scale-105"
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-purple-bright/50",
                )}
              >
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        {/* ---- Form fields ---- */}
        <Card className="gap-0 py-0 border-border/50">
          <CardContent className="space-y-5 p-5">
            {/* Name */}
            <Field label="Name" count={`${name.length}/${NAME_MAX}`} error={errors.name}>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value.slice(0, NAME_MAX));
                  if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
                }}
                className={cn(
                  "h-12 rounded-xl bg-muted/50 placeholder:text-muted-foreground",
                  errors.name && "border-destructive focus-visible:ring-destructive/50",
                )}
                placeholder="Your full name"
              />
            </Field>

            {/* Username */}
            <Field label="Username" error={errors.username}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-purple-bright/80">
                  @
                </span>
                <Input
                  value={username}
                  onChange={(e) => {
                    setUsername(
                      e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase(),
                    );
                    if (errors.username) setErrors((prev) => ({ ...prev, username: "" }));
                  }}
                  className={cn(
                    "h-12 rounded-xl bg-muted/50 pl-7 placeholder:text-muted-foreground",
                    errors.username && "border-destructive focus-visible:ring-destructive/50",
                  )}
                  placeholder="viber123"
                />
                {username.length > 0 && !errors.username && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-4 w-4 text-teal-bright" />
                  </span>
                )}
              </div>
            </Field>

            {/* Bio */}
            <Field label="Bio" count={`${bio.length}/${BIO_MAX}`} error={errors.bio}>
              <Textarea
                rows={3}
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value.slice(0, BIO_MAX));
                  if (errors.bio) setErrors((prev) => ({ ...prev, bio: "" }));
                }}
                className={cn(
                  "rounded-xl bg-muted/50 placeholder:text-muted-foreground resize-none",
                  errors.bio && "border-destructive focus-visible:ring-destructive/50",
                )}
                placeholder="Tell people what kind of night-owl you are…"
              />
            </Field>

            <Separator />

            {/* City */}
            <Field label="City">
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter your city"
                className="h-12 rounded-xl bg-muted/50 placeholder:text-muted-foreground"
                maxLength={60}
              />
            </Field>

            {/* Profession */}
            <Field label="Profession">
              <select
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="h-12 w-full rounded-xl border border-border bg-muted/50 px-3 text-sm text-foreground outline-none transition focus:border-purple-bright/60 focus:ring-2 focus:ring-purple-bright/40"
              >
                <option value="" className="bg-background text-foreground">
                  Select profession…
                </option>
                {PROFESSIONS.map((p) => (
                  <option key={p} value={p} className="bg-background text-foreground">
                    {p}
                  </option>
                ))}
              </select>
            </Field>

            {/* Instagram */}
            <Field label="Instagram (optional)">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-purple-bright/80">
                  @
                </span>
                <Input
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="h-12 rounded-xl bg-muted/50 pl-7 placeholder:text-muted-foreground"
                  placeholder="your.handle"
                />
              </div>
            </Field>
          </CardContent>
        </Card>

        {/* ---- Vibe preferences ---- */}
        <section>
          <h3 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Vibe Preferences
          </h3>
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map((tag) => {
              const isSelected = selectedVibes.includes(tag);
              const colorClasses = VIBE_COLORS[tag] || "";
              return (
                <button
                  key={tag}
                  onClick={() => toggleVibe(tag)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all duration-200",
                    isSelected
                      ? colorClasses
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span aria-hidden>{VIBE_EMOJI[tag]}</span>
                  {tag}
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- Delete account ---- */}
        <section>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteDialog(true)}
            className="gap-2 text-red-400/80 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </Button>
        </section>
      </div>

      {/* ---- Delete confirmation dialog ---- */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl border-border glass-strong">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-2">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                <AlertTriangle className="h-7 w-7 text-red-400" />
              </span>
            </div>
            <AlertDialogTitle className="text-center font-display text-lg font-bold text-foreground">
              Delete Account?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              This action is permanent and cannot be undone. All your data,
              tickets, and party history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                toast.error("Account deletion is not available yet");
                setShowDeleteDialog(false);
              }}
              className="rounded-xl bg-red-500/20 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                      */
/* ------------------------------------------------------------------ */
function Field({
  label,
  count,
  error,
  children,
}: {
  label: string;
  count?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-bright shadow-[0_0_8px_rgba(127,119,221,0.7)]" />
          {label}
        </Label>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[11px] text-destructive">{error}</span>
          )}
          {count && (
            <span className="text-[11px] tabular-nums text-muted-foreground">{count}</span>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
