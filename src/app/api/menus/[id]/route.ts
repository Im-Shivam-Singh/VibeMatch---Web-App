import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/menus/[id] — remove a menu item (host manage-party)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await db.menuItem.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }
  return NextResponse.json({ id });
}
