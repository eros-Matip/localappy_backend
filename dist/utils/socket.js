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
            var _a;
            try {
                const user = socket.user;
                if (!(user === null || user === void 0 ? void 0 : user._id)) {
                    return socket.emit("registration:error", {
                        code: "UNAUTHORIZED",
                        message: "Utilisateur non authentifié",
                    });
                }
                const registration = yield Registration_2.default.findById(payload.registrationId)
                    .populate({
                    path: "event",
                    select: "organizer",
                    populate: {
                        path: "organizer.establishment",
                        model: "Establishment",
                        select: "_id owner staff",
                        populate: [
                            { path: "owner", select: "_id" },
                            { path: "staff", select: "_id" },
                        ],
                    },
                })
                    .exec();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBd0I7QUFDeEIseUNBQTJDO0FBRTNDLDhEQUE2RTtBQUM3RSwwRUFBa0Q7QUFDbEQsdUNBQWlDO0FBTWpDLFNBQVMsUUFBUSxDQUFDLGNBQXNCO0lBQ3RDLE9BQU8sZ0JBQWdCLGNBQWMsRUFBRSxDQUFDO0FBQzFDLENBQUM7QUFFTSxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVksRUFBZSxFQUFFO0lBQ3RELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBTSxDQUFDLE1BQU0sRUFBRTtRQUM1QixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO0tBQ3RCLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFOUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtRQUV0QyxNQUFNLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO1lBQy9CLE1BQWMsQ0FBQyxJQUFJLEdBQUcsUUFBUSxDQUFDO1lBQ2hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0NBQXNDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7UUFHSCxNQUFNLENBQUMsRUFBRSxDQUNQLG1CQUFtQixFQUNuQixDQUFDLEVBQUUsY0FBYyxFQUE4QixFQUFFLEVBQUU7WUFDakQsSUFBSSxDQUFDLGNBQWM7Z0JBQUUsT0FBTztZQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FDRixDQUFDO1FBR0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFPLE9BQW9CLEVBQUUsRUFBRTs7WUFDNUQsSUFBSSxDQUFDO2dCQUNILE1BQU0sSUFBSSxHQUFJLE1BQWMsQ0FBQyxJQUE4QixDQUFDO2dCQUU1RCxJQUFJLENBQUMsQ0FBQSxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsR0FBRyxDQUFBLEVBQUUsQ0FBQztvQkFDZixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFPLEVBQUUsNkJBQTZCO3FCQUN2QyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFHRCxNQUFNLFlBQVksR0FBRyxNQUFNLHNCQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7cUJBQ3JFLFFBQVEsQ0FBQztvQkFDUixJQUFJLEVBQUUsT0FBTztvQkFDYixNQUFNLEVBQUUsV0FBVztvQkFDbkIsUUFBUSxFQUFFO3dCQUNSLElBQUksRUFBRSx5QkFBeUI7d0JBQy9CLEtBQUssRUFBRSxlQUFlO3dCQUN0QixNQUFNLEVBQUUsaUJBQWlCO3dCQUN6QixRQUFRLEVBQUU7NEJBQ1IsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUU7NEJBQ2hDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO3lCQUNqQztxQkFDRjtpQkFDRixDQUFDO3FCQUNELElBQUksRUFBRSxDQUFDO2dCQUVWLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3pDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSxpQ0FBaUM7cUJBQzNDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUVELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFZLENBQUM7Z0JBQ3hDLE1BQU0sYUFBYSxHQUFHLE1BQUEsS0FBSyxDQUFDLFNBQVMsMENBQUUsYUFBYSxDQUFDO2dCQUVyRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ25CLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSxtQ0FBbUM7cUJBQzdDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUdELE1BQU0sTUFBTSxHQUFHLElBQUksZ0JBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLE9BQU8sR0FDWCxhQUFhLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFaEUsTUFBTSxPQUFPLEdBQ1gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDO29CQUNsQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztnQkFFN0QsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUN6QixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxXQUFXO3dCQUNqQixPQUFPLEVBQ0wsbUZBQW1GO3FCQUN0RixDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFHRCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsNkNBQThCLEVBQUM7b0JBQ2xELGNBQWMsRUFBRSxPQUFPLENBQUMsY0FBYztvQkFDdEMsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHO2lCQUNyQixDQUFDLENBQUM7Z0JBRUgsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFlBQW1CLENBQUM7Z0JBQ3ZDLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFHdkMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7b0JBQ2hELGNBQWMsRUFBRSxHQUFHO29CQUNuQixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU07b0JBQ2xCLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYTtvQkFDaEMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXO29CQUM1QixXQUFXLEVBQUUsR0FBRyxDQUFDLFdBQVc7b0JBQzVCLE9BQU8sRUFBRSxNQUFNLENBQUMsSUFBSSxLQUFLLGlCQUFpQjtpQkFDM0MsQ0FBQyxDQUFDO2dCQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUU7b0JBQ3BDLGNBQWMsRUFBRSxHQUFHO29CQUNuQixPQUFPLEVBQUUsNkJBQTZCO2lCQUN2QyxDQUFDLENBQUM7WUFDTCxDQUFDO1lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtvQkFDaEMsSUFBSSxFQUFFLGFBQWE7b0JBQ25CLE9BQU8sRUFBRSxDQUFBLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxPQUFPLEtBQUksMkJBQTJCO2lCQUNyRCxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsT0FBTyxNQUFNLENBQUM7QUFDaEIsQ0FBQyxDQUFDO0FBMUhXLFFBQUEsVUFBVSxjQTBIckIifQ==