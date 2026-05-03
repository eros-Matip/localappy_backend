"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const axios_1 = __importDefault(require("axios"));
const Event_1 = __importDefault(require("../models/Event"));
const Retour_1 = __importDefault(require("../library/Retour"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const chalk_1 = __importDefault(require("chalk"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Registration_1 = __importDefault(require("../models/Registration"));
const Bill_1 = __importDefault(require("../models/Bill"));
const cloudinary_1 = __importDefault(require("cloudinary"));
const sendEventConfirmation_1 = require("../utils/sendEventConfirmation");
const mongoose_1 = __importStar(require("mongoose"));
const push_1 = require("../utils/push");
const Owner_1 = __importDefault(require("../models/Owner"));
const mailersend_1 = require("mailersend");
const TrackCityConsultationStat_1 = require("../library/TrackCityConsultationStat");
const EventPresence_1 = __importDefault(require("../models/EventPresence"));
const EventLivePhoto_1 = __importDefault(require("../models/EventLivePhoto"));
const CryptoJS = require("crypto-js");
const AllEvents = require("../../Events/index.json");
const validateImageUrl = (url) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    if (!url || url === "Image par défaut") {
        console.warn(`URL non valide ou définie comme "Image par défaut" : ${url}.`);
        return url;
    }
    try {
        new URL(url);
    }
    catch (err) {
        console.warn(`URL invalide : ${url}. Remplacement par 'Image par défaut'.`);
        return "Image par défaut";
    }
    try {
        const response = yield axios_1.default.head(url, { timeout: 5000 });
        if (response.status === 200 &&
            ((_a = response.headers["content-type"]) === null || _a === void 0 ? void 0 : _a.startsWith("image/"))) {
            return url;
        }
        else {
            console.warn(`L'URL ne pointe pas vers une image valide : ${url}.`);
            return "Image par défaut";
        }
    }
    catch (err) {
        if (axios_1.default.isAxiosError(err)) {
            console.warn(`Erreur lors de la vérification de l'URL : ${url}.`, `Status Code : ${((_b = err.response) === null || _b === void 0 ? void 0 : _b.status) || "Inconnu"}`);
            return "Image par défaut";
        }
        else {
            console.error(`Erreur inattendue lors de la vérification de l'URL : ${url}`, err);
        }
        return "Image par défaut";
    }
});
function extractImages(fileData) {
    var _a, _b;
    let imageUrls = [];
    if ((_b = (_a = fileData["hasMainRepresentation"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["ebucore:hasRelatedResource"]) {
        const resources = fileData["hasMainRepresentation"][0]["ebucore:hasRelatedResource"];
        resources.forEach((resource) => {
            if (resource["ebucore:locator"]) {
                imageUrls.push(...resource["ebucore:locator"]);
            }
        });
    }
    if (fileData["schema:image"]) {
        const schemaImages = Array.isArray(fileData["schema:image"])
            ? fileData["schema:image"]
            : [fileData["schema:image"]];
        imageUrls.push(...schemaImages);
    }
    if (fileData["hasMedia"]) {
        const mediaResources = fileData["hasMedia"];
        mediaResources.forEach((media) => {
            if (media["ebucore:locator"]) {
                imageUrls.push(media["ebucore:locator"]);
            }
        });
    }
    imageUrls = imageUrls
        .filter((url) => typeof url === "string" && url.length > 0)
        .map((url) => url.startsWith("http://") ? url.replace("http://", "https://") : url);
    if (imageUrls.length === 0) {
        imageUrls.push("Image par défaut");
    }
    return imageUrls;
}
function extractAddress(fileData) {
    var _a, _b, _c;
    const addressData = (_c = (_b = (_a = fileData["isLocatedAt"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["schema:address"]) === null || _c === void 0 ? void 0 : _c[0];
    return ([
        addressData === null || addressData === void 0 ? void 0 : addressData["schema:streetAddress"],
        addressData === null || addressData === void 0 ? void 0 : addressData["schema:addressLocality"],
        addressData === null || addressData === void 0 ? void 0 : addressData["schema:postalCode"],
    ]
        .filter(Boolean)
        .join(", ") || "Adresse inconnue");
}
function extractDescription(fileData) {
    var _a, _b, _c, _d, _e, _f;
    return (((_d = (_c = (_b = (_a = fileData["hasDescription"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["dc:description"]) === null || _c === void 0 ? void 0 : _c.fr) === null || _d === void 0 ? void 0 : _d[0]) ||
        ((_f = (_e = fileData["rdfs:comment"]) === null || _e === void 0 ? void 0 : _e.fr) === null || _f === void 0 ? void 0 : _f[0]) ||
        "Description non disponible");
}
function extractCoordinates(fileData) {
    var _a, _b;
    const geoData = (_b = (_a = fileData["isLocatedAt"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["schema:geo"];
    if (geoData) {
        return {
            newLat: parseFloat(geoData["schema:latitude"]),
            newLng: parseFloat(geoData["schema:longitude"]),
        };
    }
    return { newLat: null, newLng: null };
}
function fetchCoordinates(address) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            console.info(`Recherche des coordonnées pour : ${address}`);
            const response = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}`);
            const feature = (_a = response.data.features) === null || _a === void 0 ? void 0 : _a[0];
            if ((_b = feature === null || feature === void 0 ? void 0 : feature.geometry) === null || _b === void 0 ? void 0 : _b.coordinates) {
                console.info(`Coordonnées trouvées : ${feature.geometry.coordinates}`);
                return {
                    lat: feature.geometry.coordinates[1],
                    lng: feature.geometry.coordinates[0],
                };
            }
            console.warn(`Coordonnées non trouvées pour l'adresse : ${address}`);
        }
        catch (error) {
            console.error("Erreur API géocodage :", error);
        }
        return null;
    });
}
function extractOrganizer(fileData) {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
        legalName: ((_a = fileData["hasBeenCreatedBy"]) === null || _a === void 0 ? void 0 : _a["schema:legalName"]) ||
            "Organisateur inconnu",
        email: ((_d = (_c = (_b = fileData["hasContact"]) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c["schema:email"]) === null || _d === void 0 ? void 0 : _d[0]) ||
            "contact@unknown.com",
        phone: ((_g = (_f = (_e = fileData["hasContact"]) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f["schema:telephone"]) === null || _g === void 0 ? void 0 : _g[0]) || "0000000000",
    };
}
function extractPriceSpecification(fileData) {
    let minPrice = 0;
    let maxPrice = 0;
    let priceCurrency = "EUR";
    const offers = (fileData === null || fileData === void 0 ? void 0 : fileData.offers) || [];
    offers.forEach((offer) => {
        const priceSpecifications = offer["schema:priceSpecification"] || [];
        priceSpecifications.forEach((spec) => {
            const maxPrices = spec["schema:maxPrice"];
            const minPrices = spec["schema:minPrice"];
            const price = spec["schema:price"];
            const currency = spec["schema:priceCurrency"];
            if (!maxPrices && price) {
                maxPrice = Math.max(maxPrice, parseFloat(price));
            }
            if (!minPrices && price) {
                minPrice =
                    minPrice === 0
                        ? parseFloat(price)
                        : Math.min(minPrice, parseFloat(price));
            }
            if (Array.isArray(maxPrices)) {
                const maxValues = maxPrices.map(Number).filter((p) => !isNaN(p));
                if (maxValues.length > 0) {
                    maxPrice = Math.max(maxPrice, ...maxValues);
                }
            }
            else if (!isNaN(parseFloat(maxPrices))) {
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
            }
            else if (!isNaN(parseFloat(minPrices))) {
                const parsedMin = parseFloat(minPrices);
                minPrice = minPrice === 0 ? parsedMin : Math.min(minPrice, parsedMin);
            }
            if (currency) {
                priceCurrency = currency;
            }
        });
    });
    return {
        priceCurrency,
        minPrice,
        maxPrice,
        price: minPrice,
    };
}
const extractTranslations = (fileData) => {
    var _a, _b, _c, _d, _e;
    const translations = [];
    const labels = fileData["rdfs:label"] || {};
    const comments = fileData["rdfs:comment"] || {};
    const descObj = ((_b = (_a = fileData.hasDescription) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["dc:description"]) || {};
    const supportedLangs = new Set([
        ...Object.keys(labels),
        ...Object.keys(comments),
        ...Object.keys(descObj),
    ]);
    for (const lang of supportedLangs) {
        translations.push({
            lang,
            title: ((_c = labels[lang]) === null || _c === void 0 ? void 0 : _c[0]) || undefined,
            shortDescription: ((_d = comments[lang]) === null || _d === void 0 ? void 0 : _d[0]) || undefined,
            description: ((_e = descObj[lang]) === null || _e === void 0 ? void 0 : _e[0]) || undefined,
        });
    }
    return translations;
};
const updateOrCreateEventFromJSON = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const basePath = path_1.default.join(__dirname, "..", "..", "events", "objects");
        const updatedEvents = [];
        const createdEvents = [];
        const unmatchedFiles = [];
        for (const file of AllEvents) {
            try {
                const filePath = path_1.default.join(basePath, file.file);
                const fileData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
                const title = normalizeString(((_b = (_a = fileData["rdfs:label"]) === null || _a === void 0 ? void 0 : _a.fr) === null || _b === void 0 ? void 0 : _b[0]) || "Titre inconnu");
                const description = extractDescription(fileData);
                const mergeDates = (fileData) => {
                    const takesPlaceAt = fileData["takesPlaceAt"] || [];
                    let earliestStart = null;
                    let latestEnd = null;
                    takesPlaceAt.forEach((period) => {
                        try {
                            if (!period.startDate) {
                                console.warn(`Période ignorée : startDate manquant dans takesPlaceAt:`, period);
                                return;
                            }
                            const start = new Date(`${period.startDate}T${period.startTime || "00:00:00"}`);
                            if (isNaN(start.getTime())) {
                                console.warn(`Date de début invalide trouvée dans takesPlaceAt:`, period);
                                return;
                            }
                            const end = new Date(`${period.endDate || period.startDate}T${period.endTime || "23:59:59"}`);
                            if (isNaN(end.getTime())) {
                                console.warn(`Date de fin invalide trouvée dans takesPlaceAt:`, period);
                                return;
                            }
                            if (!earliestStart || start < earliestStart) {
                                earliestStart = start;
                            }
                            if (!latestEnd || end > latestEnd) {
                                latestEnd = end;
                            }
                        }
                        catch (error) {
                            console.error(`Erreur lors du traitement de la période :`, period, error);
                        }
                    });
                    if (!earliestStart || !latestEnd) {
                        throw new Error("Aucune date valide trouvée dans takesPlaceAt après vérification.");
                    }
                    return {
                        startDate: earliestStart.toISOString(),
                        endDate: latestEnd.toISOString(),
                    };
                };
                let { newLat, newLng } = extractCoordinates(fileData);
                const { startDate, endDate } = mergeDates(fileData);
                const images = extractImages(fileData);
                const priceSpecification = extractPriceSpecification(fileData);
                const acceptedPaymentMethod = fileData["schema:acceptedPaymentMethod"] || [];
                const organizer = extractOrganizer(fileData);
                let dbEvent = yield Event_1.default.findOne({
                    $and: [
                        { title: { $regex: new RegExp(`^${escapeRegExp(title)}$`, "i") } },
                        {
                            address: {
                                $regex: new RegExp(`^${escapeRegExp(extractAddress(fileData))}$`, "i"),
                            },
                        },
                        { startingDate: new Date(startDate) },
                    ],
                });
                if (!dbEvent) {
                    const newEvent = new Event_1.default({
                        title,
                        description,
                        translations: extractTranslations(fileData),
                        address: extractAddress(fileData),
                        location: {
                            lat: newLat,
                            lng: newLng,
                            geo: { type: "Point", coordinates: [newLng, newLat] },
                        },
                        startingDate: startDate,
                        endingDate: endDate,
                        image: images,
                        organizer,
                        theme: fileData["@type"] || ["Thème inconnu"],
                        price: priceSpecification.price,
                        priceSpecification,
                        acceptedPaymentMethod,
                    });
                    yield newEvent.save();
                    createdEvents.push({ id: newEvent._id, title: newEvent.title });
                    Retour_1.default.info(`<<n°:${createdEvents.length} Nouvel événement créé>>: ${newEvent.title}`);
                }
                else {
                    dbEvent.description = description;
                    Object(dbEvent).location = {
                        lat: newLat,
                        lng: newLng,
                        geo: { type: "Point", coordinates: [newLng, newLat] },
                    };
                    dbEvent.image = images;
                    dbEvent.price = Object(priceSpecification).price;
                    dbEvent.translations = extractTranslations(fileData);
                    dbEvent.priceSpecification = priceSpecification;
                    dbEvent.acceptedPaymentMethod = acceptedPaymentMethod;
                    yield dbEvent.save();
                    updatedEvents.push({ id: dbEvent._id, title: dbEvent.title });
                    Retour_1.default.info(`Événement mis à jour : ${dbEvent.title}`);
                }
            }
            catch (error) {
                unmatchedFiles.push(file.file);
                console.error(`Erreur lors du traitement du fichier : ${file.file}`, error);
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
    }
    catch (error) {
        console.error("Erreur globale :", error);
        return res
            .status(500)
            .json({ message: "Erreur lors du traitement.", error });
    }
});
const determinePrice = (event) => {
    if (event.price_type === "gratuit") {
        return 0;
    }
    if (event.price_detail) {
        const priceMatch = event.price_detail.match(/\d+([.,]\d+)?/);
        if (priceMatch) {
            return parseFloat(priceMatch[0].replace(",", "."));
        }
    }
    return 0;
};
const createEventForAnEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    try {
        const establishmentId = req.params.establishmentId;
        const draftId = req.body.draftId;
        if (!draftId) {
            return res.status(400).json({ message: "DraftId is required." });
        }
        const draftEvent = yield Event_1.default.findById(draftId);
        if (!draftEvent || !draftEvent.isDraft) {
            return res.status(404).json({ message: "Draft event not found." });
        }
        const establishmentFinded = yield Establishment_1.default.findById(establishmentId);
        if (!establishmentFinded) {
            Retour_1.default.error("Establishment not found");
            return res.status(404).json({ message: "Establishment not found" });
        }
        let { address } = req.body;
        let latitude = ((_a = draftEvent.location) === null || _a === void 0 ? void 0 : _a.lat) || ((_b = establishmentFinded === null || establishmentFinded === void 0 ? void 0 : establishmentFinded.location) === null || _b === void 0 ? void 0 : _b.lat);
        let longitude = ((_c = draftEvent.location) === null || _c === void 0 ? void 0 : _c.lng) || ((_d = establishmentFinded === null || establishmentFinded === void 0 ? void 0 : establishmentFinded.location) === null || _d === void 0 ? void 0 : _d.lng);
        if (address) {
            const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${address}`);
            if (((_e = responseApiGouv.data.features) === null || _e === void 0 ? void 0 : _e.length) > 0 &&
                ((_g = (_f = responseApiGouv.data.features[0].geometry) === null || _f === void 0 ? void 0 : _f.coordinates) === null || _g === void 0 ? void 0 : _g.length) === 2) {
                longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
                latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
            }
        }
        else {
            address = draftEvent.address || ((_h = establishmentFinded.address) === null || _h === void 0 ? void 0 : _h.street) || "";
        }
        const theme = Array.isArray(req.body.theme)
            ? req.body.theme
            : typeof req.body.theme === "string"
                ? [req.body.theme]
                : draftEvent.theme || [];
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
                minPrice: ((_j = req.body.priceSpecification) === null || _j === void 0 ? void 0 : _j.minPrice) || 0,
                maxPrice: ((_k = req.body.priceSpecification) === null || _k === void 0 ? void 0 : _k.maxPrice) || req.body.price || 0,
                priceCurrency: ((_l = req.body.priceSpecification) === null || _l === void 0 ? void 0 : _l.priceCurrency) || "EUR",
            },
            capacity: req.body.capacity || draftEvent.capacity,
            organizer: {
                establishment: draftEvent.organizer.establishment,
                legalName: draftEvent.organizer.legalName,
                email: ((_m = req.body.organizer) === null || _m === void 0 ? void 0 : _m.email) || draftEvent.organizer.email,
                phone: ((_o = req.body.organizer) === null || _o === void 0 ? void 0 : _o.phone) || draftEvent.organizer.phone,
            },
            translations: req.body.translations,
            registrationOpen: req.body.registrationOpen !== undefined
                ? req.body.registrationOpen
                : true,
            acceptedPaymentMethod: req.body.acceptedPaymentMethod || draftEvent.acceptedPaymentMethod,
            description: req.body.description || draftEvent.description,
            color: req.body.color || draftEvent.color,
            isDraft: false,
        });
        yield draftEvent.save();
        if (!((_p = establishmentFinded === null || establishmentFinded === void 0 ? void 0 : establishmentFinded.events) === null || _p === void 0 ? void 0 : _p.includes(draftEvent._id))) {
            (_q = establishmentFinded === null || establishmentFinded === void 0 ? void 0 : establishmentFinded.events) === null || _q === void 0 ? void 0 : _q.push(draftEvent._id);
            yield establishmentFinded.save();
        }
        if (!draftEvent.isDraft) {
            try {
                const mailerSend = new mailersend_1.MailerSend({
                    apiKey: process.env.MAILERSEND_API_KEY,
                });
                const sentFrom = new mailersend_1.Sender("noreply@localappy.fr", "Localappy");
                const recipients = [
                    new mailersend_1.Recipient(req.body.owner.email, establishmentFinded.name),
                ];
                const formatDate = (d) => {
                    if (!d)
                        return "";
                    const date = new Date(d);
                    return date.toLocaleString("fr-FR", {
                        timeZone: "Europe/Paris",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                };
                const personalization = [
                    {
                        email: establishmentFinded.email,
                        data: {
                            year: new Date().getFullYear().toString(),
                            establishment_name: establishmentFinded.name,
                            event_title: (_r = draftEvent.title) !== null && _r !== void 0 ? _r : "",
                            starting_date: formatDate(draftEvent.startingDate),
                            ending_date: formatDate(draftEvent.endingDate),
                            event_address: (_s = draftEvent.address) !== null && _s !== void 0 ? _s : "",
                            event_price: typeof draftEvent.price === "number"
                                ? draftEvent.price.toString()
                                : String((_t = draftEvent.price) !== null && _t !== void 0 ? _t : ""),
                            event_capacity: typeof draftEvent.capacity === "number"
                                ? draftEvent.capacity.toString()
                                : String((_u = draftEvent.capacity) !== null && _u !== void 0 ? _u : ""),
                            registration_status: draftEvent.registrationOpen ? "Oui" : "Non",
                            event_link: `localappy://event/${draftEvent._id}`,
                        },
                    },
                ];
                const emailParams = new mailersend_1.EmailParams()
                    .setFrom(sentFrom)
                    .setTo(recipients)
                    .setReplyTo(sentFrom)
                    .setSubject("Merci ! Votre événement est en ligne 🎉")
                    .setTemplateId(process.env.MAILERSEND_TEMPLATE_EVENT_CREATED)
                    .setPersonalization(personalization);
                yield mailerSend.email.send(emailParams);
            }
            catch (mailError) {
                console.error("MailerSend error:", mailError);
            }
        }
        const estObjId = establishmentFinded._id;
        const eventIds = yield Event_1.default.find({ "organizer.establishment": estObjId }, { _id: 1 }).distinct("_id");
        const customersWithThisEstablishment = yield Customer_1.default.find({
            $or: [
                { eventsAttended: { $in: eventIds } },
                { eventsReserved: { $in: eventIds } },
                { eventsFavorites: { $in: eventIds } },
                { establishmentFavorites: estObjId },
            ],
        })
            .select("expoPushToken")
            .lean();
        const tokens = Array.from(new Set(customersWithThisEstablishment
            .map((c) => c.expoPushToken)
            .filter((t) => typeof t === "string" && t.trim().length > 0)));
        const deepLink = `localappy://event/${draftEvent === null || draftEvent === void 0 ? void 0 : draftEvent._id}`;
        const webFallbackLink = `https://localappy.fr/open?link=${encodeURIComponent(deepLink)}`;
        const { sent, invalidTokens } = yield (0, push_1.sendExpoPushNotifications)(tokens, {
            title: draftEvent.title,
            body: `${establishmentFinded.name} vient de publier un nouvel évènement 🎉`,
            data: {
                url: deepLink,
                webUrl: webFallbackLink,
                eventId: draftEvent._id.toString(),
            },
            imageUrl: (_v = draftEvent.image) === null || _v === void 0 ? void 0 : _v[0],
        });
        console.log(`Push envoyés: ${sent} | Tokens invalides: ${invalidTokens.length}`);
        return res.status(201).json({
            message: "Event created successfully from draft",
            event: draftEvent,
        });
    }
    catch (error) {
        console.error("Error creating event:", error);
        return res.status(500).json({
            message: "Failed to create event",
            error: error instanceof Error ? error.message : error,
        });
    }
});
const createDraftEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    try {
        const establishmentId = req.params.establishmentId;
        const establishmentFinded = yield Establishment_1.default.findById(establishmentId);
        if (!establishmentFinded) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        const parseJsonField = (value, fallback) => {
            if (value === undefined || value === null || value === "") {
                return fallback;
            }
            if (Array.isArray(value) || typeof value === "object") {
                return value;
            }
            if (typeof value === "string") {
                try {
                    return JSON.parse(value);
                }
                catch (error) {
                    return fallback;
                }
            }
            return fallback;
        };
        const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
        const allFiles = Object.values(filesObject).flat();
        const sanitizeFolderName = (name) => name
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        const folderName = sanitizeFolderName((_a = establishmentFinded === null || establishmentFinded === void 0 ? void 0 : establishmentFinded.name) !== null && _a !== void 0 ? _a : "default");
        const uploadedImageUrls = [];
        for (const file of allFiles) {
            const result = yield cloudinary_1.default.v2.uploader.upload(file.path, {
                folder: `establishments/${folderName}`,
            });
            uploadedImageUrls.push(result.secure_url);
        }
        const parsedTheme = parseJsonField(req.body.theme, []);
        const normalizedTheme = Array.isArray(parsedTheme)
            ? parsedTheme.filter((theme) => typeof theme === "string" && theme.trim() !== "")
            : typeof req.body.theme === "string" && req.body.theme.trim() !== ""
                ? [req.body.theme]
                : [];
        const parsedTranslations = parseJsonField(req.body.translations, []);
        const safeTranslations = Array.isArray(parsedTranslations)
            ? parsedTranslations
                .filter((tr) => tr && typeof tr.lang === "string" && tr.lang.trim() !== "")
                .map((tr) => ({
                lang: tr.lang,
                title: typeof tr.title === "string" ? tr.title : "",
                description: typeof tr.description === "string" ? tr.description : "",
                shortDescription: typeof tr.shortDescription === "string"
                    ? tr.shortDescription
                    : "",
            }))
            : [];
        const parsedAcceptedPaymentMethod = parseJsonField(req.body.acceptedPaymentMethod, []);
        const acceptedPaymentMethod = Array.isArray(parsedAcceptedPaymentMethod)
            ? parsedAcceptedPaymentMethod.filter((method) => typeof method === "string" && method.trim() !== "")
            : [];
        const parsedStartingDate = req.body.startingDate
            ? new Date(req.body.startingDate)
            : null;
        const parsedEndingDate = req.body.endingDate
            ? new Date(req.body.endingDate)
            : null;
        const safeStartingDate = parsedStartingDate && !isNaN(parsedStartingDate.getTime())
            ? parsedStartingDate
            : undefined;
        const safeEndingDate = parsedEndingDate && !isNaN(parsedEndingDate.getTime())
            ? parsedEndingDate
            : undefined;
        let address = typeof req.body.address === "string" ? req.body.address.trim() : "";
        let longitude = ((_b = establishmentFinded.location) === null || _b === void 0 ? void 0 : _b.lng) || 0;
        let latitude = ((_c = establishmentFinded.location) === null || _c === void 0 ? void 0 : _c.lat) || 0;
        if (address) {
            try {
                const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}`);
                if (((_d = responseApiGouv.data.features) === null || _d === void 0 ? void 0 : _d.length) > 0 &&
                    ((_f = (_e = responseApiGouv.data.features[0].geometry) === null || _e === void 0 ? void 0 : _e.coordinates) === null || _f === void 0 ? void 0 : _f.length) === 2) {
                    longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
                    latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
                }
            }
            catch (error) {
                console.error("Erreur géocodage createDraftEvent:", error);
            }
        }
        const parsedPrice = req.body.price !== undefined &&
            req.body.price !== null &&
            req.body.price !== ""
            ? Number(req.body.price)
            : 0;
        const parsedMinPrice = ((_g = req.body.priceSpecification) === null || _g === void 0 ? void 0 : _g.minPrice) !== undefined &&
            ((_h = req.body.priceSpecification) === null || _h === void 0 ? void 0 : _h.minPrice) !== null &&
            ((_j = req.body.priceSpecification) === null || _j === void 0 ? void 0 : _j.minPrice) !== ""
            ? Number(req.body.priceSpecification.minPrice)
            : 0;
        const parsedMaxPrice = ((_k = req.body.priceSpecification) === null || _k === void 0 ? void 0 : _k.maxPrice) !== undefined &&
            ((_l = req.body.priceSpecification) === null || _l === void 0 ? void 0 : _l.maxPrice) !== null &&
            ((_m = req.body.priceSpecification) === null || _m === void 0 ? void 0 : _m.maxPrice) !== ""
            ? Number(req.body.priceSpecification.maxPrice)
            : parsedPrice;
        const safePrice = Number.isFinite(parsedPrice) ? parsedPrice : 0;
        const safeMinPrice = Number.isFinite(parsedMinPrice) ? parsedMinPrice : 0;
        const safeMaxPrice = Number.isFinite(parsedMaxPrice)
            ? parsedMaxPrice
            : safePrice;
        const parsedCapacity = req.body.capacity !== undefined &&
            req.body.capacity !== null &&
            req.body.capacity !== ""
            ? Number(req.body.capacity)
            : 0;
        const safeCapacity = Number.isFinite(parsedCapacity) ? parsedCapacity : 0;
        const newEvent = new Event_1.default({
            title: req.body.title || "",
            description: req.body.description || "",
            address,
            image: uploadedImageUrls,
            theme: normalizedTheme,
            startingDate: safeStartingDate,
            endingDate: safeEndingDate,
            price: safePrice,
            priceSpecification: {
                minPrice: safeMinPrice,
                maxPrice: safeMaxPrice,
                priceCurrency: ((_o = req.body.priceSpecification) === null || _o === void 0 ? void 0 : _o.priceCurrency) || "EUR",
            },
            capacity: safeCapacity,
            translations: safeTranslations,
            acceptedPaymentMethod,
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
                email: ((_p = req.body.organizer) === null || _p === void 0 ? void 0 : _p.email) ||
                    establishmentFinded.email ||
                    "Email inconnu",
                phone: ((_q = req.body.organizer) === null || _q === void 0 ? void 0 : _q.phone) ||
                    establishmentFinded.phone ||
                    "Téléphone inconnu",
            },
            registrationOpen: false,
            isDraft: true,
            color: req.body.color || undefined,
        });
        yield newEvent.save();
        if (!((_r = establishmentFinded === null || establishmentFinded === void 0 ? void 0 : establishmentFinded.events) === null || _r === void 0 ? void 0 : _r.includes(newEvent._id))) {
            (_s = establishmentFinded === null || establishmentFinded === void 0 ? void 0 : establishmentFinded.events) === null || _s === void 0 ? void 0 : _s.push(newEvent._id);
            yield establishmentFinded.save();
        }
        return res.status(201).json({
            message: "Draft created successfully",
            event: newEvent,
        });
    }
    catch (error) {
        console.error("Error creating draft event:", error);
        return res.status(500).json({
            message: "Failed to create draft",
            error: error instanceof Error ? error.message : error,
        });
    }
});
const readEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventId = req.params.eventId;
        let { source } = req.body;
        const event = yield Event_1.default.findById(eventId).populate({
            path: "registrations",
            model: "Registration",
            populate: "customer",
        });
        if (!event) {
            return res.status(404).json({ message: "Not found" });
        }
        if (source === "deeplink") {
            source = "scannés";
        }
        const clic = {
            source,
            date: new Date(),
        };
        event.clics.push(clic);
        yield event.save();
        return res.status(200).json({ message: event });
    }
    catch (error) {
        return res.status(500).json({ error });
    }
});
const readAll = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const skip = (page - 1) * limit;
        const department = String(req.query.department || "all").trim();
        const now = new Date();
        const match = {};
        if (department !== "all") {
            match.address = { $regex: `\\b${department}\\d{3}\\b`, $options: "i" };
        }
        const itemsPromise = Event_1.default.find(match)
            .select("_id title startingDate endingDate address isDraft registrationOpen organizer.legalName organizer.email")
            .sort({ startingDate: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        const statsPromise = Event_1.default.aggregate([
            { $match: match },
            {
                $facet: {
                    total: [{ $count: "count" }],
                    drafts: [{ $match: { isDraft: true } }, { $count: "count" }],
                    upcoming: [
                        { $match: { startingDate: { $gte: now }, isDraft: false } },
                        { $count: "count" },
                    ],
                    past: [
                        { $match: { startingDate: { $lt: now }, isDraft: false } },
                        { $count: "count" },
                    ],
                },
            },
            {
                $project: {
                    total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
                    drafts: { $ifNull: [{ $arrayElemAt: ["$drafts.count", 0] }, 0] },
                    upcoming: { $ifNull: [{ $arrayElemAt: ["$upcoming.count", 0] }, 0] },
                    past: { $ifNull: [{ $arrayElemAt: ["$past.count", 0] }, 0] },
                },
            },
        ]);
        const [items, statsArr] = yield Promise.all([itemsPromise, statsPromise]);
        const stats = (statsArr === null || statsArr === void 0 ? void 0 : statsArr[0]) || {
            total: 0,
            drafts: 0,
            upcoming: 0,
            past: 0,
        };
        return res.status(200).json({ items, stats, page, limit });
    }
    catch (e) {
        return res.status(500).json({ message: (e === null || e === void 0 ? void 0 : e.message) || "Erreur serveur" });
    }
});
const getEventsByPostalCode = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postalCode } = req.params;
        if (postalCode.length < 2) {
            return res.status(400).json({
                message: "Le code postal doit contenir au moins deux chiffres.",
            });
        }
        const postalCodeStart = postalCode.substring(0, 2);
        const events = yield Event_1.default.find({
            address: { $regex: `\\b${postalCodeStart}\\d{3}\\b`, $options: "i" },
        });
        if (events.length === 0) {
            return res
                .status(404)
                .json({ message: "Aucun événement trouvé pour ce code postal." });
        }
        const currentDate = new Date();
        const pastEvents = events.filter((event) => new Date(event.endingDate) < currentDate);
        const upcomingEvents = events.filter((event) => new Date(event.startingDate) > currentDate);
        const currentEvents = events.filter((event) => new Date(event.startingDate) <= currentDate &&
            new Date(event.endingDate) >= currentDate);
        return res.status(200).json({
            pastEvents,
            currentEvents,
            upcomingEvents,
        });
    }
    catch (error) {
        console.error("Erreur lors de la récupération des événements par code postal:", error);
        return res
            .status(500)
            .json({ message: "Erreur interne du serveur", error });
    }
});
const getCityFromCoordinates = (lat, lon) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const response = yield axios_1.default.get("https://nominatim.openstreetmap.org/reverse", {
            params: {
                lat,
                lon,
                format: "json",
                addressdetails: 1,
            },
            headers: {
                "User-Agent": "localappy/1.0 contact@localappy.com",
            },
            timeout: 5000,
        });
        const address = (_a = response.data) === null || _a === void 0 ? void 0 : _a.address;
        return ((address === null || address === void 0 ? void 0 : address.city) ||
            (address === null || address === void 0 ? void 0 : address.town) ||
            (address === null || address === void 0 ? void 0 : address.village) ||
            (address === null || address === void 0 ? void 0 : address.municipality) ||
            null);
    }
    catch (error) {
        if (((_b = error === null || error === void 0 ? void 0 : error.response) === null || _b === void 0 ? void 0 : _b.status) === 429) {
            console.error("Nominatim rate limit atteint (429)");
            return null;
        }
        console.error("Erreur reverse geocoding (Nominatim) :", (error === null || error === void 0 ? void 0 : error.message) || error);
        return null;
    }
});
const getEventsByPosition = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { latitude, longitude, radius } = req.body;
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 100;
        const parsedRadius = radius !== undefined && radius !== null && radius !== ""
            ? parseFloat(radius)
            : NaN;
        const finalMaxDistance = !isNaN(parsedRadius) ? parsedRadius * 1000 : 50000;
        if (latitude === undefined || longitude === undefined) {
            return res
                .status(400)
                .json({ message: "La latitude et la longitude sont requises." });
        }
        const lat = typeof latitude === "number" ? latitude : parseFloat(latitude);
        const lon = typeof longitude === "number" ? longitude : parseFloat(longitude);
        if (isNaN(lat) || isNaN(lon)) {
            return res
                .status(400)
                .json({ message: "Les coordonnées fournies ne sont pas valides." });
        }
        const currentDate = new Date();
        const fetchUniqueEventsWithCount = (matchCondition) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const totalAgg = yield Event_1.default.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [lon, lat] },
                        distanceField: "distance",
                        maxDistance: finalMaxDistance,
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
            const events = yield Event_1.default.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [lon, lat] },
                        distanceField: "distance",
                        maxDistance: finalMaxDistance,
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
                total: ((_a = totalAgg[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
                events,
            };
        });
        const [pastData, currentData, upcomingData] = yield Promise.all([
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
        let city = null;
        try {
            city = yield getCityFromCoordinates(lat, lon);
        }
        catch (geoError) {
            console.error("Erreur reverse geocoding :", (geoError === null || geoError === void 0 ? void 0 : geoError.message) || geoError);
        }
        if (city) {
            try {
                yield (0, TrackCityConsultationStat_1.trackCityConsultationStat)({ city });
            }
            catch (statError) {
                console.error("Erreur lors du tracking de la consultation ville :", (statError === null || statError === void 0 ? void 0 : statError.message) || statError);
            }
        }
        Retour_1.default.info(`all events from ${city !== null && city !== void 0 ? city : "unknown"} have been read`);
        return res.status(200).json({
            metadata: {
                city,
                radiusKm: !isNaN(parsedRadius) ? parsedRadius : 50,
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
    }
    catch (error) {
        console.error("Erreur lors de la récupération des événements :", error);
        return res.status(500).json({
            message: "Erreur interne du serveur.",
        });
    }
});
const updateEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const eventId = req.params.eventId;
    try {
        const event = yield Event_1.default.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Événement non trouvé" });
        }
        event.title = (_a = req.body.title) !== null && _a !== void 0 ? _a : event.title;
        event.description = (_b = req.body.description) !== null && _b !== void 0 ? _b : event.description;
        event.address = (_c = req.body.address) !== null && _c !== void 0 ? _c : event.address;
        event.color = (_d = req.body.color) !== null && _d !== void 0 ? _d : event.color;
        if (req.body.price !== undefined && req.body.price !== null) {
            const parsedPrice = Number(req.body.price);
            if (Number.isFinite(parsedPrice)) {
                event.price = parsedPrice;
            }
        }
        if (req.body.startingDate) {
            const parsedStartingDate = new Date(req.body.startingDate);
            if (!isNaN(parsedStartingDate.getTime())) {
                event.startingDate = parsedStartingDate;
            }
        }
        if (req.body.endingDate) {
            const parsedEndingDate = new Date(req.body.endingDate);
            if (!isNaN(parsedEndingDate.getTime())) {
                event.endingDate = parsedEndingDate;
            }
        }
        if (req.body.theme !== undefined) {
            event.theme = Array.isArray(req.body.theme)
                ? req.body.theme.filter((theme) => typeof theme === "string" && theme.trim() !== "")
                : typeof req.body.theme === "string" && req.body.theme.trim() !== ""
                    ? [req.body.theme]
                    : event.theme;
        }
        if (req.body.capacity !== undefined && req.body.capacity !== null) {
            const parsedCapacity = Number(req.body.capacity);
            if (Number.isFinite(parsedCapacity)) {
                event.capacity = parsedCapacity;
            }
        }
        if (req.body.translations !== undefined &&
            Array.isArray(req.body.translations)) {
            event.translations = req.body.translations
                .filter((tr) => tr && typeof tr.lang === "string" && tr.lang.trim() !== "")
                .map((tr) => ({
                lang: tr.lang,
                title: typeof tr.title === "string" ? tr.title : "",
                description: typeof tr.description === "string" ? tr.description : "",
                shortDescription: typeof tr.shortDescription === "string" ? tr.shortDescription : "",
            }));
        }
        if (req.body.priceSpecification) {
            const { minPrice, maxPrice, priceCurrency } = req.body.priceSpecification;
            const parsedMinPrice = Number(minPrice);
            const parsedMaxPrice = Number(maxPrice);
            event.priceSpecification = {
                minPrice: Number.isFinite(parsedMinPrice)
                    ? parsedMinPrice
                    : ((_e = event.priceSpecification) === null || _e === void 0 ? void 0 : _e.minPrice) || 0,
                maxPrice: Number.isFinite(parsedMaxPrice)
                    ? parsedMaxPrice
                    : ((_f = event.priceSpecification) === null || _f === void 0 ? void 0 : _f.maxPrice) || 0,
                priceCurrency: priceCurrency || ((_g = event.priceSpecification) === null || _g === void 0 ? void 0 : _g.priceCurrency) || "EUR",
            };
        }
        if (req.body.acceptedPaymentMethod) {
            event.acceptedPaymentMethod = Array.isArray(req.body.acceptedPaymentMethod)
                ? req.body.acceptedPaymentMethod.filter((method) => typeof method === "string" && method.trim() !== "")
                : event.acceptedPaymentMethod;
        }
        if (req.body.organizer) {
            const organizer = req.body.organizer;
            if (!organizer.establishment && !((_h = event.organizer) === null || _h === void 0 ? void 0 : _h.establishment)) {
                return res.status(400).json({
                    message: "L'établissement est obligatoire pour l'organisateur",
                });
            }
            event.organizer = {
                establishment: organizer.establishment || ((_j = event.organizer) === null || _j === void 0 ? void 0 : _j.establishment),
                legalName: organizer.legalName ||
                    ((_k = event.organizer) === null || _k === void 0 ? void 0 : _k.legalName) ||
                    "Organisateur inconnu",
                email: organizer.email || ((_l = event.organizer) === null || _l === void 0 ? void 0 : _l.email) || "Email inconnu",
                phone: organizer.phone || ((_m = event.organizer) === null || _m === void 0 ? void 0 : _m.phone) || "Téléphone inconnu",
            };
        }
        if (typeof req.body.isDraft === "boolean") {
            event.isDraft = req.body.isDraft;
        }
        if (typeof req.body.registrationOpen === "boolean") {
            event.registrationOpen = req.body.registrationOpen;
        }
        if (req.body.image) {
            event.image = Array.isArray(req.body.image)
                ? req.body.image.filter((img) => typeof img === "string" && img.trim() !== "")
                : event.image;
        }
        if (req.body.address &&
            typeof req.body.address === "string" &&
            req.body.address.trim() !== "") {
            try {
                const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(req.body.address)}`);
                if (((_o = responseApiGouv.data.features) === null || _o === void 0 ? void 0 : _o.length) > 0 &&
                    ((_q = (_p = responseApiGouv.data.features[0].geometry) === null || _p === void 0 ? void 0 : _p.coordinates) === null || _q === void 0 ? void 0 : _q.length) === 2) {
                    const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
                    const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
                    event.location = {
                        lat: latitude,
                        lng: longitude,
                        geo: {
                            type: "Point",
                            coordinates: [longitude, latitude],
                        },
                    };
                }
            }
            catch (error) {
                console.error("Erreur géocodage updateEvent:", error);
            }
        }
        const updatedEvent = yield event.save();
        return res.status(200).json({
            message: "Événement mis à jour avec succès",
            event: updatedEvent,
        });
    }
    catch (error) {
        console.error("Erreur lors de la mise à jour de l'événement:", error);
        return res.status(500).json({
            message: "Erreur lors de la mise à jour de l'événement",
            error,
        });
    }
});
const getEventByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { latitude, longitude, radius } = req.body;
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        if (!latitude || !longitude) {
            return res.status(400).json({
                message: "La latitude et la longitude sont requises pour filtrer par position.",
            });
        }
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const radiusInKm = radius ? parseFloat(radius) : 50;
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({
                message: "Les coordonnées fournies ne sont pas valides.",
            });
        }
        const events = yield Event_1.default.aggregate([
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
                    distance: { $lte: radiusInKm / 111.12 },
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
    }
    catch (error) {
        console.error("Erreur lors de la récupération des événements par date et position:", error);
        return res
            .status(500)
            .json({ message: "Erreur interne du serveur", error });
    }
});
const verifAllEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield Event_1.default.find();
        const invalidEvents = [];
        const validEvents = [];
        const defaultImageEvents = [];
        let remainingEvents = events.length;
        for (const event of events) {
            const invalidUrls = [];
            const validUrls = [];
            let hasDefaultImage = false;
            let imagesUpdated = false;
            const updatedImages = [];
            for (const imgUrl of event.image || []) {
                const validationResult = yield validateImageUrl(imgUrl);
                if (validationResult === "Image par défaut") {
                    hasDefaultImage = true;
                    imagesUpdated = true;
                    updatedImages.push("Image par défaut");
                }
                else if (validationResult === imgUrl) {
                    validUrls.push(imgUrl);
                    updatedImages.push(imgUrl);
                }
                else {
                    invalidUrls.push(imgUrl);
                    imagesUpdated = true;
                    updatedImages.push("Image par défaut");
                }
            }
            if (imagesUpdated) {
                event.image = updatedImages;
                yield event.save();
            }
            if (invalidUrls.length > 0) {
                invalidEvents.push({
                    eventId: event._id.toString(),
                    invalidUrls,
                });
            }
            else if (hasDefaultImage) {
                defaultImageEvents.push({
                    eventId: event._id.toString(),
                });
            }
            else {
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
    }
    catch (error) {
        console.error("Erreur lors de la vérification des URL des événements :", error);
        return res.status(500).json({
            message: "Erreur lors de la vérification des URL des événements.",
            error,
        });
    }
});
const updateImageUrls = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Début de la mise à jour des URLs des images...");
        const events = yield Event_1.default.find({ "image.0": { $regex: "^http://" } });
        console.log(`Nombre d'événements trouvés : ${events.length}`);
        if (!events.length) {
            console.log("Aucun événement à mettre à jour.");
            return res.status(200).json({
                message: "Aucun événement à mettre à jour",
                modifiedCount: 0,
            });
        }
        let modifiedCount = 0;
        for (const event of events) {
            console.log(`Traitement de l'événement ID : ${event._id}`);
            console.log("URLs avant mise à jour :", event.image);
            event.image = event.image.map((url) => {
                if (url.startsWith("http://")) {
                    const updatedUrl = url.replace("http://", "https://");
                    console.log(`URL mise à jour : ${url} -> ${updatedUrl}`);
                    return updatedUrl;
                }
                return url;
            });
            yield event.save();
            console.log(`Événement ID : ${event._id} sauvegardé avec succès.`);
            modifiedCount++;
        }
        console.log(`Mise à jour terminée. Nombre total d'événements modifiés : ${modifiedCount}`);
        return res.status(200).json({
            message: "Mise à jour des URLs des images réussie",
            modifiedCount,
        });
    }
    catch (error) {
        console.error("Erreur lors de la mise à jour des URLs des images :", error);
        return res.status(500).json({
            message: "Erreur lors de la mise à jour des URLs des images",
            error,
        });
    }
});
const DEFAULT_IMAGE = "Image par défaut";
const normalizeString = (str) => {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
};
const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
const BATCH_SIZE = 1000;
const PROGRESS_FILE = "./progress.json";
const saveProgress = (page) => {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({ page }), "utf-8");
};
const loadProgress = () => {
    if (fs.existsSync(PROGRESS_FILE)) {
        const data = fs.readFileSync(PROGRESS_FILE, "utf-8");
        const { page } = JSON.parse(data);
        return page || 0;
    }
    return 0;
};
const areCoordinatesEqual = (oldLat, oldLng, newLat, newLng) => {
    const precision = 1e-6;
    return (Math.abs(oldLat - newLat) < precision &&
        Math.abs(oldLng - newLng) < precision);
};
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const haversineDistance = (lat1, lng1, lat2, lng2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
const BATCH_DELAY_MS = 500;
const cleanAddress = (address) => {
    var _a, _b;
    const irrelevantKeywords = /(salle|gymnase|centre|bibliothèque|stade|parc|maison|terrain|foyer|hôtel|église|aréna|théâtre|complexe|jardin|espace)\b.*?(,|$)/gi;
    let cleanedAddress = address.replace(irrelevantKeywords, "").trim();
    const postalCodeRegex = /\b\d{5}\b/;
    const containsPostalCode = postalCodeRegex.test(cleanedAddress);
    if (!containsPostalCode) {
        console.warn(`[LOG] Adresse nettoyée invalide : ${cleanedAddress}`);
        return "";
    }
    const voieTypes = "(rue|avenue|boulevard|place|impasse|route|chemin|allée|cours|quai|voie|square|pont|faubourg|hameau)";
    const regex = new RegExp(`(?:.*?,\\s*)?(\\d{0,5}\\s*\\w+(\\s${voieTypes})?)?,?\\s*(\\d{5}),?\\s*([\\w\\s\\-]+)$`, "i");
    const match = cleanedAddress.match(regex);
    if (match) {
        const street = ((_a = match[1]) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        const postalCode = match[3];
        const city = (_b = match[4]) === null || _b === void 0 ? void 0 : _b.trim();
        return street
            ? `${street}, ${postalCode}, ${city}`
            : `${postalCode}, ${city}`;
    }
    return cleanedAddress;
};
const processBatch = (events, updatedEvents, unmatchedEvents) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    for (const event of events) {
        try {
            let fullAddress = (_a = event.address) === null || _a === void 0 ? void 0 : _a.trim();
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
            yield delay(BATCH_DELAY_MS);
            const response = yield axios_1.default.get("https://api-adresse.data.gouv.fr/search/", { params: { q: fullAddress, limit: 5 }, timeout: 10000 });
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
            const exactMatch = features.find((feature) => {
                var _a;
                const featureLabel = (_a = feature.properties.label) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                return featureLabel === null || featureLabel === void 0 ? void 0 : featureLabel.includes(originalAddress.toLowerCase());
            });
            let bestMatch = exactMatch || features[0];
            if (!exactMatch) {
                console.warn(`[LOG] Pas de correspondance exacte pour : ${event.title} (${originalAddress})`);
                fullAddress = cleanAddress(fullAddress);
                console.log(`[LOG] Tentative avec adresse nettoyée : ${fullAddress}`);
                const retryResponse = yield axios_1.default.get("https://api-adresse.data.gouv.fr/search/", { params: { q: fullAddress, limit: 5 }, timeout: 10000 });
                const retryFeatures = retryResponse.data.features;
                if (retryFeatures && retryFeatures.length > 0) {
                    bestMatch = retryFeatures[0];
                }
                else {
                    unmatchedEvents.push({
                        id: event._id,
                        title: event.title,
                        reason: "Aucune coordonnée trouvée après tentative",
                    });
                    console.warn(`[LOG] Aucun résultat après tentative pour : ${event.title}`);
                    continue;
                }
            }
            const [lng, lat] = bestMatch.geometry.coordinates;
            const oldLocation = event.location || { lat: 0, lng: 0 };
            const newLocation = { lat, lng };
            const hasChanged = oldLocation.lat !== lat || oldLocation.lng !== lng;
            const distanceFromOld = haversineDistance(oldLocation.lat, oldLocation.lng, lat, lng);
            if (hasChanged) {
                event.location = newLocation;
                yield event.save();
                const logColor = distanceFromOld > 100 ? chalk_1.default.blue : chalk_1.default.green;
                console.log(logColor(`[LOG] Coordonnées modifiées pour : ${event.title} (${oldLocation.lat}, ${oldLocation.lng}) -> (${lat}, ${lng}) | Écart : ${distanceFromOld.toFixed(2)} km`));
                updatedEvents.push({
                    id: event._id,
                    title: event.title,
                    newLocation,
                });
            }
            else {
                console.log(chalk_1.default.yellow(`[LOG] Coordonnées identiques pour : ${event.title} (${oldLocation.lat}, ${oldLocation.lng}) -> (${lat}, ${lng})`));
            }
        }
        catch (error) {
            console.error(chalk_1.default.red(`[LOG] Erreur API pour : ${event.title} - ${error}`));
            unmatchedEvents.push({
                id: event._id,
                title: event.title,
                reason: "Erreur API",
            });
        }
    }
});
const getCoordinatesFromAPI = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let page = loadProgress();
        console.log(`[LOG] Reprise du traitement à partir du lot ${page + 1}...`);
        const updatedEvents = [];
        const unmatchedEvents = [];
        const totalEvents = yield Event_1.default.countDocuments();
        console.log(`[LOG] Nombre total d'événements à traiter : ${totalEvents}`);
        while (page * BATCH_SIZE < totalEvents) {
            console.log(`[LOG] Traitement du lot ${page + 1}...`);
            const events = yield Event_1.default.find()
                .skip(page * BATCH_SIZE)
                .limit(BATCH_SIZE);
            yield processBatch(events, updatedEvents, unmatchedEvents);
            page++;
            saveProgress(page);
        }
        return res.status(200).json({
            message: "Mise à jour des coordonnées terminée.",
            updatedEventsCount: updatedEvents.length,
            unmatchedEventsCount: unmatchedEvents.length,
        });
    }
    catch (error) {
        console.error("[LOG] Erreur générale :", error);
        return res.status(500).json({
            message: "Erreur lors de la mise à jour des coordonnées.",
            error: error,
        });
    }
});
const toInt = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};
const normalizeDayRange = (input) => {
    const dayStart = new Date(input);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(input);
    dayEnd.setHours(23, 59, 59, 999);
    return { dayStart, dayEnd };
};
const registrationToAnEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const session = yield mongoose_1.default.startSession();
    try {
        const { eventId } = req.params;
        const { admin: customerId, date, paymentMethod, price, quantity, } = req.body;
        if (!eventId)
            return res.status(400).json({ message: "eventId manquant" });
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
        const now = new Date();
        const selectedEnd = new Date(selected);
        selectedEnd.setHours(23, 59, 59, 999);
        if (selectedEnd < now) {
            return res.status(400).json({ message: "date déjà passée" });
        }
        const qty = (_a = toInt(quantity)) !== null && _a !== void 0 ? _a : 1;
        if (qty <= 0) {
            return res.status(400).json({ message: "La quantité doit être ≥ 1" });
        }
        let resultPayload = null;
        yield session.withTransaction(() => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const eventFinded = yield Event_1.default.findById(eventId).session(session);
            if (!eventFinded) {
                throw { status: 404, message: "Événement introuvable" };
            }
            if (eventFinded.registrationOpen === false) {
                throw { status: 400, message: "Inscription fermée" };
            }
            const customerFinded = yield Customer_1.default.findById(customerId).session(session);
            if (!customerFinded) {
                throw { status: 404, message: "Utilisateur introuvable" };
            }
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
                const selectedDate = new Date(selected);
                end.setHours(23, 59, 59, 999);
                selectedDate.setHours(0, 0, 0, 0);
                if (selectedDate > end) {
                    throw {
                        status: 400,
                        message: "Date hors plage (après fin de l'événement)",
                    };
                }
            }
            const capacityPerDay = (_a = toInt(eventFinded.capacity)) !== null && _a !== void 0 ? _a : 0;
            if (capacityPerDay <= 0) {
                throw { status: 400, message: "Capacité non configurée ou nulle" };
            }
            const { dayStart, dayEnd } = normalizeDayRange(selected);
            const ALLOWED = ["paid", "confirmed"];
            const regsSameDay = yield Registration_1.default.find({
                event: eventFinded._id,
                status: { $in: ALLOWED },
                date: { $gte: dayStart, $lte: dayEnd },
            })
                .select("quantity")
                .session(session);
            const reservedForDay = regsSameDay.reduce((sum, r) => { var _a; return sum + ((_a = toInt(r.quantity)) !== null && _a !== void 0 ? _a : 1); }, 0);
            const remaining = capacityPerDay - reservedForDay;
            if (qty > remaining) {
                throw {
                    status: 400,
                    message: "Plus de places disponibles pour cette date",
                    remaining: Math.max(0, remaining),
                };
            }
            const unitPrice = (_b = toInt(price)) !== null && _b !== void 0 ? _b : 0;
            const ticketNumber = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const newRegistration = new Registration_1.default({
                date: selected,
                customer: customerFinded._id,
                event: eventFinded._id,
                price: unitPrice,
                status: unitPrice > 0 ? "pending" : "confirmed",
                paymentMethod: paymentMethod !== null && paymentMethod !== void 0 ? paymentMethod : (unitPrice > 0 ? "unknown" : "free"),
                quantity: qty,
                ticketNumber,
            });
            let newBill = null;
            if (unitPrice > 0) {
                const invoiceNumber = `INV-${Date.now()}-${Date.now()}`;
                newBill = new Bill_1.default({
                    customer: customerFinded._id,
                    registration: newRegistration._id,
                    amount: unitPrice * newRegistration.quantity,
                    status: "pending",
                    paymentMethod: paymentMethod !== null && paymentMethod !== void 0 ? paymentMethod : "unknown",
                    invoiceNumber,
                    issuedDate: new Date(),
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    items: [
                        {
                            description: `Inscription à l'événement ${eventFinded.title} (${selected.toLocaleDateString("fr-FR")})`,
                            quantity: newRegistration.quantity,
                            price: unitPrice,
                        },
                    ],
                });
                yield newBill.save({ session });
            }
            if (unitPrice <= 0) {
                (_c = customerFinded.eventsReserved) !== null && _c !== void 0 ? _c : (customerFinded.eventsReserved = []);
                customerFinded.eventsReserved.push(eventFinded._id);
                const eventDateFormatted = selected.toLocaleString("fr-FR");
                const invoiceUrl = `https://localappy.fr/api/invoice/${newRegistration._id}`;
                const deepLink = `localappy://event/${eventFinded === null || eventFinded === void 0 ? void 0 : eventFinded._id}`;
                const eventLink = `https://localappy.fr/open?link=${encodeURIComponent(deepLink)}`;
                yield (0, sendEventConfirmation_1.sendEventConfirmationEmail)({
                    to: customerFinded.email,
                    firstName: customerFinded.account.firstname,
                    eventTitle: eventFinded.title,
                    eventDate: eventDateFormatted,
                    eventAddress: eventFinded.address,
                    quantity: newRegistration.quantity,
                    eventLink,
                    invoiceUrl,
                });
                yield customerFinded.save({ session });
            }
            yield newRegistration.save({ session });
            eventFinded.registrations.push(newRegistration._id);
            yield eventFinded.save();
            resultPayload = {
                message: "Inscription créée avec succès",
                registrationId: newRegistration._id,
                billId: newBill ? newBill._id : null,
                remainingForDay: remaining - qty,
            };
        }));
        return res.status(201).json(resultPayload);
    }
    catch (error) {
        const status = (_b = error === null || error === void 0 ? void 0 : error.status) !== null && _b !== void 0 ? _b : 500;
        if (status !== 500) {
            return res.status(status).json(Object.assign({ message: (_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : "Erreur de validation" }, ((error === null || error === void 0 ? void 0 : error.remaining) != null ? { remaining: error.remaining } : {})));
        }
        Retour_1.default.error({ message: "Erreur lors de l'inscription", error });
        return res
            .status(500)
            .json({ message: "Erreur lors de l'inscription", error });
    }
    finally {
        session.endSession();
    }
});
const isSameLocalDayParis = (a, b) => {
    const fmt = new Intl.DateTimeFormat("fr-CA", {
        timeZone: "Europe/Paris",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
    const da = fmt.format(a);
    const db = fmt.format(b);
    return da === db;
};
const uniqObjectIds = (arr) => {
    const seen = new Set();
    const out = [];
    for (const v of arr || []) {
        const s = typeof v === "string" ? v : (v === null || v === void 0 ? void 0 : v._id) ? String(v._id) : String(v);
        if (!mongoose_1.default.isValidObjectId(s))
            continue;
        if (seen.has(s))
            continue;
        seen.add(s);
        out.push(new mongoose_1.Types.ObjectId(s));
    }
    return out;
};
const canScan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { admin } = req.body;
        if (!admin || !admin._id) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const adminId = String(admin._id);
        if (!mongoose_1.default.isValidObjectId(adminId)) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const staffOfIds = Array.isArray(admin.establishmentStaffOf)
            ? admin.establishmentStaffOf
            : [];
        const ownerEstIds = ((_a = admin === null || admin === void 0 ? void 0 : admin.ownerAccount) === null || _a === void 0 ? void 0 : _a.establishments) &&
            Array.isArray(admin.ownerAccount.establishments)
            ? admin.ownerAccount.establishments
            : [];
        const accessibleEstIds = uniqObjectIds([...staffOfIds, ...ownerEstIds]);
        if (!accessibleEstIds.length) {
            return res.status(200).json({
                canScan: false,
                activeEventId: null,
                establishmentsWithEvents: [],
            });
        }
        const now = new Date();
        const establishmentsWithEvents = [];
        let firstEventId = null;
        for (const establishmentId of accessibleEstIds) {
            const establishment = yield Establishment_1.default.findById(establishmentId)
                .populate({
                path: "events",
                match: { startingDate: { $lte: now }, endingDate: { $gte: now } },
                select: "_id title startingDate endingDate",
                options: { sort: { startingDate: 1 } },
            })
                .select("_id name activated events")
                .lean();
            if (!establishment)
                continue;
            const events = Array.isArray(establishment.events)
                ? establishment.events
                : [];
            const notFinished = events.filter((ev) => {
                if (!(ev === null || ev === void 0 ? void 0 : ev.endingDate))
                    return false;
                return new Date(ev.endingDate) >= now;
            });
            if (!notFinished.length)
                continue;
            if (!firstEventId)
                firstEventId = notFinished[0]._id;
            establishmentsWithEvents.push({
                _id: establishment._id,
                name: establishment.name,
                activated: establishment.activated,
                events: notFinished,
            });
        }
        if (!establishmentsWithEvents.length) {
            return res.status(200).json({
                canScan: false,
                activeEventId: null,
                establishmentsWithEvents: [],
            });
        }
        return res.status(200).json({
            canScan: true,
            activeEventId: firstEventId,
            establishmentsWithEvents,
        });
    }
    catch (e) {
        console.error("[canScan] error", e);
        return res.status(500).json({ message: "Internal server error" });
    }
});
const scanATicketForAnEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const { url } = req.body;
        if (!url) {
            return res.status(404).json({ message: "url invalide" });
        }
        const bytes = CryptoJS.AES.decrypt(url, process.env.SALT_SCAN);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        let registrationId;
        let requesterId;
        try {
            const parsed = JSON.parse(originalText);
            registrationId = parsed.registrationId;
            requesterId = parsed.requesterId;
        }
        catch (e) {
            return res.status(400).json({ message: "Format du QR invalide." });
        }
        if (!mongoose_1.default.isValidObjectId(registrationId)) {
            return res.status(400).json({ message: "registrationId invalide." });
        }
        if (requesterId && !mongoose_1.default.isValidObjectId(requesterId)) {
            return res.status(400).json({ message: "requesterId invalide." });
        }
        if (!requesterId) {
            return res
                .status(400)
                .json({ message: "Aucun scanneur (byWho) fourni." });
        }
        const reg = yield Registration_1.default.findById(registrationId).select("_id event status checkInStatus");
        if (!reg)
            return res
                .status(404)
                .json({ message: "Billet/registration introuvable." });
        const now = new Date();
        const regDate = reg === null || reg === void 0 ? void 0 : reg.date;
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
        const checkInStatus = reg === null || reg === void 0 ? void 0 : reg.checkInStatus;
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
        const event = yield Event_1.default.findById(reg.event).select("_id registrations organizer.establishment");
        if (!event)
            return res.status(404).json({ message: "Événement introuvable." });
        const eventEstabId = (_b = (_a = event === null || event === void 0 ? void 0 : event.organizer) === null || _a === void 0 ? void 0 : _a.establishment) === null || _b === void 0 ? void 0 : _b.toString();
        if (!eventEstabId) {
            return res
                .status(400)
                .json({ message: "Aucun établissement rattaché à cet événement." });
        }
        let byWhoModel = "Customer";
        let authorized = false;
        const [ownerDoc, customerDoc] = yield Promise.all([
            Owner_1.default.findById(requesterId).select("_id establishments establishment"),
            Customer_1.default.findById(requesterId).select("_id establishmentStaffOf establishment establishments"),
        ]);
        if (ownerDoc) {
            byWhoModel = "Owner";
            const raw = (_d = (_c = ownerDoc.establishments) !== null && _c !== void 0 ? _c : ownerDoc.establishment) !== null && _d !== void 0 ? _d : [];
            const ownerEstabIds = Array.isArray(raw)
                ? raw.map((id) => id === null || id === void 0 ? void 0 : id.toString())
                : [raw === null || raw === void 0 ? void 0 : raw.toString()];
            if (ownerEstabIds.filter(Boolean).includes(eventEstabId))
                authorized = true;
        }
        if (!authorized && customerDoc) {
            byWhoModel = "Customer";
            const raw = (_g = (_f = (_e = customerDoc.establishmentStaffOf) !== null && _e !== void 0 ? _e : customerDoc.establishments) !== null && _f !== void 0 ? _f : customerDoc.establishment) !== null && _g !== void 0 ? _g : [];
            const staffOfIds = Array.isArray(raw)
                ? raw.map((id) => id === null || id === void 0 ? void 0 : id.toString())
                : [raw === null || raw === void 0 ? void 0 : raw.toString()];
            if (staffOfIds.filter(Boolean).includes(eventEstabId))
                authorized = true;
        }
        if (!authorized) {
            return res.status(403).json({
                message: "Non autorisé : le scanneur n’est ni propriétaire ni staff de cet établissement.",
            });
        }
        const updated = yield Event_1.default.findOneAndUpdate({
            _id: event._id,
            registrations: reg._id,
            "entries.registration": { $ne: reg._id },
        }, {
            $push: {
                entries: {
                    checkedInAt: new Date(),
                    registration: reg._id,
                    byWho: requesterId,
                    byWhoModel,
                },
            },
        }, { new: true }).select("_id entries");
        if (!updated) {
            const already = yield Event_1.default.exists({
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
                message: "Incohérence : l'événement ne référence pas cette registration.",
            });
        }
        return res.json({
            ok: true,
            message: "Entrée enregistrée.",
            entriesCount: updated.entries.length,
            lastEntry: updated.entries[updated.entries.length - 1],
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erreur interne." });
    }
});
const PRESENCE_TIMEOUT_MINUTES = 20;
const getLiveEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { eventId } = req.params;
        const customerId = ((_a = req.customer) === null || _a === void 0 ? void 0 : _a._id) || ((_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.admin) === null || _c === void 0 ? void 0 : _c._id);
        if (!mongoose_1.default.isValidObjectId(eventId)) {
            return res.status(400).json({ message: "eventId invalide" });
        }
        const event = yield Event_1.default.findById(eventId).select("_id title startingDate endingDate isDraft");
        if (!event) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        const now = new Date();
        const isLive = !!event.startingDate &&
            !!event.endingDate &&
            new Date(event.startingDate) <= now &&
            new Date(event.endingDate) >= now &&
            !event.isDraft;
        const activeSince = new Date(Date.now() - PRESENCE_TIMEOUT_MINUTES * 60 * 1000);
        const participantsCount = yield EventPresence_1.default.countDocuments({
            event: event._id,
            isActive: true,
            lastSeenAt: { $gte: activeSince },
        });
        const livePhotosCount = yield EventLivePhoto_1.default.countDocuments({
            event: event._id,
            status: "approved",
        });
        const recentPhotos = yield EventLivePhoto_1.default.find({
            event: event._id,
            status: "approved",
        })
            .populate({
            path: "customer",
            model: "Customer",
            select: "account.firstname account.lastname",
        })
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();
        let userIsPresent = false;
        if (customerId) {
            const presence = yield EventPresence_1.default.findOne({
                event: event._id,
                customer: customerId,
                isActive: true,
                lastSeenAt: { $gte: activeSince },
            });
            userIsPresent = !!presence;
        }
        return res.status(200).json({
            eventId: event._id,
            isLive,
            participantsCount,
            livePhotosCount,
            userIsPresent,
            recentPhotos,
        });
    }
    catch (error) {
        console.error("Erreur getLiveEvent:", error);
        return res.status(500).json({
            message: "Erreur récupération live event",
            error,
        });
    }
});
const deleteEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const eventId = req.params.eventId;
    const owner = req.body.owner;
    try {
        const eventFinded = yield Event_1.default.findById(eventId).select("_id organizer registrations deletedAt");
        if (!owner) {
            Retour_1.default.error("Non autorisé à supprimer");
            return res.status(403).json({ message: "Non autorisé à supprimer" });
        }
        if (!eventFinded) {
            Retour_1.default.error("Événement non trouvé");
            return res.status(404).json({ message: "Événement non trouvé" });
        }
        if (eventFinded.deletedAt) {
            Retour_1.default.error("Événement déjà supprimé");
            return res.status(409).json({ message: "Événement déjà supprimé" });
        }
        const hasRegistrations = Array.isArray(eventFinded.registrations) &&
            eventFinded.registrations.length > 0;
        if (hasRegistrations) {
            Retour_1.default.error("Impossible de supprimer un événement avec des inscriptions");
            return res.status(409).json({
                message: "Impossible de supprimer un événement avec des inscriptions",
            });
        }
        yield Event_1.default.findByIdAndUpdate(eventId, {
            $set: {
                deletedAt: new Date(),
                isDraft: false,
            },
        });
        return res.status(200).json({
            message: `L'événement ${eventId} a été supprimé avec succès`,
        });
    }
    catch (error) {
        console.error("Erreur lors de la suppression de l'événement:", error);
        return res.status(500).json({ error });
    }
});
const deleteDuplicateEvents = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.info("Début de la suppression des événements en double avec fusion des images.");
        const events = yield Event_1.default.find({});
        if (!events.length) {
            console.info("Aucun événement trouvé dans la base de données.");
            return res.status(200).json({ message: "Aucun événement à vérifier." });
        }
        console.info(`Nombre total d'événements récupérés : ${events.length}`);
        const normalizedEvents = events.map((event) => {
            var _a, _b;
            return ({
                id: event._id,
                title: event.title,
                normalizedTitle: normalizeString(event.title),
                startingDate: (_a = event.startingDate) === null || _a === void 0 ? void 0 : _a.toISOString(),
                endingDate: (_b = event.endingDate) === null || _b === void 0 ? void 0 : _b.toISOString(),
                image: event.image || [],
            });
        });
        const groupedEvents = {};
        normalizedEvents.forEach((event) => {
            const key = `${event.normalizedTitle}_${event.startingDate}_${event.endingDate}`;
            if (!groupedEvents[key]) {
                groupedEvents[key] = [];
            }
            groupedEvents[key].push(event);
        });
        const duplicates = Object.values(groupedEvents).filter((events) => events.length > 1);
        console.info(`Nombre de groupes avec doublons trouvés : ${duplicates.length}`);
        if (!duplicates.length) {
            console.info("Aucun doublon détecté.");
            return res.status(200).json({ message: "Aucun doublon détecté." });
        }
        let deletedCount = 0;
        for (const duplicateGroup of duplicates) {
            const [keepEvent, ...toDeleteEvents] = duplicateGroup;
            console.info(`Conservation de l'événement : Titre="${keepEvent.title}"`);
            for (const event of toDeleteEvents) {
                if (keepEvent.image.length === 0 && event.image.length > 0) {
                    console.info(`Ajout des images de l'événement : Titre="${event.title}"`);
                    yield Event_1.default.updateOne({ _id: keepEvent.id }, { $set: { image: event.image } });
                }
                const deleteResult = yield Event_1.default.deleteOne({ _id: event.id });
                if (deleteResult.deletedCount > 0) {
                    console.info(`Événement supprimé : Titre="${event.title}"`);
                    deletedCount++;
                }
                else {
                    console.warn(`Échec de la suppression pour l'événement : Titre="${event.title}"`);
                }
            }
        }
        console.info(`Nombre total d'événements supprimés : ${deletedCount}`);
        return res.status(200).json({
            message: "Événements en double supprimés avec succès, images fusionnées si nécessaire.",
            deletedCount,
        });
    }
    catch (error) {
        console.error("Erreur lors de la suppression des doublons :", error);
        return res.status(500).json({
            message: "Erreur lors de la suppression des doublons.",
            error,
        });
    }
});
const removeMidnightDates = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.info("Début de la suppression des événements ayant des dates à minuit.");
        const result = yield Event_1.default.deleteMany({
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
    }
    catch (error) {
        console.error("Erreur lors de la suppression des événements :", error);
        return res.status(500).json({
            message: "Erreur lors de la suppression des événements.",
            error,
        });
    }
});
const removeExpiredEvents = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.info("Début de la suppression des événements expirés.");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const result = yield Event_1.default.deleteMany({
            endingDate: { $lt: today },
        });
        console.info(`Nombre d'événements supprimés : ${result.deletedCount}`);
        return res.status(200).json({
            message: "Événements expirés supprimés avec succès.",
            deletedCount: result.deletedCount,
        });
    }
    catch (error) {
        console.error("Erreur lors de la suppression des événements :", error);
        return res.status(500).json({
            message: "Erreur lors de la suppression des événements expirés.",
            error,
        });
    }
});
const deleteInvalidEvents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const nullDatesResult = yield Event_1.default.deleteMany({
            $or: [{ startingDate: null }, { endingDate: null }],
        });
        console.log(`Événements supprimés : ${nullDatesResult.deletedCount} avec startingDate ou endingDate null.`);
        const targetStartingDate = new Date("2024-12-31T23:00:00.000+00:00");
        const targetEndingDate = new Date("2025-12-31T22:59:59.000+00:00");
        const specificDeleteResult = yield Event_1.default.deleteMany({
            startingDate: targetStartingDate,
            endingDate: targetEndingDate,
        });
        console.log(`Événements supprimés : ${specificDeleteResult.deletedCount} avec startingDate et endingDate précises.`);
        res.status(200).json({
            message: `${nullDatesResult.deletedCount} événements avec dates nulles supprimés, ${specificDeleteResult.deletedCount} événements avec les dates spécifiques supprimés.`,
        });
    }
    catch (error) {
        console.error("Erreur lors de la suppression des événements :", error);
        res.status(500).json({
            error: "Erreur lors de la suppression des événements.",
            details: error,
        });
    }
});
const updateDescriptionsAndPrices = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Début de la mise à jour des descriptions et des prix.");
        console.log("Recherche des événements contenant des balises HTML...");
        const events = yield Event_1.default.find({ description: { $regex: /<[^>]+>/ } });
        console.log(`${events.length} événements trouvés avec des balises HTML.`);
        const updatedEvents = yield Promise.all(events.map((event) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            console.log(`Traitement de l'événement : ${event.title} (${event._id})`);
            const originalDescription = event.description;
            event.description = cleanHTML(event.description);
            if (originalDescription !== event.description) {
                console.log(`Description nettoyée pour l'événement : ${event.title}`);
            }
            if (event.price === null) {
                console.log(`Prix null détecté pour ${event.title}. Remplacement par 0.`);
                Object(event).price = 0;
            }
            if (event.priceSpecification) {
                if (event.priceSpecification.minPrice === null) {
                    console.log(`minPrice null détecté pour ${event.title}. Remplacement par 0.`);
                    event.priceSpecification.minPrice = 0;
                }
                if (event.priceSpecification.maxPrice === null) {
                    console.log(`maxPrice null détecté pour ${event.title}. Remplacement par 0.`);
                    event.priceSpecification.maxPrice = 0;
                }
            }
            if (!((_b = (_a = event.location) === null || _a === void 0 ? void 0 : _a.geo) === null || _b === void 0 ? void 0 : _b.coordinates) ||
                event.location.geo.coordinates.length !== 2) {
                console.log(`Coordonnées invalides détectées pour ${event.title}. Correction en cours...`);
                Object(event).location.geo.coordinates = [0, 0];
            }
            yield event.save();
            console.log(`Événement mis à jour : ${event.title} (${event._id})`);
            return event;
        })));
        console.log("Mise à jour terminée pour tous les événements.");
        res.status(200).json({
            message: `${updatedEvents.length} événements mis à jour.`,
            updatedEvents,
        });
    }
    catch (error) {
        console.error("Erreur lors de la mise à jour des descriptions et des prix :", error);
        res
            .status(500)
            .json({ message: "Erreur interne du serveur.", error: error });
    }
});
function cleanHTML(description) {
    if (!description)
        return description;
    const cleaned = description
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
    return cleaned;
}
exports.default = {
    createDraftEvent,
    createEventForAnEstablishment,
    readEvent,
    readAll,
    getEventsByPostalCode,
    getEventsByPosition,
    getEventByDate,
    updateEvent,
    getCoordinatesFromAPI,
    verifAllEvent,
    updateImageUrls,
    updateDescriptionsAndPrices,
    registrationToAnEvent,
    canScan,
    scanATicketForAnEvent,
    getLiveEvent,
    deleteEvent,
    deleteDuplicateEvents,
    removeMidnightDates,
    removeExpiredEvents,
    deleteInvalidEvents,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBMEI7QUFFMUIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFFcEQsZ0RBQXdCO0FBQ3hCLHVDQUF5QjtBQUN6QixrREFBMEI7QUFDMUIsa0VBQTBDO0FBQzFDLDBFQUFrRDtBQUNsRCwwREFBa0M7QUFDbEMsNERBQW9DO0FBQ3BDLDBFQUE0RTtBQUM1RSxxREFBMkM7QUFDM0Msd0NBQTBEO0FBQzFELDREQUFvQztBQUNwQywyQ0FBd0U7QUFDeEUsb0ZBQWlGO0FBQ2pGLDRFQUFvRDtBQUNwRCw4RUFBc0Q7QUFDdEQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBV3RDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBZ0tyRCxNQUFNLGdCQUFnQixHQUFHLENBQU8sR0FBVyxFQUFtQixFQUFFOztJQUM5RCxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUcsS0FBSyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQ1Ysd0RBQXdELEdBQUcsR0FBRyxDQUMvRCxDQUFDO1FBQ0YsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDZixDQUFDO0lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsd0NBQXdDLENBQUMsQ0FBQztRQUM1RSxPQUFPLGtCQUFrQixDQUFDO0lBQzVCLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDMUQsSUFDRSxRQUFRLENBQUMsTUFBTSxLQUFLLEdBQUc7YUFDdkIsTUFBQSxRQUFRLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQywwQ0FBRSxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUEsRUFDdEQsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFDO1FBQ2IsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLENBQUMsSUFBSSxDQUFDLCtDQUErQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1lBQ3BFLE9BQU8sa0JBQWtCLENBQUM7UUFDNUIsQ0FBQztJQUNILENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsSUFBSSxlQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxDQUFDLElBQUksQ0FDViw2Q0FBNkMsR0FBRyxHQUFHLEVBQ25ELGlCQUFpQixDQUFBLE1BQUEsR0FBRyxDQUFDLFFBQVEsMENBQUUsTUFBTSxLQUFJLFNBQVMsRUFBRSxDQUNyRCxDQUFDO1lBQ0YsT0FBTyxrQkFBa0IsQ0FBQztRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sQ0FBQyxLQUFLLENBQ1gsd0RBQXdELEdBQUcsRUFBRSxFQUM3RCxHQUFHLENBQ0osQ0FBQztRQUNKLENBQUM7UUFDRCxPQUFPLGtCQUFrQixDQUFDO0lBQzVCLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLFNBQVMsYUFBYSxDQUFDLFFBQWE7O0lBQ2xDLElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUc3QixJQUFJLE1BQUEsTUFBQSxRQUFRLENBQUMsdUJBQXVCLENBQUMsMENBQUcsQ0FBQyxDQUFDLDBDQUFHLDRCQUE0QixDQUFDLEVBQUUsQ0FBQztRQUMzRSxNQUFNLFNBQVMsR0FDYixRQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO1FBQ3JFLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxRQUFhLEVBQUUsRUFBRTtZQUNsQyxJQUFJLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1lBQ2pELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFHRCxJQUFJLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBQzFELENBQUMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDO1lBQzFCLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQy9CLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxZQUFZLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRUQsSUFBSSxRQUFRLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUN6QixNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQVUsRUFBRSxFQUFFO1lBQ3BDLElBQUksS0FBSyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDN0IsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1lBQzNDLENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFHRCxTQUFTLEdBQUcsU0FBUztTQUNsQixNQUFNLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztTQUNsRSxHQUFHLENBQUMsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUNuQixHQUFHLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUNyRSxDQUFDO0lBR0osSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQzNCLFNBQVMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUNyQyxDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbkIsQ0FBQztBQUlELFNBQVMsY0FBYyxDQUFDLFFBQWE7O0lBQ25DLE1BQU0sV0FBVyxHQUFHLE1BQUEsTUFBQSxNQUFBLFFBQVEsQ0FBQyxhQUFhLENBQUMsMENBQUcsQ0FBQyxDQUFDLDBDQUFHLGdCQUFnQixDQUFDLDBDQUFHLENBQUMsQ0FBQyxDQUFDO0lBQzFFLE9BQU8sQ0FDTDtRQUNFLFdBQVcsYUFBWCxXQUFXLHVCQUFYLFdBQVcsQ0FBRyxzQkFBc0IsQ0FBQztRQUNyQyxXQUFXLGFBQVgsV0FBVyx1QkFBWCxXQUFXLENBQUcsd0JBQXdCLENBQUM7UUFDdkMsV0FBVyxhQUFYLFdBQVcsdUJBQVgsV0FBVyxDQUFHLG1CQUFtQixDQUFDO0tBQ25DO1NBQ0UsTUFBTSxDQUFDLE9BQU8sQ0FBQztTQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxrQkFBa0IsQ0FDcEMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGtCQUFrQixDQUFDLFFBQWE7O0lBQ3ZDLE9BQU8sQ0FDTCxDQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsUUFBUSxDQUFDLGdCQUFnQixDQUFDLDBDQUFHLENBQUMsQ0FBQywwQ0FBRyxnQkFBZ0IsQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQztTQUM1RCxNQUFBLE1BQUEsUUFBUSxDQUFDLGNBQWMsQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLDRCQUE0QixDQUM3QixDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUMsUUFBYTs7SUFJdkMsTUFBTSxPQUFPLEdBQUcsTUFBQSxNQUFBLFFBQVEsQ0FBQyxhQUFhLENBQUMsMENBQUcsQ0FBQyxDQUFDLDBDQUFHLFlBQVksQ0FBQyxDQUFDO0lBQzdELElBQUksT0FBTyxFQUFFLENBQUM7UUFDWixPQUFPO1lBQ0wsTUFBTSxFQUFFLFVBQVUsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUM5QyxNQUFNLEVBQUUsVUFBVSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1NBQ2hELENBQUM7SUFDSixDQUFDO0lBQ0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ3hDLENBQUM7QUFFRCxTQUFlLGdCQUFnQixDQUM3QixPQUFlOzs7UUFFZixJQUFJLENBQUM7WUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzVELE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDOUIsOENBQThDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQzVFLENBQUM7WUFDRixNQUFNLE9BQU8sR0FBRyxNQUFBLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSwwQ0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1QyxJQUFJLE1BQUEsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFFBQVEsMENBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQ25DLE9BQU8sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLE9BQU8sQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDdkUsT0FBTztvQkFDTCxHQUFHLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO29CQUNwQyxHQUFHLEVBQUUsT0FBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2lCQUNyQyxDQUFDO1lBQ0osQ0FBQztZQUNELE9BQU8sQ0FBQyxJQUFJLENBQUMsNkNBQTZDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7Q0FBQTtBQUVELFNBQVMsZ0JBQWdCLENBQUMsUUFBYTs7SUFLckMsT0FBTztRQUNMLFNBQVMsRUFDUCxDQUFBLE1BQUEsUUFBUSxDQUFDLGtCQUFrQixDQUFDLDBDQUFHLGtCQUFrQixDQUFDO1lBQ2xELHNCQUFzQjtRQUN4QixLQUFLLEVBQ0gsQ0FBQSxNQUFBLE1BQUEsTUFBQSxRQUFRLENBQUMsWUFBWSxDQUFDLDBDQUFHLENBQUMsQ0FBQywwQ0FBRyxjQUFjLENBQUMsMENBQUcsQ0FBQyxDQUFDO1lBQ2xELHFCQUFxQjtRQUN2QixLQUFLLEVBQ0gsQ0FBQSxNQUFBLE1BQUEsTUFBQSxRQUFRLENBQUMsWUFBWSxDQUFDLDBDQUFHLENBQUMsQ0FBQywwQ0FBRyxrQkFBa0IsQ0FBQywwQ0FBRyxDQUFDLENBQUMsS0FBSSxZQUFZO0tBQ3pFLENBQUM7QUFDSixDQUFDO0FBRUQsU0FBUyx5QkFBeUIsQ0FBQyxRQUFhO0lBQzlDLElBQUksUUFBUSxHQUFXLENBQUMsQ0FBQztJQUN6QixJQUFJLFFBQVEsR0FBVyxDQUFDLENBQUM7SUFDekIsSUFBSSxhQUFhLEdBQUcsS0FBSyxDQUFDO0lBRTFCLE1BQU0sTUFBTSxHQUFHLENBQUEsUUFBUSxhQUFSLFFBQVEsdUJBQVIsUUFBUSxDQUFFLE1BQU0sS0FBSSxFQUFFLENBQUM7SUFFdEMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQVUsRUFBRSxFQUFFO1FBQzVCLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxDQUFDO1FBRXJFLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQVMsRUFBRSxFQUFFO1lBQ3hDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzFDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUNuQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQztZQUc5QyxJQUFJLENBQUMsU0FBUyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN4QixRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDbkQsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ3hCLFFBQVE7b0JBQ04sUUFBUSxLQUFLLENBQUM7d0JBQ1osQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7d0JBQ25CLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUM5QyxDQUFDO1lBR0QsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUM5QyxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN2RCxDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQzdCLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ3pCLFFBQVE7d0JBQ04sUUFBUSxLQUFLLENBQUM7NEJBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUM7NEJBQ3hCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLFNBQVMsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDO1lBQ0gsQ0FBQztpQkFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sU0FBUyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDeEMsUUFBUSxHQUFHLFFBQVEsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDeEUsQ0FBQztZQUdELElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2IsYUFBYSxHQUFHLFFBQVEsQ0FBQztZQUMzQixDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU87UUFDTCxhQUFhO1FBQ2IsUUFBUTtRQUNSLFFBQVE7UUFDUixLQUFLLEVBQUUsUUFBUTtLQUNoQixDQUFDO0FBQ0osQ0FBQztBQUVELE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxRQUFhLEVBQUUsRUFBRTs7SUFDNUMsTUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBR3hCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7SUFHNUMsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdoRCxNQUFNLE9BQU8sR0FBRyxDQUFBLE1BQUEsTUFBQSxRQUFRLENBQUMsY0FBYywwQ0FBRyxDQUFDLENBQUMsMENBQUcsZ0JBQWdCLENBQUMsS0FBSSxFQUFFLENBQUM7SUFFdkUsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUM7UUFDN0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN0QixHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQ3hCLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7S0FDeEIsQ0FBQyxDQUFDO0lBRUgsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUUsQ0FBQztRQUNsQyxZQUFZLENBQUMsSUFBSSxDQUFDO1lBQ2hCLElBQUk7WUFDSixLQUFLLEVBQUUsQ0FBQSxNQUFBLE1BQU0sQ0FBQyxJQUFJLENBQUMsMENBQUcsQ0FBQyxDQUFDLEtBQUksU0FBUztZQUNyQyxnQkFBZ0IsRUFBRSxDQUFBLE1BQUEsUUFBUSxDQUFDLElBQUksQ0FBQywwQ0FBRyxDQUFDLENBQUMsS0FBSSxTQUFTO1lBQ2xELFdBQVcsRUFBRSxDQUFBLE1BQUEsT0FBTyxDQUFDLElBQUksQ0FBQywwQ0FBRyxDQUFDLENBQUMsS0FBSSxTQUFTO1NBQzdDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPLFlBQVksQ0FBQztBQUN0QixDQUFDLENBQUM7QUFFRixNQUFNLDJCQUEyQixHQUFHLENBQ2xDLEdBQVksRUFDWixHQUFhLEVBQ2IsSUFBa0IsRUFDbEIsRUFBRTs7SUFDRixJQUFJLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztRQXdCdkUsTUFBTSxhQUFhLEdBQVUsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sYUFBYSxHQUFVLEVBQUUsQ0FBQztRQUNoQyxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7UUFFcEMsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUM7Z0JBQ0gsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNoRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBRWhFLE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FDM0IsQ0FBQSxNQUFBLE1BQUEsUUFBUSxDQUFDLFlBQVksQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxLQUFJLGVBQWUsQ0FDbkQsQ0FBQztnQkFDRixNQUFNLFdBQVcsR0FBRyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFFakQsTUFBTSxVQUFVLEdBQUcsQ0FDakIsUUFBYSxFQUMyQixFQUFFO29CQUMxQyxNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUNwRCxJQUFJLGFBQWEsR0FBZ0IsSUFBSSxDQUFDO29CQUN0QyxJQUFJLFNBQVMsR0FBZ0IsSUFBSSxDQUFDO29CQUVsQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBVyxFQUFFLEVBQUU7d0JBQ25DLElBQUksQ0FBQzs0QkFFSCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dDQUN0QixPQUFPLENBQUMsSUFBSSxDQUNWLHlEQUF5RCxFQUN6RCxNQUFNLENBQ1AsQ0FBQztnQ0FDRixPQUFPOzRCQUNULENBQUM7NEJBR0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQ3BCLEdBQUcsTUFBTSxDQUFDLFNBQVMsSUFBSSxNQUFNLENBQUMsU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUN4RCxDQUFDOzRCQUVGLElBQUksS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0NBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQ1YsbURBQW1ELEVBQ25ELE1BQU0sQ0FDUCxDQUFDO2dDQUNGLE9BQU87NEJBQ1QsQ0FBQzs0QkFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksQ0FDbEIsR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQyxTQUFTLElBQUksTUFBTSxDQUFDLE9BQU8sSUFBSSxVQUFVLEVBQUUsQ0FDeEUsQ0FBQzs0QkFFRixJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDO2dDQUN6QixPQUFPLENBQUMsSUFBSSxDQUNWLGlEQUFpRCxFQUNqRCxNQUFNLENBQ1AsQ0FBQztnQ0FDRixPQUFPOzRCQUNULENBQUM7NEJBR0QsSUFBSSxDQUFDLGFBQWEsSUFBSSxLQUFLLEdBQUcsYUFBYSxFQUFFLENBQUM7Z0NBQzVDLGFBQWEsR0FBRyxLQUFLLENBQUM7NEJBQ3hCLENBQUM7NEJBQ0QsSUFBSSxDQUFDLFNBQVMsSUFBSSxHQUFHLEdBQUcsU0FBUyxFQUFFLENBQUM7Z0NBQ2xDLFNBQVMsR0FBRyxHQUFHLENBQUM7NEJBQ2xCLENBQUM7d0JBQ0gsQ0FBQzt3QkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDOzRCQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1gsMkNBQTJDLEVBQzNDLE1BQU0sRUFDTixLQUFLLENBQ04sQ0FBQzt3QkFDSixDQUFDO29CQUNILENBQUMsQ0FBQyxDQUFDO29CQUdILElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzt3QkFDakMsTUFBTSxJQUFJLEtBQUssQ0FDYixrRUFBa0UsQ0FDbkUsQ0FBQztvQkFDSixDQUFDO29CQUdELE9BQU87d0JBQ0wsU0FBUyxFQUFHLGFBQXNCLENBQUMsV0FBVyxFQUFFO3dCQUNoRCxPQUFPLEVBQUcsU0FBa0IsQ0FBQyxXQUFXLEVBQUU7cUJBQzNDLENBQUM7Z0JBQ0osQ0FBQyxDQUFDO2dCQUdGLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsa0JBQWtCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBR3RELE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUdwRCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRXZDLE1BQU0sa0JBQWtCLEdBQUcseUJBQXlCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRy9ELE1BQU0scUJBQXFCLEdBQ3pCLFFBQVEsQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFHakQsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBRTdDLElBQUksT0FBTyxHQUFHLE1BQU0sZUFBSyxDQUFDLE9BQU8sQ0FBQztvQkFDaEMsSUFBSSxFQUFFO3dCQUNKLEVBQUUsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLElBQUksTUFBTSxDQUFDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRTt3QkFDbEU7NEJBQ0UsT0FBTyxFQUFFO2dDQUNQLE1BQU0sRUFBRSxJQUFJLE1BQU0sQ0FDaEIsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFDN0MsR0FBRyxDQUNKOzZCQUNGO3lCQUNGO3dCQUNELEVBQUUsWUFBWSxFQUFFLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFO3FCQUN0QztpQkFDRixDQUFDLENBQUM7Z0JBRUgsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNiLE1BQU0sUUFBUSxHQUFHLElBQUksZUFBSyxDQUFDO3dCQUN6QixLQUFLO3dCQUNMLFdBQVc7d0JBQ1gsWUFBWSxFQUFFLG1CQUFtQixDQUFDLFFBQVEsQ0FBQzt3QkFDM0MsT0FBTyxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUM7d0JBQ2pDLFFBQVEsRUFBRTs0QkFDUixHQUFHLEVBQUUsTUFBTTs0QkFDWCxHQUFHLEVBQUUsTUFBTTs0QkFDWCxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRTt5QkFDdEQ7d0JBQ0QsWUFBWSxFQUFFLFNBQVM7d0JBQ3ZCLFVBQVUsRUFBRSxPQUFPO3dCQUNuQixLQUFLLEVBQUUsTUFBTTt3QkFDYixTQUFTO3dCQUNULEtBQUssRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUM7d0JBQzdDLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxLQUFLO3dCQUMvQixrQkFBa0I7d0JBQ2xCLHFCQUFxQjtxQkFDdEIsQ0FBQyxDQUFDO29CQUNILE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO29CQUN0QixhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLFFBQVEsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO29CQUNoRSxnQkFBTSxDQUFDLElBQUksQ0FDVCxRQUFRLGFBQWEsQ0FBQyxNQUFNLDZCQUE2QixRQUFRLENBQUMsS0FBSyxFQUFFLENBQzFFLENBQUM7Z0JBQ0osQ0FBQztxQkFBTSxDQUFDO29CQUNOLE9BQU8sQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO29CQUNsQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxHQUFHO3dCQUN6QixHQUFHLEVBQUUsTUFBTTt3QkFDWCxHQUFHLEVBQUUsTUFBTTt3QkFDWCxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRTtxQkFDdEQsQ0FBQztvQkFDRixPQUFPLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztvQkFDdkIsT0FBTyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxLQUFLLENBQUM7b0JBQ2pELE9BQU8sQ0FBQyxZQUFZLEdBQUcsbUJBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3JELE9BQU8sQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQztvQkFDaEQsT0FBTyxDQUFDLHFCQUFxQixHQUFHLHFCQUFxQixDQUFDO29CQUN0RCxNQUFNLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDckIsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztvQkFDOUQsZ0JBQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO2dCQUN6RCxDQUFDO1lBQ0gsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQy9CLE9BQU8sQ0FBQyxLQUFLLENBQ1gsMENBQTBDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFDckQsS0FBSyxDQUNOLENBQUM7WUFDSixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLG9DQUFvQztZQUM3QyxZQUFZLEVBQUUsYUFBYSxDQUFDLE1BQU07WUFDbEMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxNQUFNO1lBQzlCLGNBQWMsRUFBRSxjQUFjLENBQUMsTUFBTTtZQUNyQyxhQUFhO1lBQ2IsYUFBYTtZQUNiLGNBQWM7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekMsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzVELENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBVSxFQUFpQixFQUFFO0lBQ25ELElBQUksS0FBSyxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNuQyxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7SUFHRCxJQUFJLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN2QixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUM3RCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2YsT0FBTyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNyRCxDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU8sQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDO0FBc0tGLE1BQU0sNkJBQTZCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQzFFLElBQUksQ0FBQztRQUNILE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO1FBQ25ELE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBRWpDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakQsSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLHVCQUFhLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBRTFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLGdCQUFNLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7WUFDeEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUdELElBQUksRUFBRSxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBQzNCLElBQUksUUFBUSxHQUNWLENBQUEsTUFBQSxVQUFVLENBQUMsUUFBUSwwQ0FBRSxHQUFHLE1BQUksTUFBQSxtQkFBbUIsYUFBbkIsbUJBQW1CLHVCQUFuQixtQkFBbUIsQ0FBRSxRQUFRLDBDQUFFLEdBQUcsQ0FBQSxDQUFDO1FBQ2pFLElBQUksU0FBUyxHQUNYLENBQUEsTUFBQSxVQUFVLENBQUMsUUFBUSwwQ0FBRSxHQUFHLE1BQUksTUFBQSxtQkFBbUIsYUFBbkIsbUJBQW1CLHVCQUFuQixtQkFBbUIsQ0FBRSxRQUFRLDBDQUFFLEdBQUcsQ0FBQSxDQUFDO1FBRWpFLElBQUksT0FBTyxFQUFFLENBQUM7WUFDWixNQUFNLGVBQWUsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQ3JDLDhDQUE4QyxPQUFPLEVBQUUsQ0FDeEQsQ0FBQztZQUVGLElBQ0UsQ0FBQSxNQUFBLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSwwQ0FBRSxNQUFNLElBQUcsQ0FBQztnQkFDekMsQ0FBQSxNQUFBLE1BQUEsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSwwQ0FBRSxXQUFXLDBDQUFFLE1BQU0sTUFBSyxDQUFDLEVBQ3BFLENBQUM7Z0JBQ0QsU0FBUyxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3JFLFFBQVEsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxLQUFJLE1BQUEsbUJBQW1CLENBQUMsT0FBTywwQ0FBRSxNQUFNLENBQUEsSUFBSSxFQUFFLENBQUM7UUFDNUUsQ0FBQztRQUdELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDekMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSztZQUNoQixDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRO2dCQUNsQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDbEIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBRzdCLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDYixLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksVUFBVSxDQUFDLEtBQUs7WUFDekMsS0FBSztZQUNMLFlBQVksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxVQUFVLENBQUMsWUFBWTtZQUM5RCxVQUFVLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLElBQUksVUFBVSxDQUFDLFVBQVU7WUFDeEQsT0FBTztZQUNQLFFBQVEsRUFBRTtnQkFDUixHQUFHLEVBQUUsUUFBUTtnQkFDYixHQUFHLEVBQUUsU0FBUztnQkFDZCxHQUFHLEVBQUU7b0JBQ0gsSUFBSSxFQUFFLE9BQU87b0JBQ2IsV0FBVyxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQztpQkFDbkM7YUFDRjtZQUNELEtBQUssRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxVQUFVLENBQUMsS0FBSztZQUN6QyxrQkFBa0IsRUFBRTtnQkFDbEIsUUFBUSxFQUFFLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQiwwQ0FBRSxRQUFRLEtBQUksQ0FBQztnQkFDcEQsUUFBUSxFQUFFLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQiwwQ0FBRSxRQUFRLEtBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQztnQkFDdEUsYUFBYSxFQUFFLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQiwwQ0FBRSxhQUFhLEtBQUksS0FBSzthQUNuRTtZQUNELFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxVQUFVLENBQUMsUUFBUTtZQUNsRCxTQUFTLEVBQUU7Z0JBQ1QsYUFBYSxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsYUFBYTtnQkFDakQsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsU0FBUztnQkFDekMsS0FBSyxFQUFFLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsMENBQUUsS0FBSyxLQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSztnQkFDOUQsS0FBSyxFQUFFLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsMENBQUUsS0FBSyxLQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsS0FBSzthQUMvRDtZQUNELFlBQVksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVk7WUFDbkMsZ0JBQWdCLEVBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTO2dCQUNyQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0I7Z0JBQzNCLENBQUMsQ0FBQyxJQUFJO1lBQ1YscUJBQXFCLEVBQ25CLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLElBQUksVUFBVSxDQUFDLHFCQUFxQjtZQUNwRSxXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksVUFBVSxDQUFDLFdBQVc7WUFDM0QsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLFVBQVUsQ0FBQyxLQUFLO1lBQ3pDLE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFeEIsSUFBSSxDQUFDLENBQUEsTUFBQSxtQkFBbUIsYUFBbkIsbUJBQW1CLHVCQUFuQixtQkFBbUIsQ0FBRSxNQUFNLDBDQUFFLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUEsRUFBRSxDQUFDO1lBQzNELE1BQUEsbUJBQW1CLGFBQW5CLG1CQUFtQix1QkFBbkIsbUJBQW1CLENBQUUsTUFBTSwwQ0FBRSxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2xELE1BQU0sbUJBQW1CLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDO2dCQUNILE1BQU0sVUFBVSxHQUFHLElBQUksdUJBQVUsQ0FBQztvQkFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQTRCO2lCQUNqRCxDQUFDLENBQUM7Z0JBRUgsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBTSxDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUVqRSxNQUFNLFVBQVUsR0FBRztvQkFDakIsSUFBSSxzQkFBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7aUJBQzlELENBQUM7Z0JBRUYsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFNLEVBQUUsRUFBRTtvQkFDNUIsSUFBSSxDQUFDLENBQUM7d0JBQUUsT0FBTyxFQUFFLENBQUM7b0JBQ2xCLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN6QixPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFO3dCQUNsQyxRQUFRLEVBQUUsY0FBYzt3QkFDeEIsSUFBSSxFQUFFLFNBQVM7d0JBQ2YsS0FBSyxFQUFFLFNBQVM7d0JBQ2hCLEdBQUcsRUFBRSxTQUFTO3dCQUNkLElBQUksRUFBRSxTQUFTO3dCQUNmLE1BQU0sRUFBRSxTQUFTO3FCQUNsQixDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDO2dCQUVGLE1BQU0sZUFBZSxHQUFHO29CQUN0Qjt3QkFDRSxLQUFLLEVBQUUsbUJBQW1CLENBQUMsS0FBSzt3QkFDaEMsSUFBSSxFQUFFOzRCQUNKLElBQUksRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsRUFBRTs0QkFDekMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsSUFBSTs0QkFDNUMsV0FBVyxFQUFFLE1BQUEsVUFBVSxDQUFDLEtBQUssbUNBQUksRUFBRTs0QkFDbkMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDOzRCQUNsRCxXQUFXLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUM7NEJBQzlDLGFBQWEsRUFBRSxNQUFBLFVBQVUsQ0FBQyxPQUFPLG1DQUFJLEVBQUU7NEJBQ3ZDLFdBQVcsRUFDVCxPQUFPLFVBQVUsQ0FBQyxLQUFLLEtBQUssUUFBUTtnQ0FDbEMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFO2dDQUM3QixDQUFDLENBQUMsTUFBTSxDQUFDLE1BQUEsVUFBVSxDQUFDLEtBQUssbUNBQUksRUFBRSxDQUFDOzRCQUNwQyxjQUFjLEVBQ1osT0FBTyxVQUFVLENBQUMsUUFBUSxLQUFLLFFBQVE7Z0NBQ3JDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRTtnQ0FDaEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFBLFVBQVUsQ0FBQyxRQUFRLG1DQUFJLEVBQUUsQ0FBQzs0QkFDdkMsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUs7NEJBQ2hFLFVBQVUsRUFBRSxxQkFBcUIsVUFBVSxDQUFDLEdBQUcsRUFBRTt5QkFDbEQ7cUJBQ0Y7aUJBQ0YsQ0FBQztnQkFFRixNQUFNLFdBQVcsR0FBRyxJQUFJLHdCQUFXLEVBQUU7cUJBQ2xDLE9BQU8sQ0FBQyxRQUFRLENBQUM7cUJBQ2pCLEtBQUssQ0FBQyxVQUFVLENBQUM7cUJBQ2pCLFVBQVUsQ0FBQyxRQUFRLENBQUM7cUJBQ3BCLFVBQVUsQ0FBQyx5Q0FBeUMsQ0FBQztxQkFDckQsYUFBYSxDQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQTJDLENBQ3hEO3FCQUNBLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUV2QyxNQUFNLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFBQyxPQUFPLFNBQVMsRUFBRSxDQUFDO2dCQUNuQixPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ2hELENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsR0FBcUIsQ0FBQztRQUczRCxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQy9CLEVBQUUseUJBQXlCLEVBQUUsUUFBUSxFQUFFLEVBQ3ZDLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUNYLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBR2xCLE1BQU0sOEJBQThCLEdBQUcsTUFBTSxrQkFBUSxDQUFDLElBQUksQ0FBQztZQUN6RCxHQUFHLEVBQUU7Z0JBQ0gsRUFBRSxjQUFjLEVBQUUsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUU7Z0JBQ3JDLEVBQUUsY0FBYyxFQUFFLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxFQUFFO2dCQUNyQyxFQUFFLGVBQWUsRUFBRSxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRTtnQkFFdEMsRUFBRSxzQkFBc0IsRUFBRSxRQUFRLEVBQUU7YUFDckM7U0FDRixDQUFDO2FBQ0MsTUFBTSxDQUFDLGVBQWUsQ0FBQzthQUN2QixJQUFJLEVBQUUsQ0FBQztRQUdWLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQ3ZCLElBQUksR0FBRyxDQUNMLDhCQUE4QjthQUMzQixHQUFHLENBQUMsQ0FBQyxDQUFNLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7YUFDaEMsTUFBTSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDcEUsQ0FDRixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQUcscUJBQXFCLFVBQVUsYUFBVixVQUFVLHVCQUFWLFVBQVUsQ0FBRSxHQUFHLEVBQUUsQ0FBQztRQUV4RCxNQUFNLGVBQWUsR0FBRyxrQ0FBa0Msa0JBQWtCLENBQzFFLFFBQVEsQ0FDVCxFQUFFLENBQUM7UUFFSixNQUFNLEVBQUUsSUFBSSxFQUFFLGFBQWEsRUFBRSxHQUFHLE1BQU0sSUFBQSxnQ0FBeUIsRUFBQyxNQUFNLEVBQUU7WUFDdEUsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLO1lBQ3ZCLElBQUksRUFBRSxHQUFHLG1CQUFtQixDQUFDLElBQUksMENBQTBDO1lBQzNFLElBQUksRUFBRTtnQkFDSixHQUFHLEVBQUUsUUFBUTtnQkFDYixNQUFNLEVBQUUsZUFBZTtnQkFDdkIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO2FBQ25DO1lBQ0QsUUFBUSxFQUFFLE1BQUEsVUFBVSxDQUFDLEtBQUssMENBQUcsQ0FBQyxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxHQUFHLENBQ1QsaUJBQWlCLElBQUksd0JBQXdCLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FDcEUsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLHVDQUF1QztZQUNoRCxLQUFLLEVBQUUsVUFBVTtTQUNsQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsd0JBQXdCO1lBQ2pDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO1NBQ3RELENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQzdELElBQUksQ0FBQztRQUNILE1BQU0sZUFBZSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO1FBQ25ELE1BQU0sbUJBQW1CLEdBQUcsTUFBTSx1QkFBYSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUUxRSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUN6QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcsQ0FBQyxLQUFVLEVBQUUsUUFBYSxFQUFFLEVBQUU7WUFDbkQsSUFBSSxLQUFLLEtBQUssU0FBUyxJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUMxRCxPQUFPLFFBQVEsQ0FBQztZQUNsQixDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN0RCxPQUFPLEtBQUssQ0FBQztZQUNmLENBQUM7WUFFRCxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUM7b0JBQ0gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzQixDQUFDO2dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBQ2YsT0FBTyxRQUFRLENBQUM7Z0JBQ2xCLENBQUM7WUFDSCxDQUFDO1lBRUQsT0FBTyxRQUFRLENBQUM7UUFDbEIsQ0FBQyxDQUFDO1FBR0YsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDNUUsTUFBTSxRQUFRLEdBQTBCLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFMUUsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFLENBQzFDLElBQUk7YUFDRCxXQUFXLEVBQUU7YUFDYixPQUFPLENBQUMsYUFBYSxFQUFFLEdBQUcsQ0FBQzthQUMzQixPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQzthQUNuQixPQUFPLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTNCLE1BQU0sVUFBVSxHQUFHLGtCQUFrQixDQUNuQyxNQUFBLG1CQUFtQixhQUFuQixtQkFBbUIsdUJBQW5CLG1CQUFtQixDQUFFLElBQUksbUNBQUksU0FBUyxDQUN2QyxDQUFDO1FBR0YsTUFBTSxpQkFBaUIsR0FBYSxFQUFFLENBQUM7UUFDdkMsS0FBSyxNQUFNLElBQUksSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUM1QixNQUFNLE1BQU0sR0FBRyxNQUFNLG9CQUFVLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRTtnQkFDNUQsTUFBTSxFQUFFLGtCQUFrQixVQUFVLEVBQUU7YUFDdkMsQ0FBQyxDQUFDO1lBQ0gsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBR0QsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sZUFBZSxHQUFhLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDO1lBQzFELENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUNoQixDQUFDLEtBQVUsRUFBRSxFQUFFLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQ2pFO1lBQ0gsQ0FBQyxDQUFDLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUU7Z0JBQ2xFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUNsQixDQUFDLENBQUMsRUFBRSxDQUFDO1FBR1QsTUFBTSxrQkFBa0IsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQ3hELENBQUMsQ0FBQyxrQkFBa0I7aUJBQ2YsTUFBTSxDQUNMLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FDVixFQUFFLElBQUksT0FBTyxFQUFFLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FDN0Q7aUJBQ0EsR0FBRyxDQUFDLENBQUMsRUFBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqQixJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUk7Z0JBQ2IsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFDLEtBQUssS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25ELFdBQVcsRUFDVCxPQUFPLEVBQUUsQ0FBQyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUMxRCxnQkFBZ0IsRUFDZCxPQUFPLEVBQUUsQ0FBQyxnQkFBZ0IsS0FBSyxRQUFRO29CQUNyQyxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFnQjtvQkFDckIsQ0FBQyxDQUFDLEVBQUU7YUFDVCxDQUFDLENBQUM7WUFDUCxDQUFDLENBQUMsRUFBRSxDQUFDO1FBR1AsTUFBTSwyQkFBMkIsR0FBRyxjQUFjLENBQ2hELEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQzlCLEVBQUUsQ0FDSCxDQUFDO1FBRUYsTUFBTSxxQkFBcUIsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDO1lBQ3RFLENBQUMsQ0FBQywyQkFBMkIsQ0FBQyxNQUFNLENBQ2hDLENBQUMsTUFBVyxFQUFFLEVBQUUsQ0FBQyxPQUFPLE1BQU0sS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FDcEU7WUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDO1FBR1AsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVk7WUFDOUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO1lBQ2pDLENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDVCxNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVTtZQUMxQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUVULE1BQU0sZ0JBQWdCLEdBQ3BCLGtCQUFrQixJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hELENBQUMsQ0FBQyxrQkFBa0I7WUFDcEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVoQixNQUFNLGNBQWMsR0FDbEIsZ0JBQWdCLElBQUksQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEQsQ0FBQyxDQUFDLGdCQUFnQjtZQUNsQixDQUFDLENBQUMsU0FBUyxDQUFDO1FBR2hCLElBQUksT0FBTyxHQUNULE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRXRFLElBQUksU0FBUyxHQUFHLENBQUEsTUFBQSxtQkFBbUIsQ0FBQyxRQUFRLDBDQUFFLEdBQUcsS0FBSSxDQUFDLENBQUM7UUFDdkQsSUFBSSxRQUFRLEdBQUcsQ0FBQSxNQUFBLG1CQUFtQixDQUFDLFFBQVEsMENBQUUsR0FBRyxLQUFJLENBQUMsQ0FBQztRQUV0RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDO2dCQUNILE1BQU0sZUFBZSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDckMsOENBQThDLGtCQUFrQixDQUM5RCxPQUFPLENBQ1IsRUFBRSxDQUNKLENBQUM7Z0JBRUYsSUFDRSxDQUFBLE1BQUEsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLDBDQUFFLE1BQU0sSUFBRyxDQUFDO29CQUN6QyxDQUFBLE1BQUEsTUFBQSxlQUFlLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLDBDQUFFLFdBQVcsMENBQUUsTUFBTSxNQUFLLENBQUMsRUFDcEUsQ0FBQztvQkFDRCxTQUFTLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDckUsUUFBUSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RFLENBQUM7WUFDSCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzdELENBQUM7UUFDSCxDQUFDO1FBR0QsTUFBTSxXQUFXLEdBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUztZQUM1QixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJO1lBQ3ZCLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLEVBQUU7WUFDbkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztZQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRVIsTUFBTSxjQUFjLEdBQ2xCLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQiwwQ0FBRSxRQUFRLE1BQUssU0FBUztZQUNuRCxDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsMENBQUUsUUFBUSxNQUFLLElBQUk7WUFDOUMsQ0FBQSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLDBDQUFFLFFBQVEsTUFBSyxFQUFFO1lBQzFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUM7WUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVSLE1BQU0sY0FBYyxHQUNsQixDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsMENBQUUsUUFBUSxNQUFLLFNBQVM7WUFDbkQsQ0FBQSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLDBDQUFFLFFBQVEsTUFBSyxJQUFJO1lBQzlDLENBQUEsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQiwwQ0FBRSxRQUFRLE1BQUssRUFBRTtZQUMxQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDO1lBQzlDLENBQUMsQ0FBQyxXQUFXLENBQUM7UUFFbEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakUsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUUsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7WUFDbEQsQ0FBQyxDQUFDLGNBQWM7WUFDaEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUdkLE1BQU0sY0FBYyxHQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxTQUFTO1lBQy9CLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUk7WUFDMUIsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEtBQUssRUFBRTtZQUN0QixDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO1lBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFUixNQUFNLFlBQVksR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUcxRSxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQUssQ0FBQztZQUN6QixLQUFLLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtZQUMzQixXQUFXLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksRUFBRTtZQUN2QyxPQUFPO1lBQ1AsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixLQUFLLEVBQUUsZUFBZTtZQUN0QixZQUFZLEVBQUUsZ0JBQWdCO1lBQzlCLFVBQVUsRUFBRSxjQUFjO1lBQzFCLEtBQUssRUFBRSxTQUFTO1lBQ2hCLGtCQUFrQixFQUFFO2dCQUNsQixRQUFRLEVBQUUsWUFBWTtnQkFDdEIsUUFBUSxFQUFFLFlBQVk7Z0JBQ3RCLGFBQWEsRUFBRSxDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsMENBQUUsYUFBYSxLQUFJLEtBQUs7YUFDbkU7WUFDRCxRQUFRLEVBQUUsWUFBWTtZQUN0QixZQUFZLEVBQUUsZ0JBQWdCO1lBQzlCLHFCQUFxQjtZQUNyQixRQUFRLEVBQUU7Z0JBQ1IsR0FBRyxFQUFFLFFBQVE7Z0JBQ2IsR0FBRyxFQUFFLFNBQVM7Z0JBQ2QsR0FBRyxFQUFFO29CQUNILElBQUksRUFBRSxPQUFPO29CQUNiLFdBQVcsRUFBRSxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUM7aUJBQ25DO2FBQ0Y7WUFDRCxTQUFTLEVBQUU7Z0JBQ1QsYUFBYSxFQUFFLG1CQUFtQixDQUFDLEdBQUc7Z0JBQ3RDLFNBQVMsRUFBRSxtQkFBbUIsQ0FBQyxJQUFJO2dCQUNuQyxLQUFLLEVBQ0gsQ0FBQSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUywwQ0FBRSxLQUFLO29CQUN6QixtQkFBbUIsQ0FBQyxLQUFLO29CQUN6QixlQUFlO2dCQUNqQixLQUFLLEVBQ0gsQ0FBQSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUywwQ0FBRSxLQUFLO29CQUN6QixtQkFBbUIsQ0FBQyxLQUFLO29CQUN6QixtQkFBbUI7YUFDdEI7WUFDRCxnQkFBZ0IsRUFBRSxLQUFLO1lBQ3ZCLE9BQU8sRUFBRSxJQUFJO1lBQ2IsS0FBSyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLFNBQVM7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFHdEIsSUFBSSxDQUFDLENBQUEsTUFBQSxtQkFBbUIsYUFBbkIsbUJBQW1CLHVCQUFuQixtQkFBbUIsQ0FBRSxNQUFNLDBDQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUEsRUFBRSxDQUFDO1lBQ3pELE1BQUEsbUJBQW1CLGFBQW5CLG1CQUFtQix1QkFBbkIsbUJBQW1CLENBQUUsTUFBTSwwQ0FBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sbUJBQW1CLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDbkMsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLDRCQUE0QjtZQUNyQyxLQUFLLEVBQUUsUUFBUTtTQUNoQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsd0JBQXdCO1lBQ2pDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO1NBQ3RELENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUdGLE1BQU0sU0FBUyxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxJQUFrQixFQUFFLEVBQUU7SUFDMUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7UUFDbkMsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFMUIsTUFBTSxLQUFLLEdBQUcsTUFBTSxlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUNuRCxJQUFJLEVBQUUsZUFBZTtZQUNyQixLQUFLLEVBQUUsY0FBYztZQUNyQixRQUFRLEVBQUUsVUFBVTtTQUNyQixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELElBQUksTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzFCLE1BQU0sR0FBRyxTQUFTLENBQUM7UUFDckIsQ0FBQztRQUVELE1BQU0sSUFBSSxHQUFHO1lBQ1gsTUFBTTtZQUNOLElBQUksRUFBRSxJQUFJLElBQUksRUFBRTtTQUNqQixDQUFDO1FBRUYsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFbkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ2xELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBR0YsTUFBTSxPQUFPLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDcEQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDbEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDdkUsTUFBTSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO1FBRWhDLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoRSxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBRXZCLE1BQU0sS0FBSyxHQUFRLEVBQUUsQ0FBQztRQUd0QixJQUFJLFVBQVUsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUV6QixLQUFLLENBQUMsT0FBTyxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxXQUFXLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQ3pFLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxlQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzthQUNuQyxNQUFNLENBQ0wsd0dBQXdHLENBQ3pHO2FBQ0EsSUFBSSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7YUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQzthQUNWLEtBQUssQ0FBQyxLQUFLLENBQUM7YUFDWixJQUFJLEVBQUUsQ0FBQztRQUVWLE1BQU0sWUFBWSxHQUFHLGVBQUssQ0FBQyxTQUFTLENBQUM7WUFDbkMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO1lBQ2pCO2dCQUNFLE1BQU0sRUFBRTtvQkFDTixLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztvQkFDNUQsUUFBUSxFQUFFO3dCQUNSLEVBQUUsTUFBTSxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRTt3QkFDM0QsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFO3FCQUNwQjtvQkFDRCxJQUFJLEVBQUU7d0JBQ0osRUFBRSxNQUFNLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO3dCQUMxRCxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7cUJBQ3BCO2lCQUNGO2FBQ0Y7WUFDRDtnQkFDRSxRQUFRLEVBQUU7b0JBQ1IsS0FBSyxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtvQkFDOUQsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtvQkFDaEUsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO29CQUNwRSxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLFlBQVksRUFBRSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFO2lCQUM3RDthQUNGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUMxRSxNQUFNLEtBQUssR0FBRyxDQUFBLFFBQVEsYUFBUixRQUFRLHVCQUFSLFFBQVEsQ0FBRyxDQUFDLENBQUMsS0FBSTtZQUM3QixLQUFLLEVBQUUsQ0FBQztZQUNSLE1BQU0sRUFBRSxDQUFDO1lBQ1QsUUFBUSxFQUFFLENBQUM7WUFDWCxJQUFJLEVBQUUsQ0FBQztTQUNSLENBQUM7UUFFRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBQUMsT0FBTyxDQUFNLEVBQUUsQ0FBQztRQUNoQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLE9BQU8sS0FBSSxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7SUFDM0UsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBR0YsTUFBTSxxQkFBcUIsR0FBRyxDQUM1QixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUVsQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsT0FBTyxFQUFFLHNEQUFzRDthQUNoRSxDQUFDLENBQUM7UUFDTCxDQUFDO1FBR0QsTUFBTSxlQUFlLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFHbkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFLLENBQUMsSUFBSSxDQUFDO1lBQzlCLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsV0FBVyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUU7U0FDckUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSw2Q0FBNkMsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUdELE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFHL0IsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDOUIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsR0FBRyxXQUFXLENBQ3BELENBQUM7UUFDRixNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUNsQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxHQUFHLFdBQVcsQ0FDdEQsQ0FBQztRQUNGLE1BQU0sYUFBYSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQ2pDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDUixJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksV0FBVztZQUMzQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksV0FBVyxDQUM1QyxDQUFDO1FBRUYsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixVQUFVO1lBQ1YsYUFBYTtZQUNiLGNBQWM7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1gsZ0VBQWdFLEVBQ2hFLEtBQUssQ0FDTixDQUFDO1FBQ0YsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzNELENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQThGRixNQUFNLHNCQUFzQixHQUFHLENBQzdCLEdBQVcsRUFDWCxHQUFXLEVBQ2EsRUFBRTs7SUFDMUIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFLLENBQUMsR0FBRyxDQUM5Qiw2Q0FBNkMsRUFDN0M7WUFDRSxNQUFNLEVBQUU7Z0JBQ04sR0FBRztnQkFDSCxHQUFHO2dCQUNILE1BQU0sRUFBRSxNQUFNO2dCQUNkLGNBQWMsRUFBRSxDQUFDO2FBQ2xCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLFlBQVksRUFBRSxxQ0FBcUM7YUFDcEQ7WUFDRCxPQUFPLEVBQUUsSUFBSTtTQUNkLENBQ0YsQ0FBQztRQUVGLE1BQU0sT0FBTyxHQUFHLE1BQUEsUUFBUSxDQUFDLElBQUksMENBQUUsT0FBTyxDQUFDO1FBRXZDLE9BQU8sQ0FDTCxDQUFBLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxJQUFJO2FBQ2IsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLElBQUksQ0FBQTthQUNiLE9BQU8sYUFBUCxPQUFPLHVCQUFQLE9BQU8sQ0FBRSxPQUFPLENBQUE7YUFDaEIsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLFlBQVksQ0FBQTtZQUNyQixJQUFJLENBQ0wsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLElBQUksQ0FBQSxNQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxRQUFRLDBDQUFFLE1BQU0sTUFBSyxHQUFHLEVBQUUsQ0FBQztZQUNwQyxPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7WUFDcEQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxDQUFDLEtBQUssQ0FDWCx3Q0FBd0MsRUFDeEMsQ0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxLQUFJLEtBQUssQ0FDeEIsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNoRSxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBRWpELE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQWMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBZSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUcsQ0FBQztRQUU3RCxNQUFNLFlBQVksR0FDaEIsTUFBTSxLQUFLLFNBQVMsSUFBSSxNQUFNLEtBQUssSUFBSSxJQUFJLE1BQU0sS0FBSyxFQUFFO1lBQ3RELENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBQ3BCLENBQUMsQ0FBQyxHQUFHLENBQUM7UUFHVixNQUFNLGdCQUFnQixHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7UUFFNUUsSUFBSSxRQUFRLEtBQUssU0FBUyxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUN0RCxPQUFPLEdBQUc7aUJBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQztpQkFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsNENBQTRDLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxPQUFPLFFBQVEsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sR0FBRyxHQUNQLE9BQU8sU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFcEUsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLCtDQUErQyxFQUFFLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUUvQixNQUFNLDBCQUEwQixHQUFHLENBQU8sY0FBbUIsRUFBRSxFQUFFOztZQUMvRCxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQUssQ0FBQyxTQUFTLENBQUM7Z0JBQ3JDO29CQUNFLFFBQVEsRUFBRTt3QkFDUixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRTt3QkFDaEQsYUFBYSxFQUFFLFVBQVU7d0JBQ3pCLFdBQVcsRUFBRSxnQkFBZ0I7d0JBQzdCLFNBQVMsRUFBRSxJQUFJO3FCQUNoQjtpQkFDRjtnQkFDRCxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUU7Z0JBQzFCO29CQUNFLE1BQU0sRUFBRTt3QkFDTixHQUFHLEVBQUUsUUFBUTt3QkFDYixLQUFLLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFO3FCQUM1QjtpQkFDRjtnQkFDRCxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7YUFDcEIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFLLENBQUMsU0FBUyxDQUFDO2dCQUNuQztvQkFDRSxRQUFRLEVBQUU7d0JBQ1IsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUU7d0JBQ2hELGFBQWEsRUFBRSxVQUFVO3dCQUN6QixXQUFXLEVBQUUsZ0JBQWdCO3dCQUM3QixTQUFTLEVBQUUsSUFBSTtxQkFDaEI7aUJBQ0Y7Z0JBQ0QsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFO2dCQUMxQjtvQkFDRSxNQUFNLEVBQUU7d0JBQ04sR0FBRyxFQUFFLFFBQVE7d0JBQ2IsS0FBSyxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRTtxQkFDNUI7aUJBQ0Y7Z0JBQ0QsRUFBRSxZQUFZLEVBQUUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEVBQUU7Z0JBQ3ZDLEVBQUUsS0FBSyxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxFQUFFO2dCQUMxQixFQUFFLEtBQUssRUFBRSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUU7Z0JBQzdCLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRTthQUNsQixDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRXRCLE9BQU87Z0JBQ0wsS0FBSyxFQUFFLENBQUEsTUFBQSxRQUFRLENBQUMsQ0FBQyxDQUFDLDBDQUFFLEtBQUssS0FBSSxDQUFDO2dCQUM5QixNQUFNO2FBQ1AsQ0FBQztRQUNKLENBQUMsQ0FBQSxDQUFDO1FBR0YsTUFBTSxDQUFDLFFBQVEsRUFBRSxXQUFXLEVBQUUsWUFBWSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQzlELDBCQUEwQixDQUFDO2dCQUN6QixVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFO2dCQUNoQyxPQUFPLEVBQUUsS0FBSzthQUNmLENBQUM7WUFDRiwwQkFBMEIsQ0FBQztnQkFDekIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRTtnQkFDbkMsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRTtnQkFDakMsT0FBTyxFQUFFLEtBQUs7YUFDZixDQUFDO1lBQ0YsMEJBQTBCLENBQUM7Z0JBQ3pCLFlBQVksRUFBRSxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUU7Z0JBQ2xDLE9BQU8sRUFBRSxLQUFLO2FBQ2YsQ0FBQztTQUNILENBQUMsQ0FBQztRQUdILElBQUksSUFBSSxHQUFrQixJQUFJLENBQUM7UUFFL0IsSUFBSSxDQUFDO1lBQ0gsSUFBSSxHQUFHLE1BQU0sc0JBQXNCLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFBQyxPQUFPLFFBQWEsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sQ0FBQyxLQUFLLENBQ1gsNEJBQTRCLEVBQzVCLENBQUEsUUFBUSxhQUFSLFFBQVEsdUJBQVIsUUFBUSxDQUFFLE9BQU8sS0FBSSxRQUFRLENBQzlCLENBQUM7UUFDSixDQUFDO1FBR0QsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUNULElBQUksQ0FBQztnQkFDSCxNQUFNLElBQUEscURBQXlCLEVBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzVDLENBQUM7WUFBQyxPQUFPLFNBQWMsRUFBRSxDQUFDO2dCQUN4QixPQUFPLENBQUMsS0FBSyxDQUNYLG9EQUFvRCxFQUNwRCxDQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRSxPQUFPLEtBQUksU0FBUyxDQUNoQyxDQUFDO1lBQ0osQ0FBQztRQUNILENBQUM7UUFFRCxnQkFBTSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsSUFBSSxhQUFKLElBQUksY0FBSixJQUFJLEdBQUksU0FBUyxpQkFBaUIsQ0FBQyxDQUFDO1FBRW5FLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsUUFBUSxFQUFFO2dCQUNSLElBQUk7Z0JBQ0osUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUU7Z0JBQ2xELFNBQVMsRUFBRSxRQUFRLENBQUMsS0FBSztnQkFDekIsWUFBWSxFQUFFLFdBQVcsQ0FBQyxLQUFLO2dCQUMvQixhQUFhLEVBQUUsWUFBWSxDQUFDLEtBQUs7Z0JBQ2pDLFdBQVcsRUFBRSxJQUFJO2dCQUNqQixRQUFRLEVBQUUsS0FBSzthQUNoQjtZQUNELFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTTtZQUMzQixhQUFhLEVBQUUsV0FBVyxDQUFDLE1BQU07WUFDakMsY0FBYyxFQUFFLFlBQVksQ0FBQyxNQUFNO1NBQ3BDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxpREFBaUQsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN4RSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSw0QkFBNEI7U0FDdEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxXQUFXLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCLEVBQUUsRUFBRTs7SUFDNUUsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFFbkMsSUFBSSxDQUFDO1FBRUgsTUFBTSxLQUFLLEdBQUcsTUFBTSxlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFHRCxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLG1DQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDNUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxtQ0FBSSxLQUFLLENBQUMsV0FBVyxDQUFDO1FBQzlELEtBQUssQ0FBQyxPQUFPLEdBQUcsTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sbUNBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUNsRCxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLG1DQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFFNUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDNUQsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDM0MsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLEtBQUssQ0FBQyxLQUFLLEdBQUcsV0FBVyxDQUFDO1lBQzVCLENBQUM7UUFDSCxDQUFDO1FBRUQsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzFCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQztnQkFDekMsS0FBSyxDQUFDLFlBQVksR0FBRyxrQkFBa0IsQ0FBQztZQUMxQyxDQUFDO1FBQ0gsQ0FBQztRQUVELElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN4QixNQUFNLGdCQUFnQixHQUFHLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLEtBQUssQ0FBQyxVQUFVLEdBQUcsZ0JBQWdCLENBQUM7WUFDdEMsQ0FBQztRQUNILENBQUM7UUFHRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2pDLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDekMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDbkIsQ0FBQyxLQUFVLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUNqRTtnQkFDSCxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRTtvQkFDbEUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7b0JBQ2xCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ3BCLENBQUM7UUFHRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNsRSxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNqRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDcEMsS0FBSyxDQUFDLFFBQVEsR0FBRyxjQUFjLENBQUM7WUFDbEMsQ0FBQztRQUNILENBQUM7UUFHRCxJQUNFLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLFNBQVM7WUFDbkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUNwQyxDQUFDO1lBQ0QsS0FBSyxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVk7aUJBQ3ZDLE1BQU0sQ0FDTCxDQUFDLEVBQU8sRUFBRSxFQUFFLENBQ1YsRUFBRSxJQUFJLE9BQU8sRUFBRSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQzdEO2lCQUNBLEdBQUcsQ0FBQyxDQUFDLEVBQU8sRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDakIsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJO2dCQUNiLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO2dCQUNuRCxXQUFXLEVBQUUsT0FBTyxFQUFFLENBQUMsV0FBVyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDckUsZ0JBQWdCLEVBQ2QsT0FBTyxFQUFFLENBQUMsZ0JBQWdCLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDckUsQ0FBQyxDQUFDLENBQUM7UUFDUixDQUFDO1FBR0QsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDaEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztZQUUxRSxNQUFNLGNBQWMsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDeEMsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXhDLEtBQUssQ0FBQyxrQkFBa0IsR0FBRztnQkFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDO29CQUN2QyxDQUFDLENBQUMsY0FBYztvQkFDaEIsQ0FBQyxDQUFDLENBQUEsTUFBQSxLQUFLLENBQUMsa0JBQWtCLDBDQUFFLFFBQVEsS0FBSSxDQUFDO2dCQUMzQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7b0JBQ3ZDLENBQUMsQ0FBQyxjQUFjO29CQUNoQixDQUFDLENBQUMsQ0FBQSxNQUFBLEtBQUssQ0FBQyxrQkFBa0IsMENBQUUsUUFBUSxLQUFJLENBQUM7Z0JBQzNDLGFBQWEsRUFDWCxhQUFhLEtBQUksTUFBQSxLQUFLLENBQUMsa0JBQWtCLDBDQUFFLGFBQWEsQ0FBQSxJQUFJLEtBQUs7YUFDcEUsQ0FBQztRQUNKLENBQUM7UUFHRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNuQyxLQUFLLENBQUMscUJBQXFCLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FDekMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FDL0I7Z0JBQ0MsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUNuQyxDQUFDLE1BQVcsRUFBRSxFQUFFLENBQUMsT0FBTyxNQUFNLEtBQUssUUFBUSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQ3BFO2dCQUNILENBQUMsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUM7UUFDbEMsQ0FBQztRQUdELElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN2QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUVyQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsSUFBSSxDQUFDLENBQUEsTUFBQSxLQUFLLENBQUMsU0FBUywwQ0FBRSxhQUFhLENBQUEsRUFBRSxDQUFDO2dCQUNoRSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMxQixPQUFPLEVBQUUscURBQXFEO2lCQUMvRCxDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsS0FBSyxDQUFDLFNBQVMsR0FBRztnQkFDaEIsYUFBYSxFQUNYLFNBQVMsQ0FBQyxhQUFhLEtBQUksTUFBQSxLQUFLLENBQUMsU0FBUywwQ0FBRSxhQUFhLENBQUE7Z0JBQzNELFNBQVMsRUFDUCxTQUFTLENBQUMsU0FBUztxQkFDbkIsTUFBQSxLQUFLLENBQUMsU0FBUywwQ0FBRSxTQUFTLENBQUE7b0JBQzFCLHNCQUFzQjtnQkFDeEIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLLEtBQUksTUFBQSxLQUFLLENBQUMsU0FBUywwQ0FBRSxLQUFLLENBQUEsSUFBSSxlQUFlO2dCQUNuRSxLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUssS0FBSSxNQUFBLEtBQUssQ0FBQyxTQUFTLDBDQUFFLEtBQUssQ0FBQSxJQUFJLG1CQUFtQjthQUN4RSxDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUMxQyxLQUFLLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQ25DLENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuRCxLQUFLLENBQUMsZ0JBQWdCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQztRQUNyRCxDQUFDO1FBR0QsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ25CLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDekMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FDbkIsQ0FBQyxHQUFRLEVBQUUsRUFBRSxDQUFDLE9BQU8sR0FBRyxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUMzRDtnQkFDSCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztRQUNsQixDQUFDO1FBR0QsSUFDRSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU87WUFDaEIsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxRQUFRO1lBQ3BDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFDOUIsQ0FBQztZQUNELElBQUksQ0FBQztnQkFDSCxNQUFNLGVBQWUsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQ3JDLDhDQUE4QyxrQkFBa0IsQ0FDOUQsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQ2pCLEVBQUUsQ0FDSixDQUFDO2dCQUVGLElBQ0UsQ0FBQSxNQUFBLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSwwQ0FBRSxNQUFNLElBQUcsQ0FBQztvQkFDekMsQ0FBQSxNQUFBLE1BQUEsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSwwQ0FBRSxXQUFXLDBDQUFFLE1BQU0sTUFBSyxDQUFDLEVBQ3BFLENBQUM7b0JBQ0QsTUFBTSxTQUFTLEdBQ2IsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDM0QsTUFBTSxRQUFRLEdBQ1osZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFFM0QsS0FBSyxDQUFDLFFBQVEsR0FBRzt3QkFDZixHQUFHLEVBQUUsUUFBUTt3QkFDYixHQUFHLEVBQUUsU0FBUzt3QkFDZCxHQUFHLEVBQUU7NEJBQ0gsSUFBSSxFQUFFLE9BQU87NEJBQ2IsV0FBVyxFQUFFLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQzt5QkFDbkM7cUJBQ0YsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywrQkFBK0IsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4RCxDQUFDO1FBQ0gsQ0FBQztRQUdELE1BQU0sWUFBWSxHQUFHLE1BQU0sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRXhDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLGtDQUFrQztZQUMzQyxLQUFLLEVBQUUsWUFBWTtTQUNwQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0NBQStDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsOENBQThDO1lBQ3ZELEtBQUs7U0FDTixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixNQUFNLGNBQWMsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUMzRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBRWpELE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDL0IsTUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQzNCLFdBQVcsQ0FBQyxXQUFXLEVBQUUsRUFDekIsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUN0QixDQUFDLENBQ0YsQ0FBQztRQUNGLE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUN6QixXQUFXLENBQUMsV0FBVyxFQUFFLEVBQ3pCLFdBQVcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQzFCLENBQUMsQ0FDRixDQUFDO1FBR0YsSUFBSSxDQUFDLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFDTCxzRUFBc0U7YUFDekUsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxRQUFrQixDQUFDLENBQUM7UUFDM0MsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLFNBQW1CLENBQUMsQ0FBQztRQUM1QyxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUU5RCxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsK0NBQStDO2FBQ3pELENBQUMsQ0FBQztRQUNMLENBQUM7UUFHRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQUssQ0FBQyxTQUFTLENBQUM7WUFDbkM7Z0JBQ0UsVUFBVSxFQUFFO29CQUNWLFFBQVEsRUFBRTt3QkFDUixLQUFLLEVBQUU7NEJBQ0wsSUFBSSxFQUFFO2dDQUNKLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxlQUFlLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTtnQ0FDcEQsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLGVBQWUsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFOzZCQUNyRDt5QkFDRjtxQkFDRjtpQkFDRjthQUNGO1lBQ0Q7Z0JBQ0UsTUFBTSxFQUFFO29CQUNOLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtvQkFDdEQsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsR0FBRyxNQUFNLEVBQUU7aUJBQ3hDO2FBQ0Y7WUFDRDtnQkFDRSxLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFO2FBQ3ZCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxxREFBcUQ7YUFDL0QsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUNYLHFFQUFxRSxFQUNyRSxLQUFLLENBQ04sQ0FBQztRQUNGLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUMzRCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFNRixNQUFNLGFBQWEsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUMxRCxJQUFJLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVsQyxNQUFNLGFBQWEsR0FBc0QsRUFBRSxDQUFDO1FBQzVFLE1BQU0sV0FBVyxHQUFvRCxFQUFFLENBQUM7UUFDeEUsTUFBTSxrQkFBa0IsR0FBK0IsRUFBRSxDQUFDO1FBRTFELElBQUksZUFBZSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFFcEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUMzQixNQUFNLFdBQVcsR0FBYSxFQUFFLENBQUM7WUFDakMsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFDO1lBQy9CLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQztZQUM1QixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7WUFFMUIsTUFBTSxhQUFhLEdBQWEsRUFBRSxDQUFDO1lBQ25DLEtBQUssTUFBTSxNQUFNLElBQUksS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUV4RCxJQUFJLGdCQUFnQixLQUFLLGtCQUFrQixFQUFFLENBQUM7b0JBQzVDLGVBQWUsR0FBRyxJQUFJLENBQUM7b0JBQ3ZCLGFBQWEsR0FBRyxJQUFJLENBQUM7b0JBQ3JCLGFBQWEsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztnQkFDekMsQ0FBQztxQkFBTSxJQUFJLGdCQUFnQixLQUFLLE1BQU0sRUFBRSxDQUFDO29CQUN2QyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUN2QixhQUFhLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM3QixDQUFDO3FCQUFNLENBQUM7b0JBQ04sV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDekIsYUFBYSxHQUFHLElBQUksQ0FBQztvQkFDckIsYUFBYSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO2dCQUN6QyxDQUFDO1lBQ0gsQ0FBQztZQUVELElBQUksYUFBYSxFQUFFLENBQUM7Z0JBQ2xCLEtBQUssQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDO2dCQUM1QixNQUFNLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNyQixDQUFDO1lBRUQsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMzQixhQUFhLENBQUMsSUFBSSxDQUFDO29CQUNqQixPQUFPLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUU7b0JBQzdCLFdBQVc7aUJBQ1osQ0FBQyxDQUFDO1lBQ0wsQ0FBQztpQkFBTSxJQUFJLGVBQWUsRUFBRSxDQUFDO2dCQUMzQixrQkFBa0IsQ0FBQyxJQUFJLENBQUM7b0JBQ3RCLE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRTtpQkFDOUIsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLFdBQVcsQ0FBQyxJQUFJLENBQUM7b0JBQ2YsT0FBTyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFO29CQUM3QixTQUFTO2lCQUNWLENBQUMsQ0FBQztZQUNMLENBQUM7WUFFRCxlQUFlLEVBQUUsQ0FBQztZQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sQ0FBQyxJQUFJLENBQUMsOENBQThDLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDMUUsT0FBTyxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXpFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLHdCQUF3QjtZQUNqQyxXQUFXLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDMUIsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLE1BQU07WUFDeEMsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLE1BQU07WUFDcEMsdUJBQXVCLEVBQUUsa0JBQWtCLENBQUMsTUFBTTtZQUNsRCxhQUFhO1lBQ2IsV0FBVztZQUNYLGtCQUFrQjtTQUNuQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1gseURBQXlELEVBQ3pELEtBQUssQ0FDTixDQUFDO1FBQ0YsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsd0RBQXdEO1lBQ2pFLEtBQUs7U0FDTixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixNQUFNLGVBQWUsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUM1RCxJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7UUFHOUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2RSxPQUFPLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUU5RCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLENBQUMsQ0FBQztZQUNoRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsaUNBQWlDO2dCQUMxQyxhQUFhLEVBQUUsQ0FBQzthQUNqQixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsSUFBSSxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBR3RCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7WUFDM0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDM0QsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFHckQsS0FBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQVcsRUFBRSxFQUFFO2dCQUM1QyxJQUFJLEdBQUcsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7b0JBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEdBQUcsT0FBTyxVQUFVLEVBQUUsQ0FBQyxDQUFDO29CQUN6RCxPQUFPLFVBQVUsQ0FBQztnQkFDcEIsQ0FBQztnQkFDRCxPQUFPLEdBQUcsQ0FBQztZQUNiLENBQUMsQ0FBQyxDQUFDO1lBR0gsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsS0FBSyxDQUFDLEdBQUcsMEJBQTBCLENBQUMsQ0FBQztZQUNuRSxhQUFhLEVBQUUsQ0FBQztRQUNsQixDQUFDO1FBR0QsT0FBTyxDQUFDLEdBQUcsQ0FDVCw4REFBOEQsYUFBYSxFQUFFLENBQzlFLENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSx5Q0FBeUM7WUFDbEQsYUFBYTtTQUNkLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxREFBcUQsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RSxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxtREFBbUQ7WUFDNUQsS0FBSztTQUNOLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFDO0FBRXpDLE1BQU0sZUFBZSxHQUFHLENBQUMsR0FBVyxFQUFVLEVBQUU7SUFDOUMsT0FBTyxHQUFHO1NBQ1AsU0FBUyxDQUFDLEtBQUssQ0FBQztTQUNoQixPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO1NBQy9CLE9BQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1NBQ3BCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDO1NBQ3BCLElBQUksRUFBRTtTQUNOLFdBQVcsRUFBRSxDQUFDO0FBQ25CLENBQUMsQ0FBQztBQUVGLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBYyxFQUFVLEVBQUU7SUFDOUMsT0FBTyxNQUFNLENBQUMsT0FBTyxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQztBQXFKRixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDeEIsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUM7QUFHeEMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRTtJQUNwQyxFQUFFLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUM7QUFHRixNQUFNLFlBQVksR0FBRyxHQUFXLEVBQUU7SUFDaEMsSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7UUFDakMsTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEMsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFDRCxPQUFPLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQztBQUVGLE1BQU0sbUJBQW1CLEdBQUcsQ0FDMUIsTUFBYyxFQUNkLE1BQWMsRUFDZCxNQUFjLEVBQ2QsTUFBYyxFQUNMLEVBQUU7SUFDWCxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUM7SUFDdkIsT0FBTyxDQUNMLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQyxHQUFHLFNBQVM7UUFDckMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUN0QyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBQ0YsTUFBTSxLQUFLLEdBQUcsQ0FBQyxFQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFHaEYsTUFBTSxpQkFBaUIsR0FBRyxDQUN4QixJQUFZLEVBQ1osSUFBWSxFQUNaLElBQVksRUFDWixJQUFZLEVBQ0osRUFBRTtJQUNWLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ2pELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQztJQUVmLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDaEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQztJQUVoQyxNQUFNLENBQUMsR0FDTCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO1lBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3ZCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV6RCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUM7QUFFRixNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUM7QUFFM0IsTUFBTSxZQUFZLEdBQUcsQ0FBQyxPQUFlLEVBQVUsRUFBRTs7SUFFL0MsTUFBTSxrQkFBa0IsR0FDdEIsbUlBQW1JLENBQUM7SUFHdEksSUFBSSxjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUdwRSxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUM7SUFDcEMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBRWhFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3hCLE9BQU8sQ0FBQyxJQUFJLENBQUMscUNBQXFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDcEUsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBR0QsTUFBTSxTQUFTLEdBQ2IscUdBQXFHLENBQUM7SUFDeEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxNQUFNLENBQ3RCLHFDQUFxQyxTQUFTLHlDQUF5QyxFQUN2RixHQUFHLENBQ0osQ0FBQztJQUVGLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7SUFFMUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNWLE1BQU0sTUFBTSxHQUFHLENBQUEsTUFBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLDBDQUFFLElBQUksRUFBRSxLQUFJLEVBQUUsQ0FBQztRQUN0QyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxJQUFJLEdBQUcsTUFBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLDBDQUFFLElBQUksRUFBRSxDQUFDO1FBQzlCLE9BQU8sTUFBTTtZQUNYLENBQUMsQ0FBQyxHQUFHLE1BQU0sS0FBSyxVQUFVLEtBQUssSUFBSSxFQUFFO1lBQ3JDLENBQUMsQ0FBQyxHQUFHLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBR0QsT0FBTyxjQUFjLENBQUM7QUFDeEIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxZQUFZLEdBQUcsQ0FDbkIsTUFBYSxFQUNiLGFBQW9CLEVBQ3BCLGVBQXNCLEVBQ3RCLEVBQUU7O0lBQ0YsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUM7WUFDSCxJQUFJLFdBQVcsR0FBRyxNQUFBLEtBQUssQ0FBQyxPQUFPLDBDQUFFLElBQUksRUFBRSxDQUFDO1lBR3hDLFdBQVcsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFeEMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNqQixlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNuQixFQUFFLEVBQUUsS0FBSyxDQUFDLEdBQUc7b0JBQ2IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO29CQUNsQixNQUFNLEVBQUUsK0JBQStCO2lCQUN4QyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzdELFNBQVM7WUFDWCxDQUFDO1lBRUQsTUFBTSxlQUFlLEdBQUcsV0FBVyxDQUFDO1lBR3BDLE1BQU0sS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1lBRzVCLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDOUIsMENBQTBDLEVBQzFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUN6RCxDQUFDO1lBRUYsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7WUFFeEMsSUFBSSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUN2QyxlQUFlLENBQUMsSUFBSSxDQUFDO29CQUNuQixFQUFFLEVBQUUsS0FBSyxDQUFDLEdBQUc7b0JBQ2IsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO29CQUNsQixNQUFNLEVBQUUsMkJBQTJCO2lCQUNwQyxDQUFDLENBQUM7Z0JBQ0gsT0FBTyxDQUFDLElBQUksQ0FBQywrQkFBK0IsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBQzNELFNBQVM7WUFDWCxDQUFDO1lBR0QsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQVksRUFBRSxFQUFFOztnQkFDaEQsTUFBTSxZQUFZLEdBQUcsTUFBQSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssMENBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQzdELE9BQU8sWUFBWSxhQUFaLFlBQVksdUJBQVosWUFBWSxDQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztZQUMvRCxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksU0FBUyxHQUFHLFVBQVUsSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFMUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNoQixPQUFPLENBQUMsSUFBSSxDQUNWLDZDQUE2QyxLQUFLLENBQUMsS0FBSyxLQUFLLGVBQWUsR0FBRyxDQUNoRixDQUFDO2dCQUdGLFdBQVcsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3hDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLFdBQVcsRUFBRSxDQUFDLENBQUM7Z0JBR3RFLE1BQU0sYUFBYSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDbkMsMENBQTBDLEVBQzFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxDQUN6RCxDQUFDO2dCQUVGLE1BQU0sYUFBYSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDO2dCQUNsRCxJQUFJLGFBQWEsSUFBSSxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM5QyxTQUFTLEdBQUcsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixDQUFDO3FCQUFNLENBQUM7b0JBQ04sZUFBZSxDQUFDLElBQUksQ0FBQzt3QkFDbkIsRUFBRSxFQUFFLEtBQUssQ0FBQyxHQUFHO3dCQUNiLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSzt3QkFDbEIsTUFBTSxFQUFFLDJDQUEyQztxQkFDcEQsQ0FBQyxDQUFDO29CQUNILE9BQU8sQ0FBQyxJQUFJLENBQ1YsK0NBQStDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FDN0QsQ0FBQztvQkFDRixTQUFTO2dCQUNYLENBQUM7WUFDSCxDQUFDO1lBR0QsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztZQUVsRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsUUFBUSxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDekQsTUFBTSxXQUFXLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFFakMsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLEdBQUcsS0FBSyxHQUFHLElBQUksV0FBVyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUM7WUFDdEUsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLENBQ3ZDLFdBQVcsQ0FBQyxHQUFHLEVBQ2YsV0FBVyxDQUFDLEdBQUcsRUFDZixHQUFHLEVBQ0gsR0FBRyxDQUNKLENBQUM7WUFFRixJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNmLEtBQUssQ0FBQyxRQUFRLEdBQUcsV0FBVyxDQUFDO2dCQUM3QixNQUFNLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFbkIsTUFBTSxRQUFRLEdBQUcsZUFBZSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsZUFBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZUFBSyxDQUFDLEtBQUssQ0FBQztnQkFFbEUsT0FBTyxDQUFDLEdBQUcsQ0FDVCxRQUFRLENBQ04sc0NBQXNDLEtBQUssQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFDLEdBQUcsS0FBSyxXQUFXLENBQUMsR0FBRyxTQUFTLEdBQUcsS0FBSyxHQUFHLGVBQWUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUM1SixDQUNGLENBQUM7Z0JBRUYsYUFBYSxDQUFDLElBQUksQ0FBQztvQkFDakIsRUFBRSxFQUFFLEtBQUssQ0FBQyxHQUFHO29CQUNiLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztvQkFDbEIsV0FBVztpQkFDWixDQUFDLENBQUM7WUFDTCxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sT0FBTyxDQUFDLEdBQUcsQ0FDVCxlQUFLLENBQUMsTUFBTSxDQUNWLHVDQUF1QyxLQUFLLENBQUMsS0FBSyxLQUFLLFdBQVcsQ0FBQyxHQUFHLEtBQUssV0FBVyxDQUFDLEdBQUcsU0FBUyxHQUFHLEtBQUssR0FBRyxHQUFHLENBQ2xILENBQ0YsQ0FBQztZQUNKLENBQUM7UUFDSCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1gsZUFBSyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsS0FBSyxDQUFDLEtBQUssTUFBTSxLQUFLLEVBQUUsQ0FBQyxDQUMvRCxDQUFDO1lBQ0YsZUFBZSxDQUFDLElBQUksQ0FBQztnQkFDbkIsRUFBRSxFQUFFLEtBQUssQ0FBQyxHQUFHO2dCQUNiLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztnQkFDbEIsTUFBTSxFQUFFLFlBQVk7YUFDckIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0scUJBQXFCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDbEUsSUFBSSxDQUFDO1FBQ0gsSUFBSSxJQUFJLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFDMUIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFMUUsTUFBTSxhQUFhLEdBQVUsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sZUFBZSxHQUFVLEVBQUUsQ0FBQztRQUNsQyxNQUFNLFdBQVcsR0FBRyxNQUFNLGVBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLCtDQUErQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRTFFLE9BQU8sSUFBSSxHQUFHLFVBQVUsR0FBRyxXQUFXLEVBQUUsQ0FBQztZQUN2QyxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUV0RCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLEVBQUU7aUJBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO2lCQUN2QixLQUFLLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFckIsTUFBTSxZQUFZLENBQUMsTUFBTSxFQUFFLGFBQWEsRUFBRSxlQUFlLENBQUMsQ0FBQztZQUUzRCxJQUFJLEVBQUUsQ0FBQztZQUNQLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyQixDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsdUNBQXVDO1lBQ2hELGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxNQUFNO1lBQ3hDLG9CQUFvQixFQUFFLGVBQWUsQ0FBQyxNQUFNO1NBQzdDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxnREFBZ0Q7WUFDekQsS0FBSyxFQUFFLEtBQUs7U0FDYixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFHRixNQUFNLEtBQUssR0FBRyxDQUFDLENBQU0sRUFBaUIsRUFBRTtJQUN0QyxNQUFNLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsT0FBTyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUN2QyxDQUFDLENBQUM7QUFFRixNQUFNLGlCQUFpQixHQUFHLENBQUMsS0FBVyxFQUFFLEVBQUU7SUFDeEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDakMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM5QixNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUMvQixNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUM7QUFDOUIsQ0FBQyxDQUFDO0FBRUYsTUFBTSxxQkFBcUIsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTs7SUFDbEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxrQkFBUSxDQUFDLFlBQVksRUFBRSxDQUFDO0lBRTlDLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBNkIsQ0FBQztRQUN0RCxNQUFNLEVBQ0osS0FBSyxFQUFFLFVBQVUsRUFDakIsSUFBSSxFQUNKLGFBQWEsRUFDYixLQUFLLEVBQ0wsUUFBUSxHQUNULEdBQUcsR0FBRyxDQUFDLElBTVAsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxDQUFDLENBQUM7UUFFM0UsSUFBSSxDQUFDLFVBQVU7WUFDYixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUNuRSxJQUFJLENBQUMsSUFBSTtZQUNQLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxvQ0FBb0MsRUFBRSxDQUFDLENBQUM7UUFFN0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEMsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUM5QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLENBQUMsQ0FBQztRQUMzRSxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2QixNQUFNLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxXQUFXLENBQUMsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBRXRDLElBQUksV0FBVyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFDRCxNQUFNLEdBQUcsR0FBRyxNQUFBLEtBQUssQ0FBQyxRQUFRLENBQUMsbUNBQUksQ0FBQyxDQUFDO1FBQ2pDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUdELElBQUksYUFBYSxHQUFRLElBQUksQ0FBQztRQUU5QixNQUFNLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBUyxFQUFFOztZQUV2QyxNQUFNLFdBQVcsR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25FLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDakIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLENBQUM7WUFDMUQsQ0FBQztZQUNELElBQUksV0FBVyxDQUFDLGdCQUFnQixLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMzQyxNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQztZQUN2RCxDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQ2xCLE1BQU0sa0JBQVEsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZELElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDcEIsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLENBQUM7WUFDNUQsQ0FBQztZQUlELElBQUksV0FBVyxDQUFDLFlBQVksRUFBRSxDQUFDO2dCQUM3QixNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7Z0JBQ2pELElBQUksUUFBUSxHQUFHLEtBQUs7b0JBQ2xCLE1BQU07d0JBQ0osTUFBTSxFQUFFLEdBQUc7d0JBQ1gsT0FBTyxFQUFFLDhDQUE4QztxQkFDeEQsQ0FBQztZQUNOLENBQUM7WUFDRCxJQUFJLFdBQVcsQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDM0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLFlBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFHeEMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDOUIsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFFbEMsSUFBSSxZQUFZLEdBQUcsR0FBRyxFQUFFLENBQUM7b0JBQ3ZCLE1BQU07d0JBQ0osTUFBTSxFQUFFLEdBQUc7d0JBQ1gsT0FBTyxFQUFFLDRDQUE0QztxQkFDdEQsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztZQUdELE1BQU0sY0FBYyxHQUFHLE1BQUEsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsbUNBQUksQ0FBQyxDQUFDO1lBQ3hELElBQUksY0FBYyxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUN4QixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsQ0FBQztZQUNyRSxDQUFDO1lBR0QsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6RCxNQUFNLE9BQU8sR0FBRyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztZQUV0QyxNQUFNLFdBQVcsR0FBRyxNQUFNLHNCQUFZLENBQUMsSUFBSSxDQUFDO2dCQUMxQyxLQUFLLEVBQUUsV0FBVyxDQUFDLEdBQUc7Z0JBQ3RCLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7Z0JBQ3hCLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTthQUN2QyxDQUFDO2lCQUNDLE1BQU0sQ0FBQyxVQUFVLENBQUM7aUJBQ2xCLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUVwQixNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUN2QyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxXQUFDLE9BQUEsR0FBRyxHQUFHLENBQUMsTUFBQSxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxtQ0FBSSxDQUFDLENBQUMsQ0FBQSxFQUFBLEVBQzFDLENBQUMsQ0FDRixDQUFDO1lBQ0YsTUFBTSxTQUFTLEdBQUcsY0FBYyxHQUFHLGNBQWMsQ0FBQztZQUVsRCxJQUFJLEdBQUcsR0FBRyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsTUFBTTtvQkFDSixNQUFNLEVBQUUsR0FBRztvQkFDWCxPQUFPLEVBQUUsNENBQTRDO29CQUNyRCxTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDO2lCQUNsQyxDQUFDO1lBQ0osQ0FBQztZQUdELE1BQU0sU0FBUyxHQUFHLE1BQUEsS0FBSyxDQUFDLEtBQUssQ0FBQyxtQ0FBSSxDQUFDLENBQUM7WUFDcEMsTUFBTSxZQUFZLEdBQUcsVUFBVSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUVoRixNQUFNLGVBQWUsR0FBRyxJQUFJLHNCQUFZLENBQUM7Z0JBQ3ZDLElBQUksRUFBRSxRQUFRO2dCQUNkLFFBQVEsRUFBRSxjQUFjLENBQUMsR0FBRztnQkFDNUIsS0FBSyxFQUFFLFdBQVcsQ0FBQyxHQUFHO2dCQUN0QixLQUFLLEVBQUUsU0FBUztnQkFDaEIsTUFBTSxFQUFFLFNBQVMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVztnQkFDL0MsYUFBYSxFQUFFLGFBQWEsYUFBYixhQUFhLGNBQWIsYUFBYSxHQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7Z0JBQ3BFLFFBQVEsRUFBRSxHQUFHO2dCQUNiLFlBQVk7YUFDYixDQUFDLENBQUM7WUFHSCxJQUFJLE9BQU8sR0FBUSxJQUFJLENBQUM7WUFDeEIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sYUFBYSxHQUFHLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO2dCQUN4RCxPQUFPLEdBQUcsSUFBSSxjQUFJLENBQUM7b0JBQ2pCLFFBQVEsRUFBRSxjQUFjLENBQUMsR0FBRztvQkFDNUIsWUFBWSxFQUFFLGVBQWUsQ0FBQyxHQUFHO29CQUNqQyxNQUFNLEVBQUUsU0FBUyxHQUFHLGVBQWUsQ0FBQyxRQUFRO29CQUM1QyxNQUFNLEVBQUUsU0FBUztvQkFDakIsYUFBYSxFQUFFLGFBQWEsYUFBYixhQUFhLGNBQWIsYUFBYSxHQUFJLFNBQVM7b0JBQ3pDLGFBQWE7b0JBQ2IsVUFBVSxFQUFFLElBQUksSUFBSSxFQUFFO29CQUN0QixPQUFPLEVBQUUsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7b0JBQ3ZELEtBQUssRUFBRTt3QkFDTDs0QkFDRSxXQUFXLEVBQUUsNkJBQTZCLFdBQVcsQ0FBQyxLQUFLLEtBQUssUUFBUSxDQUFDLGtCQUFrQixDQUN6RixPQUFPLENBQ1IsR0FBRzs0QkFDSixRQUFRLEVBQUUsZUFBZSxDQUFDLFFBQVE7NEJBQ2xDLEtBQUssRUFBRSxTQUFTO3lCQUNqQjtxQkFDRjtpQkFDRixDQUFDLENBQUM7Z0JBRUgsTUFBTSxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQztZQUNsQyxDQUFDO1lBR0QsSUFBSSxTQUFTLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBRW5CLE1BQUEsY0FBYyxDQUFDLGNBQWMsb0NBQTdCLGNBQWMsQ0FBQyxjQUFjLEdBQUssRUFBRSxFQUFDO2dCQUNyQyxjQUFjLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBRXBELE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDNUQsTUFBTSxVQUFVLEdBQUcsb0NBQW9DLGVBQWUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDN0UsTUFBTSxRQUFRLEdBQUcscUJBQXFCLFdBQVcsYUFBWCxXQUFXLHVCQUFYLFdBQVcsQ0FBRSxHQUFHLEVBQUUsQ0FBQztnQkFDekQsTUFBTSxTQUFTLEdBQUcsa0NBQWtDLGtCQUFrQixDQUNwRSxRQUFRLENBQ1QsRUFBRSxDQUFDO2dCQUdKLE1BQU0sSUFBQSxrREFBMEIsRUFBQztvQkFDL0IsRUFBRSxFQUFFLGNBQWMsQ0FBQyxLQUFLO29CQUN4QixTQUFTLEVBQUUsY0FBYyxDQUFDLE9BQU8sQ0FBQyxTQUFTO29CQUMzQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEtBQUs7b0JBQzdCLFNBQVMsRUFBRSxrQkFBa0I7b0JBQzdCLFlBQVksRUFBRSxXQUFXLENBQUMsT0FBTztvQkFDakMsUUFBUSxFQUFFLGVBQWUsQ0FBQyxRQUFRO29CQUNsQyxTQUFTO29CQUNULFVBQVU7aUJBQ1gsQ0FBQyxDQUFDO2dCQUVILE1BQU0sY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDekMsQ0FBQztZQUVELE1BQU0sZUFBZSxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7WUFDeEMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQXFCLENBQUMsQ0FBQztZQUN0RSxNQUFNLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUV6QixhQUFhLEdBQUc7Z0JBQ2QsT0FBTyxFQUFFLCtCQUErQjtnQkFDeEMsY0FBYyxFQUFFLGVBQWUsQ0FBQyxHQUFHO2dCQUNuQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUNwQyxlQUFlLEVBQUUsU0FBUyxHQUFHLEdBQUc7YUFDakMsQ0FBQztRQUNKLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE1BQU0sbUNBQUksR0FBRyxDQUFDO1FBQ3BDLElBQUksTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDO1lBRW5CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLGlCQUM1QixPQUFPLEVBQUUsTUFBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsT0FBTyxtQ0FBSSxzQkFBc0IsSUFDOUMsQ0FBQyxDQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxTQUFTLEtBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUNuRSxDQUFDO1FBQ0wsQ0FBQztRQUVELGdCQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDakUsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7WUFBUyxDQUFDO1FBQ1QsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxDQUFPLEVBQUUsQ0FBTyxFQUFFLEVBQUU7SUFDL0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRTtRQUUzQyxRQUFRLEVBQUUsY0FBYztRQUN4QixJQUFJLEVBQUUsU0FBUztRQUNmLEtBQUssRUFBRSxTQUFTO1FBQ2hCLEdBQUcsRUFBRSxTQUFTO0tBQ2YsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUN6QixNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQztBQUNuQixDQUFDLENBQUM7QUFFRixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQVUsRUFBRSxFQUFFO0lBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDL0IsTUFBTSxHQUFHLEdBQXFCLEVBQUUsQ0FBQztJQUVqQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUMxQixNQUFNLENBQUMsR0FBRyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQSxDQUFDLGFBQUQsQ0FBQyx1QkFBRCxDQUFDLENBQUUsR0FBRyxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekUsSUFBSSxDQUFDLGtCQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUFFLFNBQVM7UUFDM0MsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUFFLFNBQVM7UUFDMUIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNaLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMsQ0FBQztBQUVGLE1BQU0sT0FBTyxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUNwRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsS0FBSyxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUUzQixJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLENBQUMsa0JBQVEsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixDQUFDO1lBQzFELENBQUMsQ0FBQyxLQUFLLENBQUMsb0JBQW9CO1lBQzVCLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFUCxNQUFNLFdBQVcsR0FDZixDQUFBLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFlBQVksMENBQUUsY0FBYztZQUNuQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO1lBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLGNBQWM7WUFDbkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUVULE1BQU0sZ0JBQWdCLEdBQUcsYUFBYSxDQUFDLENBQUMsR0FBRyxVQUFVLEVBQUUsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRXhFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM3QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsS0FBSztnQkFDZCxhQUFhLEVBQUUsSUFBSTtnQkFDbkIsd0JBQXdCLEVBQUUsRUFBRTthQUM3QixDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUV2QixNQUFNLHdCQUF3QixHQUt6QixFQUFFLENBQUM7UUFFUixJQUFJLFlBQVksR0FBUSxJQUFJLENBQUM7UUFFN0IsS0FBSyxNQUFNLGVBQWUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQy9DLE1BQU0sYUFBYSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDO2lCQUNoRSxRQUFRLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsS0FBSyxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDakUsTUFBTSxFQUFFLG1DQUFtQztnQkFDM0MsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsWUFBWSxFQUFFLENBQUMsRUFBRSxFQUFFO2FBQ3ZDLENBQUM7aUJBQ0QsTUFBTSxDQUFDLDJCQUEyQixDQUFDO2lCQUNuQyxJQUFJLEVBQUUsQ0FBQztZQUVWLElBQUksQ0FBQyxhQUFhO2dCQUFFLFNBQVM7WUFFN0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBRSxhQUFxQixDQUFDLE1BQU0sQ0FBQztnQkFDekQsQ0FBQyxDQUFFLGFBQXFCLENBQUMsTUFBTTtnQkFDL0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUdQLE1BQU0sV0FBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRTtnQkFDNUMsSUFBSSxDQUFDLENBQUEsRUFBRSxhQUFGLEVBQUUsdUJBQUYsRUFBRSxDQUFFLFVBQVUsQ0FBQTtvQkFBRSxPQUFPLEtBQUssQ0FBQztnQkFDbEMsT0FBTyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksR0FBRyxDQUFDO1lBQ3hDLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNO2dCQUFFLFNBQVM7WUFFbEMsSUFBSSxDQUFDLFlBQVk7Z0JBQUUsWUFBWSxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7WUFFckQsd0JBQXdCLENBQUMsSUFBSSxDQUFDO2dCQUM1QixHQUFHLEVBQUUsYUFBYSxDQUFDLEdBQUc7Z0JBQ3RCLElBQUksRUFBRyxhQUFxQixDQUFDLElBQUk7Z0JBQ2pDLFNBQVMsRUFBRyxhQUFxQixDQUFDLFNBQVM7Z0JBQzNDLE1BQU0sRUFBRSxXQUFXO2FBQ3BCLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLHdCQUF3QixFQUFFLEVBQUU7YUFDN0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLElBQUk7WUFDYixhQUFhLEVBQUUsWUFBWTtZQUMzQix3QkFBd0I7U0FDekIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0scUJBQXFCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQ2xFLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO1FBRXpCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNULE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQztRQUMzRCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDL0QsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXZELElBQUksY0FBc0IsQ0FBQztRQUMzQixJQUFJLFdBQStCLENBQUM7UUFFcEMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4QyxjQUFjLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQztZQUN2QyxXQUFXLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQztRQUNuQyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQVEsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUM5QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO1FBQ0QsSUFBSSxXQUFXLElBQUksQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzFELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFHRCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBR0QsTUFBTSxHQUFHLEdBQUcsTUFBTSxzQkFBWSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxNQUFNLENBQzVELGdDQUFnQyxDQUNqQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLEdBQUc7WUFDTixPQUFPLEdBQUc7aUJBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQztpQkFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsQ0FBQyxDQUFDO1FBRTNELE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDdkIsTUFBTSxPQUFPLEdBQXNCLEdBQVcsYUFBWCxHQUFHLHVCQUFILEdBQUcsQ0FBVSxJQUFJLENBQUM7UUFFckQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2IsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDakQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsT0FBTyxFQUFFLHNDQUFzQzthQUNoRCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUksR0FBVyxhQUFYLEdBQUcsdUJBQUgsR0FBRyxDQUFVLGFBQWEsQ0FBQztRQUNsRCxJQUFJLE9BQU8sYUFBYSxLQUFLLFFBQVEsSUFBSSxhQUFhLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDckUsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBQ0QsSUFBSSxHQUFHLENBQUMsTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQy9CLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUdELE1BQU0sS0FBSyxHQUFHLE1BQU0sZUFBSyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUNsRCwyQ0FBMkMsQ0FDNUMsQ0FBQztRQUNGLElBQUksQ0FBQyxLQUFLO1lBQ1IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxDQUFDLENBQUM7UUFFckUsTUFBTSxZQUFZLEdBQUcsTUFBQSxNQUFDLEtBQWEsYUFBYixLQUFLLHVCQUFMLEtBQUssQ0FBVSxTQUFTLDBDQUFFLGFBQWEsMENBQUUsUUFBUSxFQUFFLENBQUM7UUFDMUUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ2xCLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwrQ0FBK0MsRUFBRSxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUdELElBQUksVUFBVSxHQUF5QixVQUFVLENBQUM7UUFDbEQsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBR3ZCLE1BQU0sQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ2hELGVBQUssQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDO1lBQ3RFLGtCQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FDbkMsdURBQXVELENBQ3hEO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNiLFVBQVUsR0FBRyxPQUFPLENBQUM7WUFDckIsTUFBTSxHQUFHLEdBQ1AsTUFBQSxNQUFDLFFBQWdCLENBQUMsY0FBYyxtQ0FDL0IsUUFBZ0IsQ0FBQyxhQUFhLG1DQUMvQixFQUFFLENBQUM7WUFDTCxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFPLEVBQUUsRUFBRSxDQUFDLEVBQUUsYUFBRixFQUFFLHVCQUFGLEVBQUUsQ0FBRSxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsQ0FBQyxDQUFDLENBQUMsR0FBRyxhQUFILEdBQUcsdUJBQUgsR0FBRyxDQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFDdEIsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUM7Z0JBQ3RELFVBQVUsR0FBRyxJQUFJLENBQUM7UUFDdEIsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7WUFDL0IsVUFBVSxHQUFHLFVBQVUsQ0FBQztZQUN4QixNQUFNLEdBQUcsR0FDUCxNQUFBLE1BQUEsTUFBQyxXQUFtQixDQUFDLG9CQUFvQixtQ0FDeEMsV0FBbUIsQ0FBQyxjQUFjLG1DQUNsQyxXQUFtQixDQUFDLGFBQWEsbUNBQ2xDLEVBQUUsQ0FBQztZQUNMLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO2dCQUNuQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQU8sRUFBRSxFQUFFLENBQUMsRUFBRSxhQUFGLEVBQUUsdUJBQUYsRUFBRSxDQUFFLFFBQVEsRUFBRSxDQUFDO2dCQUN0QyxDQUFDLENBQUMsQ0FBQyxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUN0QixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQztnQkFBRSxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQzNFLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsT0FBTyxFQUNMLGlGQUFpRjthQUNwRixDQUFDLENBQUM7UUFDTCxDQUFDO1FBR0QsTUFBTSxPQUFPLEdBQUcsTUFBTSxlQUFLLENBQUMsZ0JBQWdCLENBQzFDO1lBQ0UsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2QsYUFBYSxFQUFFLEdBQUcsQ0FBQyxHQUFHO1lBQ3RCLHNCQUFzQixFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxHQUFHLEVBQUU7U0FDekMsRUFDRDtZQUNFLEtBQUssRUFBRTtnQkFDTCxPQUFPLEVBQUU7b0JBQ1AsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFO29CQUN2QixZQUFZLEVBQUUsR0FBRyxDQUFDLEdBQUc7b0JBQ3JCLEtBQUssRUFBRSxXQUFXO29CQUNsQixVQUFVO2lCQUNYO2FBQ0Y7U0FDRixFQUNELEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUNkLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRXhCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNiLE1BQU0sT0FBTyxHQUFHLE1BQU0sZUFBSyxDQUFDLE1BQU0sQ0FBQztnQkFDakMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHO2dCQUNkLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxHQUFHO2FBQ2hDLENBQUMsQ0FBQztZQUNILElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ1osT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDMUIsRUFBRSxFQUFFLEtBQUs7b0JBQ1QsY0FBYyxFQUFFLElBQUk7b0JBQ3BCLE9BQU8sRUFBRSxnREFBZ0Q7aUJBQzFELENBQUMsQ0FBQztZQUNMLENBQUM7WUFDRCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQ0wsZ0VBQWdFO2FBQ25FLENBQUMsQ0FBQztRQUNMLENBQUM7UUFLRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDZCxFQUFFLEVBQUUsSUFBSTtZQUNSLE9BQU8sRUFBRSxxQkFBcUI7WUFDOUIsWUFBWSxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTTtZQUNwQyxTQUFTLEVBQUUsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7U0FDdkQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25CLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO0lBQzlELENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUVGLE1BQU0sd0JBQXdCLEdBQUcsRUFBRSxDQUFDO0FBRXBDLE1BQU0sWUFBWSxHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUN6RCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUMvQixNQUFNLFVBQVUsR0FBRyxDQUFBLE1BQUMsR0FBVyxDQUFDLFFBQVEsMENBQUUsR0FBRyxNQUFJLE1BQUEsTUFBQSxHQUFHLENBQUMsSUFBSSwwQ0FBRSxLQUFLLDBDQUFFLEdBQUcsQ0FBQSxDQUFDO1FBRXRFLElBQUksQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCxNQUFNLEtBQUssR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUNoRCwyQ0FBMkMsQ0FDNUMsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBRXZCLE1BQU0sTUFBTSxHQUNWLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWTtZQUNwQixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVU7WUFDbEIsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEdBQUc7WUFDbkMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUc7WUFDakMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBRWpCLE1BQU0sV0FBVyxHQUFHLElBQUksSUFBSSxDQUMxQixJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsd0JBQXdCLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FDbEQsQ0FBQztRQUVGLE1BQU0saUJBQWlCLEdBQUcsTUFBTSx1QkFBYSxDQUFDLGNBQWMsQ0FBQztZQUMzRCxLQUFLLEVBQUUsS0FBSyxDQUFDLEdBQUc7WUFDaEIsUUFBUSxFQUFFLElBQUk7WUFDZCxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFO1NBQ2xDLENBQUMsQ0FBQztRQUVILE1BQU0sZUFBZSxHQUFHLE1BQU0sd0JBQWMsQ0FBQyxjQUFjLENBQUM7WUFDMUQsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2hCLE1BQU0sRUFBRSxVQUFVO1NBQ25CLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLE1BQU0sd0JBQWMsQ0FBQyxJQUFJLENBQUM7WUFDN0MsS0FBSyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2hCLE1BQU0sRUFBRSxVQUFVO1NBQ25CLENBQUM7YUFDQyxRQUFRLENBQUM7WUFDUixJQUFJLEVBQUUsVUFBVTtZQUNoQixLQUFLLEVBQUUsVUFBVTtZQUNqQixNQUFNLEVBQUUsb0NBQW9DO1NBQzdDLENBQUM7YUFDRCxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQzthQUN2QixLQUFLLENBQUMsRUFBRSxDQUFDO2FBQ1QsSUFBSSxFQUFFLENBQUM7UUFFVixJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUM7UUFFMUIsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNmLE1BQU0sUUFBUSxHQUFHLE1BQU0sdUJBQWEsQ0FBQyxPQUFPLENBQUM7Z0JBQzNDLEtBQUssRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDaEIsUUFBUSxFQUFFLFVBQVU7Z0JBQ3BCLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUU7YUFDbEMsQ0FBQyxDQUFDO1lBRUgsYUFBYSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDN0IsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLEtBQUssQ0FBQyxHQUFHO1lBQ2xCLE1BQU07WUFDTixpQkFBaUI7WUFDakIsZUFBZTtZQUNmLGFBQWE7WUFDYixZQUFZO1NBQ2IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTdDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLGdDQUFnQztZQUN6QyxLQUFLO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBR0YsTUFBTSxXQUFXLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCLEVBQUUsRUFBRTtJQUM1RSxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCxNQUFNLFdBQVcsR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUN0RCx1Q0FBdUMsQ0FDeEMsQ0FBQztRQUVGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLGdCQUFNLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7WUFDekMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQixnQkFBTSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1lBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxJQUFLLFdBQW1CLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkMsZ0JBQU0sQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUN4QyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsTUFBTSxnQkFBZ0IsR0FDcEIsS0FBSyxDQUFDLE9BQU8sQ0FBRSxXQUFtQixDQUFDLGFBQWEsQ0FBQztZQUNoRCxXQUFtQixDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1FBRWhELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUNyQixnQkFBTSxDQUFDLEtBQUssQ0FDViw0REFBNEQsQ0FDN0QsQ0FBQztZQUNGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSw0REFBNEQ7YUFDdEUsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELE1BQU0sZUFBSyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sRUFBRTtZQUNyQyxJQUFJLEVBQUU7Z0JBQ0osU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUNyQixPQUFPLEVBQUUsS0FBSzthQUNmO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsZUFBZSxPQUFPLDZCQUE2QjtTQUM3RCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0NBQStDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEUsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDekMsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxxQkFBcUIsR0FBRyxDQUM1QixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsSUFBSSxDQUNWLDBFQUEwRSxDQUMzRSxDQUFDO1FBR0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1lBQ2hFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDO1FBQzFFLENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUd2RSxNQUFNLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTs7WUFBQyxPQUFBLENBQUM7Z0JBQzlDLEVBQUUsRUFBRSxLQUFLLENBQUMsR0FBRztnQkFDYixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7Z0JBQ2xCLGVBQWUsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztnQkFDN0MsWUFBWSxFQUFFLE1BQUEsS0FBSyxDQUFDLFlBQVksMENBQUUsV0FBVyxFQUFFO2dCQUMvQyxVQUFVLEVBQUUsTUFBQSxLQUFLLENBQUMsVUFBVSwwQ0FBRSxXQUFXLEVBQUU7Z0JBQzNDLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7YUFDekIsQ0FBQyxDQUFBO1NBQUEsQ0FBQyxDQUFDO1FBRUosTUFBTSxhQUFhLEdBQTZCLEVBQUUsQ0FBQztRQUNuRCxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNqQyxNQUFNLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxlQUFlLElBQUksS0FBSyxDQUFDLFlBQVksSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDakYsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN4QixhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQzFCLENBQUM7WUFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO1FBR0gsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLENBQ3BELENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDOUIsQ0FBQztRQUVGLE9BQU8sQ0FBQyxJQUFJLENBQ1YsNkNBQTZDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FDakUsQ0FBQztRQUVGLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1lBQ3ZDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLENBQUM7UUFHRCxJQUFJLFlBQVksR0FBRyxDQUFDLENBQUM7UUFDckIsS0FBSyxNQUFNLGNBQWMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUN4QyxNQUFNLENBQUMsU0FBUyxFQUFFLEdBQUcsY0FBYyxDQUFDLEdBQUcsY0FBYyxDQUFDO1lBRXRELE9BQU8sQ0FBQyxJQUFJLENBQUMsd0NBQXdDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBRXpFLEtBQUssTUFBTSxLQUFLLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBRW5DLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMzRCxPQUFPLENBQUMsSUFBSSxDQUNWLDRDQUE0QyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQzNELENBQUM7b0JBQ0YsTUFBTSxlQUFLLENBQUMsU0FBUyxDQUNuQixFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFLEVBQ3JCLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNqQyxDQUFDO2dCQUNKLENBQUM7Z0JBR0QsTUFBTSxZQUFZLEdBQUcsTUFBTSxlQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLFlBQVksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ2xDLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO29CQUM1RCxZQUFZLEVBQUUsQ0FBQztnQkFDakIsQ0FBQztxQkFBTSxDQUFDO29CQUNOLE9BQU8sQ0FBQyxJQUFJLENBQ1YscURBQXFELEtBQUssQ0FBQyxLQUFLLEdBQUcsQ0FDcEUsQ0FBQztnQkFDSixDQUFDO1lBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRXRFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUNMLDhFQUE4RTtZQUNoRixZQUFZO1NBQ2IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDhDQUE4QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3JFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLDZDQUE2QztZQUN0RCxLQUFLO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUMxQixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsSUFBSSxDQUNWLGtFQUFrRSxDQUNuRSxDQUFDO1FBR0YsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFLLENBQUMsVUFBVSxDQUFDO1lBQ3BDLElBQUksRUFBRTtnQkFDSixFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtnQkFDbkMsRUFBRSxVQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pDO29CQUNFLEtBQUssRUFBRTt3QkFDTCxJQUFJLEVBQUU7NEJBQ0osRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTs0QkFDeEMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTs0QkFDMUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTs0QkFDMUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTs0QkFDdEMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTs0QkFDeEMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRTt5QkFDekM7cUJBQ0Y7aUJBQ0Y7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLG1DQUFtQztZQUM1QyxZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7U0FDbEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdEQUFnRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLCtDQUErQztZQUN4RCxLQUFLO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUMxQixHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7SUFDRixJQUFJLENBQUM7UUFDSCxPQUFPLENBQUMsSUFBSSxDQUFDLGlEQUFpRCxDQUFDLENBQUM7UUFFaEUsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN6QixLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRzNCLE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBSyxDQUFDLFVBQVUsQ0FBQztZQUNwQyxVQUFVLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFO1NBQzNCLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxJQUFJLENBQUMsbUNBQW1DLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLDJDQUEyQztZQUNwRCxZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7U0FDbEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdEQUFnRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLHVEQUF1RDtZQUNoRSxLQUFLO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRyxDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsRUFBRTtJQUNoRSxJQUFJLENBQUM7UUFFSCxNQUFNLGVBQWUsR0FBRyxNQUFNLGVBQUssQ0FBQyxVQUFVLENBQUM7WUFDN0MsR0FBRyxFQUFFLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUM7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLEdBQUcsQ0FDVCwwQkFBMEIsZUFBZSxDQUFDLFlBQVksd0NBQXdDLENBQy9GLENBQUM7UUFHRixNQUFNLGtCQUFrQixHQUFHLElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDckUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBRW5FLE1BQU0sb0JBQW9CLEdBQUcsTUFBTSxlQUFLLENBQUMsVUFBVSxDQUFDO1lBQ2xELFlBQVksRUFBRSxrQkFBa0I7WUFDaEMsVUFBVSxFQUFFLGdCQUFnQjtTQUM3QixDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsR0FBRyxDQUNULDBCQUEwQixvQkFBb0IsQ0FBQyxZQUFZLDRDQUE0QyxDQUN4RyxDQUFDO1FBRUYsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbkIsT0FBTyxFQUFFLEdBQUcsZUFBZSxDQUFDLFlBQVksNENBQTRDLG9CQUFvQixDQUFDLFlBQVksbURBQW1EO1NBQ3pLLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RSxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNuQixLQUFLLEVBQUUsK0NBQStDO1lBQ3RELE9BQU8sRUFBRSxLQUFLO1NBQ2YsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBa0NGLE1BQU0sMkJBQTJCLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDeEUsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO1FBR3JFLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0RBQXdELENBQUMsQ0FBQztRQUN0RSxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSw0Q0FBNEMsQ0FBQyxDQUFDO1FBRTFFLE1BQU0sYUFBYSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDckMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFPLEtBQUssRUFBRSxFQUFFOztZQUN6QixPQUFPLENBQUMsR0FBRyxDQUNULCtCQUErQixLQUFLLENBQUMsS0FBSyxLQUFLLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FDNUQsQ0FBQztZQUdGLE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQztZQUM5QyxLQUFLLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUM7WUFFakQsSUFBSSxtQkFBbUIsS0FBSyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQzlDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMkNBQTJDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ3hFLENBQUM7WUFHRCxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ3pCLE9BQU8sQ0FBQyxHQUFHLENBQ1QsMEJBQTBCLEtBQUssQ0FBQyxLQUFLLHVCQUF1QixDQUM3RCxDQUFDO2dCQUNGLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO1lBQzFCLENBQUM7WUFHRCxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUM3QixJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQ1QsOEJBQThCLEtBQUssQ0FBQyxLQUFLLHVCQUF1QixDQUNqRSxDQUFDO29CQUNGLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDO2dCQUN4QyxDQUFDO2dCQUNELElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDL0MsT0FBTyxDQUFDLEdBQUcsQ0FDVCw4QkFBOEIsS0FBSyxDQUFDLEtBQUssdUJBQXVCLENBQ2pFLENBQUM7b0JBQ0YsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUM7Z0JBQ3hDLENBQUM7WUFDSCxDQUFDO1lBR0QsSUFDRSxDQUFDLENBQUEsTUFBQSxNQUFBLEtBQUssQ0FBQyxRQUFRLDBDQUFFLEdBQUcsMENBQUUsV0FBVyxDQUFBO2dCQUNqQyxLQUFLLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFDM0MsQ0FBQztnQkFDRCxPQUFPLENBQUMsR0FBRyxDQUNULHdDQUF3QyxLQUFLLENBQUMsS0FBSywwQkFBMEIsQ0FDOUUsQ0FBQztnQkFDRixNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUdELE1BQU0sS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLEtBQUssQ0FBQyxLQUFLLEtBQUssS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7WUFDcEUsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDLENBQUEsQ0FBQyxDQUNILENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLGdEQUFnRCxDQUFDLENBQUM7UUFFOUQsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbkIsT0FBTyxFQUFFLEdBQUcsYUFBYSxDQUFDLE1BQU0seUJBQXlCO1lBQ3pELGFBQWE7U0FDZCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1gsOERBQThELEVBQzlELEtBQUssQ0FDTixDQUFDO1FBQ0YsR0FBRzthQUNBLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDbkUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBR0YsU0FBUyxTQUFTLENBQUMsV0FBbUI7SUFDcEMsSUFBSSxDQUFDLFdBQVc7UUFBRSxPQUFPLFdBQVcsQ0FBQztJQUdyQyxNQUFNLE9BQU8sR0FBRyxXQUFXO1NBQ3hCLE9BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1NBQ3ZCLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDO1NBQ3BCLElBQUksRUFBRSxDQUFDO0lBRVYsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQUVELGtCQUFlO0lBRWIsZ0JBQWdCO0lBQ2hCLDZCQUE2QjtJQUM3QixTQUFTO0lBQ1QsT0FBTztJQUNQLHFCQUFxQjtJQUNyQixtQkFBbUI7SUFDbkIsY0FBYztJQUNkLFdBQVc7SUFJWCxxQkFBcUI7SUFDckIsYUFBYTtJQUNiLGVBQWU7SUFFZiwyQkFBMkI7SUFDM0IscUJBQXFCO0lBQ3JCLE9BQU87SUFDUCxxQkFBcUI7SUFDckIsWUFBWTtJQUNaLFdBQVc7SUFDWCxxQkFBcUI7SUFDckIsbUJBQW1CO0lBQ25CLG1CQUFtQjtJQUNuQixtQkFBbUI7Q0FDcEIsQ0FBQyJ9