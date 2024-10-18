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
const uid2 = require("uid2");
const AdminIsAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const isLoginRoute = req.originalUrl.split("/").includes("login");
    if (isLoginRoute && !req.headers.authorization) {
        return next();
    }
    if (req.headers.authorization) {
        const token = req.headers.authorization.replace("Bearer ", "");
        const CustomerFinded = yield Customer_1.default.findOne({ token });
        console.log("Token received:", token);
        if (CustomerFinded) {
            if (isLoginRoute) {
                const newToken = uid2(30);
                CustomerFinded.token = newToken;
                yield CustomerFinded.save();
                return res.status(200).json({
                    message: "Token valid",
                    customer: CustomerFinded,
                });
            }
            req.body.admin = CustomerFinded;
            if (!CustomerFinded.premiumStatus && !isLoginRoute) {
                return res
                    .status(401)
                    .json({ error: "Unauthorized, premium status required" });
            }
            return next();
        }
        else {
            return res.status(401).json({ error: "Invalid token" });
        }
    }
    else {
        return res.status(401).json({ error: "Unauthorized, token is required" });
    }
});
exports.default = AdminIsAuthenticated;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSXNBdXRoZW50aWNhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL0lzQXV0aGVudGljYXRlZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUNBLGtFQUEwQztBQUMxQyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0IsTUFBTSxvQkFBb0IsR0FBRyxDQUMzQixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixNQUFNLFlBQVksR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7SUFHbEUsSUFBSSxZQUFZLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQy9DLE9BQU8sSUFBSSxFQUFFLENBQUM7SUFDaEIsQ0FBQztJQUdELElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUM5QixNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELE1BQU0sY0FBYyxHQUFHLE1BQU0sa0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFHdEMsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUVuQixJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNqQixNQUFNLFFBQVEsR0FBVyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2xDLGNBQWMsQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDO2dCQUdoQyxNQUFNLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDNUIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDMUIsT0FBTyxFQUFFLGFBQWE7b0JBQ3RCLFFBQVEsRUFBRSxjQUFjO2lCQUN6QixDQUFDLENBQUM7WUFDTCxDQUFDO1lBR0QsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEdBQUcsY0FBYyxDQUFDO1lBRWhDLElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25ELE9BQU8sR0FBRztxQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO3FCQUNYLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSx1Q0FBdUMsRUFBRSxDQUFDLENBQUM7WUFDOUQsQ0FBQztZQUVELE9BQU8sSUFBSSxFQUFFLENBQUM7UUFDaEIsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDMUQsQ0FBQztJQUNILENBQUM7U0FBTSxDQUFDO1FBRU4sT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLENBQUM7SUFDNUUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsa0JBQWUsb0JBQW9CLENBQUMifQ==