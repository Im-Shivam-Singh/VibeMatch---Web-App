import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { Ticket, Party, Order } from "@/models";

// GET /api/tickets?userId=...  → list a user's tickets (with party + order)
async function _GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { error: "userId is required" },
      { status: 400 },
    );
  }

  const tickets = await Ticket.find({ userId })
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  // Enrich with party and order info
  const partyIds = [...new Set(tickets.map((t) => t.partyId))];
  const orderIds = [...new Set(tickets.map((t) => t.orderId))];

  const [parties, orders] = await Promise.all([
    Party.find({ _id: { $in: partyIds } }).lean({ virtuals: true }),
    Order.find({ _id: { $in: orderIds } }).lean({ virtuals: true }),
  ]);

  const partyMap = new Map(parties.map((p) => [p.id ?? p._id?.toString(), p]));
  const orderMap = new Map(orders.map((o) => [o.id ?? o._id?.toString(), o]));

  const enriched = tickets.map((t) => ({
    ...t,
    id: t.id ?? t._id?.toString(),
    party: partyMap.get(t.partyId) ?? null,
    order: (() => {
      const o = orderMap.get(t.orderId);
      if (!o) return null;
      return { ...o, id: o.id ?? o._id?.toString() };
    })(),
    createdAt: t.createdAt?.toISOString?.() ?? String(t.createdAt ?? ""),
  }));

  return NextResponse.json({ tickets: enriched });
}

export const GET = withDB(_GET);
