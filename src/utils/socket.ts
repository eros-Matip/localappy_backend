// src/utils/socket.ts
import http from "http";
import { Server, Socket } from "socket.io";
import { Express } from "express";
import { validateRegistrationAndCheckIn } from "../controllers/Registration";
import Registration from "../models/Registration";
import { Types } from "mongoose";
import IRegistration from "../interfaces/Registration";

type ScanPayload =
  | { registrationId: string; ticketNumber?: never }
  | { ticketNumber: string; registrationId?: never };

function roomName(registrationId: string) {
  return `registration:${registrationId}`;
}

export const initSocket = (app: Express): http.Server => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" },
  });

  const nsp = io.of("/tickets");

  nsp.on("connection", (socket: Socket) => {
    // 🧩 on associe l'user à la socket
    socket.on("setUser", (userData) => {
      (socket as any).user = userData;
      console.log("👤 Utilisateur attaché à la socket :", userData);
    });

    socket.on(
      "registration:join",
      ({ registrationId }: { registrationId: string }) => {
        if (!registrationId) return;
        socket.join(roomName(registrationId));
        socket.emit("registration:joined", { registrationId });
      }
    );

    // 💥 scan
    socket.on("registration:scan", async (payload: ScanPayload) => {
      try {
        const user = (socket as any).user as { _id: string } | null;

        if (!user?._id) {
          return socket.emit("registration:error", {
            code: "UNAUTHORIZED",
            message: "Utilisateur non authentifié",
          });
        }

        // 1️⃣ on récupère la registration + event + établissement
        const registration = (await Registration.findById(
          payload.registrationId
        )
          .populate({
            path: "event",
            select: "title address startingDate endingDate organizer",
            populate: {
              path: "organizer.establishment",
              model: "Establishment",
              select: "_id name owner staff phone email",
              populate: [
                { path: "owner", select: "_id" },
                { path: "staff", select: "_id" },
              ],
            },
          })
          .populate({
            path: "customer",
            select: "firstname name lastname email phone",
          })
          .exec()) as IRegistration & { _id: Types.ObjectId };

        if (!registration || !registration.event) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Événement ou ticket introuvable",
          });
        }

        const event: any = registration.event;
        const establishment = event.organizer?.establishment;

        if (!establishment) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Établissement associé introuvable",
          });
        }

        // 2️⃣ 👉 AVANT de valider, on peut déjà renvoyer les infos pour l'affichage
        // ça te permet sur le front d'afficher le nom de l'event, le client, la quantité, etc.
        socket.emit("registration:data", {
          registrationId: registration?._id.toString(),
          eventTitle: event.title,
          eventAddress: event.address,
          eventStart: event.startingDate,
          eventEnd: event.endingDate,
          customerName:
            registration.customer &&
            [
              (registration.customer as any).firstname,
              (registration.customer as any).lastname ||
                (registration.customer as any).name,
            ]
              .filter(Boolean)
              .join(" "),
          customerEmail: (registration.customer as any)?.email,
          customerPhone: (registration.customer as any)?.phone,
          quantity: registration.quantity,
        });

        // 3️⃣ on vérifie que l'utilisateur peut valider
        const userId = new Types.ObjectId(user._id);
        const isOwner =
          establishment.owner && userId.equals(establishment.owner._id);
        const isStaff =
          Array.isArray(establishment.staff) &&
          establishment.staff.some((s: any) => userId.equals(s._id));

        if (!isOwner && !isStaff) {
          return socket.emit("registration:error", {
            code: "FORBIDDEN",
            message:
              "Accès refusé — seuls le gérant ou les membres du staff peuvent valider un ticket.",
          });
        }

        // 4️⃣ on valide pour de vrai
        const result = await validateRegistrationAndCheckIn({
          registrationId: payload.registrationId,
          merchantId: user._id,
        });

        const reg = result.registration as any;
        const rid = (reg._id || "").toString();

        // 5️⃣ on notifie les rooms
        nsp.to(roomName(rid)).emit("registration:update", {
          registrationId: rid,
          status: reg.status,
          checkInStatus: reg.checkInStatus,
          checkedInAt: reg.checkedInAt,
          checkedInBy: reg.checkedInBy,
          already: result.code === "ALREADY_SCANNED",
        });

        // 6️⃣ on confirme à celui qui a scanné
        socket.emit("registration:validated", {
          registrationId: rid,
          message: "Ticket validé avec succès ✅",
        });
      } catch (err: any) {
        console.error("❌ Erreur lors du scan :", err);
        socket.emit("registration:error", {
          code: "SCAN_FAILED",
          message: err?.message || "Erreur interne du serveur",
        });
      }
    });
  });

  return server;
};
