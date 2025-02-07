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
const updateOrCreateEventFromJSON = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const basePath = path_1.default.join(__dirname, "..", "..", "events", "objects");
        const updatedEvents = [];
        const createdEvents = [];
        const unmatchedFiles = [];
        for (const file of AllEvents) {
            try {
                console.info(`Traitement du fichier : ${file.file}`);
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
                    console.info(`Nouvel événement créé : ${newEvent.title}`);
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
                    dbEvent.priceSpecification = priceSpecification;
                    dbEvent.acceptedPaymentMethod = acceptedPaymentMethod;
                    yield dbEvent.save();
                    updatedEvents.push({ id: dbEvent._id, title: dbEvent.title });
                    console.info(`Événement mis à jour : ${dbEvent.title}`);
                }
            }
            catch (error) {
                unmatchedFiles.push(file.file);
                console.error(`Erreur lors du traitement du fichier : ${file.file}`, error);
            }
        }
        return res.status(200).json({
            message: "Traitement des événements terminé.",
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
    try {
        const { title, theme, startingDate, endingDate, address, price, priceSpecification, acceptedPaymentMethod, organizer, image, description, color, } = req.body;
        const establishmentFinded = yield Establishment_1.default.findById(req.params.establishmentId);
        if (!establishmentFinded) {
            Retour_1.default.error("Establishment not found");
            return res.status(404).json({ message: "Establishment not found" });
        }
        if (!title || !startingDate || !price || !endingDate || !organizer) {
            Retour_1.default.error("Missing some values");
            return res.status(400).json({
                message: "Missing some values",
            });
        }
        const existingEvent = yield Event_1.default.findOne({
            title: title,
            startingDate: new Date(startingDate),
        });
        if (existingEvent) {
            return res.status(409).json({
                message: "An event with this title and starting date already exists.",
            });
        }
        const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${address}`);
        const latitude = address
            ? responseApiGouv.data.features[0].geometry.coordinates[1]
            : establishmentFinded.location.lat;
        const longitude = address
            ? responseApiGouv.data.features[0].geometry.coordinates[0]
            : establishmentFinded.location.lng;
        const newEvent = new Event_1.default({
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
        yield newEvent.save();
        establishmentFinded.events.push(Object(newEvent)._id);
        yield establishmentFinded.save();
        return res.status(201).json({
            message: "Event created successfully",
            event: newEvent,
        });
    }
    catch (error) {
        console.error("Error creating event:", error);
        return res.status(500).json({
            message: "Failed to create event",
            error: error,
        });
    }
});
const readEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    const eventId = req.params.eventId;
    return Event_1.default.findById(eventId)
        .then((event) => event
        ? res.status(200).json({ message: event })
        : res.status(404).json({ message: "Not found" }))
        .catch((error) => res.status(500).json({ error: error.message }));
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
            fetchUniqueEventsWithCount({ endingDate: { $lt: currentDate } }),
            fetchUniqueEventsWithCount({
                startingDate: { $lte: currentDate },
                endingDate: { $gte: currentDate },
            }),
            fetchUniqueEventsWithCount({ startingDate: { $gt: currentDate } }),
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
        const result = yield Event_1.default.deleteMany({
            $or: [{ startingDate: null }, { endingDate: null }],
        });
        console.log(`Événements supprimés : ${result.deletedCount} avec startingDate ou endingDate null.`);
        res.status(200).json({
            message: `${result.deletedCount} événements supprimés avec succès.`,
        });
    }
    catch (error) {
        console.error("Erreur lors de la suppression des événements invalides :", error);
        res.status(500).json({
            error: "Erreur lors de la suppression des événements invalides.",
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
    createEventForAnEstablishment,
    readEvent,
    readAll,
    getEventsByPostalCode,
    getEventsByPosition,
    getEventByDate,
    updateEvent,
    updateOrCreateEventFromJSON,
    getCoordinatesFromAPI,
    verifAllEvent,
    updateImageUrls,
    updateDescriptionsAndPrices,
    deleteEvent,
    deleteDuplicateEvents,
    removeMidnightDates,
    removeExpiredEvents,
    deleteInvalidEvents,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBMEI7QUFFMUIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFFcEQsZ0RBQXdCO0FBQ3hCLHVDQUF5QjtBQUN6QixrREFBMEI7QUFXMUIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFnS3JELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBTyxHQUFXLEVBQW1CLEVBQUU7O0lBQzlELElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FDVix3REFBd0QsR0FBRyxHQUFHLENBQy9ELENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sa0JBQWtCLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUNFLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRzthQUN2QixNQUFBLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLDBDQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQSxFQUN0RCxDQUFDO1lBQ0QsT0FBTyxHQUFHLENBQUM7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