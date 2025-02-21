import express, { Request, Response } from "express";
import Stripe from "stripe";
import paypal from "paypal-rest-sdk";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
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
    const { amount, currency, paymentMethod, description } = req.body;

    if (!amount || !currency || !paymentMethod) {
      return res
        .status(400)
        .json({ message: "Informations de paiement incomplètes" });
    }

    let paymentResponse;

    switch (paymentMethod) {
      // 🔹 Paiement Stripe (Carte, Apple Pay, Google Pay)
      case "stripe":
        paymentResponse = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convertir en centimes
          currency,
          payment_method_types: ["card"], // Apple Pay et Google Pay sont gérés via Stripe
          description,
        });
        return res.status(200).json({
          message: "Paiement Stripe initié",
          clientSecret: paymentResponse.client_secret,
        });

      // 🔹 Paiement PayPal
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
            paymentId: (payment as any).id, // ✅ Ajout du `paymentId`
          });
        } catch (error) {
          return res.status(500).json({ message: "Erreur PayPal", error });
        }

      // 🔹 Apple Pay & Google Pay sont gérés via Stripe Elements
      case "applePay":
      case "googlePay":
        return res.status(501).json({
          message: `${paymentMethod} doit être géré via Stripe ou le SDK natif`,
        });

      // 🔹 Méthode non reconnue
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

      // ✅ Correction : Utiliser un objet standard `{ payer_id: string }`
      const execute_payment_json = { payer_id: PayerID as string };

      // Exécuter la transaction PayPal
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

      return res
        .status(200)
        .json({ message: "Paiement PayPal validé", payment });
    } catch (error) {
      return res.status(500).json({
        message: "Erreur lors de l'exécution du paiement PayPal",
        error,
      });
    }
  }
);

export default router;
