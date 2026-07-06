import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Order, Party, User, Ticket, JoinRequest, Message, ChatThread, GroupChat } from "@/models";
import { currencyForCity } from "@/lib/types";

// GET /api/orders?userId=...  → list a user's orders (with items + party)
// GET /api/orders?partyId=... → list orders for a party (host view)
async function _GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const partyId = req.nextUrl.searchParams.get("partyId");

  if (!userId && !partyId) {
    return NextResponse.json(
      { error: "userId or partyId is required" },
      { status: 400 },
    );
  }

  const filter = userId ? { userId } : { partyId: partyId ?? undefined };
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  // Enrich with party and ticket info
  const partyIds = [...new Set(orders.map((o) => o.partyId))];
  const orderIds = [...new Set(orders.map((o) => o.id ?? o._id?.toString()))];

  const [parties, tickets] = await Promise.all([
    Party.find({ _id: { $in: partyIds } }).lean({ virtuals: true }),
    Ticket.find({ orderId: { $in: orderIds } }).lean({ virtuals: true }),
  ]);

  const partyMap = new Map(parties.map((p) => [p.id ?? p._id?.toString(), p]));
  const ticketMap = new Map(tickets.map((t) => [t.orderId, t]));

  const enriched = orders.map((o) => ({
    ...o,
    id: o.id ?? o._id?.toString(),
    party: partyMap.get(o.partyId) ?? null,
    ticket: ticketMap.get(o.id ?? o._id?.toString()) ?? null,
    createdAt: o.createdAt?.toISOString?.() ?? String(o.createdAt ?? ""),
  }));

  return NextResponse.json({ orders: enriched });
}

// POST /api/orders  → create an order (entry + optional add-ons) + ticket
// Body: { userId, partyId, items: [{ menuItemId?, name, emoji, unitPrice, quantity }] }
async function _POST(req: NextRequest) {
  const body = await req.json();
  const { userId, partyId, items } = body;
  if (!userId || !partyId || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "userId, partyId, and items[] are required" },
      { status: 400 },
    );
  }

  const party = await Party.findById(partyId).lean({ virtuals: true });
  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  // Validate the user exists — prevents foreign-key constraint violations
  // when a browser has a stale user ID in localStorage from a previous session.
  const user = await User.findById(userId).lean({ virtuals: true });
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

  // Create order with embedded items
  const order = await Order.create({
    userId,
    partyId,
    totalAmount,
    currency,
    status: "paid", // mock — no real Stripe in dev
    items: items.map((it: any) => ({
      menuItemId: it.menuItemId ?? null,
      name: it.name,
      emoji: it.emoji || "🎟️",
      unitPrice: it.unitPrice,
      quantity: it.quantity,
    })),
  });

  const orderId = order.id ?? order._id?.toString();

  const ticket = await Ticket.create({
    orderId,
    userId,
    partyId,
    qrHash: `vm-${orderId.slice(-8).toUpperCase()}-${partyId.slice(-4).toUpperCase()}`,
  });

  // Increment the party's guest count
  await Party.findByIdAndUpdate(partyId, { $inc: { guestCount: 1 } });

  // ── Post "Payment confirmed" system message into the 1:1 host↔guest thread
  const joinRequest = await JoinRequest.findOne({ partyId, requesterId: userId })
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  if (joinRequest?.threadId && party.hostId) {
    try {
      await Message.create({
        threadId: joinRequest.threadId,
        senderId: party.hostId,
        receiverId: userId,
        content: "✅ Payment confirmed — chat unlocked. Say hi to your host 👋",
        kind: "system",
        requestId: joinRequest.id ?? joinRequest._id?.toString(),
      });
      await ChatThread.findByIdAndUpdate(joinRequest.threadId, { $set: { updatedAt: new Date() } });
    } catch (err) {
      console.warn("[orders] Failed to post payment confirmation message (non-fatal):", err);
    }
  }

  // ── Unlock the group chat for this party + add the paying guest ──
  try {
    await ensureGroupChat(partyId, userId, party.hostId);
  } catch (err) {
    console.warn("[orders] Failed to bootstrap group chat (non-fatal):", err);
  }

  const leanOrder = order.toObject({ virtuals: true });
  const leanTicket = ticket.toObject({ virtuals: true });

  return NextResponse.json(
    {
      order: { ...leanOrder, id: orderId },
      ticket: { ...leanTicket, id: leanTicket.id ?? leanTicket._id?.toString() },
    },
    { status: 201 },
  );
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
  const existing = await GroupChat.findOne({ partyId }).lean({ virtuals: true });
  if (existing) {
    // Add the new guest as a member if not already.
    const existingId = existing.id ?? existing._id?.toString();
    const alreadyMember = existing.members.some((m: any) => m.userId === guestId);
    if (!alreadyMember) {
      await GroupChat.findByIdAndUpdate(existingId, {
        $push: { members: { userId: guestId, joinedAt: new Date() } },
      });
    }
    await Party.findByIdAndUpdate(partyId, { $set: { groupChatEnabled: true } });
    return;
  }

  const memberIds = hostId ? [hostId, guestId] : [guestId];
  const gc = await GroupChat.create({
    partyId,
    members: memberIds.map((uid) => ({ userId: uid, joinedAt: new Date() })),
    messages: [
      {
        senderId: guestId,
        content: "Group chat unlocked 🎉 Say hi to everyone before the night!",
        kind: "system",
        createdAt: new Date(),
      },
      // Seed the 7 referral offers — the platform's ad revenue model.
      ...BRAND_SEED.map((b) => ({
        senderId: guestId,
        content: `${b.name}: ${b.offer}`,
        kind: "offer" as const,
        offerBrand: b.id,
        createdAt: new Date(),
      })),
    ],
  });
  await Party.findByIdAndUpdate(partyId, { $set: { groupChatEnabled: true } });
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

export const GET = withDB(_GET);
export const POST = withDB(_POST);
