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
                Retour_1.default.info(`Customer ${CustomerFinded.account.firstname} ${CustomerFinded.account.name} logged by token `);
                return res.status(200).json({
                    message: "Token valid",
                    customer: CustomerFinded,
                });
            }
            req.body.admin = CustomerFinded;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSXNBdXRoZW50aWNhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL0lzQXV0aGVudGljYXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLE1BQU0sdUJBQXVCLEdBQUcsQ0FDOUIsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBR2xFLElBQUksWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvQyxPQUFPLElBQUksRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFHRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDOUIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUvRCxNQUFNLGNBQWMsR0FBRyxNQUFNLGtCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDaEU7Z0JBQ0UsSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsS0FBSyxFQUFFLE9BQU87YUFDZjtZQUNEO2dCQUNFLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLEtBQUssRUFBRSxPQUFPO2FBQ2Y7WUFDRDtnQkFDRSxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixLQUFLLEVBQUUsT0FBTztnQkFDZCxRQUFRLEVBQUUsZUFBZTthQUMxQjtZQUNELEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRTtTQUNyRSxDQUFDLENBQUM7UUFHSCxJQUFJLGNBQWMsRUFBRSxDQUFDO1lBRW5CLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sUUFBUSxHQUFXLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDbEMsY0FBYyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQUM7Z0JBR2hDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDM0IsY0FBYyxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQztnQkFDeEQsQ0FBQztnQkFHRCxNQUFNLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDNUIsZ0JBQU0sQ0FBQyxJQUFJLENBQ1QsWUFBWSxjQUFjLENBQUMsT0FBTyxDQUFDLFNBQVMsSUFBSSxjQUFjLENBQUMsT0FBTyxDQUFDLElBQUksbUJBQW1CLENBQy9GLENBQUM7Z0JBQ0YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDMUIsT0FBTyxFQUFFLGFBQWE7b0JBQ3RCLFFBQVEsRUFBRSxjQUFjO2lCQUN6QixDQUFDLENBQUM7WUFDTCxDQUFDO1lBR0QsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsY0FBYyxDQUFDO1lBVWhDLE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDaEIsQ0FBQzthQUFNLENBQUM7WUFDTixnQkFBTSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUM5QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDMUQsQ0FBQztJQUNILENBQUM7U0FBTSxDQUFDO1FBRU4sZ0JBQU0sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUNoRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGlDQUFpQyxFQUFFLENBQUMsQ0FBQztJQUM1RSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixrQkFBZSx1QkFBdUIsQ0FBQyJ9