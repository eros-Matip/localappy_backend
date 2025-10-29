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
                if (!user) {
                    return socket.emit("registration:error", {
                        code: "UNAUTHORIZED",
                        message: "Utilisateur non authentifié",
                    });
                }
                const registration = yield Registration_2.default.findById(payload.registrationId)
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
                const event = registration.event;
                const establishment = (_a = event.organizer) === null || _a === void 0 ? void 0 : _a.establishment;
                if (!establishment) {
                    return socket.emit("registration:error", {
                        code: "NOT_FOUND",
                        message: "Établissement associé introuvable",
                    });
                }
                const userId = new mongoose_1.Types.ObjectId(user._id);
                const isOwner = establishment.ownerAccount &&
                    userId.equals(establishment.ownerAccount._id);
                const isStaff = Array.isArray(establishment.staff) &&
                    establishment.staff.some((s) => userId.equals(new mongoose_1.Types.ObjectId(s._id)));
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
        });
    });
    return server;
};
exports.initSocket = initSocket;
exports.default = exports.initSocket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBd0I7QUFDeEIseUNBQTJDO0FBRTNDLDhEQUE2RTtBQUM3RSwwRUFBa0Q7QUFDbEQsdUNBQWlDO0FBTWpDLFNBQVMsUUFBUSxDQUFDLGNBQXNCO0lBQ3RDLE9BQU8sZ0JBQWdCLGNBQWMsRUFBRSxDQUFDO0FBQzFDLENBQUM7QUFXTSxNQUFNLFVBQVUsR0FBRyxDQUFDLEdBQVksRUFBZSxFQUFFO0lBQ3RELE1BQU0sTUFBTSxHQUFHLGNBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDdEMsTUFBTSxFQUFFLEdBQUcsSUFBSSxrQkFBTSxDQUFDLE1BQU0sRUFBRTtRQUM1QixJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO0tBQ3RCLENBQUMsQ0FBQztJQUVILE1BQU0sR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUM7SUFFOUIsR0FBRyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxNQUFjLEVBQUUsRUFBRTtRQUV0QyxNQUFNLENBQUMsRUFBRSxDQUNQLG1CQUFtQixFQUNuQixDQUFDLEVBQUUsY0FBYyxFQUE4QixFQUFFLEVBQUU7WUFDakQsSUFBSSxDQUFDLGNBQWM7Z0JBQUUsT0FBTztZQUM1QixNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FDRixDQUFDO1FBR0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsRUFBRSxDQUFPLE9BQW9CLEVBQUUsRUFBRTs7WUFDNUQsSUFBSSxDQUFDO2dCQUNILE1BQU0sSUFBSSxHQUFJLE1BQWMsQ0FBQyxJQUdyQixDQUFDO2dCQUVULElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDVixPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUU7d0JBQ3ZDLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFPLEVBQUUsNkJBQTZCO3FCQUN2QyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQztnQkFHRCxNQUFNLFlBQVksR0FBRyxNQUFNLHNCQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUM7cUJBQ3JFLFFBQVEsQ0FBQztvQkFDUixJQUFJLEVBQUUsT0FBTztvQkFDYixRQUFRLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLHlCQUF5Qjt3QkFDL0IsS0FBSyxFQUFFLGVBQWU7d0JBQ3RCLFFBQVEsRUFBRTs0QkFDUixJQUFJLEVBQUUsb0JBQW9COzRCQUMxQixNQUFNLEVBQUUsS0FBSzt5QkFDZDtxQkFDRjtpQkFDRixDQUFDO3FCQUNELElBQUksRUFBRSxDQUFDO2dCQUVWLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ3pDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSxpQ0FBaUM7cUJBQzNDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUVELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxLQUFZLENBQUM7Z0JBQ3hDLE1BQU0sYUFBYSxHQUFHLE1BQUEsS0FBSyxDQUFDLFNBQVMsMENBQUUsYUFBYSxDQUFDO2dCQUVyRCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ25CLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSxtQ0FBbUM7cUJBQzdDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUdELE1BQU0sTUFBTSxHQUFHLElBQUksZ0JBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNLE9BQU8sR0FDWCxhQUFhLENBQUMsWUFBWTtvQkFDMUIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUVoRCxNQUFNLE9BQU8sR0FDWCxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUM7b0JBQ2xDLGFBQWEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FDbEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUN6QyxDQUFDO2dCQUVKLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDekIsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFO3dCQUN2QyxJQUFJLEVBQUUsV0FBVzt3QkFDakIsT0FBTyxFQUNMLG1GQUFtRjtxQkFDdEYsQ0FBQyxDQUFDO2dCQUNMLENBQUM7Z0JBR0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFBLDZDQUE4QixFQUFDO29CQUNsRCxjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7b0JBQ3RDLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRztpQkFDckIsQ0FBQyxDQUFDO2dCQUVILE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxZQUFtQixDQUFDO2dCQUN2QyxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBRXZDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO29CQUNoRCxjQUFjLEVBQUUsR0FBRztvQkFDbkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO29CQUNsQixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWE7b0JBQ2hDLFdBQVcsRUFBRSxHQUFHLENBQUMsV0FBVztvQkFDNUIsV0FBVyxFQUFFLEdBQUcsQ0FBQyxXQUFXO29CQUM1QixPQUFPLEVBQUUsTUFBTSxDQUFDLElBQUksS0FBSyxpQkFBaUI7aUJBQzNDLENBQUMsQ0FBQztZQUNMLENBQUM7WUFBQyxPQUFPLEdBQVEsRUFBRSxDQUFDO2dCQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUM5QyxNQUFNLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFO29CQUNoQyxJQUFJLEVBQUUsYUFBYTtvQkFDbkIsT0FBTyxFQUFFLENBQUEsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLE9BQU8sS0FBSSwyQkFBMkI7aUJBQ3JELENBQUMsQ0FBQztZQUNMLENBQUM7UUFDSCxDQUFDLENBQUEsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsR0FBRyxFQUFFO1FBRTdCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDLENBQUM7QUF0SFcsUUFBQSxVQUFVLGNBc0hyQjtBQUVGLGtCQUFlLGtCQUFVLENBQUMifQ==