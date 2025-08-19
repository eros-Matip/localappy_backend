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
const sendEventConfirmation_1 = require("../utils/sendEventConfirmation");
dotenv_1.default.config();
const toInt = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const dayRange = (d) => {
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};
const countReservedForDay = (eventId, day, excludeId) => __awaiter(void 0, void 0, void 0, function* () {
    const { start, end } = dayRange(day);
    const filter = {
        event: eventId,
        status: { $in: ["paid", "confirmed"] },
        date: { $gte: start, $lte: end },
    };
    if (excludeId)
        filter._id = { $ne: excludeId };
    const regs = yield Registration_1.default.find(filter).select("quantity");
    return regs.reduce((s, r) => s + (toInt(r.quantity) || 1), 0);
});
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
        if (!registration)
            return res.status(404).json({ message: "Inscription introuvable" });
        const bill = yield Bill_1.default.findOne({ registration: registration._id });
        if (!bill)
            return res.status(404).json({ message: "Facture introuvable" });
        const event = yield Event_1.default.findById(registration.event);
        if (!event)
            return res.status(404).json({ message: "Événement introuvable" });
        if (registration.status === "paid" && bill.status === "paid") {
            return res.status(200).json({ message: "Déjà payé", payment });
        }
        const capacityPerDay = toInt(event.capacity);
        if (capacityPerDay <= 0) {
            return res
                .status(400)
                .json({ message: "Capacité non configurée pour cet événement" });
        }
        const reservedCount = yield countReservedForDay(event._id, registration.date, registration._id);
        const remaining = capacityPerDay - reservedCount;
        if (toInt(registration.quantity) > remaining) {
            return res.status(400).json({
                message: "Plus de places disponibles pour cette date",
                remaining: Math.max(0, remaining),
            });
        }
        registration.status = "paid";
        yield registration.save();
        bill.status = "paid";
        yield bill.save();
        event.bills.push(bill._id);
        event.registrations.push(registration._id);
        yield event.save();
        const customer = yield Customer_1.default.findById(registration.customer);
        if (!customer)
            return res.status(404).json({ message: "Client introuvable" });
        if (!customer.eventsReserved.includes(event._id)) {
            customer.eventsReserved.push(event._id);
            yield customer.save();
        }
        const eventDateFormatted = new Date(registration.date).toLocaleString("fr-FR");
        const invoiceUrl = `https://localappy.fr/api/invoice/${registration._id}`;
        const eventLink = `https://localappy.fr/events/${event._id}`;
        yield (0, sendEventConfirmation_1.sendEventConfirmationEmail)({
            to: customer.email,
            firstName: customer.account.firstname,
            eventTitle: event.title,
            eventDate: eventDateFormatted,
            eventAddress: event.address,
            quantity: registration.quantity,
            eventLink,
            invoiceUrl,
        });
        return res.status(200).json({
            message: "Paiement PayPal confirmé",
            payment,
            registration,
            bill,
            remainingAfter: remaining - toInt(registration.quantity),
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
        if (!registration)
            return res.status(404).json({ message: "Inscription introuvable" });
        const bill = yield Bill_1.default.findById(billId);
        if (!bill)
            return res.status(404).json({ message: "Facture introuvable" });
        const event = yield Event_1.default.findById(registration.event);
        if (!event)
            return res.status(404).json({ message: "Evénement introuvable" });
        if (registration.status === "paid" && bill.status === "paid") {
            return res.status(200).json({ message: "Paiement déjà confirmé" });
        }
        const capacityPerDay = toInt(event.capacity);
        if (capacityPerDay <= 0) {
            return res
                .status(400)
                .json({ message: "Capacité non configurée pour cet événement" });
        }
        const reservedCount = yield countReservedForDay(event._id, registration.date, registration._id);
        const remaining = capacityPerDay - reservedCount;
        if (toInt(registration.quantity) > remaining) {
            return res.status(400).json({
                message: "Plus de places disponibles pour cette date",
                remaining: Math.max(0, remaining),
            });
        }
        registration.status = "paid";
        yield registration.save();
        bill.status = "paid";
        yield bill.save();
        event.bills.push(bill._id);
        event.registrations.push(registration._id);
        yield event.save();
        const customer = yield Customer_1.default.findById(registration.customer);
        if (!customer)
            return res.status(404).json({ message: "Client introuvable" });
        if (!customer.eventsReserved.includes(event._id)) {
            customer.eventsReserved.push(event._id);
            yield customer.save();
        }
        const eventDateFormatted = new Date(registration.date).toLocaleString("fr-FR");
        const invoiceUrl = `https://localappy.fr/api/invoice/${registration._id}`;
        const eventLink = `https://localappy.fr/events/${event._id}`;
        yield (0, sendEventConfirmation_1.sendEventConfirmationEmail)({
            to: customer.email,
            firstName: customer.account.firstname,
            eventTitle: event.title,
            eventDate: eventDateFormatted,
            eventAddress: event.address,
            quantity: registration.quantity,
            eventLink,
            invoiceUrl,
        });
        return res.status(200).json({
            message: "Paiement confirmé",
            registration,
            bill,
            remainingAfter: remaining - toInt(registration.quantity),
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
        if (!registration)
            return res.status(404).json({ message: "Inscription introuvable" });
        const bill = yield Bill_1.default.findById(billId);
        if (!bill)
            return res.status(404).json({ message: "Facture introuvable" });
        const event = yield Event_1.default.findById(registration.event);
        if (!event)
            return res.status(404).json({ message: "Evénement introuvable" });
        if (registration.status === "paid" && bill.status === "paid") {
            return res.status(200).json({ message: "Paiement déjà enregistré" });
        }
        const capacityPerDay = toInt(event.capacity);
        if (capacityPerDay <= 0) {
            return res
                .status(400)
                .json({ message: "Capacité non configurée pour cet événement" });
        }
        const reservedCount = yield countReservedForDay(event._id, registration.date, registration._id);
        const remaining = capacityPerDay - reservedCount;
        if (toInt(registration.quantity) > remaining) {
            return res.status(400).json({
                message: "Plus de places disponibles pour cette date",
                remaining: Math.max(0, remaining),
            });
        }
        registration.status = "paid";
        yield registration.save();
        bill.status = "paid";
        yield bill.save();
        event.bills.push(bill._id);
        event.registrations.push(registration._id);
        yield event.save();
        const customer = yield Customer_1.default.findById(registration.customer);
        if (!customer)
            return res.status(404).json({ message: "Client introuvable" });
        if (!customer.eventsReserved.includes(event._id)) {
            customer.eventsReserved.push(event._id);
            yield customer.save();
        }
        const eventDateFormatted = new Date(registration.date).toLocaleString("fr-FR");
        const invoiceUrl = `https://localappy.fr/api/invoice/${registration._id}`;
        const eventLink = `https://localappy.fr/events/${event._id}`;
        yield (0, sendEventConfirmation_1.sendEventConfirmationEmail)({
            to: customer.email,
            firstName: customer.account.firstname,
            eventTitle: event.title,
            eventDate: eventDateFormatted,
            eventAddress: event.address,
            quantity: registration.quantity,
            eventLink,
            invoiceUrl,
        });
        return res.status(200).json({
            message: "Paiement en espèces enregistré",
            registration,
            bill,
            remainingAfter: remaining - toInt(registration.quantity),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF5bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvUGF5bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsc0VBQXFDO0FBQ3JDLG9EQUE0QjtBQUM1QiwwRUFBa0Q7QUFDbEQsa0VBQTBDO0FBQzFDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFDcEMsMEVBQTRFO0FBRzVFLGdCQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEIsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUV2RSxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQU8sRUFBRSxFQUFFO0lBQzNCLE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzFCLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDM0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDeEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUM5QixPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ3hCLENBQUMsQ0FBQztBQUdGLE1BQU0sbUJBQW1CLEdBQUcsQ0FDMUIsT0FBdUIsRUFDdkIsR0FBUyxFQUNULFNBQTBCLEVBQzFCLEVBQUU7SUFDRixNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFH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