// src/utils/socket.ts
import http from "http";
import { Server, Socket } from "socket.io";
import { Express } from "express";
import { validateRegistrationAndCheckIn } from "../controllers/Registration";

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

        // Si tu gères déjà l'auth en amont, tu peux retirer ce check.
        if (!user || user.role !== "merchant") {
          return socket.emit("registration:error", {
            code: "FORBIDDEN",
            message: "Rôle commerçant requis",
          });
        }

        const result = await validateRegistrationAndCheckIn({
          registrationId:
            "registrationId" in payload ? payload.registrationId : undefined,
          ticketNumber:
            "ticketNumber" in payload ? payload.ticketNumber : undefined,
          merchantId: user._id,
        });

        const reg = result.registration as any;
        const rid = (reg._id || "").toString();

        nsp.to(roomName(rid)).emit("registration:update", {
          registrationId: rid,
          status: reg.status, // e.g. "paid" | "confirmed"
          checkInStatus: reg.checkInStatus, // "checked-in"
          checkedInAt: reg.checkedInAt ?? reg.updatedAt,
          checkedInBy: reg.checkedInBy ?? user._id,
          already: result.code === "ALREADY_SCANNED",
        });
      } catch (err: any) {
        socket.emit("registration:error", {
          code: "SCAN_FAILED",
          message: err?.message || "Unknown error",
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
