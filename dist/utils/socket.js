"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = void 0;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const Registration_1 = require("../controllers/Registration");
const Registration_2 = __importDefault(require("../models/Registration"));
const mongoose_1 = require("mongoose");
function roomName(registrationId) {
    return `registration:${registrationId}`;
}
const initSocket = (app) => {
    const server = http_1.default.createServer(app);
    const io = new socket_io_1.Server(server, {
        cors: { origin: "*" },
    });
    const nsp = io.of("/tickets");
    nsp.on("connection", (socket) => {
        socket.on("setUser", (userData) => {
            socket.user = userData;
            console.log("👤 Utilisateur attaché à la socket :", userData);
        });
        socket.on("registration:join", ({ registrationId }) => {
            if (!registrationId)
                return;
            socket.join(roomName(registrationId));
            socket.emit("registration:joined", { registrationId });
        });
        socket.on("registration:scan", (payload) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const user = socket.user;
                if (!(user === null || user === void 0 ? void 0 : user._id)) {
                    return socket.emit("registration:error", {
                        code: "UNAUTHORIZED",
                        message: "Utilisateur non authentifié",
                    });
                }
                const registration = (yield Registration_2.default.findById(payload.registrationId)
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
                    .exec());
                if (!registration || !registration.event) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Événement ou ticket introuvable",
                    });
                }
                const event = registration.event;
                const establishment = (_a = event.organizer) === null || _a === void 0 ? void 0 : _a.establishment;
                if (!establishment) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Établissement associé introuvable",
                    });
                }
                socket.emit("registration:data", {
                    registrationId: registration === null || registration === void 0 ? void 0 : registration._id.toString(),
                    eventTitle: event.title,
                    eventAddress: event.address,
                    eventStart: event.startingDate,
                    eventEnd: event.endingDate,
                    customerName: registration.customer &&
                        [
                            registration.customer.firstname,
                            registration.customer.lastname ||
                                registration.customer.name,
                        ]
                            .filter(Boolean)
                            .join(" "),
                    customerEmail: (_b = registration.customer) === null || _b === void 0 ? void 0 : _b.email,
                    customerPhone: (_c = registration.customer) === null || _c === void 0 ? void 0 : _c.phone,
                    quantity: registration.quantity,
                });
                const userId = new mongoose_1.Types.ObjectId(user._id);
                const isOwner = establishment.owner && userId.equals(establishment.owner._id);
                const isStaff = Array.isArray(establishment.staff) &&
                    establishment.staff.some((s) => userId.equals(s._id));
                if (!isOwner && !isStaff) {
                    return socket.emit("registration:error", {
                        code: "FORBIDDEN",
                        message: "Accès refusé — seuls le gérant ou les membres du staff peuvent valider un ticket.",
                    });
                }
                const result = yield (0, Registration_1.validateRegistrationAndCheckIn)({
                    registrationId: payload.registrationId,
                    merchantId: user._id,
                });
                const reg = result.registration;
                const rid = (reg._id || "").toString();
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
            }
            catch (err) {
                console.error("❌ Erreur lors du scan :", err);
                socket.emit("registration:error", {
                    code: "SCAN_FAILED",
                    message: (err === null || err === void 0 ? void 0 : err.message) || "Erreur interne du serveur",
                });
            }
        }));
    });
    return server;
};
exports.initSocket = initSocket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBd0I7QUFDeEIseUNBQTJDO0FBRTNDLDhEQUE2RTtBQUM3RSwwRUFBa0Q7QUFDbEQsdUNBQWlDO0FBT2pDLFNBQVMsUUFBUSxDQUFDLGNBQXNCO0lBQ3RDLE9BQU8sZ0JBQWdCLGNBQWMsRUFBRSxDQUFDO0FBQzFDLENBQUM7QUFFTSxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVksRUFBZSxFQUFFO0lBQ3RELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBTSxDQUFDLE1BQU0sRUFBRTtRQUM1QixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO0tBQ3RCLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFOUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtRQUV0QyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQy9CLE1BQWMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsRUFBRSxDQUNQLG1CQUFtQixFQUNuQixDQUFDLEVBQUUsY0FBYyxFQUE4QixFQUFFLEVBQUU7WUFDakQsSUFBSSxDQUFDLGNBQWM7Z0JBQUUsT0FBTztZQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RD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