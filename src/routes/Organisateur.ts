import express, { Request, Response } from "express";
import EventModel from "../models/Event";
import Establishment from "../models/Establishment";
import axios from "axios";
import Event from "../models/Event";

const router = express.Router();

router.get("/organisateurs", async (req: Request, res: Response) => {
  try {
    const events = await EventModel.find().select("organizer").lean();

    const uniqueOrganizersMap = new Map<
      string,
      (typeof events)[0]["organizer"]
    >();

    for (const event of events) {
      const organizer = event.organizer;
      if (organizer) {
        const key = [
          organizer.legalName?.toLowerCase().trim() || "",
          organizer.email?.toLowerCase().trim() || "",
          organizer.phone?.toLowerCase().trim() || "",
        ].join("|");

        if (!uniqueOrganizersMap.has(key)) {
          uniqueOrganizersMap.set(key, organizer);
        }
      }
    }

    const uniqueOrganizers = Array.from(uniqueOrganizersMap.values());

    // Création des établissements à partir des organisateurs uniques
    const createdEstablishments = [];

    for (const org of uniqueOrganizers) {
      // Vérifier si l'établissement existe déjà (par nom + téléphone par ex)
      const exists = await Establishment.findOne({
        name: org.legalName,
        phone: org.phone,
      });

      if (!exists) {
        const newEstablishment = new Establishment({
          name: org.legalName,
          email: org.email,
          phone: org.phone,
          // Ici tu peux ajouter d'autres champs si disponibles dans org
          // ex: description, address, etc si ils existent
        });

        await newEstablishment.save();
        createdEstablishments.push(newEstablishment);
      }
    }

    return res.status(200).json({
      message: "Établissements créés depuis organisateurs uniques",
      countCreated: createdEstablishments.length,
      establishments: createdEstablishments,
    });
  } catch (error) {
    console.error("Erreur lors de la création des établissements :", error);
    return res.status(500).json({
      message: "Erreur serveur lors de la création des établissements",
      error,
    });
  }
});

router.get(
  "/events/assignToEstablishments",
  async (req: Request, res: Response) => {
    try {
      const etablissements = await Establishment.find();

      const events = await Event.find(
        {
          "organizer.establishment": { $exists: false },
          "organizer.legalName": { $ne: null },
        },
        { title: 1, "organizer.legalName": 1 }
      );

      console.log(`📦 ${events.length} événements non liés à traiter...`);

      let eventsUpdated = 0;
      let etablissementsUpdated = 0;

      for (const event of events) {
        const legalName = event.organizer?.legalName?.trim();
        if (!legalName) continue;

        const etab = etablissements.find(
          (e) => e.name?.trim().toLowerCase() === legalName.toLowerCase()
        );

        if (!etab) {
          console.warn(`❌ Aucun établissement trouvé pour : "${legalName}"`);
          continue;
        }

        // ✅ Ajouter l'établissement à l'événement
        await Event.updateOne(
          { _id: event._id },
          { $set: { "organizer.establishment": etab._id } }
        );
        console.log(
          `📌 Événement "${event.title}" lié à l’établissement "${etab.name}"`
        );
        eventsUpdated++;

        // ✅ Ajouter l'événement à l'établissement si absent
        if (!etab.events?.some((e) => e.toString() === event._id.toString())) {
          await Establishment.updateOne(
            { _id: etab._id },
            { $addToSet: { events: event._id } }
          );
          console.log(
            `➕ Ajout de l’événement "${event.title}" à "${etab.name}"`
          );
          etablissementsUpdated++;
        }
      }

      return res.status(200).json({
        message: "✅ Liens événements ↔ établissements mis à jour.",
        eventsUpdated,
        etablissementsUpdated,
      });
    } catch (error) {
      console.error("💥 Erreur serveur :", error);
      return res.status(500).json({
        message: "Erreur serveur lors du lien événements/établissements",
        error,
      });
    }
  }
);

export default router;
