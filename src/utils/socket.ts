// src/utils/socket.ts
import http from "http";
import { Server, Socket } from "socket.io";
import { Express } from "express";
import { Types } from "mongoose";

import Registration from "../models/Registration";
import Event from "../models/Event";
import Establishment from "../models/Establishment";

// ✅ Payload : ton QR peut contenir soit une registrationId, soit un eventId
type TicketPayload =
  | { registrationId: string; eventId?: never }
  | { eventId: string; registrationId?: never };

type UserPayload = {
  _id: string; // id du user connecté (owner ou customer staff)
  role?: string;
};

function roomName(registrationId: string) {
  return `registration:${registrationId}`;
}

function isObjectId(id: any) {
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}

/**
 * ✅ Autorisation :
 * - establishment.owner est un Owner (ObjectId)
 * - establishment.staff est Customer[] (ObjectId[])
 */
function isUserAllowedOnEstablishment(
  establishment: any,
  userId: Types.ObjectId,
) {
  const ownerId = establishment?.owner?._id || establishment?.owner;
  const staffArr = establishment?.staff || [];

  const isOwner = ownerId ? userId.equals(ownerId) : false;

  const isStaff =
    Array.isArray(staffArr) &&
    staffArr.some((s: any) => userId.equals(s?._id || s));

  return { isOwner, isStaff, allowed: isOwner || isStaff };
}

/**
 * ✅ Construit l'objet “ticketData” à afficher côté front
 */
function buildTicketData(reg: any) {
  const event = reg?.event;
  const customer = reg?.customer;

  const customerName = customer
    ? `${customer.firstname ?? ""} ${customer.lastname ?? ""}`.trim()
    : "Client";

  return {
    registrationId: (reg?._id || "").toString(),
    eventId: (event?._id || "").toString(),
    eventTitle: event?.title ?? "Événement",
    quantity: reg?.quantity ?? 1,
    date: event?.startingDate ?? reg?.date ?? null,
    customerName,
    customerEmail: customer?.email ?? "",
    customerPhone: customer?.phone ?? customer?.telephone ?? "",
    checkInStatus: reg?.checkInStatus ?? "pending",
    status: reg?.status ?? "pending",
    checkedInAt: reg?.checkedInAt ?? null,
    checkedInBy: reg?.checkedInBy ?? null,
  };
}

/**
 * ✅ Récupère une registration en partant de :
 * - registrationId (direct)
 * - eventId (on cherche la dernière registration payée/confirmée du jour, ou la plus récente)
 *   => si tu veux un autre critère, dis-moi.
 */
async function findRegistrationFromPayload(payload: TicketPayload) {
  // 1) registrationId direct
  if ("registrationId" in payload && isObjectId(payload.registrationId)) {
    const reg = await Registration.findById(payload.registrationId)
      .populate({
        path: "event",
        populate: {
          path: "organizer.establishment",
          model: "Establishment",
          select: "_id name owner staff email phone",
          populate: [
            { path: "owner", select: "_id" },
            { path: "staff", select: "_id firstname lastname email phone" },
          ],
        },
      })
      .populate({
        path: "customer",
        select: "_id firstname lastname email phone telephone",
      })
      .exec();

    return reg;
  }

  // 2) eventId => on tente de trouver une registration liée à cet event
  if ("eventId" in payload && isObjectId(payload.eventId)) {
    const reg = await Registration.findOne({ event: payload.eventId })
      .sort({ createdAt: -1 })
      .populate({
        path: "event",
        populate: {
          path: "organizer.establishment",
          model: "Establishment",
          select: "_id name owner staff email phone",
          populate: [
            { path: "owner", select: "_id" },
            {
              path: "staff",
              select: "_id firstname lastname email phone telephone",
            },
          ],
        },
      })
      .populate({
        path: "customer",
        select: "_id firstname lastname email phone telephone",
      })
      .exec();

    return reg;
  }

  return null;
}

/**
 * ✅ Check-in (sans controller externe)
 * - idempotent
 * - option : uniquement si paid/confirmed
 */
async function checkInRegistration(reg: any, byUserId: string) {
  // déjà check-in
  if (reg.checkInStatus === "checked-in") {
    return { code: "ALREADY_SCANNED" as const, registration: reg };
  }

  const allowedStatuses = ["paid", "confirmed"];
  if (!allowedStatuses.includes(reg.status)) {
    throw new Error("REGISTRATION_NOT_ELIGIBLE");
  }

  reg.checkInStatus = "checked-in";
  reg.checkedInAt = new Date();
  reg.checkedInBy = new Types.ObjectId(byUserId);

  await reg.save();
  return { code: "OK" as const, registration: reg };
}

export default function initSocket(app: Express): http.Server {
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*" },
  });

  const nsp = io.of("/tickets");

  nsp.on("connection", (socket: Socket) => {
    console.log("🔌 connected:", socket.id);

    // ✅ rattacher un user à une socket (front -> emit setUser)
    socket.on("setUser", (userData: UserPayload) => {
      (socket as any).user = userData;
      socket.emit("user:set", { ok: true });
      console.log("👤 setUser:", userData);
    });

    // ✅ DEBUG
    socket.on("ping", () => socket.emit("pong", { ok: true }));

    /**
     * ✅ PREVIEW : tu scannes -> tu veux afficher les infos AVANT de valider
     * front: socket.emit("registration:preview", { registrationId }) ou { eventId }
     */
    socket.on("registration:preview", async (payload: TicketPayload) => {
      try {
        const user = (socket as any).user as UserPayload | null;

        if (!user?._id) {
          return socket.emit("registration:error", {
            code: "UNAUTHORIZED",
            message: "Utilisateur non authentifié",
          });
        }

        const reg = await findRegistrationFromPayload(payload);
        if (!reg || !(reg as any).event) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Ticket ou événement introuvable",
          });
        }

        const event = (reg as any).event;
        const establishment = event?.organizer?.establishment;

        if (!establishment) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Établissement introuvable",
          });
        }

        const userId = new Types.ObjectId(user._id);
        const { allowed } = isUserAllowedOnEstablishment(establishment, userId);

        if (!allowed) {
          return socket.emit("registration:error", {
            code: "FORBIDDEN",
            message: "Accès refusé (gérant/staff uniquement)",
          });
        }

        const ticketData = buildTicketData(reg);

        // optionnel : join room auto
        socket.join(roomName(ticketData.registrationId));

        socket.emit("registration:previewed", {
          ok: true,
          ticket: ticketData,
        });
      } catch (err: any) {
        console.error("❌ preview error:", err);
        socket.emit("registration:error", {
          code: "PREVIEW_FAILED",
          message: err?.message || "Erreur preview",
        });
      }
    });

    /**
     * ✅ SCAN/VALIDATION : check autorisation + check-in
     * front: socket.emit("registration:scan", { registrationId }) ou { eventId }
     */
    socket.on("registration:scan", async (payload: TicketPayload) => {
      try {
        const user = (socket as any).user as UserPayload | null;

        if (!user?._id) {
          return socket.emit("registration:error", {
            code: "UNAUTHORIZED",
            message: "Utilisateur non authentifié",
          });
        }

        const reg = await findRegistrationFromPayload(payload);
        if (!reg || !(reg as any).event) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Ticket ou événement introuvable",
          });
        }

        const event = (reg as any).event;
        const establishment = event?.organizer?.establishment;

        if (!establishment) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Établissement introuvable",
          });
        }

        const userId = new Types.ObjectId(user._id);
        const { allowed } = isUserAllowedOnEstablishment(establishment, userId);

        if (!allowed) {
          return socket.emit("registration:error", {
            code: "FORBIDDEN",
            message: "Accès refusé (gérant/staff uniquement)",
          });
        }

        const result = await checkInRegistration(reg, user._id);
        const ticketData = buildTicketData(result.registration);

        // room + emit global
        socket.join(roomName(ticketData.registrationId));
        nsp
          .to(roomName(ticketData.registrationId))
          .emit("registration:update", {
            ...ticketData,
            already: result.code === "ALREADY_SCANNED",
          });

        socket.emit("registration:validated", {
          ok: true,
          ticket: ticketData,
          already: result.code === "ALREADY_SCANNED",
        });
      } catch (err: any) {
        console.error("❌ scan error:", err);

        let message = err?.message || "Erreur serveur";
        if (message === "REGISTRATION_NOT_ELIGIBLE") {
          message = "Ticket non éligible (doit être payé/confirmé)";
        }

        socket.emit("registration:error", {
          code: "SCAN_FAILED",
          message,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("🔌 disconnected:", socket.id);
    });
  });

  return server;
}
