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
const AdminIsAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const isLoginRoute = req.originalUrl.split("/").includes("login");
    if (isLoginRoute && !req.headers.authorization) {
        return next();
    }
    if (req.headers.authorization) {
        const token = req.headers.authorization.replace("Bearer ", "");
        const CustomerFinded = yield Customer_1.default.findOne({ token }).populate({
            path: "themesFavorites",
            model: "Theme",
        });
        if (CustomerFinded) {
            if (isLoginRoute) {
                const newToken = uid2(30);
                CustomerFinded.token = newToken;
                yield CustomerFinded.save();
                Retour_1.default.info(`Customer ${CustomerFinded.account.firstname} ${CustomerFinded.account.name} logged by token `);
                return res.status(200).json({
                    message: "Token valid",
                    customer: CustomerFinded,
                });
            }
            req.body.admin = CustomerFinded;
            if (!CustomerFinded.premiumStatus && !isLoginRoute) {
                Retour_1.default.warn("Unauthorized, premium status required");
                return res
                    .status(401)
                    .json({ error: "Unauthorized, premium status required" });
            }
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
exports.default = AdminIsAuthenticated;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSXNBdXRoZW50aWNhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL0lzQXV0aGVudGljYXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUEwQztBQUMxQywrREFBdUM7QUFDdkMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLE1BQU0sb0JBQW9CLEdBQUcsQ0FDM0IsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsTUFBTSxZQUFZLEdBQUcsR0FBRyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBR2xFLElBQUksWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUMvQyxPQUFPLElBQUksRUFBRSxDQUFDO0lBQ2hCLENBQUM7SUFHRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDOUIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMvRCxNQUFNLGNBQWMsR0FBRyxNQUFNLGtCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDaEUsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsT0FBTztTQUNmLENBQUMsQ0FBQztRQUdILElBQUksY0FBYyxFQUFFLENBQUM7WUFFbkIsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxRQUFRLEdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxjQUFjLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQztnQkFHaEMsTUFBTSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzVCLGdCQUFNLENBQUMsSUFBSSxDQUNULFlBQVksY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUksY0FBYyxDQUFDLE9BQU8sQ0FBQyxJQUFJLG1CQUFtQixDQUMvRixDQUFDO2dCQUNGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzFCLE9BQU8sRUFBRSxhQUFhO29CQUN0QixRQUFRLEVBQUUsY0FBYztpQkFDekIsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUdELEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLGNBQWMsQ0FBQztZQUVoQyxJQUFJLENBQUMsY0FBYyxDQUFDLGFBQWEsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUNuRCxnQkFBTSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO2dCQUNyRCxPQUFPLEdBQUc7cUJBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQztxQkFDWCxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsdUNBQXVDLEVBQUUsQ0FBQyxDQUFDO1lBQzlELENBQUM7WUFFRCxPQUFPLElBQUksRUFBRSxDQUFDO1FBQ2hCLENBQUM7YUFBTSxDQUFDO1lBQ04sZ0JBQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDOUIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQzFELENBQUM7SUFDSCxDQUFDO1NBQU0sQ0FBQztRQUVOLGdCQUFNLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7UUFDaEQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLENBQUM7SUFDNUUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsa0JBQWUsb0JBQW9CLENBQUMifQ==