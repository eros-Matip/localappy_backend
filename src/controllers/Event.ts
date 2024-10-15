import axios from "axios";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import util from "util";
import Event from "../models/Event"; // Assure-toi que le modèle Event est importé correctement
import Retour from "../library/Retour";
import Establishment from "../models/Establishment";

// Utiliser promisify pour rendre les fonctions fs asynchrones
const readFile = util.promisify(fs.readFile);

const AllEvents = require("../../events/index.json");

// Fonction de création d'événements
const createEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Chemin de base où se trouvent les fichiers
    const basePath = path.join(__dirname, "..", "..", "events", "objects");

    for (const event of AllEvents) {
      const fullPath = path.join(basePath, event.file);
      const fileData = await readFile(fullPath, "utf-8");
      const eventData = JSON.parse(fileData);

      const title = eventData["rdfs:label"]?.fr?.[0] || "Titre par défaut";
      const startingDate = eventData["schema:startDate"]?.[0] || new Date();
      const endingDate = eventData["schema:endDate"]?.[0] || new Date();
      const description =
        eventData["rdfs:comment"]?.fr?.[0] || "Description par défaut";

      // Récupérer l'adresse
      const addressData = eventData["isLocatedAt"]?.[0]?.["schema:address"];
      let address = "Adresse par défaut";
      if (addressData && Array.isArray(addressData)) {
        const firstAddress = addressData[0];
        const streetAddress = Array.isArray(
          firstAddress["schema:streetAddress"]
        )
          ? firstAddress["schema:streetAddress"].join(", ")
          : firstAddress["schema:streetAddress"] || "Rue inconnue";
        const postalCode =
          firstAddress["schema:postalCode"] || "Code postal inconnu";
        const addressLocality =
          firstAddress["schema:addressLocality"] || "Ville inconnue";
        address = `${streetAddress}, ${postalCode}, ${addressLocality}`;
      }

      const theme = eventData["@type"] || "Thème inconnu";

      // Récupération des images
      let image = "Image par défaut";
      if (
        eventData.hasMainRepresentation &&
        Array.isArray(eventData.hasMainRepresentation)
      ) {
        const mainRepresentation = eventData.hasMainRepresentation[0];
        const resource = mainRepresentation["ebucore:hasRelatedResource"]?.[0];
        image = resource?.["ebucore:locator"] || "Image par défaut";
      }

      const color = eventData.color || "#000000";

      // Récupération du numéro de téléphone et de l'email depuis `hasContact`
      let phone = "Téléphone inconnu";
      let email = "Email inconnu";
      if (eventData.hasContact && Array.isArray(eventData.hasContact)) {
        const contactInfo = eventData.hasContact[0];
        phone = contactInfo["schema:telephone"]?.[0] || "Téléphone inconnu";
        email = contactInfo["schema:email"]?.[0] || "Email inconnu";
      }

      // Organisateur
      const organizerData = eventData["hasBeenCreatedBy"];
      const organizer = {
        legalName:
          organizerData?.["schema:legalName"] || "Organisateur inconnu",
        email, // Ajout de l'email récupéré ici
        phone, // Ajout du téléphone récupéré ici
      };

      // Gestion simplifiée du prix et de la spécification du prix
      let price = 0;
      let priceCurrency = "EUR"; // Devise par défaut

      if (eventData["offers"] && Array.isArray(eventData["offers"])) {
        const offer = eventData["offers"][0]; // On prend la première offre
        if (offer && offer["schema:priceSpecification"]?.[0]) {
          const priceSpec = offer["schema:priceSpecification"][0];
          price = parseFloat(priceSpec?.["schema:price"]) || 0;
          priceCurrency = priceSpec?.["schema:priceCurrency"] || "EUR";
        }
      }

      try {
        const responseApiGouv = await axios.get(
          `https://api-adresse.data.gouv.fr/search/?q=${address}`
        );
        const features = responseApiGouv.data.features;

        if (!features || features.length === 0 || !features[0].geometry) {
          throw new Error("Coordonnées non disponibles");
        }

        const coordinates = features[0].geometry.coordinates;

        if (!coordinates || coordinates.length < 2) {
          throw new Error("Coordonnées incomplètes");
        }

        // Création de l'événement avec tous les champs du modèle
        const newEvent = new Event({
          title,
          theme,
          startingDate: new Date(startingDate),
          endingDate: new Date(endingDate),
          address,
          location: {
            lat: coordinates[1],
            lng: coordinates[0],
          },
          image,
          description,
          color,
          price, // Ajout du prix
          priceSpecification: {
            minPrice: price,
            maxPrice: price,
            priceCurrency,
          },
          organizer, // Ajout de l'organisateur avec le téléphone et l'email récupérés
        });

        await newEvent.save();
        Retour.info(`Événement créé avec succès:, ${newEvent.title}`);
      } catch (error) {
        console.error("Erreur lors de la récupération des coordonnées:", error);
      }
    }

    return res
      .status(201)
      .json({ message: "Tous les événements créés avec succès" });
  } catch (error) {
    console.error("Erreur lors de la création des événements:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la création des événements", error });
  }
};

const createEventForAnEstablishment = async (req: Request, res: Response) => {
  try {
    const {
      title,
      theme,
      startingDate,
      endingDate,
      address,
      price,
      priceSpecification,
      acceptedPaymentMethod,
      organizer,
      image,
      description,
      color,
    } = req.body;

    // Vérifier si l'établissement existe
    const establishmentFinded = await Establishment.findById(
      req.params.establishmentId
    );
    console.log("establishmentFinded", establishmentFinded);

    if (!establishmentFinded) {
      Retour.error("Establishment not found");
      return res.status(404).json({ message: "Establishment not found" });
    }

    // Vérification des champs obligatoires
    if (!title || !startingDate || !price || !endingDate || !organizer) {
      Retour.error("Missing some values");
      return res.status(400).json({
        message: "Missing some values",
      });
    }

    // Vérifier si un événement avec le même titre et la même date existe déjà
    const existingEvent = await Event.findOne({
      title: title,
      startingDate: new Date(startingDate),
    });

    if (existingEvent) {
      return res.status(409).json({
        message: "An event with this title and starting date already exists.",
      });
    }

    // Obtenir les coordonnées géographiques de l'adresse
    const responseApiGouv = await axios.get(
      `https://api-adresse.data.gouv.fr/search/?q=${address}`
    );

    const latitude = address
      ? responseApiGouv.data.features[0].geometry.coordinates[1]
      : establishmentFinded.location.lat;
    const longitude = address
      ? responseApiGouv.data.features[0].geometry.coordinates[0]
      : establishmentFinded.location.lng;

    // Créer un nouvel événement
    const newEvent = new Event({
      title,
      theme,
      startingDate,
      endingDate,
      address: address ? address : establishmentFinded.address,
      location: {
        lat: latitude,
        lng: longitude,
      },
      price,
      priceSpecification: {
        minPrice: priceSpecification.minPrice,
        maxPrice: priceSpecification.maxPrice,
        priceCurrency: priceSpecification.priceCurrency,
      },
      acceptedPaymentMethod,
      organizer: {
        establishment: establishmentFinded,
        legalName: organizer.legalName,
        email: organizer.email,
        phone: organizer.phone,
      },
      image,
      description,
      color,
    });

    // Sauvegarder l'événement dans la base de données
    await newEvent.save();

    // Ajouter l'événement à la liste des événements de l'établissement
    establishmentFinded.events.push(Object(newEvent)._id);
    await establishmentFinded.save();

    // Retourner une réponse avec l'événement créé
    return res.status(201).json({
      message: "Event created successfully",
      event: newEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      message: "Failed to create event",
      error: error,
    });
  }
};

// Fonction pour lire un événement spécifique
const readEvent = (req: Request, res: Response, next: NextFunction) => {
  const eventId = req.params.eventId;

  return Event.findById(eventId)
    .then((event) =>
      event
        ? res.status(200).json({ message: event })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

// Fonction pour lire tous les événements
const readAll = (req: Request, res: Response, next: NextFunction) => {
  return Event.find()
    .then((events) => res.status(200).json({ message: events }))
    .catch((error) => res.status(500).json({ error: error.message }));
};

// Contrôleur pour récupérer les événements par code postal
const getEventsByPostalCode = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { postalCode } = req.params; // Extraire les deux premiers chiffres du code postal des paramètres d'URL

    if (postalCode.length < 2) {
      return res.status(400).json({
        message: "Le code postal doit contenir au moins deux chiffres.",
      });
    }

    // Forcer la conversion en chaîne de caractères et ne prendre que les deux premiers chiffres
    const postalCodeStart = postalCode.substring(0, 2);

    // Chercher les événements dont le code postal dans l'adresse commence par ces deux chiffres
    const events = await Event.find({
      address: { $regex: `\\b${postalCodeStart}\\d{3}\\b`, $options: "i" }, // Recherche insensible à la casse, et s'assure que les deux premiers chiffres sont suivis de trois autres chiffres pour un code postal complet
    });

    if (events.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun événement trouvé pour ce code postal." });
    }

    // Date et heure actuelles
    const currentDate = new Date();

    // Séparer les événements en trois catégories : passés, présents (aujourd'hui) et à venir
    const pastEvents = events.filter(
      (event) => new Date(event.endingDate) < currentDate
    );
    const upcomingEvents = events.filter(
      (event) => new Date(event.startingDate) > currentDate
    );
    const currentEvents = events.filter(
      (event) =>
        new Date(event.startingDate) <= currentDate &&
        new Date(event.endingDate) >= currentDate
    );

    return res.status(200).json({
      pastEvents, // Événements passés
      currentEvents, // Événements en cours aujourd'hui
      upcomingEvents, // Événements à venir
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des événements par code postal:",
      error
    );
    return res
      .status(500)
      .json({ message: "Erreur interne du serveur", error });
  }
};

const updateEvent = async (req: Request, res: Response, next: NextFunction) => {
  const eventId = req.params.eventId;

  try {
    // Recherche de l'événement par ID
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    // Appliquer les mises à jour des champs basiques
    event.title = req.body.title || event.title;
    event.description = req.body.description || event.description;
    event.startingDate = req.body.startingDate
      ? new Date(req.body.startingDate)
      : event.startingDate;
    event.endingDate = req.body.endingDate
      ? new Date(req.body.endingDate)
      : event.endingDate;

    // Mise à jour du prix (minPrice, maxPrice et priceCurrency)
    if (req.body.priceSpecification) {
      const { minPrice, maxPrice, priceCurrency } = req.body.priceSpecification;

      event.priceSpecification = {
        minPrice: minPrice || event.priceSpecification?.minPrice || 0,
        maxPrice: maxPrice || event.priceSpecification?.maxPrice || 0,
        priceCurrency:
          priceCurrency || event.priceSpecification?.priceCurrency || "EUR",
      };
    }

    // Mise à jour des méthodes de paiement
    if (req.body.acceptedPaymentMethod) {
      event.acceptedPaymentMethod = req.body.acceptedPaymentMethod.length
        ? req.body.acceptedPaymentMethod
        : event.acceptedPaymentMethod;
    }

    // Vérification et mise à jour des informations sur l'organisateur
    if (req.body.organizer) {
      const organizer = req.body.organizer;

      // Vérification que l'établissement est fourni
      if (!organizer.establishment) {
        return res.status(400).json({
          message: "L'établissement est obligatoire pour l'organisateur",
        });
      }

      event.organizer = {
        establishment: organizer.establishment, // Assurez-vous que cette valeur est bien présente
        legalName:
          organizer.legalName ||
          event.organizer?.legalName ||
          "Organisateur inconnu",
        email: organizer.email || event.organizer?.email || "Email inconnu",
        phone: organizer.phone || event.organizer?.phone || "Téléphone inconnu",
      };
    }

    // Mise à jour de l'image, si fournie
    if (req.body.image) {
      event.image = req.body.image;
    }

    // Sauvegarde de l'événement mis à jour dans la base de données
    const updatedEvent = await event.save();

    return res.status(200).json({
      message: "Événement mis à jour avec succès",
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'événement:", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la mise à jour de l'événement", error });
  }
};

const updateOrCreateEventsFromJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    for (const jsonEvent of AllEvents) {
      // Obtenir le titre de l'événement depuis le JSON
      const title = jsonEvent["rdfs:label"]?.fr?.[0];

      // Rechercher l'événement dans la base de données par son titre
      let eventInDB = await Event.findOne({ title });

      if (eventInDB) {
        // Mise à jour des champs de l'événement existant
        eventInDB.description =
          jsonEvent["rdfs:comment"]?.fr?.[0] || eventInDB.description;
        eventInDB.startingDate = new Date(
          jsonEvent["schema:startDate"]?.[0] ?? eventInDB.startingDate
        );
        eventInDB.endingDate = new Date(
          jsonEvent["schema:endDate"]?.[0] ?? eventInDB.endingDate
        );

        // Mise à jour du prix et de la devise
        if (jsonEvent.offers?.[0]?.["schema:priceSpecification"]) {
          const priceSpec = jsonEvent.offers[0]["schema:priceSpecification"];
          eventInDB.priceSpecification = {
            minPrice:
              parseFloat(priceSpec["schema:minPrice"]?.[0]) ||
              eventInDB.priceSpecification.minPrice,
            maxPrice:
              parseFloat(priceSpec["schema:maxPrice"]?.[0]) ||
              eventInDB.priceSpecification.maxPrice,
            priceCurrency:
              priceSpec["schema:priceCurrency"] ||
              eventInDB.priceSpecification.priceCurrency,
          };
        }

        // Mise à jour des méthodes de paiement
        if (jsonEvent.offers?.[0]?.["schema:acceptedPaymentMethod"]) {
          const paymentMethods = jsonEvent.offers[0][
            "schema:acceptedPaymentMethod"
          ].map(
            (method: any) =>
              method["rdfs:label"]?.fr?.[0] || method["rdfs:label"]?.en?.[0]
          );
          eventInDB.acceptedPaymentMethod =
            paymentMethods.length > 0
              ? paymentMethods
              : eventInDB.acceptedPaymentMethod;
        }

        // Mise à jour des informations sur l'organisateur
        if (jsonEvent.hasBeenPublishedBy?.[0]) {
          const organizer = jsonEvent.hasBeenPublishedBy[0];
          Object(eventInDB).organizer = {
            legalName:
              organizer["schema:legalName"] || eventInDB.organizer.legalName,
            email: organizer["schema:email"]?.[0] || eventInDB.organizer.email,
            phone:
              organizer["schema:telephone"]?.[0] || eventInDB.organizer.phone,
          };
        }

        // Sauvegarde de l'événement mis à jour dans la base de données
        await eventInDB.save();
        Retour.info(`Événement mis à jour: ${eventInDB.title}`);
      } else {
        // Si l'événement n'existe pas, en créer un nouveau
        const address =
          jsonEvent["isLocatedAt"]?.[0]?.["schema:address"]?.[0]?.[
            "schema:streetAddress"
          ]?.[0];
        const postalCode =
          jsonEvent["isLocatedAt"]?.[0]?.["schema:address"]?.[0]?.[
            "schema:postalCode"
          ] || "";
        const city =
          jsonEvent["isLocatedAt"]?.[0]?.["schema:address"]?.[0]?.[
            "schema:addressLocality"
          ] || "";

        // Construire l'adresse complète pour l'API
        const fullAddress = `${address}, ${postalCode}, ${city}`;

        try {
          // Appel à l'API pour récupérer les coordonnées géographiques de l'adresse
          const responseApiGouv = await axios.get(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}`
          );
          const features = responseApiGouv.data.features;

          if (!features || features.length === 0 || !features[0].geometry) {
            throw new Error("Coordonnées non disponibles");
          }

          const coordinates = features[0].geometry.coordinates;

          if (!coordinates || coordinates.length < 2) {
            throw new Error("Coordonnées incomplètes");
          }

          // Création d'un nouvel événement avec les informations du JSON et les coordonnées récupérées
          const newEvent = new Event({
            title: title || "Titre par défaut",
            description:
              jsonEvent["rdfs:comment"]?.fr?.[0] || "Description par défaut",
            startingDate: new Date(
              jsonEvent["schema:startDate"]?.[0] ?? new Date()
            ),
            endingDate: new Date(
              jsonEvent["schema:endDate"]?.[0] ?? new Date()
            ),
            address: fullAddress,
            location: {
              lat: coordinates[1], // Latitude
              lng: coordinates[0], // Longitude
            },
            price: 0, // Valeur par défaut
            priceSpecification: {
              minPrice:
                parseFloat(
                  jsonEvent.offers?.[0]?.["schema:priceSpecification"]?.[
                    "schema:minPrice"
                  ]?.[0]
                ) || 0,
              maxPrice:
                parseFloat(
                  jsonEvent.offers?.[0]?.["schema:priceSpecification"]?.[
                    "schema:maxPrice"
                  ]?.[0]
                ) || 0,
              priceCurrency:
                jsonEvent.offers?.[0]?.["schema:priceSpecification"]?.[
                  "schema:priceCurrency"
                ] || "EUR",
            },
            acceptedPaymentMethod:
              jsonEvent.offers?.[0]?.["schema:acceptedPaymentMethod"]?.map(
                (method: any) =>
                  method["rdfs:label"]?.fr?.[0] || method["rdfs:label"]?.en?.[0]
              ) || [],
            organizer: {
              legalName:
                jsonEvent.hasBeenPublishedBy?.[0]?.["schema:legalName"] ||
                "Organisateur inconnu",
              email:
                jsonEvent.hasBeenPublishedBy?.[0]?.["schema:email"]?.[0] ||
                "Email inconnu",
              phone:
                jsonEvent.hasBeenPublishedBy?.[0]?.["schema:telephone"]?.[0] ||
                "Téléphone inconnu",
            },
            image:
              jsonEvent.hasMainRepresentation?.map(
                (rep: any) => rep["ebucore:locator"]?.[0]
              ) || [],
            color: jsonEvent.color || "#000000",
          });

          // Sauvegarde du nouvel événement dans la base de données
          await newEvent.save();
          Retour.info(`Nouvel événement créé: ${newEvent.title}`);
        } catch (error) {
          console.error(
            `Erreur lors de la récupération des coordonnées pour l'événement "${title}":`,
            error
          );
          // Décider si on veut continuer ou arrêter
          continue; // Ici, on choisit de continuer avec le prochain événement
        }
      }

      return res
        .status(200)
        .json({ message: "Tous les événements ont été traités." });
    }
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour ou création des événements:",
      error
    );
    return res.status(500).json({
      message: "Erreur lors de la mise à jour ou création des événements",
      error,
    });
  }
};

// Fonction pour supprimer un événement
const deleteEvent = async (req: Request, res: Response, next: NextFunction) => {
  const eventId = req.params.eventId;
  const owner = req.body.owner;

  try {
    // Trouver l'événement par ID
    const eventFinded = await Event.findById(eventId);
    if (!owner) {
      return res.status(404).json({ message: "Non authorized to delete" });
    }
    if (!eventFinded) {
      return res.status(404).json({ message: "Événement non trouvé" });
    }

    // Si l'événement a un établissement associé, le retirer de sa liste d'événements
    if (eventFinded && eventFinded.organizer.establishment) {
      const establishment = await Establishment.findOne({
        events: eventFinded._id,
      });

      if (establishment) {
        const filter = establishment.events.filter(
          (event) =>
            JSON.stringify(Object(event)._id) !==
            JSON.stringify(eventFinded._id)
        );
        Object(establishment).events = filter;
        await establishment.save(); // Sauvegarder les modifications
      }
    }

    // Supprimer l'événement de la base de données
    await Event.findByIdAndDelete(eventId);

    return res.status(200).json({
      message: `L'événement ${eventId} a été supprimé avec succès`,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression de l'événement:", error);
    return res.status(500).json({ error: error });
  }
};

export default {
  createEvent,
  createEventForAnEstablishment,
  readEvent,
  readAll,
  getEventsByPostalCode,
  updateEvent,
  updateOrCreateEventsFromJSON,
  deleteEvent,
};
