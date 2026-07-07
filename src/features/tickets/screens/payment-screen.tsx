"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronLeft, Minus, Plus, Lock, ShieldCheck, CreditCard, Smartphone, Wallet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import {
  currencyForCity,
  formatDateLabel,
  type MenuItem,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
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
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">Pick a party to confirm your spot.</p>
        <Button variant="outline" onClick={() => setScreen("home")}>Browse parties</Button>
      </div>
    );
  }

  // Error state for party query
  if (partyQuery.isError) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col items-center justify-center p-6">
        <EmptyState
          icon={RefreshCw}
          title="Couldn't load party"
          description="Something went wrong loading the party details. Please try again."
          action={
            <Button onClick={() => partyQuery.refetch()} className="bg-purple-bright text-white hover:bg-purple-bright/90">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  // Loading
  if (partyQuery.isLoading || !party) {
    return (
      <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
        <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
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
    <div className="flex min-h-[100dvh] w-full overflow-x-hidden flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/70 backdrop-blur-2xl px-4 py-3 pt-[max(env(safe-area-inset-top),12px)]">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={goBack}
            className="h-10 w-10 rounded-xl"
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
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
      </header>

      {/* Body */}
      <div className="fancy-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-4 pb-32">
        {/* Order summary */}
        <Card className="gap-0 py-0 border-border/50">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {/* Entry ticket */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 border border-purple-500/20">
                  <span className="text-lg">🎟️</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">1 × entry ticket</p>
                  <p className="truncate text-[11px] text-muted-foreground">{party.title}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-base font-semibold text-foreground">{formatPrice(party.fee)}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fixed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add drinks & snacks */}
        <Card className="gap-0 py-0 border-border/50">
          <CardContent className="p-4">
            <div className="mb-1 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-foreground">
                  Add drinks & snacks
                </h2>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Like ordering at a cinema — pick up at the door
                </p>
              </div>
              <Badge variant="outline" className="border-teal-500/25 bg-teal-500/10 text-teal-300 shrink-0">
                Optional
              </Badge>
            </div>

            {menuQuery.isLoading ? (
              <div className="mt-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : menuQuery.isError ? (
              <div className="mt-3 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">Failed to load menu</p>
                <Button variant="ghost" size="sm" onClick={() => menuQuery.refetch()}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Retry
                </Button>
              </div>
            ) : menuItems.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed border-border p-4 text-center">
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
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQty(item.id, -1)}
                          disabled={qty === 0}
                          aria-label={`Remove one ${item.name}`}
                          className={cn(
                            "h-8 w-8 rounded-full",
                            qty === 0
                              ? "cursor-not-allowed opacity-30"
                              : "border-purple-500/30 text-purple-200 hover:bg-purple-500/10",
                          )}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-5 text-center text-sm font-medium tabular-nums text-foreground">
                          {qty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setQty(item.id, 1)}
                          aria-label={`Add one ${item.name}`}
                          className="h-8 w-8 rounded-full border-purple-500/30 text-purple-200 hover:bg-purple-500/10"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Payment method */}
        <Card className="gap-0 py-0 border-border/50">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="font-display text-base font-semibold text-foreground">
              Payment method
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ul className="space-y-1">
              {PAYMENT_METHODS.map((m) => {
                const selected = paymentMethod === m.id;
                const Icon = m.icon;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod(m.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition",
                        selected ? "bg-purple-500/10 border border-purple-500/20" : "hover:bg-muted/50",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full border-2 transition",
                          selected ? "border-purple-400 bg-purple-500" : "border-muted-foreground/30",
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
                    </button>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Total + CTA */}
        <section className="pt-2">
          <Separator className="mb-4" />
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total</p>
              <p className="text-[10px] text-muted-foreground">
                Entry + {addOnCount} add-on{addOnCount === 1 ? "" : "s"}
              </p>
            </div>
            <p className="font-display text-3xl font-bold tabular-nums text-foreground">
              {formatPrice(total)}
            </p>
          </div>

          <div>
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
          </div>

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

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Secured by Stripe · refundable if host cancels
          </p>
        </section>
      </div>
    </div>
  );
}
