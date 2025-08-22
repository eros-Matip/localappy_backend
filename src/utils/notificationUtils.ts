import { INotification } from "../interfaces/Notification";
import Notification from "../models/Notification";
import { Types } from "mongoose";

export async function markNotificationRead(
  notificationId: string,
  userId: string
) {
  return Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      user: new Types.ObjectId(userId),
    },
    { status: "read", readAt: new Date() },
    { new: true }
  );
}

export async function markAllNotificationsRead(userId: string) {
  return Notification.updateMany(
    { user: new Types.ObjectId(userId), readAt: { $exists: false } },
    { status: "read", readAt: new Date() }
  );
}

export async function markNotificationClicked(
  notificationId: string,
  userId: string
) {
  return Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      user: new Types.ObjectId(userId),
    },
    { status: "clicked", clickedAt: new Date() },
    { new: true }
  );
}

export async function countUnread(userId: string) {
  return Notification.countDocuments({
    user: userId,
    readAt: { $exists: false },
  });
}

export async function createQueuedNotification(opts: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  eventId?: string;
  establishmentId?: string;
  tokens?: string[];
  ttlDays?: number;
}) {
  const now = new Date();
  const expireAt =
    opts.ttlDays && opts.ttlDays > 0
      ? new Date(now.getTime() + opts.ttlDays * 24 * 3600 * 1000)
      : undefined;

  return Notification.create({
    user: new Types.ObjectId(opts.userId),
    channel: "push",
    title: opts.title,
    body: opts.body,
    data: opts.data,
    imageUrl: opts.imageUrl,
    event: opts.eventId ? new Types.ObjectId(opts.eventId) : undefined,
    establishment: opts.establishmentId
      ? new Types.ObjectId(opts.establishmentId)
      : undefined,
    status: "queued",
    queuedAt: now,
    tokensSent: opts.tokens ?? [],
    expireAt,
  } as Partial<INotification>);
}

export async function finalizeNotificationSend(
  notificationId: string,
  payload: {
    tickets: any[];
    invalidTokens: string[];
    hadAnySuccess: boolean;
    hadAnyError: boolean;
  }
) {
  const status = payload.hadAnySuccess
    ? "sent"
    : payload.hadAnyError
      ? "failed"
      : "sent";
  return Notification.findByIdAndUpdate(
    notificationId,
    {
      status,
      sentAt: new Date(),
      tickets: payload.tickets,
      invalidTokens: payload.invalidTokens,
    },
    { new: true }
  );
}
