// src/utils/socket.ts
import http from "http";
import { Server, Socket } from "socket.io";
import { Express } from "express";
import { validateRegistrationAndCheckIn } from "../controllers/Registration";
import Registration from "../models/Registration";
import { Types } from "mongoose";

import IRegistration from "../interfaces/Registration";
import IEvent from "../interfaces/Event";

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
    console.log("🟢 Nouvelle connexion socket /tickets :", socket.id);

    // le front envoie l'user ici
    socket.on("setUser", (userData) => {
      (socket as any).user = userData;
      console.log("👤 Utilisateur attaché :", userData);
    });

    // rejoindre une room
    socket.on(
      "registration:join",
      ({ registrationId }: { registrationId: string }) => {
        if (!registrationId) return;
        socket.join(roomName(registrationId));
        socket.emit("registration:joined", { registrationId });
      }
    );

    // scan
    socket.on("registration:scan", async (payload: ScanPayload) => {
      try {
        // A. check user sur la socket
        const user = (socket as any).user as {
          _id: string;
          role?: string;
        } | null;
        if (!user?._id) {
          return socket.emit("registration:error", {
            code: "UNAUTHORIZED",
            message: "Utilisateur non authentifié",
          });
        }

        // B. construire la requête
        const query: any = {};
        if ("registrationId" in payload && payload.registrationId) {
          query._id = payload.registrationId;
        } else if ("ticketNumber" in payload && payload.ticketNumber) {
          query.ticketNumber = payload.ticketNumber;
        }

        // C. récupérer la registration + event + establishment + customer
        const registrationDoc = await Registration.findOne(query)
          .populate({
            path: "event",
            select: "title startingDate endingDate organizer",
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
          .exec();

        if (!registrationDoc) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Événement ou ticket introuvable",
          });
        }

        // ✅ on enlève le Document Mongoose
        const registrationObj = registrationDoc.toObject() as unknown;

        // 🔐 type peuplé
        type PopulatedRegistration = IRegistration & {
          _id: Types.ObjectId; // 👈 ICI on force
          event?: IEvent & {
            organizer?: {
              establishment?: {
                _id: Types.ObjectId;
                name?: string;
                owner?: { _id: Types.ObjectId };
                staff?: Array<{ _id: Types.ObjectId }>;
                phone?: string;
                email?: string;
              };
            };
          };
          customer?: {
            _id: Types.ObjectId;
            firstname?: string;
            name?: string;
            lastname?: string;
            email?: string;
            phone?: string;
          };
        };

        const registration = registrationObj as PopulatedRegistration;

        // D. contrôle d’accès
        const establishment = registration.event?.organizer?.establishment;
        if (!establishment) {
          return socket.emit("registration:error", {
            code: "NOT_FOUND",
            message: "Établissement associé introuvable",
          });
        }

        const userId = new Types.ObjectId(user._id);

        const isOwner =
          establishment.owner &&
          userId.equals(
            (establishment.owner as any)._id
              ? (establishment.owner as any)._id
              : (establishment.owner as any)
          );

        const isStaff =
          Array.isArray(establishment.staff) &&
          establishment.staff.some((s: any) =>
            userId.equals(s._id ? s._id : s)
          );

        if (!isOwner && !isStaff) {
          return socket.emit("registration:error", {
            code: "FORBIDDEN",
            message:
              "Accès refusé — seuls le gérant ou les membres du staff peuvent valider un ticket.",
          });
        }

        // E. check-in
        const result = await validateRegistrationAndCheckIn({
          registrationId: registration._id.toString(), // 👈 plus d’erreur ici
          merchantId: user._id,
        });

        const reg = result.registration as any;
        const rid = (reg._id || "").toString();

        // F. broadcast
        nsp.to(roomName(rid)).emit("registration:update", {
          registrationId: rid,
          status: reg.status,
          checkInStatus: reg.checkInStatus,
          checkedInAt: reg.checkedInAt,
          checkedInBy: reg.checkedInBy,
          already: result.code === "ALREADY_SCANNED",
        });

        // G. renvoyer au client qui a scanné les infos pour l’affichage
        socket.emit("registration:validated", {
          registrationId: rid,
          already: result.code === "ALREADY_SCANNED",
          message:
            result.code === "ALREADY_SCANNED"
              ? "Ticket déjà validé ✅"
              : "Ticket validé avec succès ✅",
          eventTitle: registration.event?.title,
          eventDate: registration.date,
          customerName:
            registration.customer?.firstname ||
            registration.customer?.name ||
            registration.customer?.lastname ||
            "Client",
          customerEmail: registration.customer?.email,
          customerPhone: registration.customer?.phone,
          quantity: registration.quantity,
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
      console.log("🔴 Socket /tickets déconnectée :", socket.id);
    });
  });

  return server;
};

export default initSocket;
