import { NextFunction, Request, Response } from "express";
import axios from "axios";

import Event from "../models/Event";
import Retour from "../library/Retour";
import Establishment from "../models/Establishment";

import path from "path";
import { readFile } from "fs/promises";

// Utiliser promisify pour rendre les fonctions fs asynchrones

const AllEvents = require("../../Events/index.json");

// Fonction de création d'événements
// const createEventFromJSON = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     // Chemin de base où se trouvent les fichiers
//     const basePath = path.join(__dirname, "..", "..", "events", "objects");

//     for (const event of AllEvents) {
//       const fullPath = path.join(basePath, event.file);
//       const fileData = await readFile(fullPath, "utf-8");
//       const eventData = JSON.parse(fileData);

//       const title = eventData["rdfs:label"]?.fr?.[0] || "Titre par défaut";
//       const description =
//         eventData["hasDescription"]?.[0]?.["dc:description"]?.fr?.[0] ||
//         eventData["rdfs:comment"]?.fr?.[0] ||
//         "Description non disponible";

//       // Récupérer l'adresse
//       const addressData = eventData["isLocatedAt"]?.[0]?.["schema:address"];
//       let address = "Adresse par défaut";
//       if (addressData && Array.isArray(addressData)) {
//         const firstAddress = addressData[0];
//         const streetAddress = Array.isArray(
//           firstAddress["schema:streetAddress"]
//         )
//           ? firstAddress["schema:streetAddress"].join(", ")
//           : firstAddress["schema:streetAddress"] || "Rue inconnue";
//         const postalCode =
//           firstAddress["schema:postalCode"] || "Code postal inconnu";
//         const addressLocality =
//           firstAddress["schema:addressLocality"] || "Ville inconnue";
//         address = `${streetAddress}, ${postalCode}, ${addressLocality}`;
//       }

//       const theme = eventData["@type"] || "Thème inconnu";

//       // Récupération des images
//       let image = "Image par défaut";
//       if (
//         eventData.hasMainRepresentation &&
//         Array.isArray(eventData.hasMainRepresentation)
//       ) {
//         const mainRepresentation = eventData.hasMainRepresentation[0];
//         const resource = mainRepresentation["ebucore:hasRelatedResource"]?.[0];
//         image = resource?.["ebucore:locator"] || "Image par défaut";
//       }

//       const color = eventData.color || "#000000";

//       // Récupération du numéro de téléphone et de l'email depuis `hasContact`
//       let phone = "Téléphone inconnu";
//       let email = "Email inconnu";
//       if (eventData.hasContact && Array.isArray(eventData.hasContact)) {
//         const contactInfo = eventData.hasContact[0];
//         phone = contactInfo["schema:telephone"]?.[0] || "Téléphone inconnu";
//         email = contactInfo["schema:email"]?.[0] || "Email inconnu";
//       }

//       // Organisateur
//       const organizerData = eventData["hasBeenCreatedBy"];
//       const organizer = {
//         legalName:
//           organizerData?.["schema:legalName"] || "Organisateur inconnu",
//         email, // Ajout de l'email récupéré ici
//         phone, // Ajout du téléphone récupéré ici
//       };

//       // Gestion simplifiée du prix et de la spécification du prix
//       let price = 0;
//       let priceCurrency = "EUR"; // Devise par défaut

//       if (eventData["offers"] && Array.isArray(eventData["offers"])) {
//         const offer = eventData["offers"][0]; // On prend la première offre
//         if (offer && offer["schema:priceSpecification"]?.[0]) {
//           const priceSpec = offer["schema:priceSpecification"][0];
//           price = parseFloat(priceSpec?.["schema:price"]) || 0;
//           priceCurrency = priceSpec?.["schema:priceCurrency"] || "EUR";
//         }
//       }

//       try {
//         const responseApiGouv = await axios.get(
//           `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
//             address
//           )}`
//         );
//         const features = responseApiGouv.data.features;

//         if (!features || features.length === 0 || !features[0].geometry) {
//           throw new Error("Coordonnées non disponibles");
//         }

//         const coordinates = features[0].geometry.coordinates;

//         if (!coordinates || coordinates.length < 2) {
//           throw new Error("Coordonnées incomplètes");
//         }

//         // Parcourir chaque période pour les événements récurrents
//         for (const period of eventData["takesPlaceAt"] || []) {
//           const startDate = period["startDate"] || "Date de début inconnue";
//           const endDate = period["endDate"] || "Date de fin inconnue";
//           const startTime = period["startTime"] || "00:00:00"; // Heure par défaut si non définie
//           const endTime = period["endTime"] || "23:59:59"; // Heure par défaut si non définie

//           const startingDateTime = new Date(`${startDate}T${startTime}`);
//           const endingDateTime = new Date(`${endDate}T${endTime}`);

//           // Création de l'événement avec tous les champs du modèle
//           const newEvent = new Event({
//             title,
//             theme,
//             startingDate: startingDateTime,
//             endingDate: endingDateTime,
//             address,
//             location: {
//               lat: coordinates[1],
//               lng: coordinates[0],
//             },
//             image,
//             description, // Description en français récupérée
//             color,
//             price, // Ajout du prix
//             priceSpecification: {
//               minPrice: price,
//               maxPrice: price,
//               priceCurrency,
//             },
//             organizer, // Ajout de l'organisateur avec le téléphone et l'email récupérés
//           });

//           await newEvent.save();
//           Retour.info(
//             `Événement créé avec succès: ${newEvent.title} pour la date ${startingDateTime.toISOString()}`
//           );
//         }
//       } catch (error) {
//         console.error("Erreur lors de la récupération des coordonnées:", error);
//       }
//     }

//     return res
//       .status(201)
//       .json({ message: "Tous les événements créés avec succès" });
//   } catch (error) {
//     console.error("Erreur lors de la création des événements:", error);
//     return res
//       .status(500)
//       .json({ message: "Erreur lors de la création des événements", error });
//   }
// };

// Fonction utilitaire pour normaliser les images

const normalizeImages = (images: any): string[] => {
  if (!images) return [];
  try {
    if (typeof images === "string") {
      images = JSON.parse(images);
    }
    return Array.isArray(images)
      ? images
          .flat(Infinity)
          .filter((img) => typeof img === "string" && img.trim() !== "")
      : [];
  } catch (err) {
    console.error("Erreur de normalisation des images :", err);
    return [];
  }
};

export const updateOrCreateEventFromJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const basePath = path.join(__dirname, "..", "..", "events", "objects");

    for (const event of AllEvents) {
      try {
        // Lecture du fichier JSON
        const fullPath = path.join(basePath, event.file);
        const fileData = await readFile(fullPath, "utf-8");
        const eventData = JSON.parse(fileData);
        const theme = eventData["@type"] || "Thème inconnu";

        // Extraction des données
        const title = eventData["rdfs:label"]?.fr?.[0] || "Titre par défaut";
        const description =
          eventData["hasDescription"]?.[0]?.["dc:description"]?.fr?.[0] ||
          eventData["rdfs:comment"]?.fr?.[0] ||
          "Description non disponible";

        // Extraction et formatage de l'adresse
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

        // Normalisation des images
        let image: string[] = [];
        if (
          eventData.hasMainRepresentation &&
          Array.isArray(eventData.hasMainRepresentation)
        ) {
          const mainRepresentation = eventData.hasMainRepresentation[0];
          const resource =
            mainRepresentation["ebucore:hasRelatedResource"]?.[0]?.[
              "ebucore:locator"
            ];
          image = normalizeImages(resource);
        }

        // Extraction des informations de contact
        let phone = "Téléphone inconnu";
        let email = "Email inconnu";
        if (eventData.hasContact && Array.isArray(eventData.hasContact)) {
          const contactInfo = eventData.hasContact[0];
          phone = contactInfo["schema:telephone"]?.[0] || "Téléphone inconnu";
          email = contactInfo["schema:email"]?.[0] || "Email inconnu";
        }

        // Extraction des informations de l'organisateur
        const organizerData = eventData["hasBeenCreatedBy"];
        const organizer = {
          establishment: organizerData?.establishment || null,
          legalName:
            organizerData?.["schema:legalName"] || "Organisateur inconnu",
          email,
          phone,
        };

        // Gestion des prix
        let price = 0;
        let priceCurrency = "EUR";
        if (eventData["offers"] && Array.isArray(eventData["offers"])) {
          const offer = eventData["offers"][0];
          if (offer?.["schema:priceSpecification"]?.[0]) {
            const priceSpec = offer["schema:priceSpecification"][0];
            price = parseFloat(priceSpec?.["schema:price"]) || 0;
            priceCurrency = priceSpec?.["schema:priceCurrency"] || "EUR";
          }
        }

        // Géocodage de l'adresse
        let coordinates = { lat: 0, lng: 0 };
        try {
          const responseApiGouv = await axios.get(
            `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}`
          );
          const features = responseApiGouv.data.features;

          if (features?.[0]?.geometry?.coordinates) {
            coordinates = {
              lat: features[0].geometry.coordinates[1],
              lng: features[0].geometry.coordinates[0],
            };
          } else {
            console.warn(
              `Coordonnées non disponibles pour l'adresse : ${address}`
            );
          }
        } catch (geoError) {
          console.error(
            "Erreur lors de la récupération des coordonnées :",
            geoError
          );
        }

        // Gestion des événements récurrents
        for (const period of eventData["takesPlaceAt"] || []) {
          const startingDate = new Date(
            `${period["startDate"]}T${period["startTime"] || "00:00:00"}`
          );
          const endingDate = new Date(
            `${period["endDate"]}T${period["endTime"] || "23:59:59"}`
          );

          // Vérification d'existence
          const existingEvent = await Event.findOne({ title, startingDate });

          if (existingEvent) {
            // Vérifiez si des changements sont nécessaires
            const hasChanges =
              existingEvent.address !== address ||
              existingEvent.location.lat !== coordinates.lat ||
              existingEvent.location.lng !== coordinates.lng ||
              JSON.stringify(existingEvent.image) !== JSON.stringify(image) ||
              existingEvent.startingDate.getTime() !== startingDate.getTime() ||
              existingEvent.endingDate.getTime() !== endingDate.getTime();

            if (hasChanges) {
              // Mise à jour
              existingEvent.description = description;
              existingEvent.address = address;
              existingEvent.location = coordinates;
              existingEvent.image = image.slice(0, 1) as [string];
              existingEvent.priceSpecification = {
                minPrice: price,
                maxPrice: price,
                priceCurrency,
              };
              existingEvent.organizer = organizer;
              existingEvent.theme = theme;
              existingEvent.startingDate = startingDate;
              existingEvent.endingDate = endingDate;

              await existingEvent.save();
              console.info(`Événement mis à jour : ${existingEvent.title}`);
            }
          } else {
            // Création
            const newEvent = new Event({
              title,
              description,
              address,
              theme,
              location: coordinates,
              image,
              priceSpecification: {
                minPrice: price,
                maxPrice: price,
                priceCurrency,
              },
              organizer,
              startingDate,
              endingDate,
            });

            await newEvent.save();
            console.info(`Événement créé avec succès : ${newEvent.title}`);
          }
        }
      } catch (eventError) {
        console.error(`Erreur avec l'événement : ${event.file}`, eventError);
      }
    }

    return res
      .status(201)
      .json({ message: "Tous les événements ont été traités avec succès." });
  } catch (error) {
    console.error("Erreur lors du traitement des événements :", error);
    return res
      .status(500)
      .json({ message: "Erreur lors du traitement des événements", error });
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
const readEvent = async (req: Request, res: Response, next: NextFunction) => {
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
const readAll = async (req: Request, res: Response, next: NextFunction) => {
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
      pastEvents,
      currentEvents,
      upcomingEvents,
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

const getEventsByPosition = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        message: "La latitude et la longitude sont requises.",
      });
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);

    // Vérifier la validité des coordonnées
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        message: "Les coordonnées fournies ne sont pas valides.",
      });
    }

    // Rayon de recherche en kilomètres (exemple : 10 km)
    const radiusInKm = req.body.radius || 50;

    // Utiliser une agrégation pour calculer la distance en utilisant la formule de Haversine
    const events = await Event.aggregate([
      {
        $addFields: {
          distance: {
            $sqrt: {
              $add: [
                {
                  $pow: [{ $subtract: ["$location.lat", lat] }, 2],
                },
                {
                  $pow: [{ $subtract: ["$location.lng", lon] }, 2],
                },
              ],
            },
          },
        },
      },
      {
        $match: {
          distance: { $lte: radiusInKm / 111.12 }, // Conversion km en degrés (approximation)
        },
      },
      {
        $sort: { distance: 1 },
      },
    ]);

    if (events.length === 0) {
      return res
        .status(404)
        .json({ message: "Aucun événement trouvé autour de cette position." });
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
      pastEvents,
      currentEvents,
      upcomingEvents,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des événements par position:",
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

const getEventByDate = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius } = req.body;

    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    // Vérifier que les coordonnées sont fournies si on souhaite filtrer par distance
    if (!latitude || !longitude) {
      return res.status(400).json({
        message:
          "La latitude et la longitude sont requises pour filtrer par position.",
      });
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);
    const radiusInKm = radius ? parseFloat(radius as string) : 50;

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({
        message: "Les coordonnées fournies ne sont pas valides.",
      });
    }

    // Utiliser une agrégation pour ajouter la distance et filtrer par date, distance, et type de position
    const events = await Event.aggregate([
      {
        $addFields: {
          distance: {
            $sqrt: {
              $add: [
                { $pow: [{ $subtract: ["$location.lat", lat] }, 2] },
                { $pow: [{ $subtract: ["$location.lng", lon] }, 2] },
              ],
            },
          },
        },
      },
      {
        $match: {
          startingDate: { $gte: startOfMonth, $lte: endOfMonth },
          distance: { $lte: radiusInKm / 111.12 }, // Conversion km en degrés
        },
      },
      {
        $sort: { distance: 1 },
      },
    ]);

    if (events.length === 0) {
      return res.status(404).json({
        message: "Aucun événement trouvé pour cette date et position.",
      });
    }

    return res.status(200).json(events);
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des événements par date et position:",
      error
    );
    return res
      .status(500)
      .json({ message: "Erreur interne du serveur", error });
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

const deleteDuplicateEvents = async (req: Request, res: Response) => {
  try {
    // Récupérer tous les événements groupés par title
    const events = await Event.aggregate([
      {
        $group: {
          _id: "$title",
          ids: { $push: "$_id" },
          count: { $sum: 1 },
        },
      },
      {
        $match: {
          count: { $gt: 1 }, // Sélectionne seulement les titres qui ont plus d'une occurrence
        },
      },
    ]);

    // Parcourir chaque groupe d'événements en double pour supprimer les occurrences supplémentaires
    for (const event of events) {
      // Conserve la première occurrence et supprime les autres
      const [firstId, ...duplicateIds] = event.ids;
      await Event.deleteMany({ _id: { $in: duplicateIds } });
    }

    return res.status(200).json({
      message: "Duplicate events removed",
      details: events,
    });
  } catch (error) {
    console.error("Error deleting duplicate events:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};

export default {
  // createEventFromJSON,
  createEventForAnEstablishment,
  readEvent,
  readAll,
  getEventsByPostalCode,
  getEventsByPosition,
  getEventByDate,
  updateEvent,
  updateOrCreateEventFromJSON,
  deleteEvent,
  deleteDuplicateEvents,
};
