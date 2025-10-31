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
        console.log("🟢 Nouvelle connexion socket /tickets :", socket.id);
        socket.on("setUser", (userData) => {
            socket.user = userData;
            console.log("👤 Utilisateur attaché :", userData);
        });
        socket.on("registration:join", ({ registrationId }) => {
            if (!registrationId)
                return;
            socket.join(roomName(registrationId));
            socket.emit("registration:joined", { registrationId });
        });
        socket.on("registration:scan", (payload) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            try {
                const user = socket.user;
                if (!(user === null || user === void 0 ? void 0 : user._id)) {
                    return socket.emit("registration:error", {
                        code: "UNAUTHORIZED",
                        message: "Utilisateur non authentifié",
                    });
                }
                const query = {};
                if ("registrationId" in payload && payload.registrationId) {
                    query._id = payload.registrationId;
                }
                else if ("ticketNumber" in payload && payload.ticketNumber) {
                    query.ticketNumber = payload.ticketNumber;
                }
                const registrationDoc = yield Registration_2.default.findOne(query)
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
                const registrationObj = registrationDoc.toObject();
                const registration = registrationObj;
                const establishment = (_b = (_a = registration.event) === null || _a === void 0 ? void 0 : _a.organizer) === null || _b === void 0 ? void 0 : _b.establishment;
                if (!establishment) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Établissement associé introuvable",
                    });
                }
                const userId = new mongoose_1.Types.ObjectId(user._id);
                const isOwner = establishment.owner &&
                    userId.equals(establishment.owner._id
                        ? establishment.owner._id
                        : establishment.owner);
                const isStaff = Array.isArray(establishment.staff) &&
                    establishment.staff.some((s) => userId.equals(s._id ? s._id : s));
                if (!isOwner && !isStaff) {
                    return socket.emit("registration:error", {
                        code: "FORBIDDEN",
                        message: "Accès refusé — seuls le gérant ou les membres du staff peuvent valider un ticket.",
                    });
                }
                const result = yield (0, Registration_1.validateRegistrationAndCheckIn)({
                    registrationId: registration._id.toString(),
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
                    already: result.code === "ALREADY_SCANNED",
                    message: result.code === "ALREADY_SCANNED"
                        ? "Ticket déjà validé ✅"
                        : "Ticket validé avec succès ✅",
                    eventTitle: (_c = registration.event) === null || _c === void 0 ? void 0 : _c.title,
                    eventDate: (_d = registration.event) === null || _d === void 0 ? void 0 : _d.startingDate,
                    customerName: ((_e = registration.customer) === null || _e === void 0 ? void 0 : _e.firstname) ||
                        ((_f = registration.customer) === null || _f === void 0 ? void 0 : _f.name) ||
                        ((_g = registration.customer) === null || _g === void 0 ? void 0 : _g.lastname) ||
                        "Client",
                    customerEmail: (_h = registration.customer) === null || _h === void 0 ? void 0 : _h.email,
                    customerPhone: (_j = registration.customer) === null || _j === void 0 ? void 0 : _j.phone,
                    quantity: registration.quantity,
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
        socket.on("disconnect", () => {
            console.log("🔴 Socket /tickets déconnectée :", socket.id);
        });
    });
    return server;
};
exports.initSocket = initSocket;
exports.default = exports.initSocket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBd0I7QUFDeEIseUNBQTJDO0FBRTNDLDhEQUE2RTtBQUM3RSwwRUFBa0Q7QUFDbEQsdUNBQWlDO0FBU2pDLFNBQVMsUUFBUSxDQUFDLGNBQXNCO0lBQ3RDLE9BQU8sZ0JBQWdCLGNBQWMsRUFBRSxDQUFDO0FBQzFDLENBQUM7QUFFTSxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVksRUFBZSxFQUFFO0lBQ3RELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBTSxDQUFDLE1BQU0sRUFBRTtRQUM1QixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO0tBQ3RCLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFOUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUdsRSxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQy9CLE1BQWMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7UUFHSCxNQUFNLENBQUMsRUFBRSxDQUNQLG1CQUFtQixFQUNuQixDQUFDLEVBQUUsY0FBYyxFQUE4QixFQUFFLEVBQUU7WUFDakQsSUFBSSxDQUFDLGNBQWM7Z0JBQUUsT0FBTztZQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FDRixDQUFDO1FBR0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFPLE9BQW9CLEVBQUUsRUFBRTs7WUFDNUQsSUFBSSxDQUFDO2dCQUVILE1BQU0sSUFBSSxHQUFJLE1BQWMsQ0FBQyxJQUdyQixDQUFDO2dCQUNULElBQUksQ0FBQyxDQUFBLElBQUksYUFBSixJQUFJLHVCQUFKLElBQUksQ0FBRSxHQUFHLENBQUEsRUFBRSxDQUFDO29CQUNmLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLGNBQWM7d0JBQ3BCLE9BQU8sRUFBRSw2QkFBNkI7cUJBQ3ZDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUdELE1BQU0sS0FBSyxHQUFRLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxnQkFBZ0IsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUMxRCxLQUFLLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUM7Z0JBQ3JDLENBQUM7cUJBQU0sSUFBSSxjQUFjLElBQUksT0FBTyxJQUFJLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDN0QsS0FBSyxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDO2dCQUM1QyxDQUFDO2dCQUdELE1BQU0sZUFBZSxHQUFHLE1BQU0sc0JBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO3FCQUN0RCxRQUFRLENBQUM7b0JBQ1IsSUFBSSxFQUFFLE9BQU87b0JBQ2IsTUFBTSxFQUFFLHlDQUF5QztvQkFDakQsUUFBUSxFQUFFO3dCQUNSLElBQUksRUFBRSx5QkFBeUI7d0JBQy9CLEtBQUssRUFBRSxlQUFlO3dCQUN0QixNQUFNLEVBQUUsa0NBQWtDO3dCQUMxQyxRQUFRLEVBQUU7NEJBQ1IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7NEJBQ2hDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO3lCQUNqQztxQkFDRjtpQkFDRixDQUFDO3FCQUNELFFBQVEsQ0FBQztvQkFDUixJQUFJLEVBQUUsVUFBVTtvQkFDaEIsTUFBTSxFQUFFLHFDQUFxQztpQkFDOUMsQ0FBQztxQkFDRCxJQUFJLEVBQUUsQ0FBQztnQkFFVixJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ3JCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSxpQ0FBaUM7cUJBQzNDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUdELE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQWEsQ0FBQztnQkEyQjlELE1BQU0sWUFBWSxHQUFHLGVBQXdDLENBQUM7Z0JBRzlELE1BQU0sYUFBYSxHQUFHLE1BQUEsTUFBQSxZQUFZLENBQUMsS0FBSywwQ0FBRSxTQUFTLDBDQUFFLGFBQWEsQ0FBQztnQkFDbkUsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNuQixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxXQUFXO3dCQUNqQixPQUFPLEVBQUUsbUNBQW1DO3FCQUM3QyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFNUMsTUFBTSxPQUFPLEdBQ1gsYUFBYSxDQUFDLEtBQUs7b0JBQ25CLE1BQU0sQ0FBQyxNQUFNLENBQ1YsYUFBYSxDQUFDLEtBQWEsQ0FBQyxHQUFHO3dCQUM5QixDQUFDLENBQUUsYUFBYSxDQUFDLEtBQWEsQ0FBQyxHQUFHO3dCQUNsQyxDQUFDLENBQUUsYUFBYSxDQUFDLEtBQWEsQ0FDakMsQ0FBQztnQkFFSixNQUFNLE9BQU8sR0FDWCxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7b0JBQ2xDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDakMsQ0FBQztnQkFFSixJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ3pCLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFDTCxtRkFBbUY7cUJBQ3RGLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUdELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSw2Q0FBOEIsRUFBQztvQkFDbEQsY0FBYyxFQUFFLFlBQVksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO29CQUMzQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUc7aUJBQ3JCLENBQUMsQ0FBQztnQkFFSCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBbUIsQ0FBQztnQkFDdkMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUd2QyxHQUFHLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtvQkFDaEQsY0FBYyxFQUFFLEdBQUc7b0JBQ25CLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTTtvQkFDbEIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhO29CQUNoQyxXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVc7b0JBQzVCLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVztvQkFDNUIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEtBQUssaUJBQWlCO2lCQUMzQyxDQUFDLENBQUM7Z0JBR0gsTUFBTSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRTtvQkFDcEMsY0FBYyxFQUFFLEdBQUc7b0JBQ25CLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxLQUFLLGlCQUFpQjtvQkFDMUMsT0FBTyxFQUNMLE1BQU0sQ0FBQyxJQUFJLEtBQUssaUJBQWlCO3dCQUMvQixDQUFDLENBQUMsc0JBQXNCO3dCQUN4QixDQUFDLENBQUMsNkJBQTZCO29CQUNuQyxVQUFVLEVBQUUsTUFBQSxZQUFZLENBQUMsS0FBSywwQ0FBRSxLQUFLO29CQUNyQyxTQUFTLEVBQUUsTUFBQSxZQUFZLENBQUMsS0FBSywwQ0FBRSxZQUFZO29CQUMzQyxZQUFZLEVBQ1YsQ0FBQSxNQUFBLFlBQVksQ0FBQyxRQUFRLDBDQUFFLFNBQVM7eUJBQ2hDLE1BQUEsWUFBWSxDQUFDLFFBQVEsMENBQUUsSUFBSSxDQUFBO3lCQUMzQixNQUFBLFlBQVksQ0FBQyxRQUFRLDBDQUFFLFFBQVEsQ0FBQTt3QkFDL0IsUUFBUTtvQkFDVixhQUFhLEVBQUUsTUFBQSxZQUFZLENBQUMsUUFBUSwwQ0FBRSxLQUFLO29CQUMzQyxhQUFhLEVBQUUsTUFBQSxZQUFZLENBQUMsUUFBUSwwQ0FBRSxLQUFLO29CQUMzQyxRQUFRLEVBQUUsWUFBWSxDQUFDLFFBQVE7aUJBQ2hDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO2dCQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFO29CQUNoQyxJQUFJLEVBQUUsYUFBYTtvQkFDbkIsT0FBTyxFQUFFLENBQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLE9BQU8sS0FBSSwyQkFBMkI7aUJBQ3JELENBQUMsQ0FBQztZQUNMLENBQUM7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1lBQzNCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUM7QUFuTVcsUUFBQSxVQUFVLGNBbU1yQjtBQUVGLGtCQUFlLGtCQUFVLENBQUMifQ==