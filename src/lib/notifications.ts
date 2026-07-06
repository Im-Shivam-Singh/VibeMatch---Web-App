import Notification from '@/models/Notification';

type NotificationType = 'message' | 'spot_request' | 'spot_accepted' | 'spot_rejected' | 'payment_received' | 'new_party_nearby' | 'review' | 'party_reminder';

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
    return notification.toObject();
  } catch (err) {
    console.warn('[notifications] Failed to create notification (non-fatal):', err);
    return null;
  }
}
