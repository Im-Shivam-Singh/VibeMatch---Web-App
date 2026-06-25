"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Check, Camera } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { CITIES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/vibe/user-avatar";

const AVATAR_PRESETS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80&auto=format&fit=crop",
];

export function EditProfileScreen() {
  const goBack = useAppStore((s) => s.goBack);
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const qc = useQueryClient();

  const [name, setName] = useState(currentUser?.name || "");
  const [username, setUsername] = useState(currentUser?.username || "");
  const [bio, setBio] = useState(currentUser?.bio || "");
  const [city, setCity] = useState(currentUser?.city || "Mumbai");
  const [instagram, setInstagram] = useState(currentUser?.instagram || "");
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || AVATAR_PRESETS[0]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.updateUser(currentUser!.id, {
        name,
        username,
        bio,
        city,
        instagram,
        avatarUrl,
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

  if (!currentUser) return null;

  return (
    <div className="flex h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 glass border-b border-border/60 px-3 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <button
          onClick={goBack}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 font-display text-lg font-bold">Edit profile</h1>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          size="sm"
          className="rounded-full vibe-gradient-bg"
        >
          <Check className="mr-1 h-4 w-4" /> Save
        </Button>
      </header>

      <div className="fancy-scrollbar flex-1 space-y-6 overflow-y-auto p-4">
        {/* Avatar */}
        <section className="flex flex-col items-center gap-3">
          <div className="relative">
            <UserAvatar name={name || "You"} src={avatarUrl} size={96} ring />
            <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full vibe-gradient-bg ring-4 ring-background">
              <Camera className="h-4 w-4 text-white" />
            </span>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
            {AVATAR_PRESETS.map((u) => (
              <button
                key={u}
                onClick={() => setAvatarUrl(u)}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 transition ${
                  avatarUrl === u ? "border-pink" : "border-transparent opacity-70"
                }`}
              >
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>

        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl"
          />
        </Field>

        <Field label="Username">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              @
            </span>
            <Input
              value={username}
              onChange={(e) =>
                setUsername(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())
              }
              className="h-12 rounded-xl pl-7"
              placeholder="viber123"
            />
          </div>
        </Field>

        <Field label="Bio">
          <Textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            className="rounded-xl"
            placeholder="Tell people what kind of night-owl you are…"
          />
          <p className="text-right text-[11px] text-muted-foreground">
            {bio.length}/160
          </p>
        </Field>

        <Field label="City">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-12 w-full rounded-xl border border-border/60 bg-background/60 px-3 text-sm outline-none focus:border-pink/50"
          >
            {CITIES.map((c) => (
              <option key={c} value={c} className="bg-card">
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Instagram (optional)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              @
            </span>
            <Input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="h-12 rounded-xl pl-7"
              placeholder="your.handle"
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </section>
  );
}
