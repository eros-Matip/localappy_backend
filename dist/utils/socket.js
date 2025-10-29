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
            var _a, _b;
            try {
                const user = socket.user;
                if (!user || user.role !== "merchant") {
                    return socket.emit("registration:error", {
                        code: "FORBIDDEN",
                        message: "Rôle commerçant requis",
                    });
                }
                const result = yield (0, Registration_1.validateRegistrationAndCheckIn)({
                    registrationId: "registrationId" in payload ? payload.registrationId : undefined,
                    ticketNumber: "ticketNumber" in payload ? payload.ticketNumber : undefined,
                    merchantId: user._id,
                });
                const reg = result.registration;
                const rid = (reg._id || "").toString();
                nsp.to(roomName(rid)).emit("registration:update", {
                    registrationId: rid,
                    status: reg.status,
                    checkInStatus: reg.checkInStatus,
                    checkedInAt: (_a = reg.checkedInAt) !== null && _a !== void 0 ? _a : reg.updatedAt,
                    checkedInBy: (_b = reg.checkedInBy) !== null && _b !== void 0 ? _b : user._id,
                    already: result.code === "ALREADY_SCANNED",
                });
            }
            catch (err) {
                socket.emit("registration:error", {
                    code: "SCAN_FAILED",
                    message: (err === null || err === void 0 ? void 0 : err.message) || "Unknown error",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NvY2tldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFDQSxnREFBd0I7QUFDeEIseUNBQTJDO0FBRTNDLDhEQUE2RTtBQU03RSxTQUFTLFFBQVEsQ0FBQyxjQUFzQjtJQUN0QyxPQUFPLGdCQUFnQixjQUFjLEVBQUUsQ0FBQztBQUMxQyxDQUFDO0FBV00sTUFBTSxVQUFVLEdBQUcsQ0FBQyxHQUFZLEVBQWUsRUFBRTtJQUN0RCxNQUFNLE1BQU0sR0FBRyxjQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxHQUFHLElBQUksa0JBQU0sQ0FBQyxNQUFNLEVBQUU7UUFDNUIsSUFBSSxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtLQUN0QixDQUFDLENBQUM7SUFFSCxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRTlCLEdBQUcsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBYyxFQUFFLEVBQUU7UUFFdEMsTUFBTSxDQUFDLEVBQUUsQ0FDUCxtQkFBbUIsRUFDbkIsQ0FBQyxFQUFFLGNBQWMsRUFBOEIsRUFBRSxFQUFFO1lBQ2pELElBQUksQ0FBQyxjQUFjO2dCQUFFLE9BQU87WUFDNUIsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUN6RCxDQUFDLENBQ0YsQ0FBQztRQUdGLE1BQU0sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLEVBQUUsQ0FBTyxPQUFvQixFQUFFLEVBQUU7O1lBQzVELElBQUksQ0FBQztnQkFDSCxNQUFNLElBQUksR0FBSSxNQUFjLENBQUMsSUFHckIsQ0FBQztnQkFHVCxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ3RDLE9BQU8sTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTt3QkFDdkMsSUFBSSxFQUFFLFdBQVc7d0JBQ2pCLE9BQU8sRUFBRSx3QkFBd0I7cUJBQ2xDLENBQUMsQ0FBQztnQkFDTCxDQUFDO2dCQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSw2Q0FBOEIsRUFBQztvQkFDbEQsY0FBYyxFQUNaLGdCQUFnQixJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUztvQkFDbEUsWUFBWSxFQUNWLGNBQWMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFNBQVM7b0JBQzlELFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRztpQkFDckIsQ0FBQyxDQUFDO2dCQUVILE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxZQUFtQixDQUFDO2dCQUN2QyxNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBRXZDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO29CQUNoRCxjQUFjLEVBQUUsR0FBRztvQkFDbkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNO29CQUNsQixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWE7b0JBQ2hDLFdBQVcsRUFBRSxNQUFBLEdBQUcsQ0FBQyxXQUFXLG1DQUFJLEdBQUcsQ0FBQyxTQUFTO29CQUM3QyxXQUFXLEVBQUUsTUFBQSxHQUFHLENBQUMsV0FBVyxtQ0FBSSxJQUFJLENBQUMsR0FBRztvQkFDeEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxJQUFJLEtBQUssaUJBQWlCO2lCQUMzQyxDQUFDLENBQUM7WUFDTCxDQUFDO1lBQUMsT0FBTyxHQUFRLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRTtvQkFDaEMsSUFBSSxFQUFFLGFBQWE7b0JBQ25CLE9BQU8sRUFBRSxDQUFBLEdBQUcsYUFBSCxHQUFHLHVCQUFILEdBQUcsQ0FBRSxPQUFPLEtBQUksZUFBZTtpQkFDekMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztRQUNILENBQUMsQ0FBQSxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFFN0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQztBQXBFVyxRQUFBLFVBQVUsY0FvRXJCO0FBRUYsa0JBQWUsa0JBQVUsQ0FBQyJ9