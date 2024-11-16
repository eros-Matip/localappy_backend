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
const express_1 = __importDefault(require("express"));
const Customer_1 = __importDefault(require("../models/Customer"));
const axios_1 = __importDefault(require("axios"));
const uid2 = require("uid2");
const router = express_1.default.Router();
router.post("/socialLogin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { provider, accessToken } = req.body;
    if (!provider || !accessToken) {
        return res
            .status(400)
            .json({ message: "Provider and accessToken are required" });
    }
    try {
        let userData;
        if (provider === "google") {
            const googleResponse = yield axios_1.default.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`);
            userData = googleResponse.data;
        }
        else if (provider === "facebook") {
            const facebookResponse = yield axios_1.default.get(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`);
            userData = facebookResponse.data;
        }
        else {
            return res.status(400).json({ message: "Invalid provider" });
        }
        let customer = yield Customer_1.default.findOne({ email: userData.email }).populate([
            {
                path: "themesFavorites",
                model: "Theme",
            },
            {
                path: "eventsFavorites",
                model: "Event",
            },
        ]);
        if (!customer) {
            customer = new Customer_1.default({
                account: {
                    firstname: userData.given_name || userData.name,
                    name: userData.family_name || "",
                },
                picture: { url: userData.picture, public_id: "fromGoogle" },
                email: userData.email,
                token: uid2(29),
            });
            yield customer.save();
        }
        else {
            customer.token = uid2(29);
            yield customer.save();
        }
        return res.status(200).json({
            message: "Social login successful",
            customer,
        });
    }
    catch (error) {
        console.error("Erreur de connexion sociale :", error);
        return res.status(500).json({
            message: "Une erreur est survenue lors de la connexion sociale",
            error,
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9naW5CeVNvY2lhbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvTG9naW5CeVNvY2lhbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxrRUFBMEM7QUFDMUMsa0RBQTBCO0FBQzFCLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUc3QixNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ2hFLE1BQU0sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztJQUUzQyxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDOUIsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILElBQUksUUFBUSxDQUFDO1FBR2IsSUFBSSxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUIsTUFBTSxjQUFjLEdBQUcsTUFBTSxlQUFLLENBQUMsR0FBRyxDQUNwQyw4REFBOEQsV0FBVyxFQUFFLENBQzVFLENBQUM7WUFDRixRQUFRLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQztRQUNqQyxDQUFDO2FBQU0sSUFBSSxRQUFRLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDbkMsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQ3RDLG1FQUFtRSxXQUFXLEVBQUUsQ0FDakYsQ0FBQztZQUNGLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7UUFDbkMsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBR0QsSUFBSSxRQUFRLEdBQUcsTUFBTSxrQkFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDeEU7Z0JBQ0UsSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsS0FBSyxFQUFFLE9BQU87YUFDZjtZQUNEO2dCQUNFLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLEtBQUssRUFBRSxPQUFPO2FBQ2Y7U0FDRixDQUFDLENBQUM7UUFHSCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZCxRQUFRLEdBQUcsSUFBSSxrQkFBUSxDQUFDO2dCQUN0QixPQUFPLEVBQUU7b0JBQ1AsU0FBUyxFQUFFLFFBQVEsQ0FBQyxVQUFVLElBQUksUUFBUSxDQUFDLElBQUk7b0JBQy9DLElBQUksRUFBRSxRQUFRLENBQUMsV0FBVyxJQUFJLEVBQUU7aUJBQ2pDO2dCQUNELE9BQU8sRUFBRSxFQUFFLEdBQUcsRUFBRSxRQUFRLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUU7Z0JBQzNELEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztnQkFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7YUFDaEIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEIsQ0FBQzthQUFNLENBQUM7WUFFTixRQUFRLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMxQixNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4QixDQUFDO1FBR0QsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUseUJBQXlCO1lBQ2xDLFFBQVE7U0FDVCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsc0RBQXNEO1lBQy9ELEtBQUs7U0FDTixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUVILGtCQUFlLE1BQU0sQ0FBQyJ9