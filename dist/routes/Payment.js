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
const Customer_1 = __importDefault(require("../models/Customer"));
const Bill_1 = __importDefault(require("../models/Bill"));
const Event_1 = __importDefault(require("../models/Event"));
dotenv_1.default.config();
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
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
        const customer = yield Customer_1.default.findById(registration.customer);
        if (customer) {
            if (!customer.eventsReserved.includes(event._id)) {
                customer.eventsReserved.push(event._id);
                yield customer.save();
            }
        }
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
        const customer = yield Customer_1.default.findById(registration.customer);
        if (customer) {
            if (!customer.eventsReserved.includes(event._id)) {
                customer.eventsReserved.push(event._id);
                yield customer.save();
            }
        }
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
        const customer = yield Customer_1.default.findById(registration.customer);
        if (customer) {
            if (!customer.eventsReserved.includes(event._id)) {
                customer.eventsReserved.push(event._id);
                yield customer.save();
            }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF5bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvUGF5bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsc0VBQXFDO0FBQ3JDLG9EQUE0QjtBQUM1QiwwRUFBa0Q7QUFDbEQsa0VBQTBDO0FBQzFDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFFcEMsZ0JBQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQixNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUksZ0JBQU0sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFrQixFQUFFO0lBQ3hELFVBQVUsRUFBRSxtQkFBbUI7Q0FDaEMsQ0FBQyxDQUFDO0FBR0gseUJBQU0sQ0FBQyxTQUFTLENBQUM7SUFDZixJQUFJLEVBQUUsU0FBUztJQUNmLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFpQjtJQUN4QyxhQUFhLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUI7Q0FDakQsQ0FBQyxDQUFDO0FBR0gsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDbEUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUNKLE1BQU0sRUFDTixRQUFRLEVBQ1IsYUFBYSxFQUNiLFdBQVcsRUFDWCxjQUFjLEVBQ2QsTUFBTSxHQUNQLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUViLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6RSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUs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