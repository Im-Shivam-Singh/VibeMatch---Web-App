import { NextRequest, NextResponse } from "next/server";
import { withDB } from "@/lib/db/mongodb";
import { JoinRequest, Ticket } from "@/lib/db/models";

// GET /api/user-party-status?userId=...&partyId=...
// Returns whether the user has an accepted request or ticket for the party.
async function _GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const partyId = req.nextUrl.searchParams.get("partyId");

  if (!userId || !partyId) {
    return NextResponse.json(
      { error: "userId and partyId are required" },
      { status: 400 }
    );
  }

  // Check for accepted request
  const acceptedRequest = await JoinRequest.findOne({
    requesterId: userId,
    partyId,
    status: "accepted",
  }).lean({ virtuals: true });

  // Check for ticket (paid)
  const ticket = await Ticket.findOne({
    userId,
    partyId,
  }).lean({ virtuals: true });

  const isInParty = !!acceptedRequest || !!ticket;
  const hasTicket = !!ticket;
  const requestStatus = acceptedRequest?.status ?? (ticket ? "paid" : null);

  return NextResponse.json({
    isInParty,
    hasTicket,
    requestStatus,
    requestId: acceptedRequest?.id ?? acceptedRequest?._id?.toString() ?? null,
    ticketId: ticket?.id ?? ticket?._id?.toString() ?? null,
  });
}

export const GET = withDB(_GET);