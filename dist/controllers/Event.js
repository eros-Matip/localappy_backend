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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
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
        if (!establishmentFinded.events.includes(draftEvent._id)) {
            establishmentFinded.events.push(draftEvent._id);
        }
        const allCustomerFinded = yield Customer_1.default.find()
            .populate([
            { path: "eventsAttended", model: "Event", select: "organizer" },
            { path: "eventsReserved", model: "Event", select: "organizer" },
            { path: "eventsFavorites", model: "Event", select: "organizer" },
            { path: "establishmentFavorites", model: "Event", select: "organizer" },
        ])
            .select("eventsAttended eventsReserved eventsFavorites establishmentFavorites expoPushToken");
        console.log("allCustomerFinded", allCustomerFinded);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBMEI7QUFFMUIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFHcEQsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQUMxQixrRUFBMEM7QUFDMUMsMEVBQWtEO0FBQ2xELDBEQUFrQztBQUNsQyw0REFBb0M7QUFDcEMsMEVBQTRFO0FBQzVFLHdEQUEyQztBQTJLM0MsTUFBTSxnQkFBZ0IsR0FBRyxDQUFPLEdBQVcsRUFBbUIsRUFBRTs7SUFDOUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztRQUN2QyxPQUFPLENBQUMsSUFBSSxDQUNWLHdEQUF3RCxHQUFHLEdBQUcsQ0FDL0QsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLHdDQUF3QyxDQUFDLENBQUM7UUFDNUUsT0FBTyxrQkFBa0IsQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzFELElBQ0UsUUFBUSxDQUFDLE1BQU0sS0FBSyxHQUFHO2FBQ3ZCLE1BQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsMENBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBLEVBQ3RELENBQUM7WUFD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