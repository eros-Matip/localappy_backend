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
const stripe_1 = __importDefault(require("stripe"));
const paypal_rest_sdk_1 = __importDefault(require("paypal-rest-sdk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-01-27.acacia",
});
paypal_rest_sdk_1.default.configure({
    mode: "sandbox",
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET,
});
router.post("/event/payment", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { amount, currency, paymentMethod, description } = req.body;
        if (!amount || !currency || !paymentMethod) {
            return res
                .status(400)
                .json({ message: "Informations de paiement incomplètes" });
        }
        let paymentResponse;
        switch (paymentMethod) {
            case "stripe":
                paymentResponse = yield stripe.paymentIntents.create({
                    amount: Math.round(amount * 100),
                    currency,
                    payment_method_types: ["card"],
                    description,
                });
                return res.status(200).json({
                    message: "Paiement Stripe initié",
                    clientSecret: paymentResponse.client_secret,
                });
            case "paypal":
                try {
                    const create_payment_json = {
                        intent: "sale",
                        payer: { payment_method: "paypal" },
                        transactions: [
                            {
                                amount: {
                                    total: amount.toFixed(2),
                                    currency: currency.toUpperCase(),
                                },
                                description,
                            },
                        ],
                        redirect_urls: {
                            return_url: "http://localhost:5000/event/payment/paypal/execute",
                            cancel_url: "http://localhost:5000/event/payment/paypal/cancel",
                        },
                    };
                    const payment = yield new Promise((resolve, reject) => {
                        paypal_rest_sdk_1.default.payment.create(create_payment_json, (error, payment) => {
                            if (error)
                                reject(error);
                            else
                                resolve(payment);
                        });
                    });
                    const approvalUrl = (_b = (_a = payment.links) === null || _a === void 0 ? void 0 : _a.find((link) => link.rel === "approval_url")) === null || _b === void 0 ? void 0 : _b.href;
                    return res.status(200).json({
                        message: "Paiement PayPal initié",
                        approvalUrl,
                        paymentId: payment.id,
                    });
                }
                catch (error) {
                    return res.status(500).json({ message: "Erreur PayPal", error });
                }
            case "applePay":
            case "googlePay":
                return res.status(501).json({
                    message: `${paymentMethod} doit être géré via Stripe ou le SDK natif`,
                });
            default:
                return res
                    .status(400)
                    .json({ message: "Méthode de paiement non prise en charge" });
        }
    }
    catch (error) {
        return res.status(500).json({ message: "Erreur lors du paiement", error });
    }
}));
router.get("/event/payment/paypal/execute", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { paymentId, PayerID } = req.query;
        if (!paymentId || !PayerID) {
            return res.status(400).json({ message: "Paramètres manquants" });
        }
        const execute_payment_json = { payer_id: PayerID };
        const payment = yield new Promise((resolve, reject) => {
            paypal_rest_sdk_1.default.payment.execute(paymentId, execute_payment_json, (error, payment) => {
                if (error)
                    reject(error);
                else
                    resolve(payment);
            });
        });
        return res
            .status(200)
            .json({ message: "Paiement PayPal validé", payment });
    }
    catch (error) {
        return res.status(500).json({
            message: "Erreur lors de l'exécution du paiement PayPal",
            error,
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF5bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvUGF5bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsc0VBQXFDO0FBQ3JDLG9EQUE0QjtBQUU1QixnQkFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhCLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLEVBQUU7SUFDeEQsVUFBVSxFQUFFLG1CQUFtQjtDQUNoQyxDQUFDLENBQUM7QUFHSCx5QkFBTSxDQUFDLFNBQVMsQ0FBQztJQUNmLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWlCO0lBQ3hDLGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFxQjtDQUNqRCxDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUNsRSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUVsRSxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsUUFBUSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDM0MsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsSUFBSSxlQUFlLENBQUM7UUFFcEIsUUFBUSxhQUFhLEVBQUUsQ0FBQztZQUV0QixLQUFL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