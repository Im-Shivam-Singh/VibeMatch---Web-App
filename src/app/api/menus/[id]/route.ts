import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { MenuItem } from "@/models";

// DELETE /api/menus/[id] — remove a menu item (host manage-party)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await connectDB();

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
