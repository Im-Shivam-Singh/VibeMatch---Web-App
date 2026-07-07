import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { MenuItem } from "@/lib/db/models";

// DELETE /api/menus/[id] — remove a menu item (host manage-party)
async function _DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const deleted = await MenuItem.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }
  } catch {
    return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
  }
  return NextResponse.json({ id });
}

export const DELETE = withDB(_DELETE);
