import { NextRequest, NextResponse } from 'next/server';
import { withDB } from '@/lib/mongodb';
import Notification from '@/models/Notification';

// PATCH /api/notifications/[id] — mark single notification as read
async function _PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true }).lean();
  if (!notification) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...notification, id: notification._id.toString() });
}

export const PATCH = withDB(_PATCH);
