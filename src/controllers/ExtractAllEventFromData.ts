// Helpers Datatourisme

import { NextFunction, Request, Response } from "express";

import Event from "../models/Event";
import Retour from "../library/Retour";

import path from "path";
import * as fs from "fs";

const CryptoJS = require("crypto-js");
const AllEvents = require("../../Events/index.json");

const normalizeString = (str: string = "") =>
  str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const escapeRegExp = (str: string = "") =>
  str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const firstValue = (value: any): any => {
  if (Array.isArray(value)) return value[0];
  return value;
};

const getLangValue = (obj: any, lang = "fr"): string | undefined => {
  return obj?.[lang]?.[0] || obj?.fr?.[0] || obj?.en?.[0] || undefined;
};

const extractAddressDetails = (fileData: any) => {
  const addressData = fileData["isLocatedAt"]?.[0]?.["schema:address"]?.[0];
  const cityData = addressData?.hasAddressCity;
  const departmentData = cityData?.isPartOfDepartment;
  const regionData = departmentData?.isPartOfRegion;
  const countryData = regionData?.isPartOfCountry;

  const streetAddress = Array.isArray(addressData?.["schema:streetAddress"])
    ? addressData["schema:streetAddress"]
    : addressData?.["schema:streetAddress"]
      ? [addressData["schema:streetAddress"]]
      : [];

  return {
    streetAddress,
    postalCode: addressData?.["schema:postalCode"] || undefined,
    city:
      addressData?.["schema:addressLocality"] ||
      getLangValue(cityData?.["rdfs:label"]),
    department: getLangValue(departmentData?.["rdfs:label"]),
    departmentCode: departmentData?.insee,
    region: getLangValue(regionData?.["rdfs:label"]),
    regionCode: regionData?.insee,
    country: getLangValue(countryData?.["rdfs:label"]),
    insee: cityData?.insee,
  };
};

function extractAddress(fileData: any): string {
  const details = extractAddressDetails(fileData);

  return (
    [...(details.streetAddress || []), details.postalCode, details.city]
      .filter(Boolean)
      .join(", ") || "Adresse inconnue"
  );
}

function extractDescription(fileData: any): string {
  return (
    fileData["hasDescription"]?.[0]?.["dc:description"]?.fr?.[0] ||
    fileData["hasDescription"]?.[0]?.shortDescription?.fr?.[0] ||
    fileData["rdfs:comment"]?.fr?.[0] ||
    "Description non disponible"
  );
}

function extractShortDescription(fileData: any): string | null {
  return (
    fileData["hasDescription"]?.[0]?.shortDescription?.fr?.[0] ||
    fileData["rdfs:comment"]?.fr?.[0] ||
    null
  );
}

function extractLongDescription(fileData: any): string | null {
  return fileData["hasDescription"]?.[0]?.["dc:description"]?.fr?.[0] || null;
}

function extractCoordinates(fileData: any): {
  newLat: number | null;
  newLng: number | null;
} {
  const geoData = fileData["isLocatedAt"]?.[0]?.["schema:geo"];

  if (!geoData) {
    return { newLat: null, newLng: null };
  }

  const lat = parseFloat(geoData["schema:latitude"]);
  const lng = parseFloat(geoData["schema:longitude"]);

  return {
    newLat: Number.isFinite(lat) ? lat : null,
    newLng: Number.isFinite(lng) ? lng : null,
  };
}

const extractTranslations = (fileData: any) => {
  const translations = [];

  const labels = fileData["rdfs:label"] || {};
  const comments = fileData["rdfs:comment"] || {};
  const descObj = fileData.hasDescription?.[0]?.["dc:description"] || {};
  const shortDescObj = fileData.hasDescription?.[0]?.shortDescription || {};

  const supportedLangs = new Set([
    ...Object.keys(labels),
    ...Object.keys(comments),
    ...Object.keys(descObj),
    ...Object.keys(shortDescObj),
  ]);

  for (const lang of supportedLangs) {
    translations.push({
      lang,
      title: labels[lang]?.[0] || undefined,
      shortDescription:
        shortDescObj[lang]?.[0] || comments[lang]?.[0] || undefined,
      description: descObj[lang]?.[0] || comments[lang]?.[0] || undefined,
      longDescription: descObj[lang]?.[0] || undefined,
    });
  }

  return translations;
};

function extractOrganizer(fileData: any) {
  const contact = fileData["hasContact"]?.[0];

  return {
    legalName:
      fileData["hasBeenCreatedBy"]?.["schema:legalName"] ||
      "Organisateur inconnu",
    email: contact?.["schema:email"]?.[0] || "Email inconnu",
    phone: contact?.["schema:telephone"]?.[0] || "Téléphone inconnu",
    website: contact?.["foaf:homepage"]?.[0] || null,
  };
}

function extractContact(fileData: any) {
  const contact = fileData["hasContact"]?.[0];
  const bookingContact = fileData["hasBookingContact"]?.[0];

  return {
    email:
      bookingContact?.["schema:email"]?.[0] ||
      contact?.["schema:email"]?.[0] ||
      null,
    phone:
      bookingContact?.["schema:telephone"]?.[0] ||
      contact?.["schema:telephone"]?.[0] ||
      null,
    website: contact?.["foaf:homepage"]?.[0] || null,
    bookingUrl:
      bookingContact?.["foaf:homepage"]?.[0] ||
      contact?.["foaf:homepage"]?.[0] ||
      null,
  };
}

function extractOccurrences(fileData: any) {
  const takesPlaceAt = fileData["takesPlaceAt"] || [];

  return takesPlaceAt
    .map((period: any) => {
      const daysOfWeek =
        period.appliesOnDay
          ?.map((day: any) => {
            const id = day["@id"] || "";
            return id.replace("schema:", "");
          })
          .filter(Boolean) || [];

      return {
        startDate: period.startDate ? new Date(period.startDate) : undefined,
        endDate: period.endDate ? new Date(period.endDate) : undefined,
        startTime: period.startTime || null,
        endTime: period.endTime || null,
        daysOfWeek,
        label:
          daysOfWeek.length === 7
            ? "Tous les jours"
            : daysOfWeek.length > 0
              ? daysOfWeek.join(", ")
              : null,
        isRecurring:
          period["@type"]?.includes("RecurrentPeriod") ||
          daysOfWeek.length > 0 ||
          false,
      };
    })
    .filter((occ: any) => occ.startDate);
}

function mergeDatesFromOccurrences(occurrences: any[]) {
  let earliestStart: Date | null = null;
  let latestEnd: Date | null = null;

  for (const occ of occurrences) {
    const startTime = occ.startTime || "00:00:00";
    const endTime = occ.endTime || "23:59:59";

    const start = new Date(
      `${occ.startDate.toISOString().split("T")[0]}T${startTime}`,
    );

    const endBase = occ.endDate || occ.startDate;
    const end = new Date(`${endBase.toISOString().split("T")[0]}T${endTime}`);

    if (!earliestStart || start < earliestStart) earliestStart = start;
    if (!latestEnd || end > latestEnd) latestEnd = end;
  }

  return {
    startingDate: earliestStart,
    endingDate: latestEnd,
  };
}

function extractImages(fileData: any): string[] {
  const imageUrls: string[] = [];

  const representations = [
    ...(fileData["hasMainRepresentation"] || []),
    ...(fileData["hasRepresentation"] || []),
  ];

  for (const representation of representations) {
    const resources = representation["ebucore:hasRelatedResource"] || [];

    for (const resource of resources) {
      const locators = resource["ebucore:locator"] || [];
      imageUrls.push(...locators);
    }
  }

  if (fileData["schema:image"]) {
    const schemaImages = Array.isArray(fileData["schema:image"])
      ? fileData["schema:image"]
      : [fileData["schema:image"]];

    imageUrls.push(...schemaImages);
  }

  const cleanUrls = imageUrls
    .filter((url) => typeof url === "string" && url.trim() !== "")
    .map((url) =>
      url.startsWith("http://") ? url.replace("http://", "https://") : url,
    );

  return [...new Set(cleanUrls.length ? cleanUrls : ["Image par défaut"])];
}

function extractEnrichedImages(fileData: any) {
  const mainIds = new Set(
    (fileData["hasMainRepresentation"] || []).map((item: any) => item["@id"]),
  );

  const representations = [
    ...(fileData["hasMainRepresentation"] || []),
    ...(fileData["hasRepresentation"] || []),
  ];

  const images: any[] = [];

  for (const representation of representations) {
    const annotation = representation["ebucore:hasAnnotation"]?.[0];
    const resources = representation["ebucore:hasRelatedResource"] || [];

    for (const resource of resources) {
      const locators = resource["ebucore:locator"] || [];

      for (const locator of locators) {
        if (!locator) continue;

        images.push({
          url: locator.startsWith("http://")
            ? locator.replace("http://", "https://")
            : locator,
          title: getLangValue(annotation?.["ebucore:title"]) || null,
          credits: annotation?.credits?.[0] || null,
          rightsStartDate: annotation?.rightsStartDate
            ? new Date(annotation.rightsStartDate)
            : null,
          rightsEndDate: annotation?.rightsEndDate
            ? new Date(annotation.rightsEndDate)
            : null,
          mimeType:
            resource["ebucore:hasMimeType"]?.[0]?.["rdfs:label"]?.fr?.[0] ||
            null,
          isMain: mainIds.has(representation["@id"]),
        });
      }
    }
  }

  const unique = new Map();

  for (const img of images) {
    if (!unique.has(img.url)) unique.set(img.url, img);
  }

  return Array.from(unique.values());
}

function extractPriceSpecification(fileData: any) {
  let minPrice: number | undefined;
  let maxPrice: number | undefined;
  let priceCurrency = "EUR";
  let priceLabel: string | null = null;
  let isFree = false;
  let pricingMode: string | undefined;
  let pricingOffer: string | undefined;

  const offers = fileData?.offers || [];

  for (const offer of offers) {
    const priceSpecifications = offer["schema:priceSpecification"] || [];

    for (const spec of priceSpecifications) {
      const price = parseFloat(spec["schema:price"]);
      const min = parseFloat(firstValue(spec["schema:minPrice"]));
      const max = parseFloat(firstValue(spec["schema:maxPrice"]));

      if (Number.isFinite(price)) {
        minPrice = minPrice === undefined ? price : Math.min(minPrice, price);
        maxPrice = maxPrice === undefined ? price : Math.max(maxPrice, price);
      }

      if (Number.isFinite(min)) {
        minPrice = minPrice === undefined ? min : Math.min(minPrice, min);
      }

      if (Number.isFinite(max)) {
        maxPrice = maxPrice === undefined ? max : Math.max(maxPrice, max);
      }

      if (spec["schema:priceCurrency"]) {
        priceCurrency = spec["schema:priceCurrency"];
      }

      const additionalInfo = getLangValue(spec.additionalInformation);

      if (additionalInfo) {
        priceLabel = additionalInfo;

        if (additionalInfo.toLowerCase().includes("gratuit")) {
          isFree = true;
          minPrice = 0;
          maxPrice = 0;
        }
      }

      pricingMode = getLangValue(spec.hasPricingMode?.[0]?.["rdfs:label"]);
      pricingOffer = getLangValue(spec.hasPricingOffer?.[0]?.["rdfs:label"]);
    }
  }

  return {
    price: minPrice ?? 0,
    priceLabel,
    isFree,
    priceSpecification: {
      minPrice: minPrice ?? 0,
      maxPrice: maxPrice ?? minPrice ?? 0,
      priceCurrency,
      pricingMode,
      pricingOffer,
    },
  };
}

function extractAcceptedPaymentMethods(fileData: any): string[] {
  const methods: string[] = [];

  for (const offer of fileData.offers || []) {
    for (const method of offer["schema:acceptedPaymentMethod"] || []) {
      const label = getLangValue(method["rdfs:label"]);
      if (label) methods.push(label);
    }
  }

  return [...new Set(methods)];
}

function extractExternalSource(fileData: any) {
  return {
    name: "datatourisme",
    id: fileData["dc:identifier"] || null,
    url: fileData["@id"] || null,
    lastUpdate: fileData.lastUpdate ? new Date(fileData.lastUpdate) : null,
    lastUpdateDatatourisme: fileData.lastUpdateDatatourisme
      ? new Date(fileData.lastUpdateDatatourisme)
      : null,
  };
}

const updateOrCreateEventFromJSON = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const basePath = path.join(__dirname, "..", "..", "events", "objects");

    const updatedEvents: any[] = [];
    const createdEvents: any[] = [];
    const unmatchedFiles: string[] = [];

    for (const file of AllEvents) {
      try {
        const filePath = path.join(basePath, file.file);
        const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        const title = normalizeString(
          fileData["rdfs:label"]?.fr?.[0] || "Titre inconnu",
        );

        const description = extractDescription(fileData);
        const shortDescription = extractShortDescription(fileData);
        const longDescription = extractLongDescription(fileData);

        const address = extractAddress(fileData);
        const addressDetails = extractAddressDetails(fileData);

        const { newLat, newLng } = extractCoordinates(fileData);

        const occurrences = extractOccurrences(fileData);

        if (!occurrences.length) {
          throw new Error("Aucune occurrence valide trouvée.");
        }

        const { startingDate, endingDate } =
          mergeDatesFromOccurrences(occurrences);

        if (!startingDate || !endingDate) {
          throw new Error("Dates principales invalides.");
        }

        const image = extractImages(fileData);
        const images = extractEnrichedImages(fileData);

        const { price, priceLabel, isFree, priceSpecification } =
          extractPriceSpecification(fileData);

        const acceptedPaymentMethod = extractAcceptedPaymentMethods(fileData);

        const organizer = extractOrganizer(fileData);
        const contact = extractContact(fileData);
        const translations = extractTranslations(fileData);
        const externalSource = extractExternalSource(fileData);

        const location: any = {
          lat: newLat,
          lng: newLng,
        };

        if (newLat !== null && newLng !== null) {
          location.geo = {
            type: "Point",
            coordinates: [newLng, newLat],
          };
        }

        let dbEvent = null;

        if (externalSource.id) {
          dbEvent = await Event.findOne({
            "externalSource.name": "datatourisme",
            "externalSource.id": externalSource.id,
          });
        }

        if (!dbEvent) {
          dbEvent = await Event.findOne({
            $and: [
              {
                title: {
                  $regex: new RegExp(`^${escapeRegExp(title)}$`, "i"),
                },
              },
              {
                address: {
                  $regex: new RegExp(`^${escapeRegExp(address)}$`, "i"),
                },
              },
              { startingDate },
            ],
          });
        }

        const eventPayload = {
          title,
          description,
          shortDescription,
          longDescription,
          translations,

          address,
          addressDetails,

          location,

          startingDate,
          endingDate,
          occurrences,

          image,
          images,

          organizer,
          contact,

          theme: fileData["@type"] || ["Thème inconnu"],

          price,
          priceLabel,
          isFree,
          priceSpecification,

          acceptedPaymentMethod,

          externalSource,
        };

        if (!dbEvent) {
          const newEvent = new Event(eventPayload);

          await newEvent.save();

          createdEvents.push({
            id: newEvent._id,
            title: newEvent.title,
          });

          Retour.info(
            `<<n°:${createdEvents.length} Nouvel événement créé>>: ${newEvent.title}`,
          );
        } else {
          Object.assign(dbEvent, eventPayload);

          await dbEvent.save();

          updatedEvents.push({
            id: dbEvent._id,
            title: dbEvent.title,
          });

          Retour.info(`Événement mis à jour : ${dbEvent.title}`);
        }
      } catch (error) {
        unmatchedFiles.push(file.file);

        console.error(
          `Erreur lors du traitement du fichier : ${file.file}`,
          error,
        );
      }
    }

    return res.status(200).json({
      message: "Traitement des événements terminé.",
      eventUpdated: updatedEvents.length,
      newEvent: createdEvents.length,
      eventUnmatched: unmatchedFiles.length,
      updatedEvents,
      createdEvents,
      unmatchedFiles,
    });
  } catch (error) {
    console.error("Erreur globale :", error);

    return res.status(500).json({
      message: "Erreur lors du traitement.",
      error,
    });
  }
};
