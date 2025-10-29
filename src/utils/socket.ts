// src/utils/socket.ts
import http from "http";
import { Server, Socket } from "socket.io";
import { Express } from "express";
import { validateRegistrationAndCheckIn } from "../controllers/Registration";
import Registration from "../models/Registration";
import { Types } from "mongoose";

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
    console.log("🎉 Nouveau client socket connecté :", socket.id);

    // 🧩 Associer l'utilisateur à sa socket
    socket.on("setUser", (userData) => {
      (socket as any).user = userData;
      console.log("👤 Utilisateur attaché à la socket :", userData);
    });

    // Rejoindre une room
    socket.on(
      "registration:join",
      ({ registrationId }: { registrationId: string }) => {
        if (!registrationId) return;
        socket.join(roomName(registrationId));
        socket.emit("registration:joined", { registrationId });
      }
    );

    // Scan par un gérant / staff
    socket.on("registration:scan", async (payload: ScanPayload) => {
      try {
        const user = (socket as any).user as { _id: string } | null;

        if (!user?._id) {
          return socket.emit("registration:error", {
            code: "UNAUTHORIZED",
            message: "Utilisateur non authentifié",
          });
        }

        // 🔎 1️⃣ Récupération du ticket + event + établissement
        const registration = await Registration.findById(payload.registrationId)
          .populate({
            path: "event",
            populate: {
              path: "organizer.establishment",
              model: "Establishment",
              populate: {
                path: "ownerAccount staff",
                select: "_id",
              },
            },
          })
          .exec();

        if (!registration || !registration.event) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Événement ou ticket introuvable",
          });
        }

        const event = registration.event as any;
        const establishment = event.organizer?.establishment;

        if (!establishment) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Établissement associé introuvable",
          });
        }

        // 🔒 2️⃣ Vérifier si l'utilisateur fait partie du staff ou est le gérant
        const userId = new Types.ObjectId(user._id);
        const isOwner =
          establishment.ownerAccount &&
          userId.equals(establishment.ownerAccount._id);

        const isStaff =
          Array.isArray(establishment.staff) &&
          establishment.staff.some((s: any) =>
            userId.equals(new Types.ObjectId(s._id))
          );

        if (!isOwner && !isStaff) {
          return socket.emit("registration:error", {
            code: "FORBIDDEN",
            message:
              "Accès refusé — seuls le gérant ou les membres du staff peuvent valider un ticket.",
          });
        }

        // ✅ 3️⃣ Valider le check-in
        const result = await validateRegistrationAndCheckIn({
          registrationId: payload.registrationId,
          merchantId: user._id,
        });

        const reg = result.registration as any;
        const rid = (reg._id || "").toString();

        // 🔄 4️⃣ Émettre la mise à jour à tous les clients connectés à cette registration
        nsp.to(roomName(rid)).emit("registration:update", {
          registrationId: rid,
          status: reg.status,
          checkInStatus: reg.checkInStatus,
          checkedInAt: reg.checkedInAt,
          checkedInBy: reg.checkedInBy,
          already: result.code === "ALREADY_SCANNED",
        });

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
