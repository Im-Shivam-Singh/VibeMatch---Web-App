"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ChevronLeft, Minus, Plus, Lock, ShieldCheck, CreditCard, Smartphone, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  currencyForCity,
  formatDateLabel,
  type MenuItem,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PaymentMethod = "visa" | "applepay" | "googlepay";

const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  sub?: string;
  icon: typeof CreditCard;
}[] = [
  { id: "visa", label: "Visa ending 4242", sub: "Default card", icon: CreditCard },
  { id: "applepay", label: "Apple Pay", icon: Smartphone },
  { id: "googlepay", label: "Google Pay", icon: Wallet },
];

export function PaymentScreen() {
  const partyId = useAppStore((s) => s.selectedPartyId);
  const currentUser = useAppStore((s) => s.currentUser);
  const goBack = useAppStore((s) => s.goBack);
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedOrderId = useAppStore((s) => s.setSelectedOrderId);

  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("visa");
  const [submitting, setSubmitting] = useState(false);

  const partyQuery = useQuery({
    queryKey: ["party", partyId],
    queryFn: () => api.getParty(partyId!),
    enabled: !!partyId,
  });

  const menuQuery = useQuery({
    queryKey: ["menu", partyId],
    queryFn: () => api.listMenu(partyId!),
    enabled: !!partyId,
  });

  const party = partyQuery.data?.party;
  const menuItems: MenuItem[] = menuQuery.data?.items ?? [];
  const currency = party ? currencyForCity(party.city) : "£";

  const addOnCount = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + (q ?? 0), 0),
    [quantities],
  );

  const menuTotal = useMemo(
    () => menuItems.reduce((sum, item) => sum + item.price * (quantities[item.id] ?? 0), 0),
    [menuItems, quantities],
  );

  const entryFee = party?.fee ?? 0;
  const total = entryFee + menuTotal;

  const formatPrice = (n: number) => `${currency}${n.toFixed(2)}`;

  const orderMutation = useMutation({
    mutationFn: (items: { menuItemId?: string; name: string; emoji: string; unitPrice: number; quantity: number }[]) =>
      api.createOrder({ userId: currentUser!.id, partyId: partyId!, items }),
    onSuccess: (data) => {
      setSelectedOrderId(data.order.id);
      toast.success("Spot secured!", { description: "Your ticket + add-ons are locked in." });
      setScreen("confirmation");
    },
    onError: (err: Error) => {
      const msg = err.message || "";
      if (msg.toLowerCase().includes("session has expired") || msg.toLowerCase().includes("log in")) {
        toast.error("Session expired", { description: "Please log in again to continue." });
        setTimeout(() => { useAppStore.getState().logout(); }, 1500);
      } else {
        toast.error("Payment failed", { description: msg || "Something went wrong. Please try again." });
      }
    },
  });

  const submit = (skipDrinks = false) => {
    if (!party || !currentUser || !partyId) return;
    if (submitting) return;
    setSubmitting(true);
    const items: { menuItemId?: string; name: string; emoji: string; unitPrice: number; quantity: number }[] = [
      { name: "Entry ticket", emoji: "🎟️", unitPrice: party.fee, quantity: 1 },
    ];
    if (!skipDrinks) {
      for (const item of menuItems) {
        const q = quantities[item.id] ?? 0;
        if (q > 0) items.push({ menuItemId: item.id, name: item.name, emoji: item.emoji, unitPrice: item.price, quantity: q });
      }
    }
    orderMutation.mutate(items, { onSettled: () => setSubmitting(false) });
  };

  const setQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[id] ?? 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  // Guard
  if (!partyId || !currentUser) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Pick a party to confirm your spot.</p>
        <Button variant="outline" onClick={() => setScreen("home")}>Browse parties</Button>
      </div>
    );
  }

  // Loading
  if (partyQuery.isLoading || !party) {
    return (
      <div className="flex h-full flex-col">
        <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-2 w-44" />
            </div>
          </div>
        </header>
        <div className="space-y-4 p-4">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-16 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-20 border-b border-white/[0.06] bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]"
      >
        <div className="flex items-center gap-3">
          <motion.button
            onClick={goBack}
            whileTap={{ scale: 0.9 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] text-white/80 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Step 4 of 9 · Checkout
            </span>
            <h1 className="font-display text-lg font-bold leading-tight text-foreground">
              Confirm your spot
            </h1>
            <p className="truncate text-[11px] text-muted-foreground">
              {party.title} · {formatDateLabel(party.date)}
            </p>
          </div>
        </div>
      </motion.header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto p-4 pb-32">
        {/* Order summary */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Order Summary
            </span>
          </div>
          {/* Entry ticket */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20 shadow-[0_0_16px_-4px_rgba(83,74,183,0.2)]">
                <span className="text-lg">🎟️</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">1 × entry ticket</p>
                <p className="truncate text-[11px] text-muted-foreground">{party.title}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-base font-semibold text-purple-200">{formatPrice(party.fee)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground/50">Fixed</p>
            </div>
          </div>
        </motion.section>

        {/* Add drinks & snacks */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <div className="mb-1 flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-semibold text-foreground">
                Add drinks & snacks
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Like ordering at a cinema — pick up at the door
              </p>
            </div>
            <span className="rounded-lg border border-teal-500/25 bg-teal-500/[0.08] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-teal-300">
              Optional
            </span>
          </div>

          {menuQuery.isLoading ? (
            <div className="mt-3 space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : menuItems.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-white/[0.08] p-4 text-center">
              <p className="text-xs text-muted-foreground">No pre-order menu for this party.</p>
            </div>
          ) : (
            <ul className="mt-3 space-y-1">
              {menuItems.map((item) => {
                const qty = quantities[item.id] ?? 0;
                return (
                  <li key={item.id} className="flex items-center gap-3 rounded-xl px-1 py-2.5">
                    <span className="shrink-0 text-xl">{item.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-purple-300/80">{formatPrice(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        onClick={() => setQty(item.id, -1)}
                        disabled={qty === 0}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Remove one ${item.name}`}
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border transition",
                          qty === 0
                            ? "cursor-not-allowed border-white/[0.06] text-white/20"
                            : "border-purple-500/30 text-purple-200 hover:bg-purple-500/10",
                        )}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </motion.button>
                      <span className="w-5 text-center text-sm font-medium tabular-nums text-foreground">
                        {qty}
                      </span>
                      <motion.button
                        type="button"
                        onClick={() => setQty(item.id, 1)}
                        whileTap={{ scale: 0.9 }}
                        aria-label={`Add one ${item.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/30 text-purple-200 transition hover:bg-purple-500/10"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </motion.button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </motion.section>

        {/* Payment method */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <h2 className="mb-3 font-display text-base font-semibold text-foreground">
            Payment method
          </h2>
          <ul className="space-y-1">
            {PAYMENT_METHODS.map((m) => {
              const selected = paymentMethod === m.id;
              const Icon = m.icon;
              return (
                <li key={m.id}>
                  <motion.button
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                      selected ? "bg-purple-500/10 border border-purple-500/20" : "hover:bg-white/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
                        selected ? "border-purple-400 bg-purple-500" : "border-white/20",
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                    </span>
                    <Icon className={cn("h-4 w-4", selected ? "text-purple-300" : "text-muted-foreground")} />
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", selected ? "text-foreground" : "text-foreground/80")}>
                        {m.label}
                      </p>
                      {m.sub && <p className="text-xs text-muted-foreground">{m.sub}</p>}
                    </div>
                  </motion.button>
                </li>
              );
            })}
          </ul>
        </motion.section>

        {/* Total + CTA */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="pt-2"
        >
          <div className="flex items-end justify-between border-t border-white/[0.06] pt-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-[10px] text-muted-foreground/50">
                Entry + {addOnCount} add-on{addOnCount === 1 ? "" : "s"}
              </p>
            </div>
            <p className="font-display text-3xl font-bold tabular-nums text-foreground">
              {formatPrice(total)}
            </p>
          </div>

          <motion.div whileTap={{ scale: 0.98 }}>
            <Button
              type="button"
              onClick={() => submit(false)}
              disabled={submitting}
              className="mt-4 h-12 w-full rounded-2xl bg-purple-500 text-base font-semibold text-white shadow-[0_0_24px_-4px_rgba(83,74,183,0.5)] hover:bg-purple-400 disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Processing…
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Pay {formatPrice(total)} · confirm spot 🔒
                </>
              )}
            </Button>
          </motion.div>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => submit(true)}
              disabled={submitting}
              className="text-xs font-medium text-purple-300/60 underline-offset-2 transition hover:text-purple-300 hover:underline disabled:opacity-50"
            >
              Skip drinks for now · entry only
            </button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground/40">
            <ShieldCheck className="h-3 w-3" />
            Secured by Stripe · refundable if host cancels
          </p>
        </motion.section>
      </div>
    </div>
  );
}
