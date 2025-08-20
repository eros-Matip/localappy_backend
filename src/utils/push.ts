// utils/push.ts
import { Expo, ExpoPushMessage } from "expo-server-sdk";
const expo = new Expo();

type BasePayload = {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string; // <— URL publique de l’image
};

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

    // ANDROID: image grand format
    if (message.imageUrl) {
      // @ts-expect-error: `imageUrl` est supporté côté Android
      m.imageUrl = message.imageUrl;
    }

    // iOS: pièces jointes (rich media)
    if (message.imageUrl) {
      // @ts-expect-error: `attachments` est supporté côté iOS
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
    }
  }
  return { sent: valid.length, invalidTokens: invalid, tickets };
}
