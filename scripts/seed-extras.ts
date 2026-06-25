// Seed vibePrefs for existing users + add a few demo reviews + party views
// so the For You feed, Reviews section, and Host Analytics dashboard have data.
import { db } from "@/lib/db";

async function main() {
  console.log("Seeding extra data...");

  // 1) Set vibePrefs on all existing users based on their city/host style
  const users = await db.user.findMany();
  const PREFS_BY_NAME: Record<string, string> = {
    "Aria Mehta": "Techno,EDM,Chill",
    "Kabir Singh": "BYOB,Chill,Retro",
    "Lena D'Souza": "Lo-fi,Chill,Techno",
    "Reyansh Patel": "EDM,Retro,Techno",
    "Mira Kapoor": "Boardgames,Bollywood,Chill",
    You: "Techno,Chill",
    Tester: "Techno,Chill",
  };
  for (const u of users) {
    const prefs = PREFS_BY_NAME[u.name] || "Chill";
    if (u.vibePrefs !== prefs) {
      await db.user.update({ where: { id: u.id }, data: { vibePrefs: prefs } });
      console.log(`  ✓ vibePrefs for ${u.name}: ${prefs}`);
    }
  }

  // 2) Add a few demo reviews on the first few parties
  const parties = await db.party.findMany({ take: 5 });
  const reviewer = users.find((u) => u.name === "You") || users[0];
  const reviewComments = [
    { rating: 5, comment: "Absolutely unreal energy. The host knew exactly how to read the room." },
    { rating: 4, comment: "Great music, lovely crowd. Wish it had gone a bit longer." },
    { rating: 5, comment: "Best Tuesday night I've had in months. Going again for sure." },
    { rating: 4, comment: "Cozy setup, friendly people, decent drinks. Would recommend." },
    { rating: 5, comment: "Sunset + lo-fi + beanbags = pure bliss. 10/10 vibes." },
  ];
  for (let i = 0; i < parties.length; i++) {
    const p = parties[i];
    const c = reviewComments[i];
    const existing = await db.review.findUnique({
      where: { partyId_userId: { partyId: p.id, userId: reviewer.id } },
    });
    if (!existing) {
      await db.review.create({
        data: {
          partyId: p.id,
          userId: reviewer.id,
          rating: c.rating,
          comment: c.comment,
        },
      });
      console.log(`  ✓ review on "${p.title}"`);
    }
  }

  // 3) Add some party views for analytics — distribute ~30-90 views across parties
  for (const p of parties) {
    const existingCount = await db.partyView.count({ where: { partyId: p.id } });
    if (existingCount < 20) {
      const target = 20 + Math.floor(Math.random() * 60);
      const toCreate = target - existingCount;
      if (toCreate > 0) {
        await db.partyView.createMany({
          data: Array.from({ length: toCreate }).map(() => ({
            partyId: p.id,
            userId: null,
          })),
        });
        console.log(`  ✓ ${toCreate} views for "${p.title}"`);
      }
    }
  }

  // 4) Add a sample accepted request so acceptance rate > 0
  const firstParty = parties[0];
  if (firstParty) {
    const existingReq = await db.joinRequest.findFirst({
      where: { partyId: firstParty.id, status: "accepted" },
    });
    if (!existingReq && reviewer) {
      await db.joinRequest.create({
        data: {
          partyId: firstParty.id,
          requesterName: reviewer.name,
          introMessage: "Hey! Loved the description. Coming with a +1, big into techno…",
          status: "accepted",
          requesterId: reviewer.id,
        },
      });
      console.log(`  ✓ accepted request on "${firstParty.title}"`);
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
