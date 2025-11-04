import { NextFunction, Request, Response } from "express";
import axios from "axios";

import Event from "../models/Event";
import Retour from "../library/Retour";
import Establishment from "../models/Establishment";

import path from "path";
import * as fs from "fs";
import chalk from "chalk";
import Customer from "../models/Customer";
import Registration from "../models/Registration";
import Bill from "../models/Bill";
import cloudinary from "cloudinary";
import { sendEventConfirmationEmail } from "../utils/sendEventConfirmation";
import mongoose, { Types } from "mongoose";
import { sendExpoPushNotifications } from "../utils/push";
import Owner from "../models/Owner";
const CryptoJS = require("crypto-js");

// Utiliser promisify pour rendre les fonctions fs asynchrones
/**
 * Génère toutes les occurrences récurrentes pour un événement
 * @param takesPlaceAt - Liste des périodes de récurrence
 * @param openingHours - Informations sur les heures d'ouverture (opens, closes)
 * * @param images - Tableau ou chaîne contenant les URLs d'images
 * @returns Liste des occurrences avec dates et horaires
 */

// const AllEvents = require("../../Events/index.json");
// const AllEventsForParis = require("../../Events/forParis.json");

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

// Fonction de validation de l'URL d'image
const validateImageUrl = async (url: string): Promise<string> => {
  if (!url || url === "Image par défaut") {
    console.warn(
      `URL non valide ou définie comme "Image par défaut" : ${url}.`
    );
    return url; // Considérer "Image par défaut" comme valide
  }

  try {
    new URL(url); // Valide la syntaxe de l'URL
  } catch (err) {
    console.warn(`URL invalide : ${url}. Remplacement par 'Image par défaut'.`);
    return "Image par défaut";
  }

  try {
    const response = await axios.head(url, { timeout: 5000 });
    if (
      response.status === 200 &&
      response.headers["content-type"]?.startsWith("image/")
    ) {
      return url; // URL valide
    } else {
      console.warn(`L'URL ne pointe pas vers une image valide : ${url}.`);
      return "Image par défaut";
    }
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.warn(
        `Erreur lors de la vérification de l'URL : ${url}.`,
        `Status Code : ${err.response?.status || "Inconnu"}`
      );
      return "Image par défaut";
    } else {
      console.error(
        `Erreur inattendue lors de la vérification de l'URL : ${url}`,
        err
      );
    }
    return "Image par défaut";
  }
};

function extractImages(fileData: any): string[] {
  let imageUrls: string[] = [];

  // Rechercher les images dans hasMainRepresentation
  if (fileData["hasMainRepresentation"]?.[0]?.["ebucore:hasRelatedResource"]) {
    const resources =
      fileData["hasMainRepresentation"][0]["ebucore:hasRelatedResource"];
    resources.forEach((resource: any) => {
      if (resource["ebucore:locator"]) {
        imageUrls.push(...resource["ebucore:locator"]);
      }
    });
  }

  // Vérifier d'autres champs potentiels pour les images
  if (fileData["schema:image"]) {
    const schemaImages = Array.isArray(fileData["schema:image"])
      ? fileData["schema:image"]
      : [fileData["schema:image"]];
    imageUrls.push(...schemaImages);
  }

  if (fileData["hasMedia"]) {
    const mediaResources = fileData["hasMedia"];
    mediaResources.forEach((media: any) => {
      if (media["ebucore:locator"]) {
        imageUrls.push(media["ebucore:locator"]);
      }
    });
  }

  // Transformation des URLs en HTTPS si elles utilisent HTTP
  imageUrls = imageUrls
    .filter((url: string) => typeof url === "string" && url.length > 0) // Vérification des chaînes valides
    .map((url: string) =>
      url.startsWith("http://") ? url.replace("http://", "https://") : url
    );

  // Ajouter une valeur par défaut si aucune image n'est trouvée
  if (imageUrls.length === 0) {
    imageUrls.push("Image par défaut");
  }

  return imageUrls;
}

// Fonctions utilitaires regroupées

function extractAddress(fileData: any): string {
  const addressData = fileData["isLocatedAt"]?.[0]?.["schema:address"]?.[0];
  return (
    [
      addressData?.["schema:streetAddress"],
      addressData?.["schema:addressLocality"],
      addressData?.["schema:postalCode"],
    ]
      .filter(Boolean)
      .join(", ") || "Adresse inconnue"
  );
}

function extractDescription(fileData: any): string {
  return (
    fileData["hasDescription"]?.[0]?.["dc:description"]?.fr?.[0] ||
    fileData["rdfs:comment"]?.fr?.[0] ||
    "Description non disponible"
  );
}

function extractCoordinates(fileData: any): {
  newLat: number | null;
  newLng: number | null;
} {
  const geoData = fileData["isLocatedAt"]?.[0]?.["schema:geo"];
  if (geoData) {
    return {
      newLat: parseFloat(geoData["schema:latitude"]),
      newLng: parseFloat(geoData["schema:longitude"]),
    };
  }
  return { newLat: null, newLng: null };
}

async function fetchCoordinates(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    console.info(`Recherche des coordonnées pour : ${address}`);
    const response = await axios.get(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}`
    );
    const feature = response.data.features?.[0];
    if (feature?.geometry?.coordinates) {
      console.info(`Coordonnées trouvées : ${feature.geometry.coordinates}`);
      return {
        lat: feature.geometry.coordinates[1],
        lng: feature.geometry.coordinates[0],
      };
    }
    console.warn(`Coordonnées non trouvées pour l'adresse : ${address}`);
  } catch (error) {
    console.error("Erreur API géocodage :", error);
  }
  return null;
}

function extractOrganizer(fileData: any): {
  legalName: string;
  email: string;
  phone: string;
} {
  return {
    legalName:
      fileData["hasBeenCreatedBy"]?.["schema:legalName"] ||
      "Organisateur inconnu",
    email:
      fileData["hasContact"]?.[0]?.["schema:email"]?.[0] ||
      "contact@unknown.com",
    phone:
      fileData["hasContact"]?.[0]?.["schema:telephone"]?.[0] || "0000000000",
  };
}

function extractPriceSpecification(fileData: any) {
  let minPrice: number = 0;
  let maxPrice: number = 0;
  let priceCurrency = "EUR"; // Valeur par défaut

  const offers = fileData?.offers || [];

  offers.forEach((offer: any) => {
    const priceSpecifications = offer["schema:priceSpecification"] || [];

    priceSpecifications.forEach((spec: any) => {
      const maxPrices = spec["schema:maxPrice"];
      const minPrices = spec["schema:minPrice"];
      const price = spec["schema:price"]; // Nouveau traitement
      const currency = spec["schema:priceCurrency"];

      console.log(
        "Max Prices:",
        maxPrices,
        "Min Prices:",
        minPrices,
        "Price:",
        price,
        "Currency:",
        currency
      );

      // Si maxPrice ou minPrice ne sont pas définis, utiliser le champ "price"
      if (!maxPrices && price) {
        maxPrice = Math.max(maxPrice, parseFloat(price));
      }
      if (!minPrices && price) {
        minPrice =
          minPrice === 0
            ? parseFloat(price)
            : Math.min(minPrice, parseFloat(price));
      }

      // Récupérer le maximum dans les tableaux
      if (Array.isArray(maxPrices)) {
        const maxValues = maxPrices.map(Number).filter((p) => !isNaN(p));
        if (maxValues.length > 0) {
          maxPrice = Math.max(maxPrice, ...maxValues);
        }
      } else if (!isNaN(parseFloat(maxPrices))) {
        maxPrice = Math.max(maxPrice, parseFloat(maxPrices));
      }

      if (Array.isArray(minPrices)) {
        const minValues = minPrices.map(Number).filter((p) => !isNaN(p));
        if (minValues.length > 0) {
          minPrice =
            minPrice === 0
              ? Math.min(...minValues)
              : Math.min(minPrice, ...minValues);
        }
      } else if (!isNaN(parseFloat(minPrices))) {
        const parsedMin = parseFloat(minPrices);
        minPrice = minPrice === 0 ? parsedMin : Math.min(minPrice, parsedMin);
      }

      // Mise à jour de la devise si elle existe
      if (currency) {
        priceCurrency = currency;
      }
    });
  });

  console.log(
    "Final Values - Min Price:",
    minPrice,
    "Max Price:",
    maxPrice,
    "Currency:",
    priceCurrency
  );

  return {
    priceCurrency,
    minPrice,
    maxPrice,
    price: maxPrice, // Utiliser le prix maximum comme prix principal
  };
}

// const updateOrCreateEventFromJSON = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const basePath = path.join(__dirname, "..", "..", "events", "objects");
//     // Fonction récursive pour collecter tous les fichiers JSON
//     // const getAllFiles = (directory: string): string[] => {
//     //   return fs.readdirSync(directory).flatMap((item) => {
//     //     const fullPath = path.join(directory, item);

//     //     if (fs.lstatSync(fullPath).isDirectory()) {
//     //       // Si c'est un dossier, on rappelle la fonction récursive
//     //       return getAllFiles(fullPath);
//     //     }

//     //     // Sinon, vérifier que c'est un fichier JSON
//     //     if (fullPath.endsWith(".json")) {
//     //       return fullPath;
//     //     }

//     //     // Ignorer si ce n'est ni un fichier JSON ni un dossier
//     //     return [];
//     //   });
//     // };

//     // Collecter tous les fichiers JSON dans tous les sous-dossiers
//     // const AllEvents = getAllFiles(basePath);

//     const updatedEvents: any[] = [];
//     const createdEvents: any[] = [];
//     const unmatchedFiles: string[] = [];

//     for (const file of AllEvents) {
//       try {
//         console.info(`Traitement du fichier : ${file.file}`);
//         const filePath = path.join(basePath, file.file);
//         const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
//         // Titre et description
//         const title = normalizeString(
//           fileData["rdfs:label"]?.fr?.[0] || "Titre inconnu"
//         );
//         const description = extractDescription(fileData);

//         const mergeDates = (
//           fileData: any
//         ): { startDate: string; endDate: string } => {
//           const takesPlaceAt = fileData["takesPlaceAt"] || [];
//           let earliestStart: Date | null = null;
//           let latestEnd: Date | null = null;

//           takesPlaceAt.forEach((period: any) => {
//             try {
//               // Vérification de la validité des champs requis
//               if (!period.startDate) {
//                 console.warn(
//                   `Période ignorée : startDate manquant dans takesPlaceAt:`,
//                   period
//                 );
//                 return;
//               }

//               // Conversion des dates
//               const start = new Date(
//                 `${period.startDate}T${period.startTime || "00:00:00"}`
//               );

//               if (isNaN(start.getTime())) {
//                 console.warn(
//                   `Date de début invalide trouvée dans takesPlaceAt:`,
//                   period
//                 );
//                 return;
//               }

//               const end = new Date(
//                 `${period.endDate || period.startDate}T${period.endTime || "23:59:59"}`
//               );

//               if (isNaN(end.getTime())) {
//                 console.warn(
//                   `Date de fin invalide trouvée dans takesPlaceAt:`,
//                   period
//                 );
//                 return;
//               }

//               // Mise à jour des limites
//               if (!earliestStart || start < earliestStart) {
//                 earliestStart = start;
//               }
//               if (!latestEnd || end > latestEnd) {
//                 latestEnd = end;
//               }
//             } catch (error) {
//               console.error(
//                 `Erreur lors du traitement de la période :`,
//                 period,
//                 error
//               );
//             }
//           });

//           // Vérification explicite avant de retourner les résultats
//           if (!earliestStart || !latestEnd) {
//             throw new Error(
//               "Aucune date valide trouvée dans takesPlaceAt après vérification."
//             );
//           }

//           // Conversion en chaîne ISO et retour des résultats
//           return {
//             startDate: (earliestStart as Date).toISOString(),
//             endDate: (latestEnd as Date).toISOString(),
//           };
//         };

//         // Coordonnées
//         let { newLat, newLng } = extractCoordinates(fileData);

//         // Dates
//         const { startDate, endDate } = mergeDates(fileData);

//         // Images
//         const images = extractImages(fileData);
//         // Prix
//         const priceSpecification = extractPriceSpecification(fileData);

//         // Méthodes de paiement
//         const acceptedPaymentMethod =
//           fileData["schema:acceptedPaymentMethod"] || [];

//         // Organisateur
//         const organizer = extractOrganizer(fileData);
//         // Recherche de l'événement existant
//         let dbEvent = await Event.findOne({
//           $and: [
//             { title: { $regex: new RegExp(`^${escapeRegExp(title)}$`, "i") } },
//             {
//               address: {
//                 $regex: new RegExp(
//                   `^${escapeRegExp(extractAddress(fileData))}$`,
//                   "i"
//                 ),
//               },
//             },
//             { startingDate: new Date(startDate) },
//           ],
//         });

//         if (!dbEvent) {
//           const newEvent = new Event({
//             title,
//             description,
//             address: extractAddress(fileData),
//             location: {
//               lat: newLat,
//               lng: newLng,
//               geo: { type: "Point", coordinates: [newLng, newLat] },
//             },
//             startingDate: startDate,
//             endingDate: endDate,
//             image: images,
//             organizer,
//             theme: fileData["@type"] || ["Thème inconnu"],
//             price: priceSpecification.price,
//             priceSpecification,
//             acceptedPaymentMethod,
//           });
//           await newEvent.save();
//           createdEvents.push({ id: newEvent._id, title: newEvent.title });
//           console.info(`Nouvel événement créé : ${newEvent.title}`);
//         } else {
//           dbEvent.description = description;
//           Object(dbEvent).location = {
//             lat: newLat,
//             lng: newLng,
//             geo: { type: "Point", coordinates: [newLng, newLat] },
//           };
//           dbEvent.image = images;
//           dbEvent.price = Object(priceSpecification).price;
//           dbEvent.priceSpecification = priceSpecification;
//           dbEvent.acceptedPaymentMethod = acceptedPaymentMethod;
//           await dbEvent.save();
//           updatedEvents.push({ id: dbEvent._id, title: dbEvent.title });
//           console.info(`Événement mis à jour : ${dbEvent.title}`);
//         }
//       } catch (error) {
//         unmatchedFiles.push(file.file);
//         console.error(
//           `Erreur lors du traitement du fichier : ${file.file}`,
//           error
//         );
//       }
//     }

//     return res.status(200).json({
//       message: "Traitement des événements terminé.",
//       eventUpdated: updatedEvents.length,
//       newEvent: createdEvents.length,
//       eventUnmatched: unmatchedFiles.length,
//       updatedEvents,
//       createdEvents,
//       unmatchedFiles,
//     });
//   } catch (error) {
//     console.error("Erreur globale :", error);
//     return res
//       .status(500)
//       .json({ message: "Erreur lors du traitement.", error });
//   }
// };

const determinePrice = (event: any): number | null => {
  if (event.price_type === "gratuit") {
    return 0; // Gratuit => prix 0
  }

  // Si le prix est spécifié dans price_detail, on essaie d'extraire un montant
  if (event.price_detail) {
    const priceMatch = event.price_detail.match(/\d+([.,]\d+)?/);
    if (priceMatch) {
      return parseFloat(priceMatch[0].replace(",", "."));
    }
  }

  return 0; // Sinon, null
};

// const updateEventForParis = async (req: Request, res: Response) => {
//   try {
//     if (!Array.isArray(AllEventsForParis)) {
//       console.log("Format invalide : les événements ne sont pas un tableau.");
//       return res
//         .status(400)
//         .json({ error: "Invalid format: 'events' must be an array." });
//     }

//     console.log(`Nombre d'événements à traiter : ${AllEventsForParis.length}`);

//     const insertedEvents = [];
//     const updatedEvents = [];
//     const skippedOccurrences = [];

//     for (const event of AllEventsForParis) {
//       const occurrences = event.occurrences
//         ? event.occurrences
//             .split(";")
//             .map((occurrence: { split: (arg0: string) => [any, any] }) => {
//               const [start, end] = occurrence.split("_");
//               return {
//                 startingDate: start ? new Date(start) : null,
//                 endingDate: end ? new Date(end) : null,
//               };
//             })
//         : [
//             {
//               startingDate: event.date_start
//                 ? new Date(event.date_start)
//                 : null,
//               endingDate: event.date_end ? new Date(event.date_end) : null,
//             },
//           ];

//       for (const occurrence of occurrences) {
//         // Ignorer si `startingDate` ou `endingDate` est null
//         if (!occurrence.startingDate || !occurrence.endingDate) {
//           console.log(
//             `Élément ignoré : absence de startingDate ou endingDate (${event.title})`
//           );
//           skippedOccurrences.push({
//             title: event.title,
//             startingDate: occurrence.startingDate,
//             endingDate: occurrence.endingDate,
//           });
//           continue;
//         }

//         try {
//           const existingEvent = await Event.findOne({
//             title: event.title,
//             startingDate: occurrence.startingDate,
//             endingDate: occurrence.endingDate,
//           });

//           if (existingEvent) {
//             console.log(
//               `Occurrence déjà existante : ${existingEvent.title} (${existingEvent.startingDate} - ${existingEvent.endingDate})`
//             );

//             // Mise à jour de l'événement existant
//             existingEvent.theme = event.tags || existingEvent.theme;
//             existingEvent.address = `${event.address_street}, ${event.address_city}, ${event.address_zipcode}`;
//             existingEvent.location = {
//               lat: event.lat_lon.lat,
//               lng: event.lat_lon.lon,
//               geo: {
//                 type: "Point",
//                 coordinates: [event.lat_lon.lon, event.lat_lon.lat],
//               },
//             };
//             existingEvent.price = determinePrice(event) || 0;
//             existingEvent.organizer = {
//               establishment: existingEvent.organizer.establishment,
//               legalName:
//                 event.address_name || existingEvent.organizer.legalName,
//               email: event.contact_mail || existingEvent.organizer.email,
//               phone: event.contact_phone || existingEvent.organizer.phone,
//             };
//             existingEvent.image = event.cover_url
//               ? [event.cover_url]
//               : existingEvent.image;
//             existingEvent.description =
//               event.description || existingEvent.description;

//             await existingEvent.save();

//             updatedEvents.push(existingEvent);
//             continue;
//           }

//           // Création d'un nouvel événement si aucun existant trouvé
//           const eventToInsert = {
//             title: event.title || "Titre non disponible",
//             theme: event.tags || ["Général"],
//             startingDate: occurrence.startingDate,
//             endingDate: occurrence.endingDate,
//             address: `${event.address_street}, ${event.address_city}, ${event.address_zipcode}`,
//             location: {
//               lat: event.lat_lon.lat,
//               lng: event.lat_lon.lon,
//               geo: {
//                 type: "Point",
//                 coordinates: [event.lat_lon.lon, event.lat_lon.lat],
//               },
//             },
//             price: determinePrice(event), // Détermination du prix
//             priceSpecification: {
//               minPrice: null,
//               maxPrice: null,
//               priceCurrency: null,
//             },
//             favorieds: [],
//             acceptedPaymentMethod: [],
//             organizer: {
//               establishment: null,
//               legalName: event.address_name || "Organisateur inconnu",
//               email: event.contact_mail || "Email inconnu",
//               phone: event.contact_phone || "Téléphone inconnu",
//             },
//             image: event.cover_url ? [event.cover_url] : [],
//             description: event.description || "Description non disponible",
//             color: null,
//           };

//           const createdEvent = await Event.create(eventToInsert);
//           console.log(
//             `Événement créé : ${createdEvent.title} (ID: ${createdEvent._id})`
//           );
//           insertedEvents.push(createdEvent);
//         } catch (err) {
//           console.error(
//             `Erreur lors de la création ou de la mise à jour de l'occurrence pour ${event.title}`
//           );
//           console.error(err);
//         }
//       }
//     }

//     console.log(`Total des événements créés : ${insertedEvents.length}`);
//     console.log(`Total des événements mis à jour : ${updatedEvents.length}`);
//     console.log(
//       `Total des occurrences ignorées (déjà existantes ou invalides) : ${skippedOccurrences.length}`
//     );

//     res.status(201).json({
//       message: `${insertedEvents.length} occurrences créées, ${updatedEvents.length} mises à jour.`,
//       skipped: `${skippedOccurrences.length} occurrences ignorées.`,
//       createdEvents: insertedEvents,
//       updatedEvents: updatedEvents,
//     });
//   } catch (error) {
//     console.error(
//       "Erreur globale lors de l'importation des occurrences :",
//       error
//     );
//     res.status(500).json({
//       error: "Erreur lors de l'importation des occurrences.",
//       details: error,
//     });
//   }
// };

const createEventForAnEstablishment = async (req: Request, res: Response) => {
  try {
    const establishmentId = req.params.establishmentId;
    const draftId = req.body.draftId; // 🧩 L’ID du draft doit être envoyé dans le body

    if (!draftId) {
      return res.status(400).json({ message: "DraftId is required." });
    }

    const draftEvent = await Event.findById(draftId);
    if (!draftEvent || !draftEvent.isDraft) {
      return res.status(404).json({ message: "Draft event not found." });
    }

    const establishmentFinded = await Establishment.findById(establishmentId);

    if (!establishmentFinded) {
      Retour.error("Establishment not found");
      return res.status(404).json({ message: "Establishment not found" });
    }

    // 📍 Gestion de l'adresse et de la localisation
    let { address } = req.body;
    let latitude = draftEvent.location?.lat || establishmentFinded.location.lat;
    let longitude =
      draftEvent.location?.lng || establishmentFinded.location.lng;

    if (address) {
      const responseApiGouv = await axios.get(
        `https://api-adresse.data.gouv.fr/search/?q=${address}`
      );

      if (
        responseApiGouv.data.features?.length > 0 &&
        responseApiGouv.data.features[0].geometry?.coordinates?.length === 2
      ) {
        longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
      }
    } else {
      address = draftEvent.address || establishmentFinded.address?.street || "";
    }

    // 🧾 Thèmes
    const theme = Array.isArray(req.body.theme)
      ? req.body.theme
      : typeof req.body.theme === "string"
        ? [req.body.theme]
        : draftEvent.theme || [];

    // 🎟️ Autres infos
    draftEvent.set({
      title: req.body.title || draftEvent.title,
      theme,
      startingDate: req.body.startingDate || draftEvent.startingDate,
      endingDate: req.body.endingDate || draftEvent.endingDate,
      address,
      location: {
        lat: latitude,
        lng: longitude,
        geo: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      price: req.body.price || draftEvent.price,
      priceSpecification: {
        minPrice: req.body.priceSpecification?.minPrice || 0,
        maxPrice: req.body.priceSpecification?.maxPrice || req.body.price || 0,
        priceCurrency: req.body.priceSpecification?.priceCurrency || "EUR",
      },
      capacity: req.body.capacity || draftEvent.capacity,
      organizer: {
        establishment: draftEvent.organizer.establishment, // garde l'établissement
        legalName: draftEvent.organizer.legalName, // si tu veux garder aussi le nom
        email: req.body.organizer?.email || draftEvent.organizer.email,
        phone: req.body.organizer?.phone || draftEvent.organizer.phone,
      },
      registrationOpen:
        req.body.registrationOpen !== undefined
          ? req.body.registrationOpen
          : true,
      acceptedPaymentMethod:
        req.body.acceptedPaymentMethod || draftEvent.acceptedPaymentMethod,
      description: req.body.description || draftEvent.description,
      color: req.body.color || draftEvent.color,
      isDraft: false,
    });

    await draftEvent.save();

    if (!establishmentFinded.events.includes(draftEvent._id)) {
      establishmentFinded.events.push(draftEvent._id);
      await establishmentFinded.save();
    }

    const estObjId = establishmentFinded._id as Types.ObjectId;

    // 1) IDs des events de cet établissement
    const eventIds = await Event.find(
      { "organizer.establishment": estObjId },
      { _id: 1 }
    ).distinct("_id");

    // 2) Clients ayant au moins un de ces events (attended / reserved / favorites)
    const customersWithThisEstablishment = await Customer.find({
      $or: [
        { eventsAttended: { $in: eventIds } },
        { eventsReserved: { $in: eventIds } },
        { eventsFavorites: { $in: eventIds } },
        // Optionnel : ceux qui ont mis l’établissement en favori
        { establishmentFavorites: estObjId },
      ],
    })
      .select("expoPushToken")
      .lean();

    // 3) Tokens Expo uniques et valides
    const tokens = Array.from(
      new Set(
        customersWithThisEstablishment
          .map((c: any) => c.expoPushToken)
          .filter((t: any) => typeof t === "string" && t.trim().length > 0)
      )
    );

    const deepLink = `localappy://event/${draftEvent?._id}`; // lien pour ouvrir dans l'app expo

    const webFallbackLink = `https://localappy.fr/open?link=${encodeURIComponent(
      deepLink
    )}`;

    const { sent, invalidTokens } = await sendExpoPushNotifications(tokens, {
      title: draftEvent.title,
      body: `${establishmentFinded.name} vient de publier un nouvel évènement 🎉`,
      data: {
        url: deepLink, // ← utilisé par l’app pour naviguer
        webUrl: webFallbackLink, // ← optionnel fallback web
        eventId: draftEvent._id.toString(),
      },
      imageUrl: draftEvent.image?.[0], // (optionnel) image de la notif
    });

    console.log(
      `Push envoyés: ${sent} | Tokens invalides: ${invalidTokens.length}`
    );
    return res.status(201).json({
      message: "Event created successfully from draft",
      event: draftEvent,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({
      message: "Failed to create event",
      error: error instanceof Error ? error.message : error,
    });
  }
};

const createDraftEvent = async (req: Request, res: Response) => {
  try {
    const establishmentId = req.params.establishmentId;
    const establishmentFinded = await Establishment.findById(establishmentId);

    if (!establishmentFinded) {
      return res.status(404).json({ message: "Establishment not found" });
    }

    // 🔍 Gestion sécurisée des fichiers envoyés
    const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
    const allFiles: Express.Multer.File[] = Object.values(filesObject).flat();

    // 🖼️ Vérifie la présence d'au moins une image
    if (allFiles.length === 0) {
      return res.status(400).json({
        message: "Aucune image n'a été envoyée. Veuillez ajouter une image.",
      });
    }
    const sanitizeFolderName = (name: string) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

    const folderName = sanitizeFolderName(establishmentFinded.name);

    // 📤 Upload des fichiers sur Cloudinary dans le dossier spécifique à l'établissement
    const uploadedImageUrls: string[] = [];
    for (const file of allFiles) {
      const result = await cloudinary.v2.uploader.upload(file.path, {
        folder: `establishments/${folderName}`,
      });
      uploadedImageUrls.push(result.secure_url);
    }

    // 📍 Localisation : fallback sur les coordonnées de l'établissement
    const longitude = establishmentFinded.location?.lng || 0;
    const latitude = establishmentFinded.location?.lat || 0;

    // 🎨 Normalisation du champ theme (vide pour un draft)
    const normalizedTheme: string[] = Array.isArray(req.body.theme)
      ? req.body.theme
      : typeof req.body.theme === "string"
        ? [req.body.theme]
        : [];

    // 📝 Création du brouillon
    const newEvent = new Event({
      image: uploadedImageUrls,
      theme: normalizedTheme, // peut rester vide dans le draft
      location: {
        lat: latitude,
        lng: longitude,
        geo: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
      },
      organizer: {
        establishment: establishmentFinded._id,
        legalName: establishmentFinded.name,
        email: establishmentFinded.email,
        phone: establishmentFinded.phone,
      },
      registrationOpen: false,
      isDraft: true,
    });

    await newEvent.save();

    // 🔗 Ajoute l'event au modèle Establishment
    establishmentFinded.events.push(newEvent._id);
    await establishmentFinded.save();

    return res.status(201).json({
      message: "Draft created successfully",
      event: newEvent,
    });
  } catch (error) {
    console.error("Error creating draft event:", error);
    return res.status(500).json({
      message: "Failed to create draft",
      error: error instanceof Error ? error.message : error,
    });
  }
};

// Fonction pour lire un événement spécifique
const readEvent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const eventId = req.params.eventId;
    const { source } = req.body;

    const event = await Event.findById(eventId).populate({
      path: "registrations",
      model: "Registration",
      populate: "customer",
    });
    if (!event) {
      return res.status(404).json({ message: "Not found" });
    }

    // Ajouter un clic
    const clic = {
      source: source,
      date: new Date(),
    };
    event.clics.push(clic);
    await event.save(); // Sauvegarde de l'événement mis à jour

    return res.status(200).json({ message: event });
  } catch (error) {
    return res.status(500).json({ error: error });
  }
};

// Fonction pour lire tous les événements
const readAll = async (req: Request, res: Response, next: NextFunction) => {
  return Event.find()
    .then((events: any) => res.status(200).json({ message: events }))
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

// const getEventsByPosition = async (req: Request, res: Response) => {
//   try {
//     const { latitude, longitude, radius } = req.body;

//     // Vérifier si les coordonnées sont fournies
//     if (!latitude || !longitude) {
//       return res.status(400).json({
//         message: "La latitude et la longitude sont requises.",
//       });
//     }

//     const lat = parseFloat(latitude as string);
//     const lon = parseFloat(longitude as string);
//     const searchRadius = parseFloat(radius) || 10; // Rayon en kilomètres (par défaut : 10 km)

//     // Vérification des coordonnées
//     if (
//       isNaN(lat) ||
//       isNaN(lon) ||
//       lat < -90 ||
//       lat > 90 ||
//       lon < -180 ||
//       lon > 180
//     ) {
//       return res.status(400).json({
//         message: "Les coordonnées fournies doivent être valides.",
//       });
//     }

//     // Utiliser l'agrégation `$geoNear` pour rechercher les événements
//     const events = await Event.aggregate([
//       {
//         $geoNear: {
//           near: { type: "Point", coordinates: [lon, lat] }, // [longitude, latitude]
//           distanceField: "distance",
//           maxDistance: searchRadius * 1000, // Convertir le rayon en mètres
//           spherical: true,
//           key: "location.geo", // Utilise le champ géospatial
//         },
//       },
//       {
//         $sort: { distance: 1 }, // Tri par distance croissante
//       },
//       {
//         $project: {
//           title: 1,
//           startingDate: 1,
//           endingDate: 1,
//           location: 1,
//           distance: 1,
//           price: 1,
//           theme: 1,
//         },
//       },
//     ]);

//     if (!events || events.length === 0) {
//       return res.status(404).json({
//         message: "Aucun événement trouvé autour de cette position.",
//       });
//     }

//     // Séparer les événements par catégories : passés, actuels et futurs
//     const currentDate = new Date();

//     const pastEvents = events.filter(
//       (event) => new Date(event.endingDate) < currentDate
//     );
//     const currentEvents = events.filter(
//       (event) =>
//         new Date(event.startingDate) <= currentDate &&
//         new Date(event.endingDate) >= currentDate
//     );
//     const upcomingEvents = events.filter(
//       (event) => new Date(event.startingDate) > currentDate
//     );

//     // Renvoyer les événements catégorisés
//     return res.status(200).json({
//       pastEvents,
//       currentEvents,
//       upcomingEvents,
//     });
//   } catch (error) {
//     console.error("Erreur lors de la récupération des événements :", error);
//     return res.status(500).json({
//       message: "Erreur interne du serveur.",
//       error: error,
//     });
//   }
// };

const getEventsByPosition = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, radius } = req.body;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const maxDistance = parseFloat(radius) * 1000 || 50000; // Par défaut 50 km

    if (!latitude || !longitude) {
      return res
        .status(400)
        .json({ message: "La latitude et la longitude sont requises." });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon)) {
      return res
        .status(400)
        .json({ message: "Les coordonnées fournies ne sont pas valides." });
    }

    const currentDate = new Date();

    // Fonction pour récupérer les événements uniques par titre
    const fetchUniqueEventsWithCount = async (matchCondition: any) => {
      const total = await Event.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lon, lat] },
            distanceField: "distance",
            maxDistance: maxDistance,
            spherical: true,
          },
        },
        { $match: matchCondition },
        {
          $group: {
            _id: "$title",
            event: { $first: "$$ROOT" },
          },
        },
        { $count: "total" },
      ]);

      const events = await Event.aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [lon, lat] },
            distanceField: "distance",
            maxDistance: maxDistance,
            spherical: true,
          },
        },
        { $match: matchCondition },
        {
          $group: {
            _id: "$title",
            event: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$event" } },
        { $sort: { distance: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
      ]).allowDiskUse(true);

      return {
        total: total[0]?.total || 0,
        events,
      };
    };

    const [pastData, currentData, upcomingData] = await Promise.all([
      fetchUniqueEventsWithCount({
        endingDate: { $lt: currentDate },
        isDraft: false,
      }),
      fetchUniqueEventsWithCount({
        startingDate: { $lte: currentDate },
        endingDate: { $gte: currentDate },
        isDraft: false,
      }),
      fetchUniqueEventsWithCount({
        startingDate: { $gt: currentDate },
        isDraft: false,
      }),
    ]);

    return res.status(200).json({
      metadata: {
        pastTotal: pastData.total,
        currentTotal: currentData.total,
        upcomingTotal: upcomingData.total,
        currentPage: page,
        pageSize: limit,
      },
      pastEvents: pastData.events,
      currentEvents: currentData.events,
      upcomingEvents: upcomingData.events,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des événements :", error);
    return res
      .status(500)
      .json({ message: "Erreur interne du serveur.", error: error });
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
    event.price = req.body.price || event.price;
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

    if (typeof req.body.isDraft === "boolean") {
      event.isDraft = req.body.isDraft;
    }

    if (typeof req.body.registrationOpen === "boolean") {
      event.registrationOpen = req.body.registrationOpen;
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

/**
 * Vérifie les URL d'image pour tous les événements dans la base de données.
 */

const verifAllEvent = async (req: Request, res: Response) => {
  try {
    const events = await Event.find();

    const invalidEvents: Array<{ eventId: string; invalidUrls: string[] }> = [];
    const validEvents: Array<{ eventId: string; validUrls: string[] }> = [];
    const defaultImageEvents: Array<{ eventId: string }> = [];

    let remainingEvents = events.length;

    for (const event of events) {
      const invalidUrls: string[] = [];
      const validUrls: string[] = [];
      let hasDefaultImage = false;
      let imagesUpdated = false;

      const updatedImages: string[] = [];
      for (const imgUrl of event.image || []) {
        const validationResult = await validateImageUrl(imgUrl);

        if (validationResult === "Image par défaut") {
          hasDefaultImage = true;
          imagesUpdated = true;
          updatedImages.push("Image par défaut");
        } else if (validationResult === imgUrl) {
          validUrls.push(imgUrl);
          updatedImages.push(imgUrl);
        } else {
          invalidUrls.push(imgUrl);
          imagesUpdated = true;
          updatedImages.push("Image par défaut");
        }
      }

      if (imagesUpdated) {
        event.image = updatedImages;
        await event.save();
      }

      if (invalidUrls.length > 0) {
        invalidEvents.push({
          eventId: event._id.toString(),
          invalidUrls,
        });
      } else if (hasDefaultImage) {
        defaultImageEvents.push({
          eventId: event._id.toString(),
        });
      } else {
        validEvents.push({
          eventId: event._id.toString(),
          validUrls,
        });
      }

      remainingEvents--;
      console.log(`Événements restants à traiter : ${remainingEvents}`);
    }

    console.warn("Événements avec des URL invalides :", invalidEvents);
    console.info("Événements avec uniquement des URL valides :", validEvents);
    console.info("Événements avec 'Image par défaut' :", defaultImageEvents);

    return res.status(200).json({
      message: "Vérification terminée.",
      totalEvents: events.length,
      invalidEventsCount: invalidEvents.length,
      validEventsCount: validEvents.length,
      defaultImageEventsCount: defaultImageEvents.length,
      invalidEvents,
      validEvents,
      defaultImageEvents,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la vérification des URL des événements :",
      error
    );
    return res.status(500).json({
      message: "Erreur lors de la vérification des URL des événements.",
      error,
    });
  }
};

const updateImageUrls = async (req: Request, res: Response) => {
  try {
    console.log("Début de la mise à jour des URLs des images...");

    // Étape 1 : Récupérer les événements avec des images contenant http://
    const events = await Event.find({ "image.0": { $regex: "^http://" } });
    console.log(`Nombre d'événements trouvés : ${events.length}`);

    if (!events.length) {
      console.log("Aucun événement à mettre à jour.");
      return res.status(200).json({
        message: "Aucun événement à mettre à jour",
        modifiedCount: 0,
      });
    }

    let modifiedCount = 0;

    // Étape 2 : Parcourir les événements et mettre à jour les URLs
    for (const event of events) {
      console.log(`Traitement de l'événement ID : ${event._id}`);
      console.log("URLs avant mise à jour :", event.image);

      // Mise à jour des URLs dans le tableau `image`
      event.image = event.image.map((url: string) => {
        if (url.startsWith("http://")) {
          const updatedUrl = url.replace("http://", "https://");
          console.log(`URL mise à jour : ${url} -> ${updatedUrl}`);
          return updatedUrl;
        }
        return url;
      });

      // Sauvegarde de l'événement mis à jour
      await event.save();
      console.log(`Événement ID : ${event._id} sauvegardé avec succès.`);
      modifiedCount++;
    }

    // Étape 3 : Retourner le résultat final
    console.log(
      `Mise à jour terminée. Nombre total d'événements modifiés : ${modifiedCount}`
    );
    return res.status(200).json({
      message: "Mise à jour des URLs des images réussie",
      modifiedCount,
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour des URLs des images :", error);
    return res.status(500).json({
      message: "Erreur lors de la mise à jour des URLs des images",
      error,
    });
  }
};

const DEFAULT_IMAGE = "Image par défaut";

const normalizeString = (str: string): string => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever les accents
    .replace(/[’']/g, "") // Enlever les apostrophes
    .replace(/\s+/g, " ") // Supprimer les espaces multiples
    .trim()
    .toLowerCase();
};

const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

// const updateEventCoordinates = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const basePath = path.join(__dirname, "..", "..", "events", "objects");

//     const updatedEvents = [];
//     const createdEvents = [];
//     const unmatchedFiles = [];

//     for (const file of AllEvents) {
//       try {
//         const filePath = path.join(basePath, file.file);
//         const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

//         const jsonTitle = normalizeString(
//           fileData["rdfs:label"]?.fr?.[0] || ""
//         );

//         const escapedTitle = escapeRegExp(jsonTitle);

//         let dbEvent = await Event.findOne({
//           title: { $regex: new RegExp(`^${escapedTitle}$`, "i") },
//         });

//         // Récupération des coordonnées géographiques
//         const geoData = fileData["isLocatedAt"]?.[0]?.["schema:geo"];
//         const newLat = geoData ? parseFloat(geoData["schema:latitude"]) : null;
//         const newLng = geoData ? parseFloat(geoData["schema:longitude"]) : null;

//         if (!newLat || !newLng || isNaN(newLat) || isNaN(newLng)) {
//           unmatchedFiles.push(file.file);
//           console.warn(`Coordonnées invalides ou absentes pour : ${file.file}`);
//           continue;
//         }

//         // Récupération de l'adresse
//         const addressData =
//           fileData["isLocatedAt"]?.[0]?.["schema:address"]?.[0];
//         const address =
//           [
//             addressData?.["schema:streetAddress"]?.[0],
//             addressData?.["schema:addressLocality"],
//             addressData?.["schema:postalCode"],
//           ]
//             .filter(Boolean)
//             .join(", ") || "Adresse inconnue";

//         if (!dbEvent) {
//           // Création d'un nouvel événement
//           const startingDate = fileData["schema:startDate"]?.[0] || null;
//           const endingDate = fileData["schema:endDate"]?.[0] || null;
//           const startTime =
//             fileData["takesPlaceAt"]?.[0]?.["startTime"] || "00:00:00";
//           const endTime =
//             fileData["takesPlaceAt"]?.[0]?.["endTime"] || "23:59:59";

//           // Concaténation de la date et de l'heure pour un format correct
//           const fullStartingDate = startingDate
//             ? `${startingDate}T${startTime}`
//             : null;
//           const fullEndingDate = endingDate ? `${endingDate}T${endTime}` : null;

//           const images =
//             fileData["hasMainRepresentation"]?.[0]?.[
//               "ebucore:hasRelatedResource"
//             ]?.map((resource: any) => resource["ebucore:locator"]) || [];

//           // Normalisation des URL d'images pour forcer le HTTPS
//           const httpsImages = images
//             .flat()
//             .map((url: string) =>
//               url.startsWith("http://")
//                 ? url.replace("http://", "https://")
//                 : url
//             );

//           dbEvent = new Event({
//             title: jsonTitle,
//             startingDate: fullStartingDate,
//             endingDate: fullEndingDate,
//             address,
//             location: { lat: newLat, lng: newLng },
//             price:
//               fileData["offers"]?.[0]?.["schema:priceSpecification"]?.[0]?.[
//                 "schema:minPrice"
//               ]?.[0] || 0,
//             priceSpecification: {
//               priceCurrency:
//                 fileData["offers"]?.[0]?.["schema:priceSpecification"]?.[0]?.[
//                   "schema:priceCurrency"
//                 ] || "EUR",
//             },
//             description:
//               fileData["rdfs:comment"]?.fr?.[0] || "Description indisponible",
//             theme: fileData["@type"] || [],
//             image: httpsImages.length > 0 ? httpsImages : [DEFAULT_IMAGE], // Ajout de l'image par défaut si aucune image
//             organizer: {
//               legalName:
//                 fileData["hasBeenCreatedBy"]?.["schema:legalName"] ||
//                 "Organisateur inconnu",
//               email:
//                 fileData["hasContact"]?.[0]?.["schema:email"]?.[0] ||
//                 "contact@unknown.com",
//               phone:
//                 fileData["hasContact"]?.[0]?.["schema:telephone"]?.[0] ||
//                 "0000000000",
//             },
//             color: "#000000",
//           });

//           await dbEvent.save();
//           createdEvents.push({ id: dbEvent._id, title: dbEvent.title });
//           console.info(`Nouvel événement créé : ${dbEvent.title}`);
//         } else {
//           // Mise à jour des coordonnées pour un événement existant
//           dbEvent.location = { lat: newLat, lng: newLng };
//           await dbEvent.save();
//           updatedEvents.push({ id: dbEvent._id, title: dbEvent.title });
//           console.info(`Coordonnées mises à jour pour : ${dbEvent.title}`);
//         }
//       } catch (error) {
//         unmatchedFiles.push(file.file);
//         console.error(
//           `Erreur lors du traitement du fichier : ${file.file}`,
//           error
//         );
//       }
//     }

//     return res.status(200).json({
//       message: "Mise à jour des coordonnées terminée.",
//       updatedEvents,
//       createdEvents,
//       unmatchedFiles,
//     });
//   } catch (error) {
//     console.error("Erreur lors de la mise à jour des coordonnées :", error);
//     return res.status(500).json({
//       message: "Erreur lors de la mise à jour des coordonnées.",
//       error,
//     });
//   }
// };

const BATCH_SIZE = 1000; // Taille d'un lot
const PROGRESS_FILE = "./progress.json"; // Fichier pour suivre l'état du traitement

// Fonction pour sauvegarder la progression
const saveProgress = (page: number) => {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ page }), "utf-8");
};

// Fonction pour charger la progression
const loadProgress = (): number => {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = fs.readFileSync(PROGRESS_FILE, "utf-8");
    const { page } = JSON.parse(data);
    return page || 0;
  }
  return 0;
};
// Fonction pour comparer les coordonnées avec une tolérance
const areCoordinatesEqual = (
  oldLat: number,
  oldLng: number,
  newLat: number,
  newLng: number
): boolean => {
  const precision = 1e-6; // Tolérance pour les différences mineures
  return (
    Math.abs(oldLat - newLat) < precision &&
    Math.abs(oldLng - newLng) < precision
  );
};
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Fonction pour calculer la distance avec la formule de Haversine

const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Rayon de la Terre en km

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const BATCH_DELAY_MS = 500; // Délai entre chaque appel en millisecondes
// Fonction pour nettoyer l'adresse
const cleanAddress = (address: string): string => {
  // Liste des mots-clés inutiles (lieux non pertinents)
  const irrelevantKeywords =
    /(salle|gymnase|centre|bibliothèque|stade|parc|maison|terrain|foyer|hôtel|église|aréna|théâtre|complexe|jardin|espace)\b.*?(,|$)/gi;

  // Supprimer les segments inutiles
  let cleanedAddress = address.replace(irrelevantKeywords, "").trim();

  // Vérifier si un code postal est présent
  const postalCodeRegex = /\b\d{5}\b/;
  const containsPostalCode = postalCodeRegex.test(cleanedAddress);

  if (!containsPostalCode) {
    console.warn(`[LOG] Adresse nettoyée invalide : ${cleanedAddress}`);
    return ""; // Retourner une chaîne vide si le code postal est absent
  }

  // Extraire les informations utiles : rue, code postal, ville
  const voieTypes =
    "(rue|avenue|boulevard|place|impasse|route|chemin|allée|cours|quai|voie|square|pont|faubourg|hameau)";
  const regex = new RegExp(
    `(?:.*?,\\s*)?(\\d{0,5}\\s*\\w+(\\s${voieTypes})?)?,?\\s*(\\d{5}),?\\s*([\\w\\s\\-]+)$`,
    "i"
  );

  const match = cleanedAddress.match(regex);

  if (match) {
    const street = match[1]?.trim() || ""; // Rue ou voie (optionnel)
    const postalCode = match[3]; // Code postal
    const city = match[4]?.trim(); // Ville
    return street
      ? `${street}, ${postalCode}, ${city}`
      : `${postalCode}, ${city}`;
  }

  // Si rien n'est extrait, retourne l'adresse nettoyée
  return cleanedAddress;
};

const processBatch = async (
  events: any[],
  updatedEvents: any[],
  unmatchedEvents: any[]
) => {
  for (const event of events) {
    try {
      let fullAddress = event.address?.trim();

      // Nettoyer l'adresse initiale
      fullAddress = cleanAddress(fullAddress);

      if (!fullAddress) {
        unmatchedEvents.push({
          id: event._id,
          title: event.title,
          reason: "Adresse manquante ou invalide",
        });
        console.warn(`[LOG] Adresse invalide pour : ${event.title}`);
        continue;
      }

      const originalAddress = fullAddress;

      // Pause pour éviter de surcharger l'API
      await delay(BATCH_DELAY_MS);

      // Appel à l'API Adresse
      const response = await axios.get(
        "https://api-adresse.data.gouv.fr/search/",
        { params: { q: fullAddress, limit: 5 }, timeout: 10000 }
      );

      const features = response.data.features;

      if (!features || features.length === 0) {
        unmatchedEvents.push({
          id: event._id,
          title: event.title,
          reason: "Aucune coordonnée trouvée",
        });
        console.warn(`[LOG] Aucun résultat pour : ${event.title}`);
        continue;
      }

      // Vérifier si une correspondance exacte existe
      const exactMatch = features.find((feature: any) => {
        const featureLabel = feature.properties.label?.toLowerCase();
        return featureLabel?.includes(originalAddress.toLowerCase());
      });

      let bestMatch = exactMatch || features[0];

      if (!exactMatch) {
        console.warn(
          `[LOG] Pas de correspondance exacte pour : ${event.title} (${originalAddress})`
        );

        // Si aucune correspondance exacte, nettoyer davantage l'adresse
        fullAddress = cleanAddress(fullAddress);
        console.log(`[LOG] Tentative avec adresse nettoyée : ${fullAddress}`);

        // Refaire une tentative avec l'adresse nettoyée
        const retryResponse = await axios.get(
          "https://api-adresse.data.gouv.fr/search/",
          { params: { q: fullAddress, limit: 5 }, timeout: 10000 }
        );

        const retryFeatures = retryResponse.data.features;
        if (retryFeatures && retryFeatures.length > 0) {
          bestMatch = retryFeatures[0];
        } else {
          unmatchedEvents.push({
            id: event._id,
            title: event.title,
            reason: "Aucune coordonnée trouvée après tentative",
          });
          console.warn(
            `[LOG] Aucun résultat après tentative pour : ${event.title}`
          );
          continue;
        }
      }

      // Extraire les coordonnées
      const [lng, lat] = bestMatch.geometry.coordinates;

      const oldLocation = event.location || { lat: 0, lng: 0 };
      const newLocation = { lat, lng };

      const hasChanged = oldLocation.lat !== lat || oldLocation.lng !== lng;
      const distanceFromOld = haversineDistance(
        oldLocation.lat,
        oldLocation.lng,
        lat,
        lng
      );

      if (hasChanged) {
        event.location = newLocation;
        await event.save();

        const logColor = distanceFromOld > 100 ? chalk.blue : chalk.green;

        console.log(
          logColor(
            `[LOG] Coordonnées modifiées pour : ${event.title} (${oldLocation.lat}, ${oldLocation.lng}) -> (${lat}, ${lng}) | Écart : ${distanceFromOld.toFixed(2)} km`
          )
        );

        updatedEvents.push({
          id: event._id,
          title: event.title,
          newLocation,
        });
      } else {
        console.log(
          chalk.yellow(
            `[LOG] Coordonnées identiques pour : ${event.title} (${oldLocation.lat}, ${oldLocation.lng}) -> (${lat}, ${lng})`
          )
        );
      }
    } catch (error) {
      console.error(
        chalk.red(`[LOG] Erreur API pour : ${event.title} - ${error}`)
      );
      unmatchedEvents.push({
        id: event._id,
        title: event.title,
        reason: "Erreur API",
      });
    }
  }
};

const getCoordinatesFromAPI = async (req: Request, res: Response) => {
  try {
    let page = loadProgress(); // Charger le dernier lot traité
    console.log(`[LOG] Reprise du traitement à partir du lot ${page + 1}...`);

    const updatedEvents: any[] = [];
    const unmatchedEvents: any[] = [];
    const totalEvents = await Event.countDocuments();
    console.log(`[LOG] Nombre total d'événements à traiter : ${totalEvents}`);

    while (page * BATCH_SIZE < totalEvents) {
      console.log(`[LOG] Traitement du lot ${page + 1}...`);

      const events = await Event.find()
        .skip(page * BATCH_SIZE)
        .limit(BATCH_SIZE);

      await processBatch(events, updatedEvents, unmatchedEvents);

      page++;
      saveProgress(page); // Sauvegarder l'état après chaque lot
    }

    return res.status(200).json({
      message: "Mise à jour des coordonnées terminée.",
      updatedEventsCount: updatedEvents.length,
      unmatchedEventsCount: unmatchedEvents.length,
    });
  } catch (error) {
    console.error("[LOG] Erreur générale :", error);
    return res.status(500).json({
      message: "Erreur lors de la mise à jour des coordonnées.",
      error: error,
    });
  }
};

// POUR REGISTRATIOTOANEVENT
const toInt = (v: any): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeDayRange = (input: Date) => {
  const dayStart = new Date(input);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(input);
  dayEnd.setHours(23, 59, 59, 999);
  return { dayStart, dayEnd };
};
const registrationToAnEvent = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();

  try {
    const { eventId } = req.params as { eventId: string };
    const {
      admin: customerId, // id du Customer (comme dans ton code)
      date,
      paymentMethod,
      price,
      quantity,
    } = req.body as {
      admin: string;
      date: string;
      paymentMethod?: string;
      price?: number;
      quantity?: number;
    };
    // ---- validations de base
    if (!eventId) return res.status(400).json({ message: "eventId manquant" });

    if (!customerId)
      return res.status(400).json({ message: "Utilisateur manquant" });
    if (!date)
      return res
        .status(400)
        .json({ message: "La date de réservation est requise" });

    const selected = new Date(date);
    if (isNaN(selected.getTime())) {
      return res.status(400).json({ message: "Date de réservation invalide" });
    }
    // -> journée passée si 23:59:59.999 de ce jour est < maintenant
    const now = new Date();
    const selectedEnd = new Date(selected);
    selectedEnd.setHours(23, 59, 59, 999);

    if (selectedEnd < now) {
      return res.status(400).json({ message: "date déjà passée" });
    }
    const qty = toInt(quantity) ?? 1;
    if (qty <= 0) {
      return res.status(400).json({ message: "La quantité doit être ≥ 1" });
    }

    // ---- transaction pour éviter les races conditions
    let resultPayload: any = null;

    await session.withTransaction(async () => {
      // Recharges sous session
      const eventFinded = await Event.findById(eventId).session(session);
      const establishmentFinded = await Establishment.findOne({
        events: eventId,
      }).session(session);

      if (!eventFinded) {
        throw { status: 404, message: "Événement introuvable" };
      }

      if (!establishmentFinded) {
        throw { status: 404, message: "Etablissement introuvable" };
      }

      if (eventFinded.registrationOpen === false) {
        throw { status: 400, message: "Inscription fermée" };
      }

      const customerFinded =
        await Customer.findById(customerId).session(session);
      if (!customerFinded) {
        throw { status: 404, message: "Utilisateur introuvable" };
      }

      // (optionnel) vérifier que la date choisie est dans la plage de l'event
      // Si tu as eventFinded.startingDate / eventFinded.endingDate :
      if (eventFinded.startingDate) {
        const start = new Date(eventFinded.startingDate);
        if (selected < start)
          throw {
            status: 400,
            message: "Date hors plage (avant début de l'événement)",
          };
      }
      if (eventFinded.endingDate) {
        const end = new Date(eventFinded.endingDate);
        if (selected > end)
          throw {
            status: 400,
            message: "Date hors plage (après fin de l'événement)",
          };
      }

      // ---- capacité PAR JOUR (on ne décrémente plus l'event)
      const capacityPerDay = toInt(eventFinded.capacity) ?? 0;
      if (capacityPerDay <= 0) {
        throw { status: 400, message: "Capacité non configurée ou nulle" };
      }

      // ---- comptage des réservations validées pour CE jour
      const { dayStart, dayEnd } = normalizeDayRange(selected);
      const ALLOWED = ["paid", "confirmed"];

      const regsSameDay = await Registration.find({
        event: eventFinded._id,
        status: { $in: ALLOWED },
        date: { $gte: dayStart, $lte: dayEnd },
      })
        .select("quantity")
        .session(session);

      const reservedForDay = regsSameDay.reduce(
        (sum, r) => sum + (toInt(r.quantity) ?? 1),
        0
      );
      const remaining = capacityPerDay - reservedForDay;

      if (qty > remaining) {
        throw {
          status: 400,
          message: "Plus de places disponibles pour cette date",
          remaining: Math.max(0, remaining),
        };
      }

      // ---- création inscription
      const unitPrice = toInt(price) ?? 0;
      const ticketNumber = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newRegistration = new Registration({
        date: selected, // ✅ la date réservée (jour)
        customer: customerFinded._id,
        event: eventFinded._id,
        price: unitPrice,
        status: unitPrice > 0 ? "pending" : "confirmed", // règle: paid/confirmed uniquement comptés
        paymentMethod: paymentMethod ?? (unitPrice > 0 ? "unknown" : "free"),
        quantity: qty,
        ticketNumber,
      });

      // ---- facture si payant
      let newBill: any = null;
      if (unitPrice > 0) {
        const invoiceNumber = `INV-${Date.now()}-${Date.now()}`;
        newBill = new Bill({
          customer: customerFinded._id,
          registration: newRegistration._id,
          amount: unitPrice * newRegistration.quantity,
          status: "pending",
          paymentMethod: paymentMethod ?? "unknown",
          invoiceNumber,
          issuedDate: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          items: [
            {
              description: `Inscription à l'événement ${eventFinded.title} (${selected.toLocaleDateString(
                "fr-FR"
              )})`,
              quantity: newRegistration.quantity,
              price: unitPrice,
            },
          ],
        });

        await newBill.save({ session });
        await Establishment.updateOne(
          { _id: establishmentFinded._id },
          { $inc: { amountAvailable: newBill.amount } },
          { session }
        );
      }

      // ---- gratuit: on confirme + email tout de suite
      if (unitPrice <= 0) {
        // statut déjà "confirmed"
        customerFinded.eventsReserved ??= [];
        customerFinded.eventsReserved.push(eventFinded._id);

        const eventDateFormatted = selected.toLocaleString("fr-FR");
        const invoiceUrl = `https://localappy.fr/api/invoice/${newRegistration._id}`;
        const eventLink = `https://localappy.fr/events/${eventFinded._id}`;

        // NB: si besoin, envoie l'email après commit (outbox pattern)
        await sendEventConfirmationEmail({
          to: customerFinded.email,
          firstName: customerFinded.account.firstname,
          eventTitle: eventFinded.title,
          eventDate: eventDateFormatted,
          eventAddress: eventFinded.address,
          quantity: newRegistration.quantity,
          eventLink,
          invoiceUrl,
        });

        await customerFinded.save({ session });
      }

      await newRegistration.save({ session });
      eventFinded.registrations.push(newRegistration._id as Types.ObjectId);
      customerFinded.bills.push(newBill._id as Types.ObjectId);

      await eventFinded.save();
      await customerFinded.save();

      resultPayload = {
        message: "Inscription créée avec succès",
        registrationId: newRegistration._id,
        billId: newBill ? newBill._id : null,
        remainingForDay: remaining - qty,
      };
    });
    return res.status(201).json(resultPayload);
  } catch (error: any) {
    const status = error?.status ?? 500;
    if (status !== 500) {
      // erreurs contrôlées
      return res.status(status).json({
        message: error?.message ?? "Erreur de validation",
        ...(error?.remaining != null ? { remaining: error.remaining } : {}),
      });
    }

    Retour.error({ message: "Erreur lors de l'inscription", error });
    return res
      .status(500)
      .json({ message: "Erreur lors de l'inscription", error });
  } finally {
    session.endSession();
  }
};

const isSameLocalDayParis = (a: Date, b: Date) => {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    // yyyy-mm-dd
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const da = fmt.format(a);
  const db = fmt.format(b);
  return da === db;
};

const scanATicketForAnEvent = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(404).json({ message: "url invalide" });
    }

    const bytes = CryptoJS.AES.decrypt(url, process.env.SALT_SCAN);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    let registrationId: string;
    let requesterId: string | undefined;

    try {
      const parsed = JSON.parse(originalText); // on parse le JSON
      registrationId = parsed.registrationId;
      requesterId = parsed.requesterId;
    } catch (e) {
      return res.status(400).json({ message: "Format du QR invalide." });
    }

    if (!mongoose.isValidObjectId(registrationId)) {
      return res.status(400).json({ message: "registrationId invalide." });
    }
    if (requesterId && !mongoose.isValidObjectId(requesterId)) {
      return res.status(400).json({ message: "requesterId invalide." });
    }

    // Qui scanne ? token prioritaire sinon requesterId
    if (!requesterId) {
      return res
        .status(400)
        .json({ message: "Aucun scanneur (byWho) fourni." });
    }

    // 2) Charger registration (source de vérité pour l’event)
    const reg = await Registration.findById(registrationId).select(
      "_id event status checkInStatus"
    );
    if (!reg)
      return res
        .status(404)
        .json({ message: "Billet/registration introuvable." });

    const now = new Date();
    const regDate: Date | undefined = (reg as any)?.date;

    if (!regDate) {
      return res
        .status(400)
        .json({ message: "Date de la réservation absente." });
    }
    if (!isSameLocalDayParis(new Date(regDate), now)) {
      return res.status(400).json({
        message: "Billet non valable pour aujourd'hui.",
      });
    }

    const checkInStatus = (reg as any)?.checkInStatus;
    if (typeof checkInStatus === "string" && checkInStatus !== "pending") {
      return res
        .status(400)
        .json({ message: "Billet non valide — entrée refusée." });
    }
    if (reg.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Billet annulé — entrée refusée." });
    }

    // 3) Charger l'événement & établissement organisateur
    const event = await Event.findById(reg.event).select(
      "_id registrations organizer.establishment"
    );
    if (!event)
      return res.status(404).json({ message: "Événement introuvable." });

    const eventEstabId = (event as any)?.organizer?.establishment?.toString();
    if (!eventEstabId) {
      return res
        .status(400)
        .json({ message: "Aucun établissement rattaché à cet événement." });
    }

    // 4) Vérifier le rôle/autorisation & déterminer byWhoModel
    let byWhoModel: "Customer" | "Owner" = "Customer";
    let authorized = false;

    // Chercher si byWho est Owner ou Customer
    const [ownerDoc, customerDoc] = await Promise.all([
      Owner.findById(requesterId).select("_id establishments establishment"),
      Customer.findById(requesterId).select(
        "_id establishmentStaffOf establishment establishments"
      ),
    ]);

    if (ownerDoc) {
      byWhoModel = "Owner";
      const raw =
        (ownerDoc as any).establishments ??
        (ownerDoc as any).establishment ??
        [];
      const ownerEstabIds = Array.isArray(raw)
        ? raw.map((id: any) => id?.toString())
        : [raw?.toString()];
      if (ownerEstabIds.filter(Boolean).includes(eventEstabId))
        authorized = true;
    }

    if (!authorized && customerDoc) {
      byWhoModel = "Customer";
      const raw =
        (customerDoc as any).establishmentStaffOf ??
        (customerDoc as any).establishments ??
        (customerDoc as any).establishment ??
        [];
      const staffOfIds = Array.isArray(raw)
        ? raw.map((id: any) => id?.toString())
        : [raw?.toString()];
      if (staffOfIds.filter(Boolean).includes(eventEstabId)) authorized = true;
    }

    if (!authorized) {
      return res.status(403).json({
        message:
          "Non autorisé : le scanneur n’est ni propriétaire ni staff de cet établissement.",
      });
    }

    // 5) Ajout idempotent (pas de double scan)
    const updated = await Event.findOneAndUpdate(
      {
        _id: event._id,
        registrations: reg._id,
        "entries.registration": { $ne: reg._id },
      },
      {
        $push: {
          entries: {
            checkedInAt: new Date(),
            registration: reg._id,
            byWho: requesterId,
            byWhoModel, // <-- clé importante pour refPath
          },
        },
      },
      { new: true }
    ).select("_id entries");

    if (!updated) {
      const already = await Event.exists({
        _id: event._id,
        "entries.registration": reg._id,
      });
      if (already) {
        return res.status(200).json({
          ok: false,
          alreadyScanned: true,
          message: "Billet déjà scanné (check-in déjà enregistré).",
        });
      }
      return res.status(404).json({
        message:
          "Incohérence : l'événement ne référence pas cette registration.",
      });
    }

    // (optionnel) marquer la registration
    // await Registration.updateOne({ _id: reg._id }, { $set: { checkedInAt: new Date(), checkInStatus: "done" } });

    return res.json({
      ok: true,
      message: "Entrée enregistrée.",
      entriesCount: updated.entries.length,
      lastEntry: updated.entries[updated.entries.length - 1],
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Erreur interne." });
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

const deleteDuplicateEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.info(
      "Début de la suppression des événements en double avec fusion des images."
    );

    // Étape 1 : Récupérer tous les événements
    const events = await Event.find({});
    if (!events.length) {
      console.info("Aucun événement trouvé dans la base de données.");
      return res.status(200).json({ message: "Aucun événement à vérifier." });
    }

    console.info(`Nombre total d'événements récupérés : ${events.length}`);

    // Étape 2 : Normaliser et grouper les événements
    const normalizedEvents = events.map((event) => ({
      id: event._id,
      title: event.title,
      normalizedTitle: normalizeString(event.title),
      startingDate: event.startingDate?.toISOString(),
      endingDate: event.endingDate?.toISOString(),
      image: event.image || [],
    }));

    const groupedEvents: { [key: string]: any[] } = {};
    normalizedEvents.forEach((event) => {
      const key = `${event.normalizedTitle}_${event.startingDate}_${event.endingDate}`;
      if (!groupedEvents[key]) {
        groupedEvents[key] = [];
      }
      groupedEvents[key].push(event);
    });

    // Étape 3 : Vérifier les groupes avec doublons
    const duplicates = Object.values(groupedEvents).filter(
      (events) => events.length > 1
    );

    console.info(
      `Nombre de groupes avec doublons trouvés : ${duplicates.length}`
    );

    if (!duplicates.length) {
      console.info("Aucun doublon détecté.");
      return res.status(200).json({ message: "Aucun doublon détecté." });
    }

    // Étape 4 : Supprimer les doublons (garder le premier par groupe et fusionner les images)
    let deletedCount = 0;
    for (const duplicateGroup of duplicates) {
      const [keepEvent, ...toDeleteEvents] = duplicateGroup;

      console.info(`Conservation de l'événement : Titre="${keepEvent.title}"`);

      for (const event of toDeleteEvents) {
        // Ajouter les images de l'événement à supprimer si nécessaire
        if (keepEvent.image.length === 0 && event.image.length > 0) {
          console.info(
            `Ajout des images de l'événement : Titre="${event.title}"`
          );
          await Event.updateOne(
            { _id: keepEvent.id },
            { $set: { image: event.image } }
          );
        }

        // Supprimer l'événement
        const deleteResult = await Event.deleteOne({ _id: event.id });
        if (deleteResult.deletedCount > 0) {
          console.info(`Événement supprimé : Titre="${event.title}"`);
          deletedCount++;
        } else {
          console.warn(
            `Échec de la suppression pour l'événement : Titre="${event.title}"`
          );
        }
      }
    }

    console.info(`Nombre total d'événements supprimés : ${deletedCount}`);

    return res.status(200).json({
      message:
        "Événements en double supprimés avec succès, images fusionnées si nécessaire.",
      deletedCount,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des doublons :", error);
    return res.status(500).json({
      message: "Erreur lors de la suppression des doublons.",
      error,
    });
  }
};

const removeMidnightDates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.info(
      "Début de la suppression des événements ayant des dates à minuit."
    );

    // Supprimer les événements où les heures de startingDate et endingDate sont à minuit
    const result = await Event.deleteMany({
      $and: [
        { startingDate: { $type: "date" } },
        { endingDate: { $type: "date" } },
        {
          $expr: {
            $and: [
              { $eq: [{ $hour: "$startingDate" }, 0] },
              { $eq: [{ $minute: "$startingDate" }, 0] },
              { $eq: [{ $second: "$startingDate" }, 0] },
              { $eq: [{ $hour: "$endingDate" }, 0] },
              { $eq: [{ $minute: "$endingDate" }, 0] },
              { $eq: [{ $second: "$endingDate" }, 0] },
            ],
          },
        },
      ],
    });

    console.info(`Nombre d'événements supprimés : ${result.deletedCount}`);

    return res.status(200).json({
      message: "Événements supprimés avec succès.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des événements :", error);
    return res.status(500).json({
      message: "Erreur lors de la suppression des événements.",
      error,
    });
  }
};

const removeExpiredEvents = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.info("Début de la suppression des événements expirés.");
    // Calculer la date d'aujourd'hui à minuit
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliser la date pour ignorer l'heure

    // Supprimer les événements où `endingDate` est inférieure à aujourd'hui
    const result = await Event.deleteMany({
      endingDate: { $lt: today },
    });

    console.info(`Nombre d'événements supprimés : ${result.deletedCount}`);

    return res.status(200).json({
      message: "Événements expirés supprimés avec succès.",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des événements :", error);
    return res.status(500).json({
      message: "Erreur lors de la suppression des événements expirés.",
      error,
    });
  }
};

const deleteInvalidEvents = async (req: Request, res: Response) => {
  try {
    // 1️⃣ Suppression des événements avec startingDate ou endingDate null
    const nullDatesResult = await Event.deleteMany({
      $or: [{ startingDate: null }, { endingDate: null }],
    });

    console.log(
      `Événements supprimés : ${nullDatesResult.deletedCount} avec startingDate ou endingDate null.`
    );

    // 2️⃣ Suppression des événements ayant les dates précises de la capture d'écran
    const targetStartingDate = new Date("2024-12-31T23:00:00.000+00:00");
    const targetEndingDate = new Date("2025-12-31T22:59:59.000+00:00");

    const specificDeleteResult = await Event.deleteMany({
      startingDate: targetStartingDate,
      endingDate: targetEndingDate,
    });

    console.log(
      `Événements supprimés : ${specificDeleteResult.deletedCount} avec startingDate et endingDate précises.`
    );

    res.status(200).json({
      message: `${nullDatesResult.deletedCount} événements avec dates nulles supprimés, ${specificDeleteResult.deletedCount} événements avec les dates spécifiques supprimés.`,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression des événements :", error);
    res.status(500).json({
      error: "Erreur lors de la suppression des événements.",
      details: error,
    });
  }
};
// const migrateData = async () => {
//   try {
//     // Récupère les événements avec lat/lng mais sans geo
//     const events = await Event.find();

//     console.log(`Nombre d'événements à migrer : ${events.length}`);

//     for (const event of events) {
//       const { lat, lng } = event.location;

//       // Vérifie que lat et lng sont valides
//       if (typeof lat === "number" && typeof lng === "number") {
//         event.location.geo = {
//           type: "Point",
//           coordinates: [lng, lat], // Longitude, Latitude
//         };

//         // Enregistre les modifications
//         await event.save();
//         console.log(`Événement ID ${event._id} migré avec succès.`);
//       } else {
//         console.warn(
//           `Coordonnées invalides pour l'événement ID ${event._id}: lat=${lat}, lng=${lng}`
//         );
//       }
//     }

//     console.log("Migration des données terminée !");
//   } catch (error) {
//     console.error("Erreur lors de la migration des données :", error);
//   }
// };

const updateDescriptionsAndPrices = async (req: Request, res: Response) => {
  try {
    console.log("Début de la mise à jour des descriptions et des prix.");

    // Trouver les événements avec des balises HTML dans leur description
    console.log("Recherche des événements contenant des balises HTML...");
    const events = await Event.find({ description: { $regex: /<[^>]+>/ } });
    console.log(`${events.length} événements trouvés avec des balises HTML.`);

    const updatedEvents = await Promise.all(
      events.map(async (event) => {
        console.log(
          `Traitement de l'événement : ${event.title} (${event._id})`
        );

        // Nettoyer la description en supprimant les balises HTML
        const originalDescription = event.description;
        event.description = cleanHTML(event.description);

        if (originalDescription !== event.description) {
          console.log(`Description nettoyée pour l'événement : ${event.title}`);
        }

        // Remplacer le prix null par 0
        if (event.price === null) {
          console.log(
            `Prix null détecté pour ${event.title}. Remplacement par 0.`
          );
          Object(event).price = 0;
        }

        // Mettre à jour priceSpecification si minPrice ou maxPrice est null
        if (event.priceSpecification) {
          if (event.priceSpecification.minPrice === null) {
            console.log(
              `minPrice null détecté pour ${event.title}. Remplacement par 0.`
            );
            event.priceSpecification.minPrice = 0;
          }
          if (event.priceSpecification.maxPrice === null) {
            console.log(
              `maxPrice null détecté pour ${event.title}. Remplacement par 0.`
            );
            event.priceSpecification.maxPrice = 0;
          }
        }

        // Vérifier et corriger les coordonnées
        if (
          !event.location?.geo?.coordinates ||
          event.location.geo.coordinates.length !== 2
        ) {
          console.log(
            `Coordonnées invalides détectées pour ${event.title}. Correction en cours...`
          );
          Object(event).location.geo.coordinates = [0, 0]; // Par défaut : longitude et latitude nulles
        }

        // Sauvegarder l'événement
        await event.save();
        console.log(`Événement mis à jour : ${event.title} (${event._id})`);
        return event;
      })
    );

    console.log("Mise à jour terminée pour tous les événements.");

    res.status(200).json({
      message: `${updatedEvents.length} événements mis à jour.`,
      updatedEvents,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour des descriptions et des prix :",
      error
    );
    res
      .status(500)
      .json({ message: "Erreur interne du serveur.", error: error });
  }
};

// Fonction pour supprimer toutes les balises HTML
function cleanHTML(description: string): string {
  if (!description) return description;

  // Supprimer toutes les balises HTML et extraire le texte brut
  const cleaned = description
    .replace(/<[^>]+>/g, "") // Supprime toutes les balises HTML
    .replace(/\s+/g, " ") // Remplace plusieurs espaces consécutifs par un seul espace
    .trim(); // Supprime les espaces en début et fin de chaîne

  return cleaned;
}

export default {
  // createEventFromJSON,
  createDraftEvent,
  createEventForAnEstablishment,
  readEvent,
  readAll,
  getEventsByPostalCode,
  getEventsByPosition,
  getEventByDate,
  updateEvent,
  // updateOrCreateEventFromJSON,
  // updateEventForParis,
  // migrateData,
  getCoordinatesFromAPI,
  verifAllEvent,
  updateImageUrls,
  // updateEventCoordinates,
  updateDescriptionsAndPrices,
  registrationToAnEvent,
  scanATicketForAnEvent,
  deleteEvent,
  deleteDuplicateEvents,
  removeMidnightDates,
  removeExpiredEvents,
  deleteInvalidEvents,
};
