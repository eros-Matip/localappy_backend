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
const Customer_1 = __importDefault(require("../models/Customer"));
const Retour_1 = __importDefault(require("../library/Retour"));
const TrackloginStat_1 = require("../library/TrackloginStat");
const uid2 = require("uid2");
const CustomerIsAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const isLoginRoute = req.originalUrl.split("/").includes("login");
    if (isLoginRoute && !req.headers.authorization) {
        return next();
    }
    if (req.headers.authorization) {
        const token = req.headers.authorization.replace("Bearer ", "");
        const CustomerFinded = yield Customer_1.default.findOne({ token }).populate([
            {
                path: "themesFavorites",
                model: "Theme",
            },
            {
                path: "eventsFavorites",
                model: "Event",
            },
            {
                path: "eventsReserved",
                model: "Event",
                populate: "registrations",
            },
            { path: "ownerAccount", model: "Owner", populate: "establishments" },
        ]);
        if (CustomerFinded) {
            if (isLoginRoute) {
                const newToken = uid2(30);
                CustomerFinded.token = newToken;
                if (req.body.expoPushToken) {
                    CustomerFinded.expoPushToken = req.body.expoPushToken;
                }
                yield CustomerFinded.save();
                yield (0, TrackloginStat_1.trackLoginStat)({
                    role: "customer",
                });
                Retour_1.default.info(`Customer ${CustomerFinded.account.firstname} ${CustomerFinded.account.name} logged by token `);
                return res.status(200).json({
                    message: "Token valid",
                    customer: CustomerFinded,
                });
            }
            req.body.admin = CustomerFinded;
            req.customer = CustomerFinded;
            return next();
        }
        else {
            Retour_1.default.error("Invalid token");
            return res.status(401).json({ error: "Invalid token" });
        }
    }
    else {
        Retour_1.default.error("Unauthorized, token is required");
        return res.status(401).json({ error: "Unauthorized, token is required" });
    }
});
exports.default = CustomerIsAuthenticated;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSXNBdXRoZW50aWNhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL0lzQXV0aGVudGljYXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsOERBQTJEO0FBQzNELE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUU3QixNQUFNLHVCQUF1QixHQUFHLENBQzlCLEdBQVksRUFDWixHQUFhLEVBQ2IsSUFBa0IsRUFDbEIsRUFBRTtJQUNGLE1BQU0sWUFBWSxHQUFHLEdBQUcsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUdsRSxJQUFJLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDL0MsT0FBTyxJQUFJLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBR0QsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQzlCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFL0QsTUFBTSxjQUFjLEdBQUcsTUFBTSxrQkFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDO1lBQ2hFO2dCQUNFLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLEtBQUssRUFBRSxPQUFPO2FBQ2Y7WUFDRDtnQkFDRSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixLQUFLLEVBQUUsT0FBTzthQUNmO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsS0FBSyxFQUFFLE9BQU87Z0JBQ2QsUUFBUSxFQUFFLGVBQWU7YUFDMUI7WUFDRCxFQUFFLElBQUksRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsZ0JBQWdCLEVBQUU7U0FDckUsQ0FBQyxDQUFDO1FBR0gsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUVuQixJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNqQixNQUFNLFFBQVEsR0FBVyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2xDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO2dCQUdoQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQzNCLGNBQWMsQ0FBQyxhQUFhLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQ3hELENBQUM7Z0JBR0QsTUFBTSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sSUFBQSwrQkFBYyxFQUFDO29CQUNuQixJQUFJLEVBQUUsVUFBVTtpQkFDakIsQ0FBQyxDQUFDO2dCQUNILGdCQUFNLENBQUMsSUFBSSxDQUNULFlBQVksY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLG1CQUFtQixDQUMvRixDQUFDO2dCQUNGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzFCLE9BQU8sRUFBRSxhQUFhO29CQUN0QixRQUFRLEVBQUUsY0FBYztpQkFDekIsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUdELEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQztZQUMvQixHQUFXLENBQUMsUUFBUSxHQUFHLGNBQWMsQ0FBQztZQVV2QyxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ2hCLENBQUM7YUFBTSxDQUFDO1lBQ04sZ0JBQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDOUIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7SUFDSCxDQUFDO1NBQU0sQ0FBQztRQUVOLGdCQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDaEQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLENBQUM7SUFDNUUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsa0JBQWUsdUJBQXVCLENBQUMifQ==