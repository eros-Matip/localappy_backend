import Admin from "../models/Admin"; // adapte
import { Expo, ExpoPushMessage } from "expo-server-sdk";

const expo = new Expo();

async function sendToAdmins(messages: ExpoPushMessage[]) {
  if (!messages.length) return;

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}

export async function notifyAdminsNewOwner(params: {
  ownerId: string;
  ownerFirstname: string;
  ownerName: string;
  customerId?: string;
}) {
  const admins = await Admin.find(
    { expoPushToken: { $exists: true, $ne: null } },
    { expoPushToken: 1 },
  ).lean();

  const messages: ExpoPushMessage[] = [];

  for (const admin of admins) {
    const token = (admin as any).expoPushToken;
    if (!token || !Expo.isExpoPushToken(token)) continue;

    messages.push({
      to: token,
      sound: "default",
      title: "Nouveau compte Organisateur créé",
      body: `${params.ownerFirstname} ${params.ownerName} vient de créer un compte.`,
      data: { type: "NEW_OWNER_CREATED", ...params },
    });
  }

  await sendToAdmins(messages);
}

export async function notifyAdminsNewEstablishment(params: {
  establishmentId: string;
  establishmentName: string;
  legalForm: "company" | "association";
  ownerId: string;
  ownerFirstname: string;
  ownerName: string;
}) {
  const admins = await Admin.find(
    { expoPushToken: { $exists: true, $ne: null } },
    { expoPushToken: 1 },
  ).lean();

  const messages: ExpoPushMessage[] = [];

  for (const admin of admins) {
    const token = (admin as any).expoPushToken;
    if (!token || !Expo.isExpoPushToken(token)) continue;

    const label =
      params.legalForm === "association" ? "Association" : "Entreprise";

    messages.push({
      to: token,
      sound: "default",
      title: `Nouvel établissement (${label})`,
      body: `${params.establishmentName} a été créé par ${params.ownerFirstname} ${params.ownerName}.`,
      data: { type: "NEW_ESTABLISHMENT_CREATED", ...params },
    });
  }

  await sendToAdmins(messages);
}

// ✅ AJOUT : demande d’activation
export async function notifyAdminsActivationRequest(params: {
  establishmentId: string;
  establishmentName: string;
  legalForm: "company" | "association";
  ownerId: string;
  ownerFirstname: string;
  ownerName: string;
}) {
  const admins = await Admin.find(
    { expoPushToken: { $exists: true, $ne: null } },
    { expoPushToken: 1 },
  ).lean();

  const messages: ExpoPushMessage[] = [];

  for (const admin of admins) {
    const token = (admin as any).expoPushToken;
    if (!token || !Expo.isExpoPushToken(token)) continue;

    const label =
      params.legalForm === "association" ? "Association" : "Entreprise";

    messages.push({
      to: token,
      sound: "default",
      title: `Demande d’activation (${label})`,
      body: `${params.establishmentName} — demande par ${params.ownerFirstname} ${params.ownerName}.`,
      data: { type: "ESTABLISHMENT_ACTIVATION_REQUEST", ...params },
    });
  }

  await sendToAdmins(messages);
}
