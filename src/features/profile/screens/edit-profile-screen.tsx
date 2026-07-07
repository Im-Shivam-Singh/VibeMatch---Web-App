"use client";

import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  Check,
  Camera,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { PROFESSIONS, VIBE_TAGS, VIBE_EMOJI, VIBE_COLORS, parseVibes } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateUser(currentUser!.id, {
        name,
        username,
        bio,
        city,
        profession: profession || undefined,
        instagram,
        avatarUrl,
        vibePrefs: selectedVibes.join(","),
      }),
    onSuccess: (data) => {
      setCurrentUser(data.user);
      qc.invalidateQueries({ queryKey: ["user", currentUser?.id] });
      toast.success("Profile updated ✨");
      goBack();
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const toggleVibe = (tag: string) => {
    setSelectedVibes((prev) =>
      prev.includes(tag) ? prev.filter((v) => v !== tag) : [...prev, tag],
    );
  };

  if (!currentUser) return null;

  return (
    <div className="flex min-h-[100dvh] w-full max-w-[100vw] overflow-x-hidden flex-col animate-screen-in">
      {/* ---- Sticky header ---- */}
      <header className="sticky top-0 z-20 flex items-center gap-2 glass-strong border-b border-white/[0.08] px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold text-white">
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
              : "bg-white/[0.06] text-white/30",
          )}
        >
          {saveMutation.isPending ? (
            <motion.span
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
              className="inline-block h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
            />
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
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
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
        </motion.section>

        {/* ---- Form fields ---- */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="space-y-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5"
        >
          {/* Name */}
          <Field label="Name" count={`${name.length}/${NAME_MAX}`}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, NAME_MAX))}
              className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-purple-bright/50 focus-visible:border-purple-bright/60"
              placeholder="Your full name"
            />
          </Field>

          {/* Username */}
          <Field label="Username">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-purple-bright/80">
                @
              </span>
              <Input
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase(),
                  )
                }
                className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] pl-7 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-purple-bright/50 focus-visible:border-purple-bright/60"
                placeholder="viber123"
              />
              {username.length > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Check className="h-4 w-4 text-teal-bright" />
                </span>
              )}
            </div>
          </Field>

          {/* Bio */}
          <Field label="Bio" count={`${bio.length}/${BIO_MAX}`}>
            <Textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
              className="rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-purple-bright/50 focus-visible:border-purple-bright/60 resize-none"
              placeholder="Tell people what kind of night-owl you are…"
            />
          </Field>

          {/* City */}
          <Field label="City">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Enter your city"
              className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-purple-bright/50 focus-visible:border-purple-bright/60"
              maxLength={60}
            />
          </Field>

          {/* Profession */}
          <Field label="Profession">
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none transition focus:border-purple-bright/60 focus:ring-2 focus:ring-purple-bright/40"
            >
              <option value="" className="bg-[#110f1f] text-white">
                Select profession…
              </option>
              {PROFESSIONS.map((p) => (
                <option key={p} value={p} className="bg-[#110f1f] text-white">
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
                className="h-12 rounded-xl border-white/[0.08] bg-white/[0.04] pl-7 text-white placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-purple-bright/50 focus-visible:border-purple-bright/60"
                placeholder="your.handle"
              />
            </div>
          </Field>
        </motion.div>

        {/* ---- Vibe preferences ---- */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.4 }}
        >
          <h3 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">
            Vibe Preferences
          </h3>
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map((tag) => {
              const isSelected = selectedVibes.includes(tag);
              const colorClasses = VIBE_COLORS[tag] || "";
              return (
                <motion.button
                  key={tag}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => toggleVibe(tag)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium border transition-all duration-200",
                    isSelected
                      ? colorClasses
                      : "bg-white/[0.04] text-white/40 border-white/[0.08] hover:bg-white/[0.08] hover:text-white/60",
                  )}
                >
                  <span aria-hidden>{VIBE_EMOJI[tag]}</span>
                  {tag}
                </motion.button>
              );
            })}
          </div>
        </motion.section>

        {/* ---- Delete account ---- */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.24 }}
        >
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center gap-2 text-sm font-medium text-red-400/80 transition hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
            Delete Account
          </button>
        </motion.section>
      </div>

      {/* ---- Delete confirmation dialog ---- */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-[#18152e] border border-white/[0.08] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-center mb-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15 border border-red-500/30">
                  <AlertTriangle className="h-7 w-7 text-red-400" />
                </span>
              </div>
              <h3 className="text-center font-display text-lg font-bold text-white">
                Delete Account?
              </h3>
              <p className="mt-2 text-center text-sm text-white/50">
                This action is permanent and cannot be undone. All your data,
                tickets, and party history will be lost.
              </p>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 rounded-xl bg-white/[0.06] py-3 text-sm font-semibold text-white/80 transition hover:bg-white/[0.1]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    toast.error("Account deletion is not available yet");
                    setShowDeleteDialog(false);
                  }}
                  className="flex-1 rounded-xl bg-red-500/20 py-3 text-sm font-semibold text-red-400 ring-1 ring-red-500/30 transition hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                      */
/* ------------------------------------------------------------------ */
function Field({
  label,
  count,
  children,
}: {
  label: string;
  count?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-xs uppercase tracking-[0.12em] text-white/60">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-bright shadow-[0_0_8px_rgba(127,119,221,0.7)]" />
          {label}
        </Label>
        {count && (
          <span className="text-[11px] tabular-nums text-white/30">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}
