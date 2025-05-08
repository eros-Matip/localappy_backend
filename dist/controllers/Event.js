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
        const { title, theme, startingDate, endingDate, address, price, priceSpecification, acceptedPaymentMethod, capacity, registrationOpen, organizer, image, description, color, } = req.body;
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
            capacity,
            registrationOpen,
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
    try {
        const eventId = req.params.eventId;
        const { source } = req.body;
        const event = yield Event_1.default.findById(eventId);
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
const registrationToAnEvent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventFinded = yield Event_1.default.findById(req.params.eventId);
        if (!eventFinded) {
            return res.status(404).json({ message: "Événement introuvable" });
        }
        if (eventFinded.registrationOpen === false) {
            return res.status(404).json({ message: "Incription fermée" });
        }
        const customerFinded = yield Customer_1.default.findById(req.body.customerId);
        if (!customerFinded) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }
        if (eventFinded.capacity <= 0) {
            return res.status(400).json({ message: "Plus de places disponibles" });
        }
        const { paymentMethod, quantity } = req.body;
        const price = eventFinded.price;
        const newRegistration = new Registration_1.default({
            date: new Date(),
            customer: customerFinded._id,
            event: eventFinded._id,
            price: price,
            status: "pending",
            paymentMethod: paymentMethod,
            quantity: quantity || 1,
        });
        yield newRegistration.save();
        const invoiceNumber = `INV-${Date.now()}`;
        if (price > 0) {
            const newBill = new Bill_1.default({
                customer: customerFinded._id,
                registration: newRegistration._id,
                amount: price * newRegistration.quantity,
                status: "pending",
                paymentMethod: paymentMethod,
                invoiceNumber: invoiceNumber,
                issuedDate: new Date(),
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                items: [
                    {
                        description: `Inscription à l'événement ${eventFinded.title}`,
                        quantity: newRegistration.quantity,
                        price: price,
                    },
                ],
            });
            yield newBill.save();
        }
        eventFinded.capacity -= newRegistration.quantity;
        yield eventFinded.save();
        return res.status(201).json({
            message: "Inscription et facture créées avec succès",
            registration: newRegistration,
        });
    }
    catch (error) {
        Retour_1.default.error({ message: "Erreur lors de l'inscription", error: error });
        return res
            .status(500)
            .json({ message: "Erreur lors de l'inscription", error: error });
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
    registrationToAnEvent,
    deleteEvent,
    deleteDuplicateEvents,
    removeMidnightDates,
    removeExpiredEvents,
    deleteInvalidEvents,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSxrREFBMEI7QUFFMUIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFFcEQsZ0RBQXdCO0FBQ3hCLHVDQUF5QjtBQUN6QixrREFBMEI7QUFDMUIsa0VBQTBDO0FBQzFDLDBFQUFrRDtBQUNsRCwwREFBa0M7QUFXbEMsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFnS3JELE1BQU0sZ0JBQWdCLEdBQUcsQ0FBTyxHQUFXLEVBQW1CLEVBQUU7O0lBQzlELElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxLQUFLLGtCQUFrQixFQUFFLENBQUM7UUFDdkMsT0FBTyxDQUFDLElBQUksQ0FDVix3REFBd0QsR0FBRyxHQUFHLENBQy9ELENBQUM7UUFDRixPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNmLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyx3Q0FBd0MsQ0FBQyxDQUFDO1FBQzVFLE9BQU8sa0JBQWtCLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUMxRCxJQUNFLFFBQVEsQ0FBQyxNQUFNLEtBQUssR0FBRzthQUN2QixNQUFBLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLDBDQUFFLFVBQVUsQ0FBQyxRQUFRLENB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