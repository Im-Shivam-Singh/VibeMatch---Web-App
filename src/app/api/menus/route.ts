import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/mongodb";
import { MenuItem } from "@/models";

// GET /api/menus?partyId=...  → list menu items for a party
async function _GET(req: NextRequest) {
  const partyId = req.nextUrl.searchParams.get("partyId");
  if (!partyId) {
    return NextResponse.json(
      { error: "partyId is required" },
      { status: 400 },
    );
  }

  const items = await MenuItem.find({ partyId })
    .sort({ category: 1, createdAt: 1 })
    .lean({ virtuals: true });
  return NextResponse.json({ items });
}

// POST /api/menus  → add a menu item (host only)
async function _POST(req: NextRequest) {
  const body = await req.json();
  const { partyId, name, price, emoji, category } = body;
  if (!partyId || !name) {
    return NextResponse.json(
      { error: "partyId and name are required" },
      { status: 400 },
    );
  }

  const item = await MenuItem.create({
    partyId,
    name,
    price: Number(price) || 0,
    emoji: emoji || "🍹",
    category: category || "drink",
  });
  return NextResponse.json({ item: item.toObject({ virtuals: true }) }, { status: 201 });
}

export const GET = withDB(_GET);
export const POST = withDB(_POST);
