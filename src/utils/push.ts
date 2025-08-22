// src/utils/push.ts
import { Expo, ExpoPushMessage } from "expo-server-sdk";
import {
  createQueuedNotification,
  finalizeNotificationSend,
} from "./notificationUtils";

const expo = new Expo();

export type BasePayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string; // URL publique de l’image
  eventId?: string; // optionnel: pour lier côté métier
  establishmentId?: string;
  ttlDays?: number; // optionnel: purge auto (TTL)
};

/**
 * ENVOI CLASSIQUE (signature inchangée)
 * - Pas de persistance (pour compatibilité)
 */
export async function sendExpoPushNotifications(
  tokens: string[],
  message: BasePayload
) {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const t of tokens) (Expo.isExpoPushToken(t) ? valid : invalid).push(t);
  if (!valid.length) return { sent: 0, invalidTokens: invalid, tickets: [] };

  const msgs: ExpoPushMessage[] = valid.map((to) => {
    const m: ExpoPushMessage = {
      to,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      priority: "high",
    };
    if (message.imageUrl) {
      // @ts-expect-error: Android large image
      m.imageUrl = message.imageUrl;
      // @ts-expect-error: iOS rich media
      m.attachments = [{ url: message.imageUrl }];
      m.mutableContent = true;
    }
    return m;
  });

  const chunks = expo.chunkPushNotifications(msgs);
  const tickets: any[] = [];
  for (const chunk of chunks) {
    try {
      const r = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...r);
    } catch (e) {
      console.error("Expo push send error:", e);
      tickets.push(
        ...chunk.map(() => ({ status: "error", message: String(e) }))
      );
    }
  }
  return { sent: valid.length, invalidTokens: invalid, tickets };
}

/**
 * ENVOI PAR UTILISATEUR + PERSISTANCE
 * - 1 Notification par user, avec tokens, tickets et invalidTokens
 *
 * tokensByUser = { [userId]: string[]tokens }
 */
export async function sendExpoPushNotificationsByUser(
  tokensByUser: Record<string, string[]>,
  message: BasePayload
) {
  // 1) Pré-créer une Notification "queued" pour chaque user
  const queued = await Promise.all(
    Object.entries(tokensByUser).map(([userId, tokens]) =>
      createQueuedNotification({
        userId,
        title: message.title,
        body: message.body,
        data: message.data,
        imageUrl: message.imageUrl,
        eventId: message.eventId,
        establishmentId: message.establishmentId,
        tokens,
        ttlDays: message.ttlDays,
      })
    )
  );

  // 2) Lister tokens valides/invalides en conservant le mapping userId
  const validPairs: Array<{ token: string; userId: string }> = [];
  const invalidPairs: Array<{ token: string; userId: string }> = [];

  for (const [userId, tokens] of Object.entries(tokensByUser)) {
    for (const t of tokens) {
      (Expo.isExpoPushToken(t) ? validPairs : invalidPairs).push({
        token: t,
        userId,
      });
    }
  }

  // Si aucun token valide, marquer toutes les notifications en "failed"
  if (!validPairs.length) {
    await Promise.all(
      queued.map((doc) =>
        finalizeNotificationSend(String(doc._id), {
          tickets: [],
          invalidTokens: invalidPairs
            .filter((p) => String(doc.user) === p.userId)
            .map((p) => p.token),
          hadAnySuccess: false,
          hadAnyError: true,
        })
      )
    );
    return {
      sent: 0,
      invalidTokens: invalidPairs.map((p) => p.token),
      tickets: [],
    };
  }

  // 3) Construire les messages Expo
  const msgs: ExpoPushMessage[] = validPairs.map(({ token }) => {
    const m: ExpoPushMessage = {
      to: token,
      sound: "default",
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      priority: "high",
    };
    if (message.imageUrl) {
      // @ts-expect-error
      m.imageUrl = message.imageUrl;
      // @ts-expect-error
      m.attachments = [{ url: message.imageUrl }];
      m.mutableContent = true;
    }
    return m;
  });

  // 4) Envoi en chunks
  const chunks = expo.chunkPushNotifications(msgs);
  const tickets: any[] = [];
  for (const chunk of chunks) {
    try {
      const r = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...r);
    } catch (e) {
      console.error("Expo push send error:", e);
      tickets.push(
        ...chunk.map(() => ({ status: "error", message: String(e) }))
      );
    }
  }

  // 5) Regrouper tickets/invalid par user
  const ticketsByUser: Record<string, any[]> = {};
  const invalidByUser: Record<string, string[]> = {};

  invalidPairs.forEach(({ userId, token }) => {
    (invalidByUser[userId] ??= []).push(token);
  });

  validPairs.forEach(({ userId }, i) => {
    (ticketsByUser[userId] ??= []).push(tickets[i]);
  });

  // 6) Finaliser chaque Notification
  await Promise.all(
    queued.map((doc) => {
      const userId = String(doc.user);
      const userTickets = ticketsByUser[userId] ?? [];
      const userInvalid = invalidByUser[userId] ?? [];
      const hadAnySuccess = userTickets.some(
        (t) => t?.status === "ok" || t?.status === "success"
      );
      const hadAnyError = userTickets.some(
        (t) => t?.status === "error" || t?.status === "failed"
      );
      return finalizeNotificationSend(String(doc._id), {
        tickets: userTickets,
        invalidTokens: userInvalid,
        hadAnySuccess,
        hadAnyError,
      });
    })
  );

  return {
    sent: validPairs.length,
    invalidTokens: invalidPairs.map((p) => p.token),
    tickets,
  };
}
