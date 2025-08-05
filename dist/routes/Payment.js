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
const Registration_1 = __importDefault(require("../models/Registration"));
const Bill_1 = __importDefault(require("../models/Bill"));
const Event_1 = __importDefault(require("../models/Event"));
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
        const { amount, currency, paymentMethod, description, registrationId, billId, } = req.body;
        if (!amount || !currency || !paymentMethod || !registrationId || !billId) {
            return res.status(400).json({ message: "Informations incomplètes" });
        }
        let paymentResponse;
        switch (paymentMethod) {
            case "stripe":
            case "applePay":
            case "googlePay":
                paymentResponse = yield stripe.paymentIntents.create({
                    amount: Math.round(amount * 100),
                    currency,
                    payment_method_types: ["card"],
                    description,
                    metadata: {
                        registrationId,
                        billId,
                    },
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
                                custom: registrationId,
                            },
                        ],
                        redirect_urls: {
                            return_url: "https://localappy.fr/event/payment/paypal/execute",
                            cancel_url: "https://localappy.fr/event/payment/paypal/cancel",
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
    var _a, _b;
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
        const paymentInfo = payment;
        const customField = (_b = (_a = paymentInfo.transactions) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.custom;
        const registrationId = customField;
        if (!registrationId) {
            return res.status(400).json({ message: "registrationId manquant" });
        }
        const registration = yield Registration_1.default.findById(registrationId);
        if (!registration) {
            return res.status(404).json({ message: "Inscription introuvable" });
        }
        const bill = yield Bill_1.default.findOne({ registration: registration._id });
        if (!bill) {
            return res.status(404).json({ message: "Facture introuvable" });
        }
        const event = yield Event_1.default.findById(registration.event);
        if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        if (registration.status === "paid" && bill.status === "paid") {
            return res.status(200).json({ message: "Déjà payé", payment });
        }
        registration.status = "paid";
        yield registration.save();
        bill.status = "paid";
        yield bill.save();
        event.capacity -= registration.quantity;
        if (event.capacity < 0)
            event.capacity = 0;
        yield event.save();
        return res.status(200).json({
            message: "Paiement PayPal confirmé",
            payment,
            registration,
            bill,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Erreur lors de l'exécution du paiement PayPal",
            error,
        });
    }
}));
router.post("/event/payment/confirm", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { registrationId, billId } = req.body;
        if (!registrationId || !billId) {
            return res.status(400).json({ message: "Paramètres manquants" });
        }
        const registration = yield Registration_1.default.findById(registrationId);
        if (!registration) {
            return res.status(404).json({ message: "Inscription introuvable" });
        }
        const bill = yield Bill_1.default.findById(billId);
        if (!bill) {
            return res.status(404).json({ message: "Facture introuvable" });
        }
        const event = yield Event_1.default.findById(registration.event);
        if (!event) {
            return res.status(404).json({ message: "Evénement introuvable" });
        }
        if (registration.status === "paid" && bill.status === "paid") {
            return res.status(200).json({ message: "Paiement déjà confirmé" });
        }
        registration.status = "paid";
        yield registration.save();
        bill.status = "paid";
        yield bill.save();
        event.capacity -= registration.quantity;
        if (event.capacity < 0)
            event.capacity = 0;
        yield event.save();
        return res.status(200).json({
            message: "Paiement confirmé",
            registration,
            bill,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Erreur lors de la confirmation du paiement",
            error,
        });
    }
}));
router.post("/event/payment/cash", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { registrationId, billId } = req.body;
        if (!registrationId || !billId) {
            return res.status(400).json({ message: "Paramètres manquants" });
        }
        const registration = yield Registration_1.default.findById(registrationId);
        if (!registration) {
            return res.status(404).json({ message: "Inscription introuvable" });
        }
        const bill = yield Bill_1.default.findById(billId);
        if (!bill) {
            return res.status(404).json({ message: "Facture introuvable" });
        }
        const event = yield Event_1.default.findById(registration.event);
        if (!event) {
            return res.status(404).json({ message: "Evénement introuvable" });
        }
        if (registration.status === "paid" && bill.status === "paid") {
            return res.status(200).json({ message: "Paiement déjà enregistré" });
        }
        registration.status = "paid";
        yield registration.save();
        bill.status = "paid";
        yield bill.save();
        event.capacity -= registration.quantity;
        if (event.capacity < 0)
            event.capacity = 0;
        yield event.save();
        return res.status(200).json({
            message: "Paiement en espèces enregistré",
            registration,
            bill,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Erreur lors de l'enregistrement du paiement cash",
            error,
        });
    }
}));
router.get("/user/payment-methods/:customerId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { customerId } = req.params;
    try {
        const paymentMethods = yield stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
        });
        return res.status(200).json({ paymentMethods });
    }
    catch (error) {
        return res
            .status(500)
            .json({ message: "Erreur récupération cartes", error });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF5bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvUGF5bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsc0VBQXFDO0FBQ3JDLG9EQUE0QjtBQUM1QiwwRUFBa0Q7QUFDbEQsMERBQWtDO0FBQ2xDLDREQUFvQztBQUVwQyxnQkFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhCLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWtCLEVBQUU7SUFDeEQsVUFBVSxFQUFFLG1CQUFtQjtDQUNoQyxDQUFDLENBQUM7QUFHSCx5QkFBTSxDQUFDLFNBQVMsQ0FBQztJQUNmLElBQUksRUFBRSxTQUFTO0lBQ2YsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWlCO0lBQ3hDLGFBQWEsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFxQjtDQUNqRCxDQUFDLENBQUM7QUFHSCxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUNsRSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQ0osTUFBTSxFQUNOLFFBQVEsRUFDUixhQUFhLEVBQ2IsV0FBVyxFQUNYLGNBQWMsRUFDZCxNQUFNLEdBQ1AsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBRWIsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLGFBQWEsSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMEJB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