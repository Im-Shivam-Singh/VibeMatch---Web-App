import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { User, Party } from "@/lib/db/models";

// POST /api/seed — Seed the production database with demo data
// This is a one-time operation to populate the empty production DB.
// It only runs if the database has no users (prevents duplicate seeding).
async function _POST(req: NextRequest) {
  // Safety check: only seed if database is empty
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return NextResponse.json({
      message: "Database already has data. Skipping seed.",
      userCount,
      partyCount: await Party.countDocuments(),
    });
  }

  // Import and run the auto-seeder
  const { autoSeed } = await import("@/lib/db/auto-seed");
  await autoSeed();

  const finalUserCount = await User.countDocuments();
  const finalPartyCount = await Party.countDocuments();

  return NextResponse.json({
    message: "Database seeded successfully!",
    userCount: finalUserCount,
    partyCount: finalPartyCount,
  });
}

export const POST = withDB(_POST);
