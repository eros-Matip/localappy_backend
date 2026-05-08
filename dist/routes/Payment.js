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
const router = express_1.default.Router();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY);
paypal_rest_sdk_1.default.configure({
    mode: process.env.PAYPAL_MODE === "sandbox" ? "sandbox" : "live",
    client_id: process.env.PAYPAL_CLIENT_ID,
    client_secret: process.env.PAYPAL_CLIENT_SECRET,
});
const API_PUBLIC_URL = process.env.API_PUBLIC_URL || "https://localappy.fr";
const WEB_PUBLIC_URL = process.env.WEB_PUBLIC_URL || "https://localappy.fr";
const toInt = (value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
};
const isSameObjectId = (a, b) => {
    if (!a || !b)
        return false;
    return String(a) === String(b);
};
const pushObjectIdOnce = (arr, id) => {
    const alreadyExists = arr.some((item) => isSameObjectId(item, id));
    if (!alreadyExists)
        arr.push(id);
};
const dayRange = (date) => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
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
    if (excludeId) {
        filter._id = { $ne: excludeId };
    }
    const registrations = yield Registration_1.default.find(filter).select("quantity");
    return registrations.reduce((sum, registration) => {
        return sum + (toInt(registration.quantity) || 1);
    }, 0);
});
const sendConfirmation = (_a) => __awaiter(void 0, [_a], void 0, function* ({ registration, bill, event, customer, }) {
    const eventDateFormatted = new Date(registration.date).toLocaleString("fr-FR");
    const invoiceUrl = `${WEB_PUBLIC_URL}/api/invoice/${registration._id}`;
    const deepLink = `localappy://event/${event._id}`;
    const eventLink = `${WEB_PUBLIC_URL}/open?link=${encodeURIComponent(deepLink)}`;
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
});
const markRegistrationAsPaid = (_a) => __awaiter(void 0, [_a], void 0, function* ({ registrationId, billId, }) {
    const registration = yield Registration_1.default.findById(registrationId);
    if (!registration) {
        return {
            ok: false,
            status: 404,
            message: "Inscription introuvable",
        };
    }
    const bill = billId
        ? yield Bill_1.default.findById(billId)
        : yield Bill_1.default.findOne({ registration: registration._id });
    if (!bill) {
        return {
            ok: false,
            status: 404,
            message: "Facture introuvable",
        };
    }
    const event = yield Event_1.default.findById(registration.event);
    if (!event) {
        return {
            ok: false,
            status: 404,
            message: "Événement introuvable",
        };
    }
    if (registration.status === "paid" && bill.status === "paid") {
        return {
            ok: true,
            alreadyPaid: true,
            registration,
            bill,
            event,
            remainingAfter: null,
        };
    }
    const capacityPerDay = toInt(event.capacity);
    if (capacityPerDay <= 0) {
        return {
            ok: false,
            status: 400,
            message: "Capacité non configurée pour cet événement",
        };
    }
    const registrationDate = new Date(registration.date);
    if (Number.isNaN(registrationDate.getTime())) {
        return {
            ok: false,
            status: 400,
            message: "Date de réservation invalide",
        };
    }
    const reservedCount = yield countReservedForDay(event._id, registrationDate, registration._id);
    const remaining = capacityPerDay - reservedCount;
    const quantity = toInt(registration.quantity) || 1;
    if (quantity > remaining) {
        return {
            ok: false,
            status: 400,
            message: "Plus de places disponibles pour cette date",
            remaining: Math.max(0, remaining),
        };
    }
    registration.status = "paid";
    yield registration.save();
    bill.status = "paid";
    yield bill.save();
    pushObjectIdOnce(event.bills, bill._id);
    pushObjectIdOnce(event.registrations, registration._id);
    yield event.save();
    const customer = yield Customer_1.default.findById(registration.customer);
    if (!customer) {
        return {
            ok: false,
            status: 404,
            message: "Client introuvable",
        };
    }
    const alreadyReserved = customer.eventsReserved.some((id) => isSameObjectId(id, event._id));
    if (!alreadyReserved) {
        customer.eventsReserved.push(event._id);
        yield customer.save();
    }
    yield sendConfirmation({
        registration,
        bill,
        event,
        customer,
    });
    return {
        ok: true,
        alreadyPaid: false,
        registration,
        bill,
        event,
        customer,
        remainingAfter: remaining - quantity,
    };
});
router.post("/event/payment", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { amount, currency, paymentMethod, description, registrationId, billId, } = req.body;
        const numericAmount = Number(amount);
        if (!numericAmount ||
            !currency ||
            !paymentMethod ||
            !registrationId ||
            !billId) {
            return res.status(400).json({
                message: "Informations incomplètes",
            });
        }
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                message: "Montant invalide",
            });
        }
        switch (paymentMethod) {
            case "stripe":
            case "credit_card":
            case "applePay":
            case "googlePay": {
                const paymentIntent = yield stripe.paymentIntents.create({
                    amount: Math.round(numericAmount * 100),
                    currency,
                    payment_method_types: ["card"],
                    description,
                    metadata: {
                        registrationId,
                        billId,
                        paymentMethod,
                    },
                });
                return res.status(200).json({
                    message: "Paiement Stripe initié",
                    clientSecret: paymentIntent.client_secret,
                });
            }
            case "paypal": {
                const createPaymentJson = {
                    intent: "sale",
                    payer: {
                        payment_method: "paypal",
                    },
                    transactions: [
                        {
                            amount: {
                                total: numericAmount.toFixed(2),
                                currency: String(currency).toUpperCase(),
                            },
                            description,
                            custom: registrationId,
                            invoice_number: String(billId),
                        },
                    ],
                    redirect_urls: {
                        return_url: `${API_PUBLIC_URL}/event/payment/paypal/execute`,
                        cancel_url: `${API_PUBLIC_URL}/event/payment/paypal/cancel`,
                    },
                };
                const payment = yield new Promise((resolve, reject) => {
                    paypal_rest_sdk_1.default.payment.create(createPaymentJson, (error, createdPayment) => {
                        if (error)
                            reject(error);
                        else
                            resolve(createdPayment);
                    });
                });
                const approvalUrl = (_b = (_a = payment.links) === null || _a === void 0 ? void 0 : _a.find((link) => link.rel === "approval_url")) === null || _b === void 0 ? void 0 : _b.href;
                if (!approvalUrl) {
                    return res.status(500).json({
                        message: "Lien PayPal introuvable",
                        payment,
                    });
                }
                return res.status(200).json({
                    message: "Paiement PayPal initié",
                    approvalUrl,
                    paymentId: payment.id,
                });
            }
            default:
                return res.status(400).json({
                    message: "Méthode de paiement non prise en charge",
                });
        }
    }
    catch (error) {
        console.error("PAYMENT INIT ERROR:", error);
        return res.status(500).json({
            message: "Erreur lors du paiement",
            error,
        });
    }
}));
router.get("/event/payment/paypal/execute", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        const { paymentId, PayerID } = req.query;
        if (!paymentId || !PayerID) {
            return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/error?reason=missing_params`);
        }
        const executePaymentJson = {
            payer_id: PayerID,
        };
        const payment = yield new Promise((resolve, reject) => {
            paypal_rest_sdk_1.default.payment.execute(paymentId, executePaymentJson, (error, executedPayment) => {
                if (error)
                    reject(error);
                else
                    resolve(executedPayment);
            });
        });
        const paymentState = String((payment === null || payment === void 0 ? void 0 : payment.state) || "").toLowerCase();
        if (paymentState !== "approved") {
            return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/error?reason=not_approved`);
        }
        const registrationId = (_b = (_a = payment.transactions) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.custom;
        const billId = (_d = (_c = payment.transactions) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.invoice_number;
        if (!registrationId) {
            return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/error?reason=missing_registration`);
        }
        const result = yield markRegistrationAsPaid({
            registrationId,
            billId,
        });
        if (!result.ok) {
            const reason = result.message || "payment_confirmation_failed";
            return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/error?reason=${encodeURIComponent(reason)}`);
        }
        return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/success?registrationId=${registrationId}&billId=${billId || ""}`);
    }
    catch (error) {
        console.error("PAYPAL EXECUTE ERROR:", error);
        return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/error?reason=execute_failed`);
    }
}));
router.get("/event/payment/paypal/cancel", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/cancel`);
}));
router.post("/event/payment/confirm", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { registrationId, billId } = req.body;
        if (!registrationId || !billId) {
            return res.status(400).json({
                message: "Paramètres manquants",
            });
        }
        const result = yield markRegistrationAsPaid({
            registrationId,
            billId,
        });
        if (!result.ok) {
            return res.status(result.status || 500).json({
                message: result.message,
                remaining: result.remaining,
            });
        }
        return res.status(200).json({
            message: result.alreadyPaid
                ? "Paiement déjà confirmé"
                : "Paiement confirmé",
            registration: result.registration,
            bill: result.bill,
            remainingAfter: result.remainingAfter,
        });
    }
    catch (error) {
        console.error("PAYMENT CONFIRM ERROR:", error);
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
            return res.status(400).json({
                message: "Paramètres manquants",
            });
        }
        const result = yield markRegistrationAsPaid({
            registrationId,
            billId,
        });
        if (!result.ok) {
            return res.status(result.status || 500).json({
                message: result.message,
                remaining: result.remaining,
            });
        }
        return res.status(200).json({
            message: result.alreadyPaid
                ? "Paiement déjà enregistré"
                : "Paiement en espèces enregistré",
            registration: result.registration,
            bill: result.bill,
            remainingAfter: result.remainingAfter,
        });
    }
    catch (error) {
        console.error("CASH PAYMENT ERROR:", error);
        return res.status(500).json({
            message: "Erreur lors de l'enregistrement du paiement cash",
            error,
        });
    }
}));
router.get("/user/payment-methods/:customerId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { customerId } = req.params;
        if (!customerId) {
            return res.status(400).json({
                message: "customerId manquant",
            });
        }
        const paymentMethods = yield stripe.paymentMethods.list({
            customer: customerId,
            type: "card",
        });
        return res.status(200).json({
            paymentMethods: paymentMethods.data,
        });
    }
    catch (error) {
        console.error("PAYMENT METHODS ERROR:", error);
        return res.status(500).json({
            message: "Erreur récupération cartes",
            error,
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUGF5bWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvUGF5bWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFxRDtBQUNyRCxvREFBNEI7QUFDNUIsc0VBQXFDO0FBQ3JDLG9EQUE0QjtBQUc1QiwwRUFBa0Q7QUFDbEQsa0VBQTBDO0FBQzFDLDBEQUFrQztBQUNsQyw0REFBb0M7QUFDcEMsMEVBQTRFO0FBRTVFLGdCQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEIsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBa0IsQ0FBQyxDQUFDO0FBRTFELHlCQUFNLENBQUMsU0FBUyxDQUFDO0lBQ2YsSUFBSSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNO0lBQ2hFLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFpQjtJQUN4QyxhQUFhLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBcUI7Q0FDakQsQ0FBQyxDQUFDO0FBRUgsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksc0JBQXNCLENBQUM7QUFDNUUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksc0JBQXNCLENBQUM7QUFFNUUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxLQUFjLEVBQUUsRUFBRTtJQUMvQixNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDeEIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxD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