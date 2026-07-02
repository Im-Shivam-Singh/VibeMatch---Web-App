import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MenuItem } from "@/models";

// GET /api/menus?partyId=...  → list menu items for a party
export async function GET(req: NextRequest) {
  const partyId = req.nextUrl.searchParams.get("partyId");
  if (!partyId) {
    return NextResponse.json(
      { error: "partyId is required" },
      { status: 400 },
    );
  }

  await connectDB();

  const items = await MenuItem.find({ partyId })
    .sort({ category: 1, createdAt: 1 })
    .lean({ virtuals: true });
  return NextResponse.json({ items });
}

// POST /api/menus  → add a menu item (host only)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { partyId, name, price, emoji, category } = body;
  if (!partyId || !name) {
    return NextResponse.json(
      { error: "partyId and name are required" },
      { status: 400 },
    );
  }

  await connectDB();

  const item = await MenuItem.create({
    partyId,
    name,
    price: Number(price) || 0,
    emoji: emoji || "🍹",
    category: category || "drink",
  });
  return NextResponse.json({ item: item.toObject({ virtuals: true }) }, { status: 201 });
}
