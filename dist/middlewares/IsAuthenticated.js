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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSXNBdXRoZW50aWNhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL0lzQXV0aGVudGljYXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLE1BQU0sdUJBQXVCLEdBQUcsQ0FDOUIsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBR2xFLElBQUksWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvQyxPQUFPLElBQUksRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFHRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDOUIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUvRCxNQUFNLGNBQWMsR0FBRyxNQUFNLGtCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDaEU7Z0JBQ0UsSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsS0FBSyxFQUFFLE9BQU87YUFDZjtZQUNEO2dCQUNFLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLEtBQUssRUFBRSxPQUFPO2FBQ2Y7WUFDRDtnQkFDRSxJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixLQUFLLEVBQUUsT0FBTzthQUNmO1lBQ0QsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFO1NBQ3JFLENBQUMsQ0FBQztRQUdILElBQUksY0FBYyxFQUFFLENBQUM7WUFFbkIsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxRQUFRLEdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxjQUFjLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztnQkFHaEMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUMzQixjQUFjLENBQUMsYUFBYSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDO2dCQUN4RCxDQUFDO2dCQUdELE1BQU0sY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM1QixnQkFBTSxDQUFDLElBQUksQ0FDVCxZQUFZLGNBQWMsQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLGNBQWMsQ0FBQyxPQUFPLENBQUMsSUFBSSxtQkFBbUIsQ0FDL0YsQ0FBQztnQkFDRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMxQixPQUFPLEVBQUUsYUFBYTtvQkFDdEIsUUFBUSxFQUFFLGNBQWM7aUJBQ3pCLENBQUMsQ0FBQztZQUNMLENBQUM7WUFHRCxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxjQUFjLENBQUM7WUFVaEMsT0FBTyxJQUFJLEVBQUUsQ0FBQztRQUNoQixDQUFDO2FBQU0sQ0FBQztZQUNOLGdCQUFNLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzlCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUMxRCxDQUFDO0lBQ0gsQ0FBQztTQUFNLENBQUM7UUFFTixnQkFBTSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLGtCQUFlLHVCQUF1QixDQUFDIn0=