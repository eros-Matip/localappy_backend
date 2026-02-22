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
exports.default = initSocket;
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mongoose_1 = require("mongoose");
const Registration_1 = __importDefault(require("../models/Registration"));
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
    return server;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQTZKQSw2QkFvS0M7QUFoVUQsZ0RBQXdCO0FBQ3hCLHlDQUEyQztBQUUzQyx1Q0FBaUM7QUFFakMsMEVBQWtEO0FBY2xELFNBQVMsUUFBUSxDQUFDLGNBQXNCO0lBQ3RDLE9BQU8sZ0JBQWdCLGNBQWMsRUFBRSxDQUFDO0FBQzFDLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxFQUFPO0lBQ3pCLE9BQU8sT0FBTyxFQUFFLEtBQUssUUFBUSxJQUFJLGdCQUFnQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3RCxDQUFDO0FBRUQsU0FBUyw0QkFBNEIsQ0FDbkMsYUFBa0IsRUFDbEIsTUFBc0I7O0lBRXRCLE1BQU0sT0FBTyxHQUFHLENBQUEsTUFBQSxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsS0FBSywwQ0FBRSxHQUFHLE1BQUksYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLEtBQUssQ0FBQSxDQUFDO0lBQ2xFLE1BQU0sUUFBUSxHQUFHLENBQUEsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLEtBQUssS0FBSSxFQUFFLENBQUM7SUFFNUMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFFekQsTUFBTSxPQUFPLEdBQ1gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7UUFDdkIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxHQUFHLEtBQUksQ0FBQyxDQUFDLENBQUMsQ0FB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