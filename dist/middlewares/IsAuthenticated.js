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
    if (!req.headers.authorization) {
        Retour_1.default.error("Unauthorized, token is required");
        return res.status(401).json({ error: "Unauthorized, token is required" });
    }
    const token = req.headers.authorization.replace("Bearer ", "");
    try {
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
            {
                path: "ownerAccount",
                model: "Owner",
                populate: "establishments",
            },
            {
                path: "establishmentStaffOf",
                model: "Establishment",
                select: "name _id",
            },
        ]);
        if (!CustomerFinded) {
            Retour_1.default.error("Invalid token");
            return res.status(401).json({ error: "Invalid token" });
        }
        if (isLoginRoute) {
            const newToken = uid2(30);
            CustomerFinded.token = newToken;
            if (req.body.expoPushToken) {
                CustomerFinded.expoPushToken = req.body.expoPushToken;
            }
            yield CustomerFinded.save();
            Retour_1.default.info(`Customer ${CustomerFinded.account.firstname} ${CustomerFinded.account.name} logged by token`);
            return res.status(200).json({
                message: "Token valid",
                customer: CustomerFinded,
            });
        }
        const isOwner = !!CustomerFinded.ownerAccount;
        const staffRef = CustomerFinded.establishmentStaffOf;
        const isStaff = !!staffRef;
        const currentEstablishmentId = req.params.establishmentId;
        let isStaffOfThisEstablishment = false;
        if (isStaff && currentEstablishmentId) {
            if (staffRef._id) {
                isStaffOfThisEstablishment =
                    staffRef._id.toString() === currentEstablishmentId;
            }
            else {
                isStaffOfThisEstablishment =
                    staffRef.toString && staffRef.toString() === currentEstablishmentId;
            }
        }
        req.body.admin = Object.assign(Object.assign({}, CustomerFinded.toObject()), { isOwner,
            isStaff,
            isStaffOfThisEstablishment });
        return next();
    }
    catch (error) {
        Retour_1.default.error("Auth middleware error: " + error.message);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = CustomerIsAuthenticated;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSXNBdXRoZW50aWNhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL0lzQXV0aGVudGljYXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLE1BQU0sdUJBQXVCLEdBQUcsQ0FDOUIsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBR2xFLElBQUksWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvQyxPQUFPLElBQUksRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFHRCxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvQixnQkFBTSxDQUFDLEtBQUssQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsaUNBQWlDLEVBQUUsQ0FBQyxDQUFDO0lBQzVFLENBQUM7SUFFRCxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRS9ELElBQUksQ0FBQztRQUNILE1BQU0sY0FBYyxHQUFHLE1BQU0sa0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUNoRTtnQkFDRSxJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixLQUFLLEVBQUUs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