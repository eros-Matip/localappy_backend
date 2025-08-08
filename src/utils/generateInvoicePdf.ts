import PDFDocument from "pdfkit";
import { Request, Response } from "express";
import Registration from "../models/Registration";

export const generateInvoicePdf = async (req: Request, res: Response) => {
  try {
    const registration = await Registration.findById(req.params.registrationId)
      .populate("customer")
      .populate("event");

    if (!registration) {
      return res.status(404).send("Inscription non trouvée.");
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=facture-${registration._id}.pdf`
    );
    res.setHeader("Content-Type", "application/pdf");
    doc.pipe(res);

    // HEADER
    doc.fontSize(20).text("Facture", { align: "center" });
    doc.moveDown();

    // Infos client
    doc
      .fontSize(12)
      .text(
        `Nom du client : ${(registration.customer as any).account.firstname} ${(registration.customer as any).account.name}`
      );
    doc.text(`Email : ${(registration.customer as any).email}`);
    doc.text(
      `Date d'inscription : ${new Date(registration.date).toLocaleDateString("fr-FR")}`
    );
    doc.text(`Méthode de paiement : ${registration.paymentMethod}`);
    doc.text(`Numéro de ticket : ${registration.ticketNumber || "N/A"}`);
    doc.moveDown();

    // Infos événement
    doc.fontSize(14).text("Détails de l'événement :", { underline: true });
    doc.fontSize(12).text(`Titre : ${(registration.event as any).title}`);
    doc.text(
      `Date : ${new Date((registration.event as any).startingDate).toLocaleString("fr-FR")}`
    );
    doc.text(`Adresse : ${(registration.event as any).address}`);
    doc.moveDown();

    // Détails du prix
    const unitPrice = registration.price / registration.quantity;
    doc.text(`Quantité réservée : ${registration.quantity}`);
    doc.text(`Prix unitaire : ${unitPrice.toFixed(2)} €`);
    doc.text(`Total TTC : ${registration.price.toFixed(2)} €`);
    doc.moveDown();

    doc.text("Merci pour votre réservation !", { align: "center" });

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur lors de la génération de la facture.");
  }
};
