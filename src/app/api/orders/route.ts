import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currencyForCity } from "@/lib/types";

// GET /api/orders?userId=...  → list a user's orders (with items + party)
// GET /api/orders?partyId=... → list orders for a party (host view)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const partyId = req.nextUrl.searchParams.get("partyId");

  if (!userId && !partyId) {
    return NextResponse.json(
      { error: "userId or partyId is required" },
      { status: 400 },
    );
  }

  const where = userId ? { userId } : { partyId: partyId ?? undefined };
  const orders = await db.order.findMany({
    where,
    include: {
      items: true,
      party: true,
      ticket: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ orders });
}

// POST /api/orders  → create an order (entry + optional add-ons) + ticket
// Body: { userId, partyId, items: [{ menuItemId?, name, emoji, unitPrice, quantity }] }
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, partyId, items } = body;
  if (!userId || !partyId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "userId, partyId, and items[] are required" },
      { status: 400 },
    );
  }

  const party = await db.party.findUnique({ where: { id: partyId } });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  // Validate the user exists — prevents foreign-key constraint violations
  // when a browser has a stale user ID in localStorage from a previous session.
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json(
      {
        error: "Your session has expired. Please log in again to continue.",
        code: "USER_NOT_FOUND",
      },
      { status: 401 },
    );
  }

  const currency = currencyForCity(party.city);
  const totalAmount = items.reduce(
    (sum: number, it: any) => sum + it.unitPrice * it.quantity,
    0,
  );

  // Create order + items + ticket in one transaction
  const order = await db.order.create({
    data: {
      userId,
      partyId,
      totalAmount,
      currency,
      status: "paid", // mock — no real Stripe in dev
      items: {
        create: items.map((it: any) => ({
          menuItemId: it.menuItemId ?? null,
          name: it.name,
          emoji: it.emoji || "🎟️",
          unitPrice: it.unitPrice,
          quantity: it.quantity,
        })),
      },
    },
    include: { items: true },
  });

  const ticket = await db.ticket.create({
    data: {
      orderId: order.id,
      userId,
      partyId,
      qrHash: `vm-${order.id.slice(-8).toUpperCase()}-${partyId.slice(-4).toUpperCase()}`,
    },
  });

  // Increment the party's guest count
  await db.party.update({
    where: { id: partyId },
    data: { guestCount: { increment: 1 } },
  });

  // ── Post "Payment confirmed" system message into the 1:1 host↔guest thread
  // The chat is locked (no messages allowed) between request-creation and
  // payment. This system message is the unlock signal — it tells both sides
  // the chat is now open, and the chat UI uses the `paid` flag (computed in
  // GET /api/threads/[id]) to re-enable the composer.
  const joinRequest = await db.joinRequest.findFirst({
    where: { partyId, requesterId: userId },
    orderBy: { createdAt: "desc" },
  });
  if (joinRequest?.threadId && party.hostId) {
    await db.message.create({
      data: {
        threadId: joinRequest.threadId,
        senderId: party.hostId,
        receiverId: userId,
        content: "✅ Payment confirmed — chat unlocked. Say hi to your host 👋",
        kind: "system",
        requestId: joinRequest.id,
      },
    });
    await db.chatThread.update({
      where: { id: joinRequest.threadId },
      data: { updatedAt: new Date() },
    });
  }

  // ── Unlock the group chat for this party + add the paying guest ──
  // The group chat is the "active event" room where all paid guests + the
  // host coordinate. It's created on the first payment and the guest is
  // added as a member. The host is auto-added too (so they're present from
  // the start). Referral-offer cards are seeded once on creation.
  await ensureGroupChat(partyId, userId, party.hostId);

  return NextResponse.json({ order, ticket }, { status: 201 });
}

// ── Group chat bootstrap ──────────────────────────────────────────────
// Idempotent: creates the GroupChat for a party on first payment, flips
// party.groupChatEnabled, and ensures both the paying guest + the host are
// members. Seeds a welcome system message + the 7 referral-offer cards so
// the revenue model (affiliate referrals) is visible from message #1.
async function ensureGroupChat(
  partyId: string,
  guestId: string,
  hostId: string | null,
) {
  const existing = await db.groupChat.findUnique({ where: { partyId } });
  if (existing) {
    // Add the new guest as a member if not already.
    await db.groupChatMember.upsert({
      where: { groupChatId_userId: { groupChatId: existing.id, userId: guestId } },
      create: { groupChatId: existing.id, userId: guestId },
      update: {},
    });
    await db.party.update({
      where: { id: partyId },
      data: { groupChatEnabled: true },
    });
    return;
  }

  const memberIds = hostId ? [hostId, guestId] : [guestId];
  const gc = await db.groupChat.create({
    data: {
      partyId,
      members: {
        create: memberIds.map((uid) => ({ userId: uid })),
      },
      messages: {
        create: [
          {
            senderId: guestId,
            content: "Group chat unlocked 🎉 Say hi to everyone before the night!",
            kind: "system",
          },
          // Seed the 7 referral offers — the platform's ad revenue model.
          ...BRAND_SEED.map((b) => ({
            senderId: guestId,
            content: `${b.name}: ${b.offer}`,
            kind: "offer" as const,
            offerBrand: b.id,
          })),
        ],
      },
    },
  });
  await db.party.update({
    where: { id: partyId },
    data: { groupChatEnabled: true },
  });
  return gc;
}

const BRAND_SEED = [
  { id: "swiggy", name: "Swiggy", offer: "20% off party food delivery" },
  { id: "zomato", name: "Zomato", offer: "Flat ₹100 off on orders above ₹499" },
  { id: "blinkit", name: "Blinkit", offer: "10-min drinks delivery · 15% off" },
  { id: "zepto", name: "Zepto", offer: "10-min snacks + ice · ₹50 off" },
  { id: "bigbasket", name: "BigBasket", offer: "Bulk party supplies · 25% off" },
  { id: "instamart", name: "Instamart", offer: "15-min mixers & soft drinks · 12% off" },
  { id: "flipkart", name: "Flipkart Minutes", offer: "Speakers & decor in 10 mins · 20% off" },
];
