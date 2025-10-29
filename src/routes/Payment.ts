import express, { Request, Response } from "express";
import Stripe from "stripe";
import paypal from "paypal-rest-sdk";
import dotenv from "dotenv";
import Registration from "../models/Registration";
import Customer from "../models/Customer";
import Bill from "../models/Bill";
import Event from "../models/Event";
import { sendEventConfirmationEmail } from "../utils/sendEventConfirmation";
import { Types } from "mongoose";

dotenv.config();

const toInt = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const dayRange = (d: Date) => {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

/** Compte les places déjà réservées (paid/confirmed) pour le même event et la même journée. */
const countReservedForDay = async (
  eventId: Types.ObjectId,
  day: Date,
  excludeId?: Types.ObjectId
) => {
  const { start, end } = dayRange(day);
  const filter: any = {
    event: eventId,
    status: { $in: ["paid", "confirmed"] },
    date: { $gte: start, $lte: end },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const regs = await Registration.find(filter).select("quantity");
  return regs.reduce((s, r) => s + (toInt(r.quantity) || 1), 0);
};

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

// 🅿️ Configuration PayPal
paypal.configure({
  mode: "sandbox", // "live" en production
  client_id: process.env.PAYPAL_CLIENT_ID!,
  client_secret: process.env.PAYPAL_CLIENT_SECRET!,
});

// 🎟️ Route pour initier un paiement
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

    if (!amount || !currency || !paymentMethod || !registrationId || !billId) {
      return res.status(400).json({ message: "Informations incomplètes" });
    }

    let paymentResponse;

    switch (paymentMethod) {
      case "stripe":
      case "applePay":
      case "googlePay":
        // ✅ Création PaymentIntent avec metadata
        paymentResponse = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // centimes
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
                custom: registrationId, // Ajout d’info
              },
            ],
            redirect_urls: {
              return_url: "https://localappy.fr/event/payment/paypal/execute",
              cancel_url: "https://localappy.fr/event/payment/paypal/cancel",
            },
          };

          const payment = await new Promise((resolve, reject) => {
            paypal.payment.create(create_payment_json, (error, payment) => {
              if (error) reject(error);
              else resolve(payment);
            });
          });

          const approvalUrl = (payment as any).links?.find(
            (link: any) => link.rel === "approval_url"
          )?.href;

          return res.status(200).json({
            message: "Paiement PayPal initié",
            approvalUrl,
            paymentId: (payment as any).id,
          });
        } catch (error) {
          return res.status(500).json({ message: "Erreur PayPal", error });
        }

      default:
        return res
          .status(400)
          .json({ message: "Méthode de paiement non prise en charge" });
    }
  } catch (error) {
    return res.status(500).json({ message: "Erreur lors du paiement", error });
  }
});

router.get(
  "/event/payment/paypal/execute",
  async (req: Request, res: Response) => {
    try {
      const { paymentId, PayerID } = req.query;

      if (!paymentId || !PayerID) {
        return res.status(400).json({ message: "Paramètres manquants" });
      }

      const execute_payment_json = { payer_id: PayerID as string };

      const payment = await new Promise((resolve, reject) => {
        paypal.payment.execute(
          paymentId as string,
          execute_payment_json,
          (error, payment) => {
            if (error) reject(error);
            else resolve(payment);
          }
        );
      });

      const paymentInfo = payment as any;
      const customField = paymentInfo.transactions?.[0]?.custom;
      const registrationId = customField;

      if (!registrationId) {
        return res.status(400).json({ message: "registrationId manquant" });
      }

      const registration = await Registration.findById(registrationId);
      if (!registration)
        return res.status(404).json({ message: "Inscription introuvable" });

      const bill = await Bill.findOne({ registration: registration._id });
      if (!bill)
        return res.status(404).json({ message: "Facture introuvable" });

      const event = await Event.findById(registration.event);
      if (!event)
        return res.status(404).json({ message: "Événement introuvable" });

      // Idempotence
      if (registration.status === "paid" && bill.status === "paid") {
        return res.status(200).json({ message: "Déjà payé", payment });
      }

      // Vérif capacité par jour
      const capacityPerDay = toInt(event.capacity);
      if (capacityPerDay <= 0) {
        return res
          .status(400)
          .json({ message: "Capacité non configurée pour cet événement" });
      }

      const reservedCount = await countReservedForDay(
        event._id as Types.ObjectId,
        registration.date,
        registration._id as Types.ObjectId
      );
      const remaining = capacityPerDay - reservedCount;

      if (toInt(registration.quantity) > remaining) {
        return res.status(400).json({
          message: "Plus de places disponibles pour cette date",
          remaining: Math.max(0, remaining),
        });
      }

      // ✅ Marquer payé (NE PAS toucher event.capacity)
      registration.status = "paid";
      await registration.save();

      bill.status = "paid";
      await bill.save();

      event.bills.push(bill._id as Types.ObjectId);
      event.registrations.push(registration._id as Types.ObjectId);
      await event.save();

      // Lier l'event au client si besoin
      const customer = await Customer.findById(registration.customer);
      if (!customer)
        return res.status(404).json({ message: "Client introuvable" });
      if (!customer.eventsReserved.includes(event._id)) {
        customer.eventsReserved.push(event._id);
        await customer.save();
      }

      // Email : utiliser la date réservée
      const eventDateFormatted = new Date(registration.date).toLocaleString(
        "fr-FR"
      );
      const invoiceUrl = `https://localappy.fr/api/invoice/${registration._id}`;
      const eventLink = `https://localappy.fr/events/${event._id}`;

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

      return res.status(200).json({
        message: "Paiement PayPal confirmé",
        payment,
        registration,
        bill,
        remainingAfter: remaining - toInt(registration.quantity),
      });
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de l'exécution du paiement PayPal",
        error,
      });
    }
  }
);

// ✅ Route pour confirmer un paiement Stripe manuellement (si pas de webhook)
router.post("/event/payment/confirm", async (req: Request, res: Response) => {
  try {
    const { registrationId, billId } = req.body;
    if (!registrationId || !billId) {
      return res.status(400).json({ message: "Paramètres manquants" });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration)
      return res.status(404).json({ message: "Inscription introuvable" });

    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: "Facture introuvable" });

    const event = await Event.findById(registration.event);
    if (!event)
      return res.status(404).json({ message: "Evénement introuvable" });

    // Idempotence
    if (registration.status === "paid" && bill.status === "paid") {
      return res.status(200).json({ message: "Paiement déjà confirmé" });
    }

    const capacityPerDay = toInt(event.capacity);
    if (capacityPerDay <= 0) {
      return res
        .status(400)
        .json({ message: "Capacité non configurée pour cet événement" });
    }

    const reservedCount = await countReservedForDay(
      event._id as Types.ObjectId,
      registration.date,
      registration._id as Types.ObjectId
    );
    const remaining = capacityPerDay - reservedCount;

    if (toInt(registration.quantity) > remaining) {
      return res.status(400).json({
        message: "Plus de places disponibles pour cette date",
        remaining: Math.max(0, remaining),
      });
    }

    // ✅ Marquer payé (sans décrémenter event.capacity)
    registration.status = "paid";
    await registration.save();

    bill.status = "paid";
    await bill.save();

    event.bills.push(bill._id as Types.ObjectId);
    event.registrations.push(registration._id as Types.ObjectId);
    await event.save();

    // Lier l'event au client si besoin
    const customer = await Customer.findById(registration.customer);
    if (!customer)
      return res.status(404).json({ message: "Client introuvable" });
    if (!customer.eventsReserved.includes(event._id)) {
      customer.eventsReserved.push(event._id);
      await customer.save();
    }

    // Email avec la date réservée
    const eventDateFormatted = new Date(registration.date).toLocaleString(
      "fr-FR"
    );
    const invoiceUrl = `https://localappy.fr/api/invoice/${registration._id}`;
    const eventLink = `https://localappy.fr/events/${event._id}`;

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

    return res.status(200).json({
      message: "Paiement confirmé",
      registration,
      bill,
      remainingAfter: remaining - toInt(registration.quantity),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de la confirmation du paiement",
      error,
    });
  }
});

// ✅ Route pour paiement en espèces (cash)
router.post("/event/payment/cash", async (req: Request, res: Response) => {
  try {
    const { registrationId, billId } = req.body;
    if (!registrationId || !billId) {
      return res.status(400).json({ message: "Paramètres manquants" });
    }

    const registration = await Registration.findById(registrationId);
    if (!registration)
      return res.status(404).json({ message: "Inscription introuvable" });

    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: "Facture introuvable" });

    const event = await Event.findById(registration.event);
    if (!event)
      return res.status(404).json({ message: "Evénement introuvable" });

    // Idempotence
    if (registration.status === "paid" && bill.status === "paid") {
      return res.status(200).json({ message: "Paiement déjà enregistré" });
    }

    const capacityPerDay = toInt(event.capacity);
    if (capacityPerDay <= 0) {
      return res
        .status(400)
        .json({ message: "Capacité non configurée pour cet événement" });
    }

    const reservedCount = await countReservedForDay(
      event._id as Types.ObjectId,
      registration.date,
      registration._id as Types.ObjectId
    );
    const remaining = capacityPerDay - reservedCount;

    if (toInt(registration.quantity) > remaining) {
      return res.status(400).json({
        message: "Plus de places disponibles pour cette date",
        remaining: Math.max(0, remaining),
      });
    }

    // ✅ Enregistrer cash = payé
    registration.status = "paid";
    await registration.save();

    bill.status = "paid";
    await bill.save();

    event.bills.push(bill._id as Types.ObjectId);
    event.registrations.push(registration._id as Types.ObjectId);
    await event.save();

    // Lier l'event au client si besoin
    const customer = await Customer.findById(registration.customer);
    if (!customer)
      return res.status(404).json({ message: "Client introuvable" });
    if (!customer.eventsReserved.includes(event._id)) {
      customer.eventsReserved.push(event._id);
      await customer.save();
    }

    // Email (date réservée)
    const eventDateFormatted = new Date(registration.date).toLocaleString(
      "fr-FR"
    );
    const invoiceUrl = `https://localappy.fr/api/invoice/${registration._id}`;
    const eventLink = `https://localappy.fr/events/${event._id}`;

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

    return res.status(200).json({
      message: "Paiement en espèces enregistré",
      registration,
      bill,
      remainingAfter: remaining - toInt(registration.quantity),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Erreur lors de l'enregistrement du paiement cash",
      error,
    });
  }
});

router.get("/user/payment-methods/:customerId", async (req, res) => {
  const { customerId } = req.params;

  try {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    return res.status(200).json({ paymentMethods });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erreur récupération cartes", error });
  }
});

export default router;
