import express, { Request, Response } from "express";
import Stripe from "stripe";
import paypal from "paypal-rest-sdk";
import dotenv from "dotenv";
import { Types } from "mongoose";

import Registration from "../models/Registration";
import Customer from "../models/Customer";
import Bill from "../models/Bill";
import Event from "../models/Event";
import { sendEventConfirmationEmail } from "../utils/sendEventConfirmation";

dotenv.config();

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

paypal.configure({
  mode: process.env.PAYPAL_MODE === "sandbox" ? "sandbox" : "live",
  client_id: process.env.PAYPAL_CLIENT_ID!,
  client_secret: process.env.PAYPAL_CLIENT_SECRET!,
});

const API_PUBLIC_URL = process.env.API_PUBLIC_URL || "https://localappy.fr";
const WEB_PUBLIC_URL = process.env.WEB_PUBLIC_URL || "https://localappy.fr";

const toInt = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const isSameObjectId = (a: unknown, b: unknown) => {
  if (!a || !b) return false;
  return String(a) === String(b);
};

const pushObjectIdOnce = (arr: Types.ObjectId[], id: Types.ObjectId) => {
  const alreadyExists = arr.some((item) => isSameObjectId(item, id));
  if (!alreadyExists) arr.push(id);
};

const dayRange = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const countReservedForDay = async (
  eventId: Types.ObjectId,
  day: Date,
  excludeId?: Types.ObjectId,
) => {
  const { start, end } = dayRange(day);

  const filter: any = {
    event: eventId,
    status: { $in: ["paid", "confirmed"] },
    date: { $gte: start, $lte: end },
  };

  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const registrations = await Registration.find(filter).select("quantity");

  return registrations.reduce((sum, registration) => {
    return sum + (toInt(registration.quantity) || 1);
  }, 0);
};

const sendConfirmation = async ({
  registration,
  bill,
  event,
  customer,
}: {
  registration: any;
  bill: any;
  event: any;
  customer: any;
}) => {
  const eventDateFormatted = new Date(registration.date).toLocaleString(
    "fr-FR",
  );

  const invoiceUrl = `${WEB_PUBLIC_URL}/api/invoice/${registration._id}`;
  const deepLink = `localappy://event/${event._id}`;
  const eventLink = `${WEB_PUBLIC_URL}/open?link=${encodeURIComponent(
    deepLink,
  )}`;

  await sendEventConfirmationEmail({
    to: customer.email,
    firstName: customer.account.firstname,
    eventTitle: event.title,
    eventDate: eventDateFormatted,
    eventAddress: event.address,
    quantity: registration.quantity,
    eventLink,
    invoiceUrl,
  });
};

const markRegistrationAsPaid = async ({
  registrationId,
  billId,
}: {
  registrationId: string;
  billId?: string;
}) => {
  const registration = await Registration.findById(registrationId);

  if (!registration) {
    return {
      ok: false,
      status: 404,
      message: "Inscription introuvable",
    };
  }

  const bill = billId
    ? await Bill.findById(billId)
    : await Bill.findOne({ registration: registration._id });

  if (!bill) {
    return {
      ok: false,
      status: 404,
      message: "Facture introuvable",
    };
  }

  const event = await Event.findById(registration.event);

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

  const reservedCount = await countReservedForDay(
    event._id as Types.ObjectId,
    registrationDate,
    registration._id as Types.ObjectId,
  );

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
  await registration.save();

  bill.status = "paid";
  await bill.save();

  pushObjectIdOnce(event.bills, bill._id as Types.ObjectId);
  pushObjectIdOnce(event.registrations, registration._id as Types.ObjectId);
  await event.save();

  const customer = await Customer.findById(registration.customer);

  if (!customer) {
    return {
      ok: false,
      status: 404,
      message: "Client introuvable",
    };
  }

  const alreadyReserved = customer.eventsReserved.some((id: Types.ObjectId) =>
    isSameObjectId(id, event._id),
  );

  if (!alreadyReserved) {
    customer.eventsReserved.push(event._id);
    await customer.save();
  }

  await sendConfirmation({
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
};

router.post("/event/payment", async (req: Request, res: Response) => {
  try {
    const {
      amount,
      currency,
      paymentMethod,
      description,
      registrationId,
      billId,
    } = req.body;

    const numericAmount = Number(amount);

    if (
      !numericAmount ||
      !currency ||
      !paymentMethod ||
      !registrationId ||
      !billId
    ) {
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
        const paymentIntent = await stripe.paymentIntents.create({
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
        const createPaymentJson: any = {
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

        const payment = await new Promise<any>((resolve, reject) => {
          paypal.payment.create(createPaymentJson, (error, createdPayment) => {
            if (error) reject(error);
            else resolve(createdPayment);
          });
        });

        const approvalUrl = payment.links?.find(
          (link: any) => link.rel === "approval_url",
        )?.href;

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
  } catch (error) {
    console.error("PAYMENT INIT ERROR:", error);

    return res.status(500).json({
      message: "Erreur lors du paiement",
      error,
    });
  }
});

router.get(
  "/event/payment/paypal/execute",
  async (req: Request, res: Response) => {
    try {
      const { paymentId, PayerID } = req.query;

      if (!paymentId || !PayerID) {
        return res.redirect(
          `${WEB_PUBLIC_URL}/payment/paypal/error?reason=missing_params`,
        );
      }

      const executePaymentJson = {
        payer_id: PayerID as string,
      };

      const payment = await new Promise<any>((resolve, reject) => {
        paypal.payment.execute(
          paymentId as string,
          executePaymentJson,
          (error, executedPayment) => {
            if (error) reject(error);
            else resolve(executedPayment);
          },
        );
      });

      const paymentState = String(payment?.state || "").toLowerCase();

      if (paymentState !== "approved") {
        return res.redirect(
          `${WEB_PUBLIC_URL}/payment/paypal/error?reason=not_approved`,
        );
      }

      const registrationId = payment.transactions?.[0]?.custom;
      const billId = payment.transactions?.[0]?.invoice_number;

      if (!registrationId) {
        return res.redirect(
          `${WEB_PUBLIC_URL}/payment/paypal/error?reason=missing_registration`,
        );
      }

      const result = await markRegistrationAsPaid({
        registrationId,
        billId,
      });

      if (!result.ok) {
        const reason = result.message || "payment_confirmation_failed";

        return res.redirect(
          `${WEB_PUBLIC_URL}/payment/paypal/error?reason=${encodeURIComponent(reason)}`,
        );
      }

      return res.redirect(
        `${WEB_PUBLIC_URL}/payment/paypal/success?registrationId=${registrationId}&billId=${billId || ""}`,
      );
    } catch (error) {
      console.error("PAYPAL EXECUTE ERROR:", error);

      return res.redirect(
        `${WEB_PUBLIC_URL}/payment/paypal/error?reason=execute_failed`,
      );
    }
  },
);

router.get(
  "/event/payment/paypal/cancel",
  async (_req: Request, res: Response) => {
    return res.redirect(`${WEB_PUBLIC_URL}/payment/paypal/cancel`);
  },
);

router.post("/event/payment/confirm", async (req: Request, res: Response) => {
  try {
    const { registrationId, billId } = req.body;

    if (!registrationId || !billId) {
      return res.status(400).json({
        message: "Paramètres manquants",
      });
    }

    const result = await markRegistrationAsPaid({
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
  } catch (error) {
    console.error("PAYMENT CONFIRM ERROR:", error);

    return res.status(500).json({
      message: "Erreur lors de la confirmation du paiement",
      error,
    });
  }
});

router.post("/event/payment/cash", async (req: Request, res: Response) => {
  try {
    const { registrationId, billId } = req.body;

    if (!registrationId || !billId) {
      return res.status(400).json({
        message: "Paramètres manquants",
      });
    }

    const result = await markRegistrationAsPaid({
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
  } catch (error) {
    console.error("CASH PAYMENT ERROR:", error);

    return res.status(500).json({
      message: "Erreur lors de l'enregistrement du paiement cash",
      error,
    });
  }
});

router.get("/user/payment-methods/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!customerId) {
      return res.status(400).json({
        message: "customerId manquant",
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return res.status(200).json({
      paymentMethods: paymentMethods.data,
    });
  } catch (error) {
    console.error("PAYMENT METHODS ERROR:", error);

    return res.status(500).json({
      message: "Erreur récupération cartes",
      error,
    });
  }
});

export default router;
