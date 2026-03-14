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
exports.getTicketsNsp = exports.getLiveNsp = exports.getIO = void 0;
exports.default = initSocket;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mongoose_1 = require("mongoose");
const Registration_1 = __importDefault(require("../models/Registration"));
let ioRef = null;
let liveNspRef = null;
let ticketsNspRef = null;
function roomName(registrationId) {
    return `registration:${registrationId}`;
}
function isObjectId(id) {
    return typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
}
function isUserAllowedOnEstablishment(establishment, userId) {
    var _a;
    const ownerId = ((_a = establishment === null || establishment === void 0 ? void 0 : establishment.owner) === null || _a === void 0 ? void 0 : _a._id) || (establishment === null || establishment === void 0 ? void 0 : establishment.owner);
    const staffArr = (establishment === null || establishment === void 0 ? void 0 : establishment.staff) || [];
    const isOwner = ownerId ? userId.equals(ownerId) : false;
    const isStaff = Array.isArray(staffArr) &&
        staffArr.some((s) => userId.equals((s === null || s === void 0 ? void 0 : s._id) || s));
    return { isOwner, isStaff, allowed: isOwner || isStaff };
}
function buildTicketData(reg) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    const event = reg === null || reg === void 0 ? void 0 : reg.event;
    const customer = reg === null || reg === void 0 ? void 0 : reg.customer;
    const customerName = customer
        ? `${(_a = customer.firstname) !== null && _a !== void 0 ? _a : ""} ${(_b = customer.lastname) !== null && _b !== void 0 ? _b : ""}`.trim()
        : "Client";
    return {
        registrationId: ((reg === null || reg === void 0 ? void 0 : reg._id) || "").toString(),
        eventId: ((event === null || event === void 0 ? void 0 : event._id) || "").toString(),
        eventTitle: (_c = event === null || event === void 0 ? void 0 : event.title) !== null && _c !== void 0 ? _c : "Événement",
        quantity: (_d = reg === null || reg === void 0 ? void 0 : reg.quantity) !== null && _d !== void 0 ? _d : 1,
        date: (_f = (_e = event === null || event === void 0 ? void 0 : event.startingDate) !== null && _e !== void 0 ? _e : reg === null || reg === void 0 ? void 0 : reg.date) !== null && _f !== void 0 ? _f : null,
        customerName,
        customerEmail: (_g = customer === null || customer === void 0 ? void 0 : customer.email) !== null && _g !== void 0 ? _g : "",
        customerPhone: (_j = (_h = customer === null || customer === void 0 ? void 0 : customer.phone) !== null && _h !== void 0 ? _h : customer === null || customer === void 0 ? void 0 : customer.telephone) !== null && _j !== void 0 ? _j : "",
        checkInStatus: (_k = reg === null || reg === void 0 ? void 0 : reg.checkInStatus) !== null && _k !== void 0 ? _k : "pending",
        status: (_l = reg === null || reg === void 0 ? void 0 : reg.status) !== null && _l !== void 0 ? _l : "pending",
        checkedInAt: (_m = reg === null || reg === void 0 ? void 0 : reg.checkedInAt) !== null && _m !== void 0 ? _m : null,
        checkedInBy: (_o = reg === null || reg === void 0 ? void 0 : reg.checkedInBy) !== null && _o !== void 0 ? _o : null,
    };
}
function findRegistrationFromPayload(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if ("registrationId" in payload && isObjectId(payload.registrationId)) {
            const reg = yield Registration_1.default.findById(payload.registrationId)
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
            const reg = yield Registration_1.default.findOne({ event: payload.eventId })
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
    });
}
function checkInRegistration(reg, byUserId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (reg.checkInStatus === "checked-in") {
            return { code: "ALREADY_SCANNED", registration: reg };
        }
        const allowedStatuses = ["paid", "confirmed"];
        if (!allowedStatuses.includes(reg.status)) {
            throw new Error("REGISTRATION_NOT_ELIGIBLE");
        }
        reg.checkInStatus = "checked-in";
        reg.checkedInAt = new Date();
        reg.checkedInBy = new mongoose_1.Types.ObjectId(byUserId);
        yield reg.save();
        return { code: "OK", registration: reg };
    });
}
function initSocket(app) {
    const server = http_1.default.createServer(app);
    const io = new socket_io_1.Server(server, {
        cors: { origin: "*" },
    });
    const nsp = io.of("/tickets");
    const liveNsp = io.of("/live");
    ioRef = io;
    ticketsNspRef = nsp;
    liveNspRef = liveNsp;
    nsp.on("connection", (socket) => {
        console.log("🔌 connected:", socket.id);
        socket.on("setUser", (userData) => {
            socket.user = userData;
            socket.emit("user:set", { ok: true });
            console.log("👤 setUser:", userData);
        });
        socket.on("ping", () => socket.emit("pong", { ok: true }));
        socket.on("registration:preview", (payload) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user = socket.user;
                if (!(user === null || user === void 0 ? void 0 : user._id)) {
                    return socket.emit("registration:error", {
                        code: "UNAUTHORIZED",
                        message: "Utilisateur non authentifié",
                    });
                }
                const reg = yield findRegistrationFromPayload(payload);
                if (!reg || !reg.event) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Ticket ou événement introuvable",
                    });
                }
                const event = reg.event;
                const establishment = (_a = event === null || event === void 0 ? void 0 : event.organizer) === null || _a === void 0 ? void 0 : _a.establishment;
                if (!establishment) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Établissement introuvable",
                    });
                }
                const userId = new mongoose_1.Types.ObjectId(user._id);
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
            }
            catch (err) {
                console.error("❌ preview error:", err);
                socket.emit("registration:error", {
                    code: "PREVIEW_FAILED",
                    message: (err === null || err === void 0 ? void 0 : err.message) || "Erreur preview",
                });
            }
        }));
        socket.on("registration:scan", (payload) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const user = socket.user;
                if (!(user === null || user === void 0 ? void 0 : user._id)) {
                    return socket.emit("registration:error", {
                        code: "UNAUTHORIZED",
                        message: "Utilisateur non authentifié",
                    });
                }
                const reg = yield findRegistrationFromPayload(payload);
                if (!reg || !reg.event) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Ticket ou événement introuvable",
                    });
                }
                const event = reg.event;
                const establishment = (_a = event === null || event === void 0 ? void 0 : event.organizer) === null || _a === void 0 ? void 0 : _a.establishment;
                if (!establishment) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Établissement introuvable",
                    });
                }
                const userId = new mongoose_1.Types.ObjectId(user._id);
                const { allowed } = isUserAllowedOnEstablishment(establishment, userId);
                if (!allowed) {
                    return socket.emit("registration:error", {
                        code: "FORBIDDEN",
                        message: "Accès refusé (gérant/staff uniquement)",
                    });
                }
                const result = yield checkInRegistration(reg, user._id);
                const ticketData = buildTicketData(result.registration);
                socket.join(roomName(ticketData.registrationId));
                nsp
                    .to(roomName(ticketData.registrationId))
                    .emit("registration:update", Object.assign(Object.assign({}, ticketData), { already: result.code === "ALREADY_SCANNED" }));
                socket.emit("registration:validated", {
                    ok: true,
                    ticket: ticketData,
                    already: result.code === "ALREADY_SCANNED",
                });
            }
            catch (err) {
                console.error("❌ scan error:", err);
                let message = (err === null || err === void 0 ? void 0 : err.message) || "Erreur serveur";
                if (message === "REGISTRATION_NOT_ELIGIBLE") {
                    message = "Ticket non éligible (doit être payé/confirmé)";
                }
                socket.emit("registration:error", {
                    code: "SCAN_FAILED",
                    message,
                });
            }
        }));
        socket.on("disconnect", () => {
            console.log("🔌 disconnected:", socket.id);
        });
    });
    liveNsp.on("connection", (socket) => {
        console.log("🔴 live connected:", socket.id);
        socket.on("live:joinEvent", (eventId) => {
            if (!eventId)
                return;
            socket.join(`event:${eventId}`);
            socket.emit("live:joined", { eventId });
            console.log(`Socket ${socket.id} joined live room event:${eventId}`);
        });
        socket.on("live:leaveEvent", (eventId) => {
            if (!eventId)
                return;
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
const getIO = () => {
    if (!ioRef) {
        throw new Error("Socket.IO not initialized");
    }
    return ioRef;
};
exports.getIO = getIO;
const getLiveNsp = () => {
    if (!liveNspRef) {
        throw new Error("Live namespace not initialized");
    }
    return liveNspRef;
};
exports.getLiveNsp = getLiveNsp;
const getTicketsNsp = () => {
    if (!ticketsNspRef) {
        throw new Error("Tickets namespace not initialized");
    }
    return ticketsNspRef;
};
exports.getTicketsNsp = getTicketsNsp;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFpSkEsNkJBbUxDO0FBblVELGdEQUF3QjtBQUN4Qix5Q0FBMkM7QUFFM0MsdUNBQWlDO0FBRWpDLDBFQUFrRDtBQUVsRCxJQUFJLEtBQUssR0FBa0IsSUFBSSxDQUFDO0FBQ2hDLElBQUksVUFBVSxHQUFvQyxJQUFJLENBQUM7QUFDdkQsSUFBSSxhQUFhLEdBQW9DLElBQUksQ0FBQztBQVkxRCxTQUFTLFFBQVEsQ0FBQyxjQUFzQjtJQUN0QyxPQUFPLGdCQUFnQixjQUFjLEVBQUUsQ0FBQztBQUMxQyxDQUFDO0FBRUQsU0FBUyxVQUFVLENBQUMsRUFBTztJQUN6QixPQUFPLE9BQU8sRUFBRSxLQUFLLFFBQVEsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDN0QsQ0FBQztBQUVELFNBQVMsNEJBQTRCLENBQ25DLGFBQWtCLEVBQ2xCLE1BQXNCOztJQUV0QixNQUFNLE9BQU8sR0FBRyxDQUFBLE1BQUEsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLEtBQUssMENBQUUsR0FBRyxNQUFJLGFBQWEsYUFBYixhQUFhLHVCQUFiLGFBQWEsQ0FBRSxLQUFLLENBQUEsQ0FBQztJQUNsRSxNQUFNLFFBQVEsR0FBRyxDQUFBLGFBQWEsYUFBYixhQUFhLHVCQUFiLGFBQWEsQ0FBRSxLQUFLLEtBQUksRUFBRSxDQUFDO0lBRTVDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBRXpELE1BQU0sT0FBTyxHQUNYLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQ3ZCLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsR0FBRyxLQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxPQUFPLEVBQUUsQ0FBQztBQUMzRCxDQUFDO0FBS0QsU0FBUyxlQUFlLENBQUMsR0FBUTs7SUFDL0IsTUFBTSxLQUFLLEdBQUcsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLEtBQUssQ0FBQztJQUN6QixNQUFNLFFBQVEsR0FBRyxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsUUFBUSxDQUFDO0lBRS9CLE1BQU0sWUFBWSxHQUFHLFFBQVE7UUFDM0IsQ0FBQyxDQUFDLEdBQUcsTUFBQSxRQUFRLENBQUMsU0FBUyxtQ0FBSSxFQUFFLElBQUksTUFBQSxRQUFRLENBQUMsUUFBUSxtQ0FBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUU7UUFDakUsQ0FBQyxDQUFDLFFBQVEsQ0FBQztJQUViLE9BQU87UUFDTCxjQUFjLEVBQUUsQ0FBQyxDQUFBLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxHQUFHLEtBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFO1FBQzNDLE9BQU8sRUFBRSxDQUFDLENBQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLEdBQUcsS0FBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUU7UUFDdEMsVUFBVSxFQUFFLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLEtBQUssbUNBQUksV0FBVztRQUN2QyxRQUFRLEVBQUUsTUFBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsUUFBUSxtQ0FBSSxDQUFDO1FBQzVCLElBQUksRUFBRSxNQUFBLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFlBQVksbUNBQUksR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLElBQUksbUNBQUksSUFBSTtRQUM5QyxZQUFZO1FBQ1osYUFBYSxFQUFFLE1BQUEsUUFBUSxhQUFSLFFBQVEsdUJBQVIsUUFBUSxDQUFFLEtBQUssbUNBQUksRUFBRTtRQUNwQyxhQUFhLEVBQUUsTUFBQSxNQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxLQUFLLG1DQUFJLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRSxTQUFTLG1DQUFJLEVBQUU7UUFDM0QsYUFBYSxFQUFFLE1BQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLGFBQWEsbUNBQUksU0FBUztRQUM5QyxNQUFNLEVBQUUsTUFBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsTUFBTSxtQ0FBSSxTQUFTO1FBQ2hDLFdBQVcsRUFBRSxNQUFBLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxXQUFXLG1DQUFJLElBQUk7UUFDckMsV0FBVyxFQUFFLE1BQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLFdBQVcsbUNBQUksSUFBSTtLQUN0QyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQWUsMkJBQTJCLENBQUMsT0FBc0I7O1FBQy9ELElBQUksZ0JBQWdCLElBQUksT0FBTyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUN0RSxNQUFNLEdBQUcsR0FBRyxNQUFNLHNCQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7aUJBQzVELFFBQVEsQ0FBQztnQkFDUixJQUFJLEVBQUUsT0FBTztnQkFDYixRQUFRLEVBQUU7b0JBQ1IsSUFBSSxFQUFFLHlCQUF5QjtvQkFDL0IsS0FBSyxFQUFFLGVBQWU7b0JBQ3RCLE1BQU0sRUFBRSxrQ0FBa0M7b0JBQzFDLFFBQVEsRUFBRTt3QkFDUixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTt3QkFDaEMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxvQ0FBb0MsRUFBRTtxQkFDaEU7aUJBQ0Y7YUFDRixDQUFDO2lCQUNELFFBQVEsQ0FBQztnQkFDUixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsTUFBTSxFQUFFLDhDQUE4QzthQUN2RCxDQUFDO2lCQUNELElBQUksRUFBRSxDQUFDO1lBRVYsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBRUQsSUFBSSxTQUFTLElBQUksT0FBTyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN4RCxNQUFNLEdBQUcsR0FBRyxNQUFNLHNCQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztpQkFDL0QsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7aUJBQ3ZCLFFBQVEsQ0FBQztnQkFDUixJQUFJLEVBQUUsT0FBTztnQkFDYixRQUFRLEVBQUU7b0JBQ1IsSUFBSSxFQUFFLHlCQUF5QjtvQkFDL0IsS0FBSyxFQUFFLGVBQWU7b0JBQ3RCLE1BQU0sRUFBRSxrQ0FBa0M7b0JBQzFDLFFBQVEsRUFBRTt3QkFDUixFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTt3QkFDaEM7NEJBQ0UsSUFBSSxFQUFFLE9BQU87NEJBQ2IsTUFBTSxFQUFFLDhDQUE4Qzt5QkFDdkQ7cUJBQ0Y7aUJBQ0Y7YUFDRixDQUFDO2lCQUNELFFBQVEsQ0FBQztnQkFDUixJQUFJLEVBQUUsVUFBVTtnQkFDaEIsTUFBTSxFQUFFLDhDQUE4QzthQUN2RCxDQUFDO2lCQUNELElBQUksRUFBRSxDQUFDO1lBRVYsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0NBQUE7QUFFRCxTQUFlLG1CQUFtQixDQUFDLEdBQVEsRUFBRSxRQUFnQjs7UUFDM0QsSUFBSSxHQUFHLENBQUMsYUFBYSxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sRUFBRSxJQUFJLEVBQUUsaUJBQTBCLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ2pFLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDL0MsQ0FBQztRQUVELEdBQUcsQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDO1FBQ2pDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUM3QixHQUFHLENBQUMsV0FBVyxHQUFHLElBQUksZ0JBQUssQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFL0MsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDakIsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFhLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ3BELENBQUM7Q0FBQTtBQUVELFNBQXdCLFVBQVUsQ0FBQyxHQUFZO0lBQzdDLE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBTSxDQUFDLE1BQU0sRUFBRTtRQUM1QixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO0tBQ3RCLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDOUIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUUvQixLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQ1gsYUFBYSxHQUFHLEdBQUcsQ0FBQztJQUNwQixVQUFVLEdBQUcsT0FBTyxDQUFDO0lBRXJCLEdBQUcsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBYyxFQUFFLEVBQUU7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBUyxFQUFFLENBQUMsUUFBcUIsRUFBRSxFQUFFO1lBQzVDLE1BQWMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFM0QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFPLE9BQXNCLEVBQUUsRUFBRTs7WUFDakUsSUFBSSxDQUFDO2dCQUNILE1BQU0sSUFBSSxHQUFJLE1BQWMsQ0FBQyxJQUEwQixDQUFDO2dCQUV4RCxJQUFJLENBQUMsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsR0FBRyxDQUFBLEVBQUUsQ0FBQztvQkFDZixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFPLEVBQUUsNkJBQTZCO3FCQUN2QyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUUsR0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNoQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxXQUFXO3dCQUNqQixPQUFPLEVBQUUsaUNBQWlDO3FCQUMzQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxNQUFNLEtBQUssR0FBSSxHQUFXLENBQUMsS0FBSyxDQUFDO2dCQUNqQyxNQUFNLGFBQWEsR0FBRyxNQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxTQUFTLDBDQUFFLGFBQWEsQ0FBQztnQkFFdEQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNuQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxXQUFXO3dCQUNqQixPQUFPLEVBQUUsMkJBQTJCO3FCQUNyQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLDRCQUE0QixDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFFeEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNiLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSx3Q0FBd0M7cUJBQ2xELENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUVELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFeEMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBRWpELE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7b0JBQ3BDLEVBQUUsRUFBRSxJQUFJO29CQUNSLE1BQU0sRUFBRSxVQUFVO2lCQUNuQixDQUFDLENBQUM7WUFDTCxDQUFDO1lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDdkMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtvQkFDaEMsSUFBSSxFQUFFLGdCQUFnQjtvQkFDdEIsT0FBTyxFQUFFLENBQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLE9BQU8sS0FBSSxnQkFBZ0I7aUJBQzFDLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFPLE9BQXNCLEVBQUUsRUFBRTs7WUFDOUQsSUFBSSxDQUFDO2dCQUNILE1BQU0sSUFBSSxHQUFJLE1BQWMsQ0FBQyxJQUEwQixDQUFDO2dCQUV4RCxJQUFJLENBQUMsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsR0FBRyxDQUFBLEVBQUUsQ0FBQztvQkFDZixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFPLEVBQUUsNkJBQTZCO3FCQUN2QyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxNQUFNLEdBQUcsR0FBRyxNQUFNLDJCQUEyQixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUN2RCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUUsR0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNoQyxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxXQUFXO3dCQUNqQixPQUFPLEVBQUUsaUNBQWlDO3FCQUMzQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxNQUFNLEtBQUssR0FBSSxHQUFXLENBQUMsS0FBSyxDQUFDO2dCQUNqQyxNQUFNLGFBQWEsR0FBRyxNQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxTQUFTLDBDQUFFLGFBQWEsQ0FBQztnQkFFdEQsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNuQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxXQUFXO3dCQUNqQixPQUFPLEVBQUUsMkJBQTJCO3FCQUNyQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDNUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLDRCQUE0QixDQUFDLGFBQWEsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFFeEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNiLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSx3Q0FBd0M7cUJBQ2xELENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEQsTUFBTSxVQUFVLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQztnQkFFeEQsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pELEdBQUc7cUJBQ0EsRUFBRSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7cUJBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsa0NBQ3RCLFVBQVUsS0FDYixPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksS0FBSyxpQkFBaUIsSUFDMUMsQ0FBQztnQkFFTCxNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFO29CQUNwQyxFQUFFLEVBQUUsSUFBSTtvQkFDUixNQUFNLEVBQUUsVUFBVTtvQkFDbEIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEtBQUssaUJBQWlCO2lCQUMzQyxDQUFDLENBQUM7WUFDTCxDQUFDO1lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBRXBDLElBQUksT0FBTyxHQUFHLENBQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLE9BQU8sS0FBSSxnQkFBZ0IsQ0FBQztnQkFDL0MsSUFBSSxPQUFPLEtBQUssMkJBQTJCLEVBQUUsQ0FBQztvQkFDNUMsT0FBTyxHQUFHLCtDQUErQyxDQUFDO2dCQUM1RCxDQUFDO2dCQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7b0JBQ2hDLElBQUksRUFBRSxhQUFhO29CQUNuQixPQUFPO2lCQUNSLENBQUMsQ0FBQztZQUNMLENBQUM7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxDQUFDLE1BQWMsRUFBRSxFQUFFO1FBQzFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTdDLE1BQU0sQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFlLEVBQUUsRUFBRTtZQUM5QyxJQUFJLENBQUMsT0FBTztnQkFBRSxPQUFPO1lBQ3JCLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUN4QyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsTUFBTSxDQUFDLEVBQUUsMkJBQTJCLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixFQUFFLENBQUMsT0FBZSxFQUFFLEVBQUU7WUFDL0MsSUFBSSxDQUFDLE9BQU87Z0JBQUUsT0FBTztZQUNyQixNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNqQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLE1BQU0sQ0FBQyxFQUFFLHlCQUF5QixPQUFPLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBRU0sTUFBTSxLQUFLLEdBQUcsR0FBRyxFQUFFO0lBQ3hCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNYLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBQ0QsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDLENBQUM7QUFMVyxRQUFBLEtBQUssU0FLaEI7QUFFSyxNQUFNLFVBQVUsR0FBRyxHQUFHLEVBQUU7SUFDN0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2hCLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztJQUNwRCxDQUFDO0lBQ0QsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBTFcsUUFBQSxVQUFVLGNBS3JCO0FBRUssTUFBTSxhQUFhLEdBQUcsR0FBRyxFQUFFO0lBQ2hDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUNuQixNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUNELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUMsQ0FBQztBQUxXLFFBQUEsYUFBYSxpQkFLeEIifQ==