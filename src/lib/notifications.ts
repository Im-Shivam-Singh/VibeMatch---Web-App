import Notification from '@/models/Notification';

type NotificationType = 'message' | 'spot_request' | 'spot_accepted' | 'spot_rejected' | 'payment_received' | 'new_party_nearby' | 'review' | 'party_reminder';

// Notify socket service to emit real-time notification
async function emitSocketNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  id?: string;
  createdAt?: string;
}) {
  try {
    // The socket service runs on port 3003
    const res = await fetch('http://localhost:3003/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.warn('[notifications] Socket emission failed:', res.status);
    }
  } catch (err) {
    // Socket service might not be running - non-fatal
    console.warn('[notifications] Socket service unreachable (non-fatal):', err);
  }
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  data,
}: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}) {
  try {
    const notification = await Notification.create({ userId, type, title, body, data, read: false });
    const obj = notification.toObject();
    const id = (obj as any)._id?.toString() ?? (obj as any).id;
    const createdAt = (obj as any).createdAt?.toISOString?.() ?? new Date().toISOString();

    // Emit real-time notification via socket service
    await emitSocketNotification({
      userId,
      type,
      title,
      body,
      data,
      id,
      createdAt,
    });

    return obj;
  } catch (err) {
    console.warn('[notifications] Failed to create notification (non-fatal):', err);
    return null;
  }
}
