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

/**
 * Initialise Socket.IO sur un serveur HTTP commun avec Express.
 * - Namespace: /tickets (peut être renommé si besoin)
 * - Événements:
 *    - registration:join { registrationId }
 *    - registration:scan { registrationId } | { ticketNumber }  // pas de vérif QR ici
 *    - registration:update { registrationId, checkInStatus, ... }
 *    - registration:error { code, message }
 */
export const initSocket = (app: Express): http.Server => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: "*" }, // ajuste pour la prod
  });

  const nsp = io.of("/tickets");

  nsp.on("connection", (socket: Socket) => {
    // Rejoindre la room d'une registration
    socket.on(
      "registration:join",
      ({ registrationId }: { registrationId: string }) => {
        if (!registrationId) return;
        socket.join(roomName(registrationId));
        socket.emit("registration:joined", { registrationId });
      }
    );

    // Scan par le commerçant (PAS de vérification de qrToken ici)
    socket.on("registration:scan", async (payload: ScanPayload) => {
      try {
        const user = (socket as any).user as {
          _id: string;
          role: string;
        } | null;

        if (!user) {
          return socket.emit("registration:error", {
            code: "UNAUTHORIZED",
            message: "Utilisateur non authentifié",
          });
        }

        // Récupération de la registration pour remonter jusqu’à l’événement
        const registration = await Registration.findById(payload.registrationId)
          .populate({
            path: "event",
            populate: {
              path: "organizer.establishment",
              model: "Establishment",
              populate: {
                path: "staff ownerAccount",
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

        // Vérifie si le user est le propriétaire OU un membre du staff
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

        // ✅ Validation et check-in
        const result = await validateRegistrationAndCheckIn({
          registrationId: payload.registrationId,
          merchantId: user._id,
        });

        const reg = result.registration as any;
        const rid = (reg._id || "").toString();

        nsp.to(roomName(rid)).emit("registration:update", {
          registrationId: rid,
          status: reg.status,
          checkInStatus: reg.checkInStatus,
          checkedInAt: reg.checkedInAt ?? reg.updatedAt,
          checkedInBy: user._id,
          already: result.code === "ALREADY_SCANNED",
        });
      } catch (err: any) {
        console.error("❌ Erreur lors du scan :", err);
        socket.emit("registration:error", {
          code: "SCAN_FAILED",
          message: err?.message || "Erreur interne du serveur",
        });
      }
    });

    socket.on("disconnect", () => {
      // noop
    });
  });

  return server;
};

export default initSocket;
