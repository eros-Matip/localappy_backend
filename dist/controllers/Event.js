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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBMEI7QUFFMUIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFHcEQsdUNBQXlCO0FBQ3pCLGtEQUEwQjtBQTJLMUIsTUFBTSxnQkFBZ0IsR0FBRyxDQUFPLEdBQVcsRUFBbUIsRUFBRTs7SUFDOUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxHQUFHLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztRQUN2QyxPQUFPLENBQUMsSUFBSSxDQUNWLHdEQUF3RCxHQUFHLEdBQUcsQ0FDL0QsQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2YsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsSUFBSSxDQUFDLGtCQUFrQixHQUFHLHdDQUF3QyxDQUFDLENBQUM7UUFDNUUsT0FBTyxrQkFBa0IsQ0FBQztJQUM1QixDQUFDO0lBRUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzFELElBQ0UsUUFBUSxDQUFDLE1BQU0sS0FBSyxHQUFHO2FBQ3ZCLE1BQUEsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsMENBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFBLEVBQ3RELENBQUM7WUFDRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsR0FBRyxHQUFH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