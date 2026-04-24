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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBMEI7QUFFMUIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFHcEQsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixrRUFBMEM7QUFDMUMsMEVBQWtEO0FBQ2xELDBEQUFrQztBQUNsQyw0REFBb0M7QUFDcEMsMEVBQTRFO0FBQzVFLHFEQUEyQztBQUMzQyx3Q0FBMEQ7QUFDMUQsNERBQW9DO0FBQ3BDLDJDQUF3RTtBQUN4RSxvRkFBaUY7QUFDakYsNEVBQW9EO0FBQ3BELDhFQUFzRDtBQUN0RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUEyS3RDLE1BQU0sZ0JBQWdCLEdBQUcsQ0FBTyxHQUFXLEVBQW1CLEVBQUU7O0lBQzlELElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FDVix3REFBd0QsR0FBRyxHQUFHLENBQy9ELENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sa0JBQWtCLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FB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