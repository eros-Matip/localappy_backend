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
exports.generateInvoicePdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const Registration_1 = __importDefault(require("../models/Registration"));
const generateInvoicePdf = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const registration = yield Registration_1.default.findById(req.params.registrationId)
            .populate("customer")
            .populate("event");
        if (!registration) {
            return res.status(404).send("Inscription non trouvée.");
        }
        const doc = new pdfkit_1.default({ margin: 50 });
        res.setHeader("Content-Disposition", `attachment; filename=facture-${registration._id}.pdf`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);
        doc.fontSize(20).text("Facture", { align: "center" });
        doc.moveDown();
        doc
            .fontSize(12)
            .text(`Nom du client : ${registration.customer.account.firstname} ${registration.customer.account.name}`);
        doc.text(`Email : ${registration.customer.email}`);
        doc.text(`Date d'inscription : ${new Date(registration.date).toLocaleDateString("fr-FR")}`);
        doc.text(`Méthode de paiement : ${registration.paymentMethod}`);
        doc.text(`Numéro de ticket : ${registration.ticketNumber || "N/A"}`);
        doc.moveDown();
        doc.fontSize(14).text("Détails de l'événement :", { underline: true });
        doc.fontSize(12).text(`Titre : ${registration.event.title}`);
        doc.text(`Date : ${new Date(registration.event.startingDate).toLocaleString("fr-FR")}`);
        doc.text(`Adresse : ${registration.event.address}`);
        doc.moveDown();
        const unitPrice = registration.price / registration.quantity;
        doc.text(`Quantité réservée : ${registration.quantity}`);
        doc.text(`Prix unitaire : ${unitPrice.toFixed(2)} €`);
        doc.text(`Total TTC : ${registration.price.toFixed(2)} €`);
        doc.moveDown();
        doc.text("Merci pour votre réservation !", { align: "center" });
        doc.end();
    }
    catch (error) {
        console.error(error);
        res.status(500).send("Erreur lors de la génération de la facture.");
    }
});
exports.generateInvoicePdf = generateInvoicePdf;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVJbnZvaWNlUGRmLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2dlbmVyYXRlSW52b2ljZVBkZi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxvREFBaUM7QUFFakMsMEVBQWtEO0FBRTNDLE1BQU0sa0JBQWtCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDdEUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxZQUFZLEdBQUcsTUFBTSxzQkFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQzthQUN4RSxRQUFRLENBQUMsVUFBVSxDQUFDO2FBQ3BCLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUVyQixJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDbEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLGdCQUFXLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUU1QyxHQUFHLENBQUMsU0FBUyxDQUNYLHFCQUFxQixFQUNyQixnQ0FBZ0MsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUN2RCxDQUFDO1FBQ0YsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNqRCxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBR2QsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdEQsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBR2YsR0FBRzthQUNBLFFBQVEsQ0FBQyxFQUFFLENBQUM7YUFDWixJQUFJLENBQ0gsbUJBQW9CLFlBQVksQ0FBQyxRQUFnQixDQUFDLE9BQU8sQ0FBQyxTQUFTLElBQUssWUFBWSxDQUFDLFFBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUNySCxDQUFDO1FBQ0osR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFZLFlBQVksQ0FBQyxRQUFnQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDNUQsR0FBRyxDQUFDLElBQUksQ0FDTix3QkFBd0IsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQ2xGLENBQUM7UUFDRixHQUFHLENBQUMsSUFBSSxDQUFDLHlCQUF5QixZQUFZLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUNoRSxHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixZQUFZLENBQUMsWUFBWSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDckUsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBR2YsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUN2RSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFZLFlBQVksQ0FBQyxLQUFhLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN0RSxHQUFHLENBQUMsSUFBSSxDQUNOLFVBQVUsSUFBSSxJQUFJLENBQUUsWUFBWSxDQUFDLEtBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FDdkYsQ0FBQztRQUNGLEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYyxZQUFZLENBQUMsS0FBYSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDN0QsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBR2YsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDO1FBQzdELEdBQUcsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxZQUFZLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDM0QsR0FBRyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRWYsR0FBRyxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBRWhFLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNyQixHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQTVEVyxRQUFBLGtCQUFrQixzQkE0RDdCIn0=