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
const Event_1 = __importDefault(require("../models/Event"));
const Retour_1 = __importDefault(require("../library/Retour"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const CryptoJS = require("crypto-js");
const AllEvents = require("../../Events/index.json");
const normalizeString = (str = "") => str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
const escapeRegExp = (str = "") => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const firstValue = (value) => {
    if (Array.isArray(value))
        return value[0];
    return value;
};
const getLangValue = (obj, lang = "fr") => {
    var _a, _b, _c;
    return ((_a = obj === null || obj === void 0 ? void 0 : obj[lang]) === null || _a === void 0 ? void 0 : _a[0]) || ((_b = obj === null || obj === void 0 ? void 0 : obj.fr) === null || _b === void 0 ? void 0 : _b[0]) || ((_c = obj === null || obj === void 0 ? void 0 : obj.en) === null || _c === void 0 ? void 0 : _c[0]) || undefined;
};
const extractAddressDetails = (fileData) => {
    var _a, _b, _c;
    const addressData = (_c = (_b = (_a = fileData["isLocatedAt"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["schema:address"]) === null || _c === void 0 ? void 0 : _c[0];
    const cityData = addressData === null || addressData === void 0 ? void 0 : addressData.hasAddressCity;
    const departmentData = cityData === null || cityData === void 0 ? void 0 : cityData.isPartOfDepartment;
    const regionData = departmentData === null || departmentData === void 0 ? void 0 : departmentData.isPartOfRegion;
    const countryData = regionData === null || regionData === void 0 ? void 0 : regionData.isPartOfCountry;
    const streetAddress = Array.isArray(addressData === null || addressData === void 0 ? void 0 : addressData["schema:streetAddress"])
        ? addressData["schema:streetAddress"]
        : (addressData === null || addressData === void 0 ? void 0 : addressData["schema:streetAddress"])
            ? [addressData["schema:streetAddress"]]
            : [];
    return {
        streetAddress,
        postalCode: (addressData === null || addressData === void 0 ? void 0 : addressData["schema:postalCode"]) || undefined,
        city: (addressData === null || addressData === void 0 ? void 0 : addressData["schema:addressLocality"]) ||
            getLangValue(cityData === null || cityData === void 0 ? void 0 : cityData["rdfs:label"]),
        department: getLangValue(departmentData === null || departmentData === void 0 ? void 0 : departmentData["rdfs:label"]),
        departmentCode: departmentData === null || departmentData === void 0 ? void 0 : departmentData.insee,
        region: getLangValue(regionData === null || regionData === void 0 ? void 0 : regionData["rdfs:label"]),
        regionCode: regionData === null || regionData === void 0 ? void 0 : regionData.insee,
        country: getLangValue(countryData === null || countryData === void 0 ? void 0 : countryData["rdfs:label"]),
        insee: cityData === null || cityData === void 0 ? void 0 : cityData.insee,
    };
};
function extractAddress(fileData) {
    const details = extractAddressDetails(fileData);
    return ([...(details.streetAddress || []), details.postalCode, details.city]
        .filter(Boolean)
        .join(", ") || "Adresse inconnue");
}
function extractDescription(fileData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return (((_d = (_c = (_b = (_a = fileData["hasDescription"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["dc:description"]) === null || _c === void 0 ? void 0 : _c.fr) === null || _d === void 0 ? void 0 : _d[0]) ||
        ((_h = (_g = (_f = (_e = fileData["hasDescription"]) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.shortDescription) === null || _g === void 0 ? void 0 : _g.fr) === null || _h === void 0 ? void 0 : _h[0]) ||
        ((_k = (_j = fileData["rdfs:comment"]) === null || _j === void 0 ? void 0 : _j.fr) === null || _k === void 0 ? void 0 : _k[0]) ||
        "Description non disponible");
}
function extractShortDescription(fileData) {
    var _a, _b, _c, _d, _e, _f;
    return (((_d = (_c = (_b = (_a = fileData["hasDescription"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.shortDescription) === null || _c === void 0 ? void 0 : _c.fr) === null || _d === void 0 ? void 0 : _d[0]) ||
        ((_f = (_e = fileData["rdfs:comment"]) === null || _e === void 0 ? void 0 : _e.fr) === null || _f === void 0 ? void 0 : _f[0]) ||
        null);
}
function extractLongDescription(fileData) {
    var _a, _b, _c, _d;
    return ((_d = (_c = (_b = (_a = fileData["hasDescription"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["dc:description"]) === null || _c === void 0 ? void 0 : _c.fr) === null || _d === void 0 ? void 0 : _d[0]) || null;
}
function extractCoordinates(fileData) {
    var _a, _b;
    const geoData = (_b = (_a = fileData["isLocatedAt"]) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["schema:geo"];
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
const extractTranslations = (fileData) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const translations = [];
    const labels = fileData["rdfs:label"] || {};
    const comments = fileData["rdfs:comment"] || {};
    const descObj = ((_b = (_a = fileData.hasDescription) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["dc:description"]) || {};
    const shortDescObj = ((_d = (_c = fileData.hasDescription) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.shortDescription) || {};
    const supportedLangs = new Set([
        ...Object.keys(labels),
        ...Object.keys(comments),
        ...Object.keys(descObj),
        ...Object.keys(shortDescObj),
    ]);
    for (const lang of supportedLangs) {
        translations.push({
            lang,
            title: ((_e = labels[lang]) === null || _e === void 0 ? void 0 : _e[0]) || undefined,
            shortDescription: ((_f = shortDescObj[lang]) === null || _f === void 0 ? void 0 : _f[0]) || ((_g = comments[lang]) === null || _g === void 0 ? void 0 : _g[0]) || undefined,
            description: ((_h = descObj[lang]) === null || _h === void 0 ? void 0 : _h[0]) || ((_j = comments[lang]) === null || _j === void 0 ? void 0 : _j[0]) || undefined,
            longDescription: ((_k = descObj[lang]) === null || _k === void 0 ? void 0 : _k[0]) || undefined,
        });
    }
    return translations;
};
function extractOrganizer(fileData) {
    var _a, _b, _c, _d, _e;
    const contact = (_a = fileData["hasContact"]) === null || _a === void 0 ? void 0 : _a[0];
    return {
        legalName: ((_b = fileData["hasBeenCreatedBy"]) === null || _b === void 0 ? void 0 : _b["schema:legalName"]) ||
            "Organisateur inconnu",
        email: ((_c = contact === null || contact === void 0 ? void 0 : contact["schema:email"]) === null || _c === void 0 ? void 0 : _c[0]) || "Email inconnu",
        phone: ((_d = contact === null || contact === void 0 ? void 0 : contact["schema:telephone"]) === null || _d === void 0 ? void 0 : _d[0]) || "Téléphone inconnu",
        website: ((_e = contact === null || contact === void 0 ? void 0 : contact["foaf:homepage"]) === null || _e === void 0 ? void 0 : _e[0]) || null,
    };
}
function extractContact(fileData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const contact = (_a = fileData["hasContact"]) === null || _a === void 0 ? void 0 : _a[0];
    const bookingContact = (_b = fileData["hasBookingContact"]) === null || _b === void 0 ? void 0 : _b[0];
    return {
        email: ((_c = bookingContact === null || bookingContact === void 0 ? void 0 : bookingContact["schema:email"]) === null || _c === void 0 ? void 0 : _c[0]) ||
            ((_d = contact === null || contact === void 0 ? void 0 : contact["schema:email"]) === null || _d === void 0 ? void 0 : _d[0]) ||
            null,
        phone: ((_e = bookingContact === null || bookingContact === void 0 ? void 0 : bookingContact["schema:telephone"]) === null || _e === void 0 ? void 0 : _e[0]) ||
            ((_f = contact === null || contact === void 0 ? void 0 : contact["schema:telephone"]) === null || _f === void 0 ? void 0 : _f[0]) ||
            null,
        website: ((_g = contact === null || contact === void 0 ? void 0 : contact["foaf:homepage"]) === null || _g === void 0 ? void 0 : _g[0]) || null,
        bookingUrl: ((_h = bookingContact === null || bookingContact === void 0 ? void 0 : bookingContact["foaf:homepage"]) === null || _h === void 0 ? void 0 : _h[0]) ||
            ((_j = contact === null || contact === void 0 ? void 0 : contact["foaf:homepage"]) === null || _j === void 0 ? void 0 : _j[0]) ||
            null,
    };
}
function extractOccurrences(fileData) {
    const takesPlaceAt = fileData["takesPlaceAt"] || [];
    return takesPlaceAt
        .map((period) => {
        var _a, _b;
        const daysOfWeek = ((_a = period.appliesOnDay) === null || _a === void 0 ? void 0 : _a.map((day) => {
            const id = day["@id"] || "";
            return id.replace("schema:", "");
        }).filter(Boolean)) || [];
        return {
            startDate: period.startDate ? new Date(period.startDate) : undefined,
            endDate: period.endDate ? new Date(period.endDate) : undefined,
            startTime: period.startTime || null,
            endTime: period.endTime || null,
            daysOfWeek,
            label: daysOfWeek.length === 7
                ? "Tous les jours"
                : daysOfWeek.length > 0
                    ? daysOfWeek.join(", ")
                    : null,
            isRecurring: ((_b = period["@type"]) === null || _b === void 0 ? void 0 : _b.includes("RecurrentPeriod")) ||
                daysOfWeek.length > 0 ||
                false,
        };
    })
        .filter((occ) => occ.startDate);
}
function mergeDatesFromOccurrences(occurrences) {
    let earliestStart = null;
    let latestEnd = null;
    for (const occ of occurrences) {
        const startTime = occ.startTime || "00:00:00";
        const endTime = occ.endTime || "23:59:59";
        const start = new Date(`${occ.startDate.toISOString().split("T")[0]}T${startTime}`);
        const endBase = occ.endDate || occ.startDate;
        const end = new Date(`${endBase.toISOString().split("T")[0]}T${endTime}`);
        if (!earliestStart || start < earliestStart)
            earliestStart = start;
        if (!latestEnd || end > latestEnd)
            latestEnd = end;
    }
    return {
        startingDate: earliestStart,
        endingDate: latestEnd,
    };
}
function extractImages(fileData) {
    const imageUrls = [];
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
        .map((url) => url.startsWith("http://") ? url.replace("http://", "https://") : url);
    return [...new Set(cleanUrls.length ? cleanUrls : ["Image par défaut"])];
}
function extractEnrichedImages(fileData) {
    var _a, _b, _c, _d, _e, _f;
    const mainIds = new Set((fileData["hasMainRepresentation"] || []).map((item) => item["@id"]));
    const representations = [
        ...(fileData["hasMainRepresentation"] || []),
        ...(fileData["hasRepresentation"] || []),
    ];
    const images = [];
    for (const representation of representations) {
        const annotation = (_a = representation["ebucore:hasAnnotation"]) === null || _a === void 0 ? void 0 : _a[0];
        const resources = representation["ebucore:hasRelatedResource"] || [];
        for (const resource of resources) {
            const locators = resource["ebucore:locator"] || [];
            for (const locator of locators) {
                if (!locator)
                    continue;
                images.push({
                    url: locator.startsWith("http://")
                        ? locator.replace("http://", "https://")
                        : locator,
                    title: getLangValue(annotation === null || annotation === void 0 ? void 0 : annotation["ebucore:title"]) || null,
                    credits: ((_b = annotation === null || annotation === void 0 ? void 0 : annotation.credits) === null || _b === void 0 ? void 0 : _b[0]) || null,
                    rightsStartDate: (annotation === null || annotation === void 0 ? void 0 : annotation.rightsStartDate)
                        ? new Date(annotation.rightsStartDate)
                        : null,
                    rightsEndDate: (annotation === null || annotation === void 0 ? void 0 : annotation.rightsEndDate)
                        ? new Date(annotation.rightsEndDate)
                        : null,
                    mimeType: ((_f = (_e = (_d = (_c = resource["ebucore:hasMimeType"]) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d["rdfs:label"]) === null || _e === void 0 ? void 0 : _e.fr) === null || _f === void 0 ? void 0 : _f[0]) ||
                        null,
                    isMain: mainIds.has(representation["@id"]),
                });
            }
        }
    }
    const unique = new Map();
    for (const img of images) {
        if (!unique.has(img.url))
            unique.set(img.url, img);
    }
    return Array.from(unique.values());
}
function extractPriceSpecification(fileData) {
    var _a, _b, _c, _d, _e;
    let minPrice;
    let maxPrice;
    let priceCurrency = "EUR";
    let priceLabel = null;
    let isFree = false;
    let pricingMode;
    let pricingOffer;
    const offers = (fileData === null || fileData === void 0 ? void 0 : fileData.offers) || [];
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
            pricingMode = getLangValue((_b = (_a = spec.hasPricingMode) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b["rdfs:label"]);
            pricingOffer = getLangValue((_d = (_c = spec.hasPricingOffer) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d["rdfs:label"]);
        }
    }
    return {
        price: minPrice !== null && minPrice !== void 0 ? minPrice : 0,
        priceLabel,
        isFree,
        priceSpecification: {
            minPrice: minPrice !== null && minPrice !== void 0 ? minPrice : 0,
            maxPrice: (_e = maxPrice !== null && maxPrice !== void 0 ? maxPrice : minPrice) !== null && _e !== void 0 ? _e : 0,
            priceCurrency,
            pricingMode,
            pricingOffer,
        },
    };
}
function extractAcceptedPaymentMethods(fileData) {
    const methods = [];
    for (const offer of fileData.offers || []) {
        for (const method of offer["schema:acceptedPaymentMethod"] || []) {
            const label = getLangValue(method["rdfs:label"]);
            if (label)
                methods.push(label);
        }
    }
    return [...new Set(methods)];
}
function extractExternalSource(fileData) {
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
                const shortDescription = extractShortDescription(fileData);
                const longDescription = extractLongDescription(fileData);
                const address = extractAddress(fileData);
                const addressDetails = extractAddressDetails(fileData);
                const { newLat, newLng } = extractCoordinates(fileData);
                const occurrences = extractOccurrences(fileData);
                if (!occurrences.length) {
                    throw new Error("Aucune occurrence valide trouvée.");
                }
                const { startingDate, endingDate } = mergeDatesFromOccurrences(occurrences);
                if (!startingDate || !endingDate) {
                    throw new Error("Dates principales invalides.");
                }
                const image = extractImages(fileData);
                const images = extractEnrichedImages(fileData);
                const { price, priceLabel, isFree, priceSpecification } = extractPriceSpecification(fileData);
                const acceptedPaymentMethod = extractAcceptedPaymentMethods(fileData);
                const organizer = extractOrganizer(fileData);
                const contact = extractContact(fileData);
                const translations = extractTranslations(fileData);
                const externalSource = extractExternalSource(fileData);
                const location = {
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
                    dbEvent = yield Event_1.default.findOne({
                        "externalSource.name": "datatourisme",
                        "externalSource.id": externalSource.id,
                    });
                }
                if (!dbEvent) {
                    dbEvent = yield Event_1.default.findOne({
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
                    const newEvent = new Event_1.default(eventPayload);
                    yield newEvent.save();
                    createdEvents.push({
                        id: newEvent._id,
                        title: newEvent.title,
                    });
                    Retour_1.default.info(`<<n°:${createdEvents.length} Nouvel événement créé>>: ${newEvent.title}`);
                }
                else {
                    Object.assign(dbEvent, eventPayload);
                    yield dbEvent.save();
                    updatedEvents.push({
                        id: dbEvent._id,
                        title: dbEvent.title,
                    });
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
        return res.status(500).json({
            message: "Erreur lors du traitement.",
            error,
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXh0cmFjdEFsbEV2ZW50RnJvbURhdGEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvRXh0cmFjdEFsbEV2ZW50RnJvbURhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFJQSw0REFBb0M7QUFDcEMsK0RBQXVDO0FBRXZDLGdEQUF3QjtBQUN4Qix1Q0FBeUI7QUFFekIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0FBRXJELE1BQU0sZUFBZSxHQUFHLENBQUMsTUFBYyxFQUFFLEVBQUUsRUFBRSxDQUMzQyxHQUFHO0tBQ0EsU0FBUyxDQUFDLEtBQUssQ0FBQztLQUNoQixPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO0tBQy9CLElBQUksRUFBRSxDQUFDO0FBRVosTUFBTSxZQUFZLEdBQUcsQ0FBQyxNQUFjLEVBQUUsRUFBRSxFQUFFLENBQ3hDLEdBQUcsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsTUFBTSxDQUFDLENBQUM7QUFFN0MsTUFBTSxVQUFVLEdBQUcsQ0FBQyxLQUFVLEVBQU8sRUFBRTtJQUNyQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQUUsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDMUMsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDLENBQUM7QUFFRixNQUFNLFlBQVksR0FBRyxDQUFDLEdBQVEsRUFBRSxJQUFJLEdBQUcsSUFBSSxFQUFzQixFQUFFOztJQUNqRSxPQUFPLENBQUEsTUFBQSxHQUFHLGFBQUgsR0FBRyx1QkFBSCxHQUFHLENBQUcsSUFBSSxDQUFDLDBDQUFHLENBQUMsQ0FBQyxNQUFJLE1BQUEsR0FBRyxhQUFILEdBQUcs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