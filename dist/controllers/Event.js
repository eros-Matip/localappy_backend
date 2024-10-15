"use strict";
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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const util_1 = __importDefault(require("util"));
const Event_1 = __importDefault(require("../models/Event"));
const Retour_1 = __importDefault(require("../library/Retour"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
const AllEvents = require("../../events/index.json");
const createEvent = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    try {
        const basePath = path_1.default.join(__dirname, "..", "..", "events", "objects");
        for (const event of AllEvents) {
            const fullPath = path_1.default.join(basePath, event.file);
            const fileData = yield readFile(fullPath, "utf-8");
            const eventData = JSON.parse(fileData);
            const title = ((_b = (_a = eventData["rdfs:label"]) === null || _a === void 0 ? void 0 : _a.fr) === null || _b === void 0 ? void 0 : _b[0]) || "Titre par défaut";
            const startingDate = ((_c = eventData["schema:startDate"]) === null || _c === void 0 ? void 0 : _c[0]) || new Date();
            const endingDate = ((_d = eventData["schema:endDate"]) === null || _d === void 0 ? void 0 : _d[0]) || new Date();
            const description = ((_f = (_e = eventData["rdfs:comment"]) === null || _e === void 0 ? void 0 : _e.fr) === null || _f === void 0 ? void 0 : _f[0]) || "Description par défaut";
            const addressData = (_h = (_g = eventData["isLocatedAt"]) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h["schema:address"];
            let address = "Adresse par défaut";
            if (addressData && Array.isArray(addressData)) {
                const firstAddress = addressData[0];
                const streetAddress = Array.isArray(firstAddress["schema:streetAddress"])
                    ? firstAddress["schema:streetAddress"].join(", ")
                    : firstAddress["schema:streetAddress"] || "Rue inconnue";
                const postalCode = firstAddress["schema:postalCode"] || "Code postal inconnu";
                const addressLocality = firstAddress["schema:addressLocality"] || "Ville inconnue";
                address = `${streetAddress}, ${postalCode}, ${addressLocality}`;
            }
            const theme = eventData["@type"] || "Thème inconnu";
            let image = "Image par défaut";
            if (eventData.hasMainRepresentation &&
                Array.isArray(eventData.hasMainRepresentation)) {
                const mainRepresentation = eventData.hasMainRepresentation[0];
                const resource = (_j = mainRepresentation["ebucore:hasRelatedResource"]) === null || _j === void 0 ? void 0 : _j[0];
                image = (resource === null || resource === void 0 ? void 0 : resource["ebucore:locator"]) || "Image par défaut";
            }
            const color = eventData.color || "#000000";
            let phone = "Téléphone inconnu";
            let email = "Email inconnu";
            if (eventData.hasContact && Array.isArray(eventData.hasContact)) {
                const contactInfo = eventData.hasContact[0];
                phone = ((_k = contactInfo["schema:telephone"]) === null || _k === void 0 ? void 0 : _k[0]) || "Téléphone inconnu";
                email = ((_l = contactInfo["schema:email"]) === null || _l === void 0 ? void 0 : _l[0]) || "Email inconnu";
            }
            const organizerData = eventData["hasBeenCreatedBy"];
            const organizer = {
                legalName: (organizerData === null || organizerData === void 0 ? void 0 : organizerData["schema:legalName"]) || "Organisateur inconnu",
                email,
                phone,
            };
            let price = 0;
            let priceCurrency = "EUR";
            if (eventData["offers"] && Array.isArray(eventData["offers"])) {
                const offer = eventData["offers"][0];
                if (offer && ((_m = offer["schema:priceSpecification"]) === null || _m === void 0 ? void 0 : _m[0])) {
                    const priceSpec = offer["schema:priceSpecification"][0];
                    price = parseFloat(priceSpec === null || priceSpec === void 0 ? void 0 : priceSpec["schema:price"]) || 0;
                    priceCurrency = (priceSpec === null || priceSpec === void 0 ? void 0 : priceSpec["schema:priceCurrency"]) || "EUR";
                }
            }
            try {
                const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${address}`);
                const features = responseApiGouv.data.features;
                if (!features || features.length === 0 || !features[0].geometry) {
                    throw new Error("Coordonnées non disponibles");
                }
                const coordinates = features[0].geometry.coordinates;
                if (!coordinates || coordinates.length < 2) {
                    throw new Error("Coordonnées incomplètes");
                }
                const newEvent = new Event_1.default({
                    title,
                    theme,
                    startingDate: new Date(startingDate),
                    endingDate: new Date(endingDate),
                    address,
                    location: {
                        lat: coordinates[1],
                        lng: coordinates[0],
                    },
                    image,
                    description,
                    color,
                    price,
                    priceSpecification: {
                        minPrice: price,
                        maxPrice: price,
                        priceCurrency,
                    },
                    organizer,
                });
                yield newEvent.save();
                Retour_1.default.info(`Événement créé avec succès:, ${newEvent.title}`);
            }
            catch (error) {
                console.error("Erreur lors de la récupération des coordonnées:", error);
            }
        }
        return res
            .status(201)
            .json({ message: "Tous les événements créés avec succès" });
    }
    catch (error) {
        console.error("Erreur lors de la création des événements:", error);
        return res
            .status(500)
            .json({ message: "Erreur lors de la création des événements", error });
    }
});
const createEventForAnEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, theme, startingDate, endingDate, address, price, priceSpecification, acceptedPaymentMethod, organizer, image, description, color, } = req.body;
        const establishmentFinded = yield Establishment_1.default.findById(req.params.establishmentId);
        console.log("establishmentFinded", establishmentFinded);
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
const readEvent = (req, res, next) => {
    const eventId = req.params.eventId;
    return Event_1.default.findById(eventId)
        .then((event) => event
        ? res.status(200).json({ message: event })
        : res.status(404).json({ message: "Not found" }))
        .catch((error) => res.status(500).json({ error: error.message }));
};
const readAll = (req, res, next) => {
    return Event_1.default.find()
        .then((events) => res.status(200).json({ message: events }))
        .catch((error) => res.status(500).json({ error: error.message }));
};
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
const updateOrCreateEventsFromJSON = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34;
    try {
        for (const jsonEvent of AllEvents) {
            const title = (_b = (_a = jsonEvent["rdfs:label"]) === null || _a === void 0 ? void 0 : _a.fr) === null || _b === void 0 ? void 0 : _b[0];
            let eventInDB = yield Event_1.default.findOne({ title });
            if (eventInDB) {
                eventInDB.description =
                    ((_d = (_c = jsonEvent["rdfs:comment"]) === null || _c === void 0 ? void 0 : _c.fr) === null || _d === void 0 ? void 0 : _d[0]) || eventInDB.description;
                eventInDB.startingDate = new Date((_f = (_e = jsonEvent["schema:startDate"]) === null || _e === void 0 ? void 0 : _e[0]) !== null && _f !== void 0 ? _f : eventInDB.startingDate);
                eventInDB.endingDate = new Date((_h = (_g = jsonEvent["schema:endDate"]) === null || _g === void 0 ? void 0 : _g[0]) !== null && _h !== void 0 ? _h : eventInDB.endingDate);
                if ((_k = (_j = jsonEvent.offers) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k["schema:priceSpecification"]) {
                    const priceSpec = jsonEvent.offers[0]["schema:priceSpecification"];
                    eventInDB.priceSpecification = {
                        minPrice: parseFloat((_l = priceSpec["schema:minPrice"]) === null || _l === void 0 ? void 0 : _l[0]) ||
                            eventInDB.priceSpecification.minPrice,
                        maxPrice: parseFloat((_m = priceSpec["schema:maxPrice"]) === null || _m === void 0 ? void 0 : _m[0]) ||
                            eventInDB.priceSpecification.maxPrice,
                        priceCurrency: priceSpec["schema:priceCurrency"] ||
                            eventInDB.priceSpecification.priceCurrency,
                    };
                }
                if ((_p = (_o = jsonEvent.offers) === null || _o === void 0 ? void 0 : _o[0]) === null || _p === void 0 ? void 0 : _p["schema:acceptedPaymentMethod"]) {
                    const paymentMethods = jsonEvent.offers[0]["schema:acceptedPaymentMethod"].map((method) => { var _a, _b, _c, _d; return ((_b = (_a = method["rdfs:label"]) === null || _a === void 0 ? void 0 : _a.fr) === null || _b === void 0 ? void 0 : _b[0]) || ((_d = (_c = method["rdfs:label"]) === null || _c === void 0 ? void 0 : _c.en) === null || _d === void 0 ? void 0 : _d[0]); });
                    eventInDB.acceptedPaymentMethod =
                        paymentMethods.length > 0
                            ? paymentMethods
                            : eventInDB.acceptedPaymentMethod;
                }
                if ((_q = jsonEvent.hasBeenPublishedBy) === null || _q === void 0 ? void 0 : _q[0]) {
                    const organizer = jsonEvent.hasBeenPublishedBy[0];
                    Object(eventInDB).organizer = {
                        legalName: organizer["schema:legalName"] || eventInDB.organizer.legalName,
                        email: ((_r = organizer["schema:email"]) === null || _r === void 0 ? void 0 : _r[0]) || eventInDB.organizer.email,
                        phone: ((_s = organizer["schema:telephone"]) === null || _s === void 0 ? void 0 : _s[0]) || eventInDB.organizer.phone,
                    };
                }
                yield eventInDB.save();
                Retour_1.default.info(`Événement mis à jour: ${eventInDB.title}`);
            }
            else {
                const address = (_x = (_w = (_v = (_u = (_t = jsonEvent["isLocatedAt"]) === null || _t === void 0 ? void 0 : _t[0]) === null || _u === void 0 ? void 0 : _u["schema:address"]) === null || _v === void 0 ? void 0 : _v[0]) === null || _w === void 0 ? void 0 : _w["schema:streetAddress"]) === null || _x === void 0 ? void 0 : _x[0];
                const postalCode = ((_1 = (_0 = (_z = (_y = jsonEvent["isLocatedAt"]) === null || _y === void 0 ? void 0 : _y[0]) === null || _z === void 0 ? void 0 : _z["schema:address"]) === null || _0 === void 0 ? void 0 : _0[0]) === null || _1 === void 0 ? void 0 : _1["schema:postalCode"]) || "";
                const city = ((_5 = (_4 = (_3 = (_2 = jsonEvent["isLocatedAt"]) === null || _2 === void 0 ? void 0 : _2[0]) === null || _3 === void 0 ? void 0 : _3["schema:address"]) === null || _4 === void 0 ? void 0 : _4[0]) === null || _5 === void 0 ? void 0 : _5["schema:addressLocality"]) || "";
                const fullAddress = `${address}, ${postalCode}, ${city}`;
                try {
                    const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(fullAddress)}`);
                    const features = responseApiGouv.data.features;
                    if (!features || features.length === 0 || !features[0].geometry) {
                        throw new Error("Coordonnées non disponibles");
                    }
                    const coordinates = features[0].geometry.coordinates;
                    if (!coordinates || coordinates.length < 2) {
                        throw new Error("Coordonnées incomplètes");
                    }
                    const newEvent = new Event_1.default({
                        title: title || "Titre par défaut",
                        description: ((_7 = (_6 = jsonEvent["rdfs:comment"]) === null || _6 === void 0 ? void 0 : _6.fr) === null || _7 === void 0 ? void 0 : _7[0]) || "Description par défaut",
                        startingDate: new Date((_9 = (_8 = jsonEvent["schema:startDate"]) === null || _8 === void 0 ? void 0 : _8[0]) !== null && _9 !== void 0 ? _9 : new Date()),
                        endingDate: new Date((_11 = (_10 = jsonEvent["schema:endDate"]) === null || _10 === void 0 ? void 0 : _10[0]) !== null && _11 !== void 0 ? _11 : new Date()),
                        address: fullAddress,
                        location: {
                            lat: coordinates[1],
                            lng: coordinates[0],
                        },
                        price: 0,
                        priceSpecification: {
                            minPrice: parseFloat((_15 = (_14 = (_13 = (_12 = jsonEvent.offers) === null || _12 === void 0 ? void 0 : _12[0]) === null || _13 === void 0 ? void 0 : _13["schema:priceSpecification"]) === null || _14 === void 0 ? void 0 : _14["schema:minPrice"]) === null || _15 === void 0 ? void 0 : _15[0]) || 0,
                            maxPrice: parseFloat((_19 = (_18 = (_17 = (_16 = jsonEvent.offers) === null || _16 === void 0 ? void 0 : _16[0]) === null || _17 === void 0 ? void 0 : _17["schema:priceSpecification"]) === null || _18 === void 0 ? void 0 : _18["schema:maxPrice"]) === null || _19 === void 0 ? void 0 : _19[0]) || 0,
                            priceCurrency: ((_22 = (_21 = (_20 = jsonEvent.offers) === null || _20 === void 0 ? void 0 : _20[0]) === null || _21 === void 0 ? void 0 : _21["schema:priceSpecification"]) === null || _22 === void 0 ? void 0 : _22["schema:priceCurrency"]) || "EUR",
                        },
                        acceptedPaymentMethod: ((_25 = (_24 = (_23 = jsonEvent.offers) === null || _23 === void 0 ? void 0 : _23[0]) === null || _24 === void 0 ? void 0 : _24["schema:acceptedPaymentMethod"]) === null || _25 === void 0 ? void 0 : _25.map((method) => { var _a, _b, _c, _d; return ((_b = (_a = method["rdfs:label"]) === null || _a === void 0 ? void 0 : _a.fr) === null || _b === void 0 ? void 0 : _b[0]) || ((_d = (_c = method["rdfs:label"]) === null || _c === void 0 ? void 0 : _c.en) === null || _d === void 0 ? void 0 : _d[0]); })) || [],
                        organizer: {
                            legalName: ((_27 = (_26 = jsonEvent.hasBeenPublishedBy) === null || _26 === void 0 ? void 0 : _26[0]) === null || _27 === void 0 ? void 0 : _27["schema:legalName"]) ||
                                "Organisateur inconnu",
                            email: ((_30 = (_29 = (_28 = jsonEvent.hasBeenPublishedBy) === null || _28 === void 0 ? void 0 : _28[0]) === null || _29 === void 0 ? void 0 : _29["schema:email"]) === null || _30 === void 0 ? void 0 : _30[0]) ||
                                "Email inconnu",
                            phone: ((_33 = (_32 = (_31 = jsonEvent.hasBeenPublishedBy) === null || _31 === void 0 ? void 0 : _31[0]) === null || _32 === void 0 ? void 0 : _32["schema:telephone"]) === null || _33 === void 0 ? void 0 : _33[0]) ||
                                "Téléphone inconnu",
                        },
                        image: ((_34 = jsonEvent.hasMainRepresentation) === null || _34 === void 0 ? void 0 : _34.map((rep) => { var _a; return (_a = rep["ebucore:locator"]) === null || _a === void 0 ? void 0 : _a[0]; })) || [],
                        color: jsonEvent.color || "#000000",
                    });
                    yield newEvent.save();
                    Retour_1.default.info(`Nouvel événement créé: ${newEvent.title}`);
                }
                catch (error) {
                    console.error(`Erreur lors de la récupération des coordonnées pour l'événement "${title}":`, error);
                    continue;
                }
            }
            return res
                .status(200)
                .json({ message: "Tous les événements ont été traités." });
        }
    }
    catch (error) {
        console.error("Erreur lors de la mise à jour ou création des événements:", error);
        return res.status(500).json({
            message: "Erreur lors de la mise à jour ou création des événements",
            error,
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
exports.default = {
    createEvent,
    createEventForAnEstablishment,
    readEvent,
    readAll,
    getEventsByPostalCode,
    updateEvent,
    updateOrCreateEventsFromJSON,
    deleteEvent,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBMEI7QUFFMUIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixnREFBd0I7QUFDeEIsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2Qyw0RUFBb0Q7QUFHcEQsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLFNBQVMsQ0FBQyxZQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFN0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHlCQUF5QixDQUFDLENBQUM7QUFHckQsTUFBTSxXQUFXLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCLEVBQUUsRUFBRTs7SUFDNUUsSUFBSSxDQUFDO1FBRUgsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFFdkUsS0FBSyxNQUFNLEtBQUssSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUM5QixNQUFNLFFBQVEsR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakQsTUFBTSxRQUFRLEdBQUcsTUFBTSxRQUFRLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ25ELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFdkMsTUFBTSxLQUFLLEdBQUcsQ0FBQSxNQUFBLE1BQUEsU0FBUyxDQUFDLFlBQVksQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxLQUFJLGtCQUFrQixDQUFDO1lBQ3JFLE1BQU0sWUFBWSxHQUFHLENBQUEsTUFBQSxTQUFTLENBQUMsa0JBQWtCLENBQUMsMENBQUcsQ0FBQyxDQUFDLEtBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUN0RSxNQUFNLFVBQVUsR0FBRyxDQUFBLE1BQUEsU0FBUyxDQUFDLGdCQUFnQixDQUFDLDBDQUFHLENBQUMsQ0FBQyxLQUFJLElBQUksSUFBSSxFQUFFLENBQUM7WUFDbEUsTUFBTSxXQUFXLEdBQ2YsQ0FBQSxNQUFBLE1BQUEsU0FBUyxDQUFDLGNBQWMsQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxLQUFJLHdCQUF3QixDQUFDO1lBR2pFLE1BQU0sV0FBVyxHQUFHLE1BQUEsTUFBQSxTQUFTLENBQUMsYUFBYSxDQUFDLDBDQUFHLENBQUMsQ0FBQywwQ0FBRyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3RFLElBQUksT0FBTyxHQUFHLG9CQUFvQixDQUFDO1lBQ25DLElBQUksV0FBVyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxZQUFZLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwQyxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUNqQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FDckM7b0JBQ0MsQ0FBQyxDQUFDLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7b0JBQ2pELENBQUMsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsSUFBSSxjQUFjLENBQUM7Z0JBQzNELE1BQU0sVUFBVSxHQUNkLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLHFCQUFxQixDQUFDO2dCQUM3RCxNQUFNLGVBQWUsR0FDbkIsWUFBWSxDQUFDLHdCQUF3QixDQUFDLElBQUksZ0JBQWdCLENBQUM7Z0JBQzdELE9BQU8sR0FBRyxHQUFHLGFBQWEsS0FBSyxVQUFVLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDbEUsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxlQUFlLENBQUM7WUFHcEQsSUFBSSxLQUFLLEdBQUcsa0JBQWtCLENBQUM7WUFDL0IsSUFDRSxTQUFTLENBQUMscUJBQXFCO2dCQUMvQixLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxFQUM5QyxDQUFDO2dCQUNELE1BQU0sa0JBQWtCLEdBQUcsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5RCxNQUFNLFFBQVEsR0FBRyxNQUFBLGtCQUFrQixDQUFDLDRCQUE0QixDQUFDLDBDQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUN2RSxLQUFLLEdBQUcsQ0FBQSxRQUFRLGFBQVIsUUFBUSx1QkFBUixRQUFRLENBQUcsaUJBQWlCLENBQUMsS0FBSSxrQkFBa0IsQ0FBQztZQUM5RCxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUM7WUFHM0MsSUFBSSxLQUFLLEdBQUcsbUJBQW1CLENBQUM7WUFDaEMsSUFBSSxLQUFLLEdBQUcsZUFBZSxDQUFDO1lBQzVCLElBQUksU0FBUyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO2dCQUNoRSxNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxLQUFLLEdBQUcsQ0FBQSxNQUFBLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQywwQ0FBRyxDQUFDLENBQUMsS0FBSSxtQkFBbUIsQ0FBQztnQkFDcEUsS0FBSyxHQUFHLENBQUEsTUFBQSxXQUFXLENBQUMsY0FBYyxDQUFDLDBDQUFHLENBQUMsQ0FBQyxLQUFJLGVBQWUsQ0FBQztZQUM5RCxDQUFDO1lBR0QsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixDQUFDLENBQUM7WUFDcEQsTUFBTSxTQUFTLEdBQUc7Z0JBQ2hCLFNBQVMsRUFDUCxDQUFBLGFBQWEsYUFBYixhQUFhLHVCQUFiLGFBQWEsQ0FBRyxrQkFBa0IsQ0FBQyxLQUFJLHNCQUFzQjtnQkFDL0QsS0FBSztnQkFDTCxLQUFLO2FBQ04sQ0FBQztZQUdGLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztZQUNkLElBQUksYUFBYSxHQUFHLEtBQUssQ0FBQztZQUUxQixJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQzlELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDckMsSUFBSSxLQUFLLEtBQUksTUFBQSxLQUFLLENBQUMsMkJBQTJCLENBQUMsMENBQUcsQ0FBQyxDQUFDLENBQUEsRUFBRSxDQUFDO29CQUNyRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDeEQsS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLGFBQVQsU0FBUyx1QkFBVCxTQUFTLENBQUcsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ3JELGFBQWEsR0FBRyxDQUFBLFNBQVMsYUFBVCxTQUFTLHVCQUFULFNBQVMsQ0FBRyxzQkFBc0IsQ0FBQyxLQUFJLEtBQUssQ0FBQztnQkFDL0QsQ0FBQztZQUNILENBQUM7WUFFRCxJQUFJLENBQUM7Z0JBQ0gsTUFBTSxlQUFlLEdBQUcsTUFBTSxlQUFLLENBQUMsR0FBRyxDQUNyQyw4Q0FBOEMsT0FBTyxFQUFFLENBQ3hELENBQUM7Z0JBQ0YsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7Z0JBRS9DLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2hFLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztnQkFDakQsQ0FBQztnQkFFRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztnQkFFckQsSUFBSSxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7Z0JBQzdDLENBQUM7Z0JBR0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFLLENBQUM7b0JBQ3pCLEtBQUs7b0JBQ0wsS0FBSztvQkFDTCxZQUFZLEVBQUUsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDO29CQUNwQyxVQUFVLEVBQUUsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDO29CQUNoQyxPQUFPO29CQUNQLFFBQVEsRUFBRTt3QkFDUixHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFDbkIsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7cUJBQ3BCO29CQUNELEtBQUs7b0JBQ0wsV0FBVztvQkFDWCxLQUFLO29CQUNMLEtBQUs7b0JBQ0wsa0JBQWtCLEVBQUU7d0JBQ2xCLFFBQVEsRUFBRSxLQUFLO3dCQUNmLFFBQVEsRUFBRSxLQUFLO3dCQUNmLGFBQWE7cUJBQ2Q7b0JBQ0QsU0FBUztpQkFDVixDQUFDLENBQUM7Z0JBRUgsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3RCLGdCQUFNLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNoRSxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGlEQUFpRCxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFFLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxHQUFHO2FBQ1AsTUFBTSxDQUFDLEdBQUcsQ0FBQzthQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ25FLE9BQU8sR0FBRzthQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7YUFDWCxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUMzRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixNQUFNLDZCQUE2QixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQzFFLElBQUksQ0FBQztRQUNILE1BQU0sRUFDSixLQUFLLEVBQ0wsS0FBSyxFQUNMLFlBQVksRUFDWixVQUFVLEVBQ1YsT0FBTyxFQUNQLEtBQUssRUFDTCxrQkFBa0IsRUFDbEIscUJBQXFCLEVBQ3JCLFNBQVMsRUFDVCxLQUFLLEVBQ0wsV0FBVyxFQUNYLEtBQUssR0FDTixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFHYixNQUFNLG1CQUFtQixHQUFHLE1BQU0sdUJBQWEsQ0FBQyxRQUFRLENBQ3RELEdBQUcsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUMzQixDQUFDO1FBQ0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRXhELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQ3pCLGdCQUFNLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7WUFDeEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUdELElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxZQUFZLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNuRSxnQkFBTSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxxQkFBcUI7YUFDL0IsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUdELE1BQU0sYUFBYSxHQUFHLE1BQU0sZUFBSyxDQUFDLE9BQU8sQ0FBQztZQUN4QyxLQUFLLEVBQUUsS0FBSztZQUNaLFlBQVksRUFBRSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUM7U0FDckMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUNsQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsNERBQTREO2FBQ3RFLENBQUMsQ0FBQztRQUNMLENBQUM7UUFHRCxNQUFNLGVBQWUsR0FBRyxNQUFNLGVBQUssQ0FBQyxHQUFHLENBQ3JDLDhDQUE4QyxPQUFPLEVBQUUsQ0FDeEQsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLE9BQU87WUFDdEIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzFELENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1FBQ3JDLE1BQU0sU0FBUyxHQUFHLE9BQU87WUFDdkIsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1lBQzFELENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDO1FBR3JDLE1BQU0sUUFBUSxHQUFHLElBQUksZUFBSyxDQUFDO1lBQ3pCLEtBQUs7WUFDTCxLQUFLO1lBQ0wsWUFBWTtZQUNaLFVBQVU7WUFDVixPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLE9BQU87WUFDeEQsUUFBUSxFQUFFO2dCQUNSLEdBQUcsRUFBRSxRQUFRO2dCQUNiLEdBQUcsRUFBRSxTQUFTO2FBQ2Y7WUFDRCxLQUFLO1lBQ0wsa0JBQWtCLEVBQUU7Z0JBQ2xCLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRO2dCQUNyQyxRQUFRLEVBQUUsa0JBQWtCLENBQUMsUUFBUTtnQkFDckMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLGFBQWE7YUFDaEQ7WUFDRCxxQkFBcUI7WUFDckIsU0FBUyxFQUFFO2dCQUNULGFBQWEsRUFBRSxtQkFBbUI7Z0JBQ2xDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztnQkFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLO2dCQUN0QixLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUs7YUFDdkI7WUFDRCxLQUFLO1lBQ0wsV0FBVztZQUNYLEtBQUs7U0FDTixDQUFDLENBQUM7UUFHSCxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUd0QixtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN0RCxNQUFNLG1CQUFtQixDQUFDLElBQUksRUFBRSxDQUFDO1FBR2pDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLDRCQUE0QjtZQUNyQyxLQUFLLEVBQUUsUUFBUTtTQUNoQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDOUMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsd0JBQXdCO1lBQ2pDLEtBQUssRUFBRSxLQUFLO1NBQ2IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBR0YsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCLEVBQUUsRUFBRTtJQUNwRSxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUVuQyxPQUFPLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO1NBQzNCLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ2QsS0FBSztRQUNILENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQztRQUMxQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FDbkQ7U0FDQSxLQUFLLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFDO0FBR0YsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCLEVBQUUsRUFBRTtJQUNsRSxPQUFPLGVBQUssQ0FBQyxJQUFJLEVBQUU7U0FDaEIsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1NBQzNELEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0RSxDQUFDLENBQUM7QUFHRixNQUFNLHFCQUFxQixHQUFHLENBQzVCLEdBQVksRUFDWixHQUFhLEVBQ2IsSUFBa0IsRUFDbEIsRUFBRTtJQUNGLElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO1FBRWxDLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMxQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUsc0RBQXNEO2FBQ2hFLENBQUMsQ0FBQztRQUNMLENBQUM7UUFHRCxNQUFNLGVBQWUsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUduRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQUM7WUFDOUIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLE1BQU0sZUFBZSxXQUFXLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRTtTQUNyRSxDQUFDLENBQUM7UUFFSCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZDQUE2QyxFQUFFLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBR0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUcvQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUM5QixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFHLFdBQVcsQ0FDcEQsQ0FBQztRQUNGLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQ2xDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEdBQUcsV0FBVyxDQUN0RCxDQUFDO1FBQ0YsTUFBTSxhQUFhLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FDakMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUNSLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxXQUFXO1lBQzNDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsSUFBSSxXQUFXLENBQzVDLENBQUM7UUFFRixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLFVBQVU7WUFDVixhQUFhO1lBQ2IsY0FBYztTQUNmLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FDWCxnRUFBZ0UsRUFDaEUsS0FBSyxDQUNOLENBQUM7UUFDRixPQUFPLEdBQUc7YUFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2FBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSxXQUFXLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCLEVBQUUsRUFBRTs7SUFDNUUsTUFBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUM7SUFFbkMsSUFBSSxDQUFDO1FBRUgsTUFBTSxLQUFLLEdBQUcsTUFBTSxlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFHRCxLQUFLLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDNUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDO1FBQzlELEtBQUssQ0FBQyxZQUFZLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZO1lBQ3hDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztZQUNqQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQztRQUN2QixLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVTtZQUNwQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDL0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFHckIsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDaEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztZQUUxRSxLQUFLLENBQUMsa0JBQWtCLEdBQUc7Z0JBQ3pCLFFBQVEsRUFBRSxRQUFRLEtBQUksTUFBQSxLQUFLLENBQUMsa0JBQWtCLDBDQUFFLFFBQVEsQ0FBQSxJQUFJLENBQUM7Z0JBQzdELFFBQVEsRUFBRSxRQUFRLEtBQUksTUFBQSxLQUFLLENBQUMsa0JBQWtCLDBDQUFFLFFBQVEsQ0FBQSxJQUFJLENBQUM7Z0JBQzdELGFBQWEsRUFDWCxhQUFhLEtBQUksTUFBQSxLQUFLLENBQUMsa0JBQWtCLDBDQUFFLGFBQWEsQ0FBQSxJQUFJLEtBQUs7YUFDcEUsQ0FBQztRQUNKLENBQUM7UUFHRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUNuQyxLQUFLLENBQUMscUJBQXFCLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNO2dCQUNqRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUI7Z0JBQ2hDLENBQUMsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUM7UUFDbEMsQ0FBQztRQUdELElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN2QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUdyQyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM3QixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMxQixPQUFPLEVBQUUscURBQXFEO2lCQUMvRCxDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsS0FBSyxDQUFDLFNBQVMsR0FBRztnQkFDaEIsYUFBYSxFQUFFLFNBQVMsQ0FBQyxhQUFhO2dCQUN0QyxTQUFTLEVBQ1AsU0FBUyxDQUFDLFNBQVM7cUJBQ25CLE1BQUEsS0FBSyxDQUFDLFNBQVMsMENBQUUsU0FBUyxDQUFBO29CQUMxQixzQkFBc0I7Z0JBQ3hCLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSyxLQUFJLE1BQUEsS0FBSyxDQUFDLFNBQVMsMENBQUUsS0FBSyxDQUFBLElBQUksZUFBZTtnQkFDbkUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLLEtBQUksTUFBQSxLQUFLLENBQUMsU0FBUywwQ0FBRSxLQUFLLENBQUEsSUFBSSxtQkFBbUI7YUFDeEUsQ0FBQztRQUNKLENBQUM7UUFHRCxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDbkIsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUMvQixDQUFDO1FBR0QsTUFBTSxZQUFZLEdBQUcsTUFBTSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFeEMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsa0NBQWtDO1lBQzNDLEtBQUssRUFBRSxZQUFZO1NBQ3BCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywrQ0FBK0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RSxPQUFPLEdBQUc7YUFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2FBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDhDQUE4QyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDOUUsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBRUYsTUFBTSw0QkFBNEIsR0FBRyxDQUNuQyxHQUFZLEVBQ1osR0FBYSxFQUNiLElBQWtCLEVBQ2xCLEVBQUU7O0lBQ0YsSUFBSSxDQUFDO1FBQ0gsS0FBSyxNQUFNLFNBQVMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUVsQyxNQUFNLEtBQUssR0FBRyxNQUFBLE1BQUEsU0FBUyxDQUFDLFlBQVksQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxDQUFDO1lBRy9DLElBQUksU0FBUyxHQUFHLE1BQU0sZUFBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFL0MsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFFZCxTQUFTLENBQUMsV0FBVztvQkFDbkIsQ0FBQSxNQUFBLE1BQUEsU0FBUyxDQUFDLGNBQWMsQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxLQUFJLFNBQVMsQ0FBQyxXQUFXLENBQUM7Z0JBQzlELFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQy9CLE1BQUEsTUFBQSxTQUFTLENBQUMsa0JBQWtCLENBQUMsMENBQUcsQ0FBQyxDQUFDLG1DQUFJLFNBQVMsQ0FBQyxZQUFZLENBQzdELENBQUM7Z0JBQ0YsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLElBQUksQ0FDN0IsTUFBQSxNQUFBLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQywwQ0FBRyxDQUFDLENBQUMsbUNBQUksU0FBUyxDQUFDLFVBQVUsQ0FDekQsQ0FBQztnQkFHRixJQUFJLE1BQUEsTUFBQSxTQUFTLENBQUMsTUFBTSwwQ0FBRyxDQUFDLENBQUMsMENBQUcsMkJBQTJCLENBQUMsRUFBRSxDQUFDO29CQUN6RCxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLDJCQUEyQixDQUFDLENBQUM7b0JBQ25FLFNBQVMsQ0FBQyxrQkFBa0IsR0FBRzt3QkFDN0IsUUFBUSxFQUNOLFVBQVUsQ0FBQyxNQUFBLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQywwQ0FBRyxDQUFDLENBQUMsQ0FBQzs0QkFDN0MsU0FBUyxDQUFDLGtCQUFrQixDQUFDLFFBQVE7d0JBQ3ZDLFFBQVEsRUFDTixVQUFVLENBQUMsTUFBQSxTQUFTLENBQUMsaUJBQWlCLENBQUMsMENBQUcsQ0FBQyxDQUFDLENBQUM7NEJBQzdDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRO3dCQUN2QyxhQUFhLEVBQ1gsU0FBUyxDQUFDLHNCQUFzQixDQUFDOzRCQUNqQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsYUFBYTtxQkFDN0MsQ0FBQztnQkFDSixDQUFDO2dCQUdELElBQUksTUFBQSxNQUFBLFNBQVMsQ0FBQyxNQUFNLDBDQUFHLENBQUMsQ0FBQywwQ0FBRyw4QkFBOEIsQ0FBQyxFQUFFLENBQUM7b0JBQzVELE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQ3hDLDhCQUE4QixDQUMvQixDQUFDLEdBQUcsQ0FDSCxDQUFDLE1BQVcsRUFBRSxFQUFFLHVCQUNkLE9BQUEsQ0FBQSxNQUFBLE1BQUEsTUFBTSxDQUFDLFlBQVksQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxNQUFJLE1BQUEsTUFBQSxNQUFNLENBQUMsWUFBWSxDQUFDLDBDQUFFLEVBQUUsMENBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQSxFQUFBLENBQ2pFLENBQUM7b0JBQ0YsU0FBUyxDQUFDLHFCQUFxQjt3QkFDN0IsY0FBYyxDQUFDLE1BQU0sR0FBRyxDQUFDOzRCQUN2QixDQUFDLENBQUMsY0FBYzs0QkFDaEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQztnQkFDeEMsQ0FBQztnQkFHRCxJQUFJLE1BQUEsU0FBUyxDQUFDLGtCQUFrQiwwQ0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUN0QyxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ2xELE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLEdBQUc7d0JBQzVCLFNBQVMsRUFDUCxTQUFTLENBQUMsa0JBQWtCLENBQUMsSUFBSSxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVM7d0JBQ2hFLEtBQUssRUFBRSxDQUFBLE1BQUEsU0FBUyxDQUFDLGNBQWMsQ0FBQywwQ0FBRyxDQUFDLENBQUMsS0FBSSxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUs7d0JBQ2xFLEtBQUssRUFDSCxDQUFBLE1BQUEsU0FBUyxDQUFDLGtCQUFrQixDQUFDLDBDQUFHLENBQUMsQ0FBQyxLQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSztxQkFDbEUsQ0FBQztnQkFDSixDQUFDO2dCQUdELE1BQU0sU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUN2QixnQkFBTSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDMUQsQ0FBQztpQkFBTSxDQUFDO2dCQUVOLE1BQU0sT0FBTyxHQUNYLE1BQUEsTUFBQSxNQUFBLE1BQUEsTUFBQSxTQUFTLENBQUMsYUFBYSxDQUFDLDBDQUFHLENBQUMsQ0FBQywwQ0FBRyxnQkFBZ0IsQ0FBQywwQ0FBRyxDQUFDLENBQUMsMENBQ3BELHNCQUFzQixDQUN2QiwwQ0FBRyxDQUFDLENBQUMsQ0FBQztnQkFDVCxNQUFNLFVBQVUsR0FDZCxDQUFBLE1BQUEsTUFBQSxNQUFBLE1BQUEsU0FBUyxDQUFDLGFBQWEsQ0FBQywwQ0FBRyxDQUFDLENBQUMsMENBQUcsZ0JBQWdCLENBQUMsMENBQUcsQ0FBQyxDQUFDLDBDQUNwRCxtQkFBbUIsQ0FDcEIsS0FBSSxFQUFFLENBQUM7Z0JBQ1YsTUFBTSxJQUFJLEdBQ1IsQ0FBQSxNQUFBLE1BQUEsTUFBQSxNQUFBLFNBQVMsQ0FBQyxhQUFhLENBQUMsMENBQUcsQ0FBQyxDQUFDLDBDQUFHLGdCQUFnQixDQUFDLDBDQUFHLENBQUMsQ0FBQywwQ0FDcEQsd0JBQXdCLENBQ3pCLEtBQUksRUFBRSxDQUFDO2dCQUdWLE1BQU0sV0FBVyxHQUFHLEdBQUcsT0FBTyxLQUFLLFVBQVUsS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFFekQsSUFBSSxDQUFDO29CQUVILE1BQU0sZUFBZSxHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDckMsOENBQThDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQ2hGLENBQUM7b0JBQ0YsTUFBTSxRQUFRLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUM7b0JBRS9DLElBQUksQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7d0JBQ2hFLE1BQU0sSUFBSSxLQUFLLENBQUMsNkJBQTZCLENBQUMsQ0FBQztvQkFDakQsQ0FBQztvQkFFRCxNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztvQkFFckQsSUFBSSxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUMzQyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7b0JBQzdDLENBQUM7b0JBR0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxlQUFLLENBQUM7d0JBQ3pCLEtBQUssRUFBRSxLQUFLLElBQUksa0JBQWtCO3dCQUNsQyxXQUFXLEVBQ1QsQ0FBQSxNQUFBLE1BQUEsU0FBUyxDQUFDLGNBQWMsQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxLQUFJLHdCQUF3Qjt3QkFDaEUsWUFBWSxFQUFFLElBQUksSUFBSSxDQUNwQixNQUFBLE1BQUEsU0FBUyxDQUFDLGtCQUFrQixDQUFDLDBDQUFHLENBQUMsQ0FBQyxtQ0FBSSxJQUFJLElBQUksRUFBRSxDQUNqRDt3QkFDRCxVQUFVLEVBQUUsSUFBSSxJQUFJLENBQ2xCLE9BQUEsT0FBQSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsNENBQUcsQ0FBQyxDQUFDLHFDQUFJLElBQUksSUFBSSxFQUFFLENBQy9DO3dCQUNELE9BQU8sRUFBRSxXQUFXO3dCQUNwQixRQUFRLEVBQUU7NEJBQ1IsR0FBRyxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7NEJBQ25CLEdBQUcsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO3lCQUNwQjt3QkFDRCxLQUFLLEVBQUUsQ0FBQzt3QkFDUixrQkFBa0IsRUFBRTs0QkFDbEIsUUFBUSxFQUNOLFVBQVUsQ0FDUixPQUFBLE9BQUEsT0FBQSxPQUFBLFNBQVMsQ0FBQyxNQUFNLDRDQUFHLENBQUMsQ0FBQyw0Q0FBRywyQkFBMkIsQ0FBQyw0Q0FDbEQsaUJBQWlCLENBQ2xCLDRDQUFHLENBQUMsQ0FBQyxDQUNQLElBQUksQ0FBQzs0QkFDUixRQUFRLEVBQ04sVUFBVSxDQUNSLE9BQUEsT0FBQSxPQUFBLE9BQUEsU0FBUyxDQUFDLE1BQU0sNENBQUcsQ0FBQyxDQUFDLDRDQUFHLDJCQUEyQixDQUFDLDRDQUNsRCxpQkFBaUIsQ0FDbEIsNENBQUcsQ0FBQyxDQUFDLENBQ1AsSUFBSSxDQUFDOzRCQUNSLGFBQWEsRUFDWCxDQUFBLE9BQUEsT0FBQSxPQUFBLFNBQVMsQ0FBQyxNQUFNLDRDQUFHLENBQUMsQ0FBQyw0Q0FBRywyQkFBMkIsQ0FBQyw0Q0FDbEQsc0JBQXNCLENBQ3ZCLEtBQUksS0FBSzt5QkFDYjt3QkFDRCxxQkFBcUIsRUFDbkIsQ0FBQSxPQUFBLE9BQUEsT0FBQSxTQUFTLENBQUMsTUFBTSw0Q0FBRyxDQUFDLENBQUMsNENBQUcsOEJBQThCLENBQUMsNENBQUUsR0FBRyxDQUMxRCxDQUFDLE1BQVcsRUFBRSxFQUFFLHVCQUNkLE9BQUEsQ0FBQSxNQUFBLE1BQUEsTUFBTSxDQUFDLFlBQVksQ0FBQywwQ0FBRSxFQUFFLDBDQUFHLENBQUMsQ0FBQyxNQUFJLE1BQUEsTUFBQSxNQUFNLENBQUMsWUFBWSxDQUFDLDBDQUFFLEVBQUUsMENBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQSxFQUFBLENBQ2pFLEtBQUksRUFBRTt3QkFDVCxTQUFTLEVBQUU7NEJBQ1QsU0FBUyxFQUNQLENBQUEsT0FBQSxPQUFBLFNBQVMsQ0FBQyxrQkFBa0IsNENBQUcsQ0FBQyxDQUFDLDRDQUFHLGtCQUFrQixDQUFDO2dDQUN2RCxzQkFBc0I7NEJBQ3hCLEtBQUssRUFDSCxDQUFBLE9BQUEsT0FBQSxPQUFBLFNBQVMsQ0FBQyxrQkFBa0IsNENBQUcsQ0FBQyxDQUFDLDRDQUFHLGNBQWMsQ0FBQyw0Q0FBRyxDQUFDLENBQUM7Z0NBQ3hELGVBQWU7NEJBQ2pCLEtBQUssRUFDSCxDQUFBLE9BQUEsT0FBQSxPQUFBLFNBQVMsQ0FBQyxrQkFBa0IsNENBQUcsQ0FBQyxDQUFDLDRDQUFHLGtCQUFrQixDQUFDLDRDQUFHLENBQUMsQ0FBQztnQ0FDNUQsbUJBQW1CO3lCQUN0Qjt3QkFDRCxLQUFLLEVBQ0gsQ0FBQSxPQUFBLFNBQVMsQ0FBQyxxQkFBcUIsNENBQUUsR0FBRyxDQUNsQyxDQUFDLEdBQVEsRUFBRSxFQUFFLFdBQUMsT0FBQSxNQUFBLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQywwQ0FBRyxDQUFDLENBQUMsQ0FBQSxFQUFBLENBQzFDLEtBQUksRUFBRTt3QkFDVCxLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUssSUFBSSxTQUFTO3FCQUNwQyxDQUFDLENBQUM7b0JBR0gsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ3RCLGdCQUFNLENBQUMsSUFBSSxDQUFDLDBCQUEwQixRQUFRLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDMUQsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNmLE9BQU8sQ0FBQyxLQUFLLENBQ1gsb0VBQW9FLEtBQUssSUFBSSxFQUM3RSxLQUFLLENBQ04sQ0FBQztvQkFFRixTQUFTO2dCQUNYLENBQUM7WUFDSCxDQUFDO1lBRUQsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUNYLDJEQUEyRCxFQUMzRCxLQUFLLENBQ04sQ0FBQztRQUNGLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLDBEQUEwRDtZQUNuRSxLQUFLO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQztBQUNILENBQUMsQ0FBQSxDQUFDO0FBR0YsTUFBTSxXQUFXLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCLEVBQUUsRUFBRTtJQUM1RSxNQUFNLE9BQU8sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUNuQyxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztJQUU3QixJQUFJLENBQUM7UUFFSCxNQUFNLFdBQVcsR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQztRQUNuRSxDQUFDO1FBR0QsSUFBSSxXQUFXLElBQUksV0FBVyxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2RCxNQUFNLGFBQWEsR0FBRyxNQUFNLHVCQUFhLENBQUMsT0FBTyxDQUFDO2dCQUNoRCxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUc7YUFDeEIsQ0FBQyxDQUFDO1lBRUgsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbEIsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQ3hDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDUixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUM7b0JBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUNsQyxDQUFDO2dCQUNGLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO2dCQUN0QyxNQUFNLGFBQWEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM3QixDQUFDO1FBQ0gsQ0FBQztRQUdELE1BQU0sZUFBSyxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXZDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDMUIsT0FBTyxFQUFFLGVBQWUsT0FBTyw2QkFBNkI7U0FDN0QsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtDQUErQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RFLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUNoRCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFFRixrQkFBZTtJQUNiLFdBQVc7SUFDWCw2QkFBNkI7SUFDN0IsU0FBUztJQUNULE9BQU87SUFDUCxxQkFBcUI7SUFDckIsV0FBVztJQUNYLDRCQUE0QjtJQUM1QixXQUFXO0NBQ1osQ0FBQyJ9