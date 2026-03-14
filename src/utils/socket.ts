// src/utils/socket.ts
import http from "http";
import { Server, Socket } from "socket.io";
import { Express } from "express";
import { Types } from "mongoose";

import Registration from "../models/Registration";

let ioRef: Server | null = null;
let liveNspRef: ReturnType<Server["of"]> | null = null;
let ticketsNspRef: ReturnType<Server["of"]> | null = null;

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

async function findRegistrationFromPayload(payload: TicketPayload) {
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

async function checkInRegistration(reg: any, byUserId: string) {
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
  const liveNsp = io.of("/live");

  ioRef = io;
  ticketsNspRef = nsp;
  liveNspRef = liveNsp;

  nsp.on("connection", (socket: Socket) => {
    console.log("🔌 connected:", socket.id);

    socket.on("setUser", (userData: UserPayload) => {
      (socket as any).user = userData;
      socket.emit("user:set", { ok: true });
      console.log("👤 setUser:", userData);
    });

    socket.on("ping", () => socket.emit("pong", { ok: true }));

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

  liveNsp.on("connection", (socket: Socket) => {
    console.log("🔴 live connected:", socket.id);

    socket.on("live:joinEvent", (eventId: string) => {
      if (!eventId) return;
      socket.join(`event:${eventId}`);
      socket.emit("live:joined", { eventId });
      console.log(`Socket ${socket.id} joined live room event:${eventId}`);
    });

    socket.on("live:leaveEvent", (eventId: string) => {
      if (!eventId) return;
      socket.leave(`event:${eventId}`);
      socket.emit("live:left", { eventId });
      console.log(`Socket ${socket.id} left live room event:${eventId}`);
    });

    socket.on("disconnect", () => {
      console.log("🔴 live disconnected:", socket.id);
    });
  });

  return server;
}

export const getIO = () => {
  if (!ioRef) {
    throw new Error("Socket.IO not initialized");
  }
  return ioRef;
};

export const getLiveNsp = () => {
  if (!liveNspRef) {
    throw new Error("Live namespace not initialized");
  }
  return liveNspRef;
};

export const getTicketsNsp = () => {
  if (!ticketsNspRef) {
    throw new Error("Tickets namespace not initialized");
  }
  return ticketsNspRef;
};
