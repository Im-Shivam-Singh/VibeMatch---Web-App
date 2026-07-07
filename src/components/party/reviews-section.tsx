"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { relativeTime, type PartyReview } from "@/lib/types";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

interface ReviewsSectionProps {
  partyId: string;
  isInParty?: boolean;
}

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

export function ReviewsSection({ partyId, isInParty }: ReviewsSectionProps) {
  const qc = useQueryClient();
  const currentUser = useAppStore((s) => s.currentUser);
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryKey = useMemo(() => ["reviews", partyId] as const, [partyId]);

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: () => api.listReviews(partyId),
    enabled: !!partyId,
  });

  const reviews = data?.reviews ?? [];
  const avgRating = data?.avgRating ?? 0;
  const count = data?.count ?? 0;

  // Distribution: count per star level
  const distribution = useMemo(() => {
    const map: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const lvl = Math.max(1, Math.min(5, Math.round(r.rating)));
      map[lvl] = (map[lvl] || 0) + 1;
    }
    return map;
  }, [reviews]);

  const submitMutation = useMutation({
    mutationFn: (input: {
      rating: number;
      comment: string;
    }) => {
      if (!currentUser) {
        throw new Error("Sign in to leave a review");
      }
      return api.submitReview({
        partyId,
        userId: currentUser.id,
        rating: input.rating,
        comment: input.comment.trim(),
      });
    },
    onSuccess: () => {
      toast.success("Review posted! 🌟", {
        description: "Thanks for sharing your experience.",
      });
      qc.invalidateQueries({ queryKey });
      setDialogOpen(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Couldn't post review");
    },
  });

  if (isLoading) {
    return <ReviewsSkeleton />;
  }

  if (isError) {
    return (
      <section className="space-y-3">
        <SectionHeading />
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 text-center text-sm text-muted-foreground">
          Couldn't load reviews. Pull back to retry.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <SectionHeading />

      {/* Summary card */}
      <div className="rounded-3xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1">
              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
              <span className="font-display text-4xl font-extrabold leading-none">
                {avgRating > 0 ? avgRating.toFixed(1) : "—"}
              </span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              {count} {count === 1 ? "review" : "reviews"}
            </p>
          </div>

          {/* Distribution bars */}
          <div className="flex-1 space-y-1.5">
            {STAR_LEVELS.map((lvl) => {
              const c = distribution[lvl] || 0;
              const pct = count > 0 ? (c / count) * 100 : 0;
              return (
                <div
                  key={lvl}
                  className="flex items-center gap-2"
                  aria-label={`${lvl} star: ${c} reviews`}
                >
                  <span className="flex w-3 items-center justify-end text-[10px] text-muted-foreground">
                    {lvl}
                  </span>
                  <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-[10px] tabular-nums text-muted-foreground">
                    {c}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {isInParty ? (
          <Button
            onClick={() => setDialogOpen(true)}
            className="mt-4 h-11 w-full rounded-full bg-amber-400 text-black text-sm font-semibold hover:bg-amber-400"
          >
            <Star className="h-4 w-4" />
            Write a review
          </Button>
        ) : (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Join this party to leave a review
          </p>
        )}
      </div>

      {/* Reviews list / empty state */}
      {reviews.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No reviews yet"
          description="Be the first to share your experience"
          className="rounded-2xl border border-border/60 bg-card/40 py-8"
        />
      ) : (
        <ul className="space-y-2.5">
          {reviews.map((r) => (
            <ReviewItem key={r.id} review={r} />
          ))}
        </ul>
      )}

      <WriteReviewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(rating, comment) =>
          submitMutation.mutate({ rating, comment })
        }
        submitting={submitMutation.isPending}
      />
    </section>
  );
}

function SectionHeading() {
  return (
    <h2 className="flex items-center gap-1.5 font-display text-sm font-semibold">
      <MessageSquare className="h-4 w-4 text-amber-400" /> Reviews
    </h2>
  );
}

function ReviewItem({ review }: { review: PartyReview }) {
  const name = review.user?.name || "Anonymous";
  const avatarUrl = review.user?.avatarUrl ?? null;
  return (
    <li className="rounded-2xl border border-border/60 bg-card/40 p-3 transition-colors hover:border-amber-400/40">
      <div className="flex items-center gap-2.5">
        <UserAvatar name={name} src={avatarUrl} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <p className="truncate text-sm font-semibold">{name}</p>
            <span className="text-[11px] text-muted-foreground">
              {relativeTime(review.createdAt)}
            </span>
          </div>
          <Stars rating={review.rating} className="mt-0.5" />
        </div>
      </div>
      {review.comment && (
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {review.comment}
        </p>
      )}
    </li>
  );
}

function Stars({
  rating,
  className,
}: {
  rating: number;
  className?: string;
}) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((lvl) => (
        <Star
          key={lvl}
          className={cn(
            "h-3.5 w-3.5",
            lvl <= Math.round(rating)
              ? "fill-amber-400 text-amber-400"
              : "text-muted-foreground",
          )}
        />
      ))}
    </div>
  );
}

interface WriteReviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (rating: number, comment: string) => void;
  submitting: boolean;
}

const MAX_COMMENT = 280;
const MIN_COMMENT = 3;

function WriteReviewDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: WriteReviewDialogProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const canSubmit =
    rating >= 1 && comment.trim().length >= MIN_COMMENT && !submitting;

  const reset = () => {
    setRating(0);
    setHover(0);
    setComment("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(rating, comment);
    // Don't reset here — the dialog will be reset on close after success.
  };

  const displayRating = hover || rating;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="mx-auto max-w-[420px] rounded-3xl border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">
            <span className="text-amber-400">Review this party</span>
          </DialogTitle>
          <DialogDescription>
            Share your experience to help other viber heads
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star selector */}
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => {
                const active = lvl <= displayRating;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onMouseEnter={() => setHover(lvl)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(lvl)}
                    aria-label={`${lvl} star${lvl > 1 ? "s" : ""}`}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl border transition-all",
                      active
                        ? "bg-amber-400 border-transparent"
                        : "border-border/60 bg-background/40 hover:border-amber-400/40",
                    )}
                  >
                    <Star
                      className={cn(
                        "h-5 w-5 transition-colors",
                        active
                          ? "fill-white text-white"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {rating === 0
                ? "Tap a star to rate"
                : ratingLabel(rating)}
            </p>
          </div>

          {/* Comment */}
          <div className="space-y-1.5">
            <Textarea
              autoFocus
              rows={4}
              maxLength={MAX_COMMENT}
              placeholder="What was the vibe like? Crowd, music, host…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="rounded-xl bg-background/60"
            />
            <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
              <span>Min {MIN_COMMENT} characters</span>
              <span
                className={cn(
                  "tabular-nums",
                  comment.length > MAX_COMMENT - 30 && "text-amber-300",
                )}
              >
                {comment.length}/{MAX_COMMENT}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="ghost"
            onClick={() => handleClose(false)}
            disabled={submitting}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-xl bg-amber-400 text-black font-semibold hover:bg-amber-400"
          >
            {submitting ? (
              "Posting…"
            ) : (
              <>
                <Send className="h-4 w-4" /> Post review
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ratingLabel(r: number): string {
  switch (r) {
    case 5:
      return "Loved it 🔥";
    case 4:
      return "Great time ✨";
    case 3:
      return "It was okay";
    case 2:
      return "Not great";
    case 1:
      return "Didn't enjoy";
    default:
      return "";
  }
}

function ReviewsSkeleton() {
  return (
    <section className="space-y-3">
      <Skeleton className="h-4 w-24" />
      <div className="rounded-3xl border border-border/60 bg-card/50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="flex-1 space-y-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-1.5 w-full rounded-full" />
            ))}
          </div>
        </div>
        <Skeleton className="mt-4 h-11 w-full rounded-full" />
      </div>
      <div className="space-y-2.5">
        {[0, 1].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
