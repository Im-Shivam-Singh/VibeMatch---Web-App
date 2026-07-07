import { NextRequest, NextResponse } from 'next/server';
import { withDB } from '@/lib/db/mongodb';
import Notification from '@/lib/db/models/Notification';

// GET /api/notifications?userId=xxx&limit=20&offset=0
async function _GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');

  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ userId, read: false }),
  ]);

  return NextResponse.json({
    notifications: notifications.map(n => ({ ...n, id: n._id.toString() })),
    unreadCount,
  });
}

// PATCH /api/notifications — mark all as read
async function _PATCH(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  await Notification.updateMany({ userId, read: false }, { read: true });
  return NextResponse.json({ ok: true });
}

export const GET = withDB(_GET);
export const PATCH = withDB(_PATCH);
