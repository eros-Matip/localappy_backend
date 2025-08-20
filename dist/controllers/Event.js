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
const mongoose_1 = __importDefault(require("mongoose"));
const push_1 = require("../utils/push");
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
            console.log("Max Prices:", maxPrices, "Min Prices:", minPrices, "Price:", price, "Currency:", currency);
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
    console.log("Final Values - Min Price:", minPrice, "Max Price:", maxPrice, "Currency:", priceCurrency);
    return {
        priceCurrency,
        minPrice,
        maxPrice,
        price: maxPrice,
    };
}
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
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
        let latitude = ((_a = draftEvent.location) === null || _a === void 0 ? void 0 : _a.lat) || establishmentFinded.location.lat;
        let longitude = ((_b = draftEvent.location) === null || _b === void 0 ? void 0 : _b.lng) || establishmentFinded.location.lng;
        if (address) {
            const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${address}`);
            if (((_c = responseApiGouv.data.features) === null || _c === void 0 ? void 0 : _c.length) > 0 &&
                ((_e = (_d = responseApiGouv.data.features[0].geometry) === null || _d === void 0 ? void 0 : _d.coordinates) === null || _e === void 0 ? void 0 : _e.length) === 2) {
                longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
                latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
            }
        }
        else {
            address = draftEvent.address || ((_f = establishmentFinded.address) === null || _f === void 0 ? void 0 : _f.street) || "";
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
                minPrice: ((_g = req.body.priceSpecification) === null || _g === void 0 ? void 0 : _g.minPrice) || 0,
                maxPrice: ((_h = req.body.priceSpecification) === null || _h === void 0 ? void 0 : _h.maxPrice) || req.body.price || 0,
                priceCurrency: ((_j = req.body.priceSpecification) === null || _j === void 0 ? void 0 : _j.priceCurrency) || "EUR",
            },
            capacity: req.body.capacity || draftEvent.capacity,
            organizer: {
                establishment: draftEvent.organizer.establishment,
                legalName: draftEvent.organizer.legalName,
                email: ((_k = req.body.organizer) === null || _k === void 0 ? void 0 : _k.email) || draftEvent.organizer.email,
                phone: ((_l = req.body.organizer) === null || _l === void 0 ? void 0 : _l.phone) || draftEvent.organizer.phone,
            },
            registrationOpen: req.body.registrationOpen !== undefined
                ? req.body.registrationOpen
                : true,
            acceptedPaymentMethod: req.body.acceptedPaymentMethod || draftEvent.acceptedPaymentMethod,
            description: req.body.description || draftEvent.description,
            color: req.body.color || draftEvent.color,
            isDraft: false,
        });
        yield draftEvent.save();
        if (!establishmentFinded.events.includes(draftEvent._id)) {
            establishmentFinded.events.push(draftEvent._id);
            yield establishmentFinded.save();
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
            imageUrl: (_m = draftEvent.image) === null || _m === void 0 ? void 0 : _m[0],
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
    var _a, _b;
    try {
        const establishmentId = req.params.establishmentId;
        const establishmentFinded = yield Establishment_1.default.findById(establishmentId);
        if (!establishmentFinded) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        const filesObject = req.files && !Array.isArray(req.files) ? req.files : {};
        const allFiles = Object.values(filesObject).flat();
        if (allFiles.length === 0) {
            return res.status(400).json({
                message: "Aucune image n'a été envoyée. Veuillez ajouter une image.",
            });
        }
        const sanitizeFolderName = (name) => name
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        const folderName = sanitizeFolderName(establishmentFinded.name);
        const uploadedImageUrls = [];
        for (const file of allFiles) {
            const result = yield cloudinary_1.default.v2.uploader.upload(file.path, {
                folder: `establishments/${folderName}`,
            });
            uploadedImageUrls.push(result.secure_url);
        }
        const longitude = ((_a = establishmentFinded.location) === null || _a === void 0 ? void 0 : _a.lng) || 0;
        const latitude = ((_b = establishmentFinded.location) === null || _b === void 0 ? void 0 : _b.lat) || 0;
        const normalizedTheme = Array.isArray(req.body.theme)
            ? req.body.theme
            : typeof req.body.theme === "string"
                ? [req.body.theme]
                : [];
        const newEvent = new Event_1.default({
            image: uploadedImageUrls,
            theme: normalizedTheme,
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
        yield newEvent.save();
        establishmentFinded.events.push(newEvent._id);
        yield establishmentFinded.save();
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
        const { source } = req.body;
        const event = yield Event_1.default.findById(eventId).populate({
            path: "registrations",
            model: "Registration",
            populate: "customer",
        });
        if (!event) {
            return res.status(404).json({ message: "Not found" });
        }
        const clic = {
            source: source,
            date: new Date(),
        };
        event.clics.push(clic);
        yield event.save();
        return res.status(200).json({ message: event });
    }
    catch (error) {
        return res.status(500).json({ error: error });
    }
});
const readAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    return Event_1.default.find()
        .then((events) => res.status(200).json({ message: events }))
        .catch((error) => res.status(500).json({ error: error.message }));
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
const getEventsByPosition = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { latitude, longitude, radius } = req.body;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const maxDistance = parseFloat(radius) * 1000 || 50000;
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
        const fetchUniqueEventsWithCount = (matchCondition) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const total = yield Event_1.default.aggregate([
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
            const events = yield Event_1.default.aggregate([
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
                total: ((_a = total[0]) === null || _a === void 0 ? void 0 : _a.total) || 0,
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
    }
    catch (error) {
        console.error("Erreur lors de la récupération des événements :", error);
        return res
            .status(500)
            .json({ message: "Erreur interne du serveur.", error: error });
    }
});
const updateEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const eventId = req.params.eventId;
    try {
        const event = yield Event_1.default.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Événement non trouvé" });
        }
        event.title = req.body.title || event.title;
        event.description = req.body.description || event.description;
        event.startingDate = req.body.startingDate
            ? new Date(req.body.startingDate)
            : event.startingDate;
        event.endingDate = req.body.endingDate
            ? new Date(req.body.endingDate)
            : event.endingDate;
        if (req.body.priceSpecification) {
            const { minPrice, maxPrice, priceCurrency } = req.body.priceSpecification;
            event.priceSpecification = {
                minPrice: minPrice || ((_a = event.priceSpecification) === null || _a === void 0 ? void 0 : _a.minPrice) || 0,
                maxPrice: maxPrice || ((_b = event.priceSpecification) === null || _b === void 0 ? void 0 : _b.maxPrice) || 0,
                priceCurrency: priceCurrency || ((_c = event.priceSpecification) === null || _c === void 0 ? void 0 : _c.priceCurrency) || "EUR",
            };
        }
        if (req.body.acceptedPaymentMethod) {
            event.acceptedPaymentMethod = req.body.acceptedPaymentMethod.length
                ? req.body.acceptedPaymentMethod
                : event.acceptedPaymentMethod;
        }
        if (req.body.organizer) {
            const organizer = req.body.organizer;
            if (!organizer.establishment) {
                return res.status(400).json({
                    message: "L'établissement est obligatoire pour l'organisateur",
                });
            }
            event.organizer = {
                establishment: organizer.establishment,
                legalName: organizer.legalName ||
                    ((_d = event.organizer) === null || _d === void 0 ? void 0 : _d.legalName) ||
                    "Organisateur inconnu",
                email: organizer.email || ((_e = event.organizer) === null || _e === void 0 ? void 0 : _e.email) || "Email inconnu",
                phone: organizer.phone || ((_f = event.organizer) === null || _f === void 0 ? void 0 : _f.phone) || "Téléphone inconnu",
            };
        }
        if (typeof req.body.isDraft === "boolean") {
            event.isDraft = req.body.isDraft;
        }
        if (req.body.image) {
            event.image = req.body.image;
        }
        const updatedEvent = yield event.save();
        return res.status(200).json({
            message: "Événement mis à jour avec succès",
            event: updatedEvent,
        });
    }
    catch (error) {
        console.error("Erreur lors de la mise à jour de l'événement:", error);
        return res
            .status(500)
            .json({ message: "Erreur lors de la mise à jour de l'événement", error });
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
                if (selected > end)
                    throw {
                        status: 400,
                        message: "Date hors plage (après fin de l'événement)",
                    };
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
                const eventLink = `https://localappy.fr/events/${eventFinded._id}`;
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
const deleteEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const eventId = req.params.eventId;
    const owner = req.body.owner;
    try {
        const eventFinded = yield Event_1.default.findById(eventId);
        if (!owner) {
            return res.status(404).json({ message: "Non authorized to delete" });
        }
        if (!eventFinded) {
            return res.status(404).json({ message: "Événement non trouvé" });
        }
        if (eventFinded && eventFinded.organizer.establishment) {
            const establishment = yield Establishment_1.default.findOne({
                events: eventFinded._id,
            });
            if (establishment) {
                const filter = establishment.events.filter((event) => JSON.stringify(Object(event)._id) !==
                    JSON.stringify(eventFinded._id));
                Object(establishment).events = filter;
                yield establishment.save();
            }
        }
        yield Event_1.default.findByIdAndDelete(eventId);
        return res.status(200).json({
            message: `L'événement ${eventId} a été supprimé avec succès`,
        });
    }
    catch (error) {
        console.error("Erreur lors de la suppression de l'événement:", error);
        return res.status(500).json({ error: error });
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
    deleteEvent,
    deleteDuplicateEvents,
    removeMidnightDates,
    removeExpiredEvents,
    deleteInvalidEvents,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBMEI7QUFFMUIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFHcEQsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixrRUFBMEM7QUFDMUMsMEVBQWtEO0FBQ2xELDBEQUFrQztBQUNsQyw0REFBb0M7QUFDcEMsMEVBQTRFO0FBQzVFLHdEQUEyQztBQUUzQyx3Q0FBMEQ7QUEySzFELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBTyxHQUFXLEVBQW1CLEVBQUU7O0lBQzlELElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FDVix3REFBd0QsR0FBRyxHQUFHLENBQy9ELENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sa0JBQWtCLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUNFLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRzthQUN2QixNQUFBLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLDBDQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQSxF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