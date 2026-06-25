import { db } from "@/lib/db";

// Seed VibeMatch with demo users, parties, threads, and messages.
const DEMO_USERS = [
  {
    phone: "+919999900001",
    name: "Aria Mehta",
    username: "aria",
    bio: "Techno gypsy · hosting rooftop sessions in Mumbai 🌃",
    city: "Mumbai",
    instagram: "aria.nights",
    vibes: 128,
    hosted: 14,
    rating: 4.9,
    ratingCount: 38,
  },
  {
    phone: "+919999900002",
    name: "Kabir Singh",
    username: "kabir",
    bio: "BYOB energy. Delhi underground. Bring snacks 🍕",
    city: "Delhi",
    instagram: "kabir.afterhours",
    vibes: 96,
    hosted: 9,
    rating: 4.7,
    ratingCount: 22,
  },
  {
    phone: "+919999900003",
    name: "Lena D'Souza",
    username: "lena",
    bio: "Lo-fi & chill curator. Goa sunsets only 🌅",
    city: "Goa",
    instagram: "lena.sunsets",
    vibes: 210,
    hosted: 21,
    rating: 5.0,
    ratingCount: 51,
  },
  {
    phone: "+919999900004",
    name: "Reyansh Patel",
    username: "rey",
    bio: "EDM + retro mashups. Bangalore warehouse nights ⚡",
    city: "Bangalore",
    instagram: "rey.warehouse",
    vibes: 174,
    hosted: 18,
    rating: 4.8,
    ratingCount: 44,
  },
  {
    phone: "+919999900005",
    name: "Mira Kapoor",
    username: "mira",
    bio: "Boardgame evenings + Bollywood dance-offs in Pune 🎲",
    city: "Pune",
    instagram: "mira.gameknights",
    vibes: 88,
    hosted: 7,
    rating: 4.6,
    ratingCount: 19,
  },
  {
    phone: "+919999900006",
    name: "You",
    username: "you",
    bio: "Just here for the vibes ✨",
    city: "Mumbai",
    vibes: 12,
    hosted: 0,
    rating: 5.0,
    ratingCount: 3,
  },
];

const COVERS = [
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1571266028243-d220c9c3b31e?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1483452389744-eaaf621f05cb?w=800&q=80&auto=format&fit=crop",
];

const AVATARS = [
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80&auto=format&fit=crop",
];

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

const DEMO_PARTIES = [
  {
    title: "Neon Rooftop: Techno Till Dawn",
    city: "Mumbai",
    area: "Bandra West",
    date: futureDate(1),
    time: "21:30",
    fee: 800,
    maxGuests: 40,
    vibes: "Techno,EDM",
    description:
      "Rooftop under the stars with a custom Funktion rig. Local + guest DJs through the night. BYO good energy. Strict door, no creeps.",
    hostIndex: 0,
    coverIndex: 0,
    guestCount: 27,
  },
  {
    title: "BYOB Garage Sessions Vol. 7",
    city: "Delhi",
    area: "Hauz Khas Village",
    date: futureDate(2),
    time: "20:00",
    fee: 0,
    maxGuests: 25,
    vibes: "BYOB,Chill",
    description:
      "Bring your own bottle and your favorite AUX weapon. Living-room energy, fairy lights, and shameless singalongs. Snacks on us.",
    hostIndex: 1,
    coverIndex: 1,
    guestCount: 12,
  },
  {
    title: "Sunset Lo-fi & Vinyl",
    city: "Goa",
    area: "Anjuna",
    date: futureDate(3),
    time: "17:30",
    fee: 500,
    maxGuests: 30,
    vibes: "Lo-fi,Chill",
    description:
      "Watch the sky melt while a curated stack of vinyl plays. Beanbags, hammocks, and a quiet crowd. Phones on silent please.",
    hostIndex: 2,
    coverIndex: 2,
    guestCount: 18,
  },
  {
    title: "Warehouse Pulse: EDM x Retro",
    city: "Bangalore",
    area: "Whitefield",
    date: futureDate(4),
    time: "22:00",
    fee: 1200,
    maxGuests: 60,
    vibes: "EDM,Retro,Techno",
    description:
      "A converted warehouse with laser rig and a 90s-vs-now mashup set. Dress to sweat. Coatcheck available. 18+ only.",
    hostIndex: 3,
    coverIndex: 3,
    guestCount: 44,
  },
  {
    title: "Boardgame Knights: Strategy Night",
    city: "Pune",
    area: "Koregaon Park",
    date: futureDate(5),
    time: "18:30",
    fee: 300,
    maxGuests: 16,
    vibes: "Boardgames,Chill",
    description:
      "Catan, Wingspan, and a secret Codenames tournament. Newcomers welcome — we teach. Pizza and chai on rotation. No sore losers.",
    hostIndex: 4,
    coverIndex: 4,
    guestCount: 9,
  },
  {
    title: "Bollywood Night: Dance & Dhamaka",
    city: "Mumbai",
    area: "Lower Parel",
    date: futureDate(6),
    time: "20:30",
    fee: 600,
    maxGuests: 50,
    vibes: "Bollywood,Retro",
    description:
      "Full Bollywood setlist from 90s to now. Choreographer on site for the shy ones. Themed cocktails. Bring your moves, leave your ego.",
    hostIndex: 0,
    coverIndex: 5,
    guestCount: 33,
  },
  {
    title: "Midnight Techno Boat",
    city: "Goa",
    area: "Panjim Harbor",
    date: futureDate(8),
    time: "23:00",
    fee: 1500,
    maxGuests: 35,
    vibes: "Techno,EDM",
    description:
      "A 3-hour boat ride with a sound system and the Arabian sea. Boarding 22:30, returns 02:00. Seasickness pills recommended. No flip-flops.",
    hostIndex: 2,
    coverIndex: 0,
    guestCount: 30,
  },
  {
    title: "Retro Cassette Lounge",
    city: "Delhi",
    area: "Saket",
    date: futureDate(9),
    time: "19:00",
    fee: 0,
    maxGuests: 20,
    vibes: "Retro,Lo-fi,Chill",
    description:
      "An evening of actual cassette tapes and analog warmth. Bring a tape to trade if you have one. Dim lights, deep conversations.",
    hostIndex: 1,
    coverIndex: 2,
    guestCount: 7,
  },
];

async function seed() {
  console.log("Seeding VibeMatch...");

  const userIds: string[] = [];
  for (let i = 0; i < DEMO_USERS.length; i++) {
    const u = DEMO_USERS[i];
    const existing = await db.user.findUnique({ where: { phone: u.phone } });
    if (existing) {
      userIds[i] = existing.id;
      continue;
    }
    const created = await db.user.create({
      data: { ...u, avatarUrl: AVATARS[i % AVATARS.length] },
    });
    userIds[i] = created.id;
  }

  const partyIds: string[] = [];
  for (let i = 0; i < DEMO_PARTIES.length; i++) {
    const p = DEMO_PARTIES[i];
    const hostId = userIds[p.hostIndex];
    const host = DEMO_USERS[p.hostIndex];
    const existing = await db.party.findFirst({ where: { title: p.title, hostId } });
    if (existing) {
      partyIds[i] = existing.id;
      continue;
    }
    const created = await db.party.create({
      data: {
        title: p.title,
        city: p.city,
        area: p.area,
        date: p.date,
        time: p.time,
        fee: p.fee,
        maxGuests: p.maxGuests,
        vibes: p.vibes,
        description: p.description,
        hostName: host.name,
        hostId,
        coverUrl: COVERS[p.coverIndex],
        guestCount: p.guestCount,
      },
    });
    partyIds[i] = created.id;
  }

  const youId = userIds[5];
  const ariaId = userIds[0];
  const existingThread = await db.chatThread.findFirst({
    where: {
      OR: [
        { userAId: youId, userBId: ariaId },
        { userAId: ariaId, userBId: youId },
      ],
    },
  });
  let threadId = existingThread?.id;
  if (!threadId) {
    const t = await db.chatThread.create({
      data: { userAId: youId, userBId: ariaId, partyId: partyIds[0] },
    });
    threadId = t.id;
    await db.message.createMany({
      data: [
        {
          threadId,
          senderId: youId,
          receiverId: ariaId,
          content: "Hey Aria! Loved the rooftop set last time. Coming Sat?",
          read: true,
        },
        {
          threadId,
          senderId: ariaId,
          receiverId: youId,
          content: "Yesss. Door opens 9:30. Bring 1 +1 if you want 💫",
          read: false,
        },
      ],
    });
  }

  console.log("Seed complete. Users:", userIds.length, "Parties:", partyIds.length);
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
