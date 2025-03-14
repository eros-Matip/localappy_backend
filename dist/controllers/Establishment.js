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
const Owner_1 = __importDefault(require("../models/Owner"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Retour_1 = __importDefault(require("../library/Retour"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary = require("cloudinary");
const createEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { activity, website, facebook, instagram, twitter, adressLabel, society, siret, adress, city, zip, activityCodeNAF, } = req.body;
    if (!activity ||
        !adressLabel ||
        !society ||
        !siret ||
        !adress ||
        !city ||
        !zip) {
        Retour_1.default.warn("Some value is missing");
        return res.status(404).json({ message: "Some value is missing" });
    }
    console.log(Object(req.files).file);
    if (!Object(req.files).file) {
        Retour_1.default.warn("KBis is missing");
        return res.status(400).json({ message: "KBis is missing" });
    }
    const fileKeys = req.files ? Object(req.files).file : [];
    try {
        const owner = yield Owner_1.default.findById(req.body.owner);
        if (!owner) {
            Retour_1.default.warn("Owner not found");
            return res.status(404).json({ message: "Owner not found" });
        }
        if (!owner.isVerified) {
            Retour_1.default.warn("Owner not verified");
            return res.status(400).json({ message: "Owner not verified" });
        }
        const cloudinaryFolder = `${owner.account.firstname}_${owner.account.name}_folder`;
        let kbisUploadResult = null;
        if (fileKeys.length > 0) {
            kbisUploadResult = yield cloudinary.v2.uploader.upload(fileKeys[0].path, {
                folder: cloudinaryFolder,
                public_id: "KBis",
                resource_type: "image",
            });
        }
        const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adressLabel)}`);
        if (!responseApiGouv.data.features.length) {
            Retour_1.default.warn("Invalid address, no coordinates found.");
            return res
                .status(400)
                .json({ message: "Invalid address, no coordinates found." });
        }
        const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
        const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        const existingEstablishment = yield Establishment_1.default.findOne({
            name: society,
            siret: siret,
        });
        if (existingEstablishment) {
            Retour_1.default.warn("An establishment with the same name already exists");
            return res.status(409).json({
                message: "An establishment with the same name already exists",
            });
        }
        const establishment = new Establishment_1.default({
            name: society,
            type: activity,
            siret: siret,
            picture: {
                public_id: "",
                secure_url: "",
            },
            address: {
                street: adress,
                city: city,
                postalCode: zip,
                country: "FRANCE",
            },
            location: {
                lat: latitude,
                lng: longitude,
            },
            contact: {
                website,
                socialMedia: { facebook, instagram, twitter },
            },
            legalInfo: {
                registrationNumber: siret,
                KBis: kbisUploadResult
                    ? {
                        public_id: kbisUploadResult.public_id,
                        secure_url: kbisUploadResult.secure_url,
                    }
                    : null,
                activityCodeNAF: activityCodeNAF,
            },
            owner: owner._id,
            events: [],
        });
        yield establishment.save();
        owner.establishments.push(Object(establishment)._id);
        yield owner.save();
        Retour_1.default.info("Establishment created successfully");
        return res.status(201).json({
            message: "Establishment created successfully",
            establishment,
        });
    }
    catch (error) {
        Retour_1.default.error(`Error creating establishment: ${error}`);
        return res.status(500).json({
            error: "Failed to create establishment",
            details: error,
        });
    }
});
const ENTREPRISES_DIR = path_1.default.join(__dirname, "../../Entreprises/objects");
const getAllFiles = (directory) => {
    if (!fs_1.default.existsSync(directory))
        return [];
    return fs_1.default.readdirSync(directory).flatMap((item) => {
        const fullPath = path_1.default.join(directory, item);
        if (fs_1.default.lstatSync(fullPath).isDirectory()) {
            return getAllFiles(fullPath);
        }
        return fullPath.endsWith(".json") ? [fullPath] : [];
    });
};
const fetchEstablishmentsByJson = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30;
    try {
        console.log(`📂 Recherche des fichiers JSON dans ${ENTREPRISES_DIR}`);
        const allFiles = getAllFiles(ENTREPRISES_DIR);
        if (allFiles.length === 0) {
            return res.status(404).json({
                message: "Aucun fichier JSON trouvé dans Entreprises/objects.",
            });
        }
        const updatedEstablishments = [];
        const createdEstablishments = [];
        const unmatchedFiles = [];
        for (const file of allFiles) {
            try {
                console.info(`📂 Traitement du fichier : ${file}`);
                const fileContent = fs_1.default.readFileSync(file, "utf8").trim();
                if (!fileContent) {
                    console.warn(`⚠️ Fichier vide ignoré : ${file}`);
                    continue;
                }
                let jsonData;
                try {
                    jsonData = JSON.parse(fileContent);
                }
                catch (error) {
                    console.error(`❌ JSON invalide dans ${file} :`, error);
                    continue;
                }
                const normalizedData = Array.isArray(jsonData) ? jsonData : [jsonData];
                for (const obj of normalizedData) {
                    try {
                        const establishmentName = ((_b = (_a = obj["rdfs:label"]) === null || _a === void 0 ? void 0 : _a.fr) === null || _b === void 0 ? void 0 : _b[0]) || "Nom inconnu";
                        const city = ((_f = (_e = (_d = (_c = obj["isLocatedAt"]) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d["schema:address"]) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f["schema:addressLocality"]) || "";
                        const street = ((_l = (_k = (_j = (_h = (_g = obj["isLocatedAt"]) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h["schema:address"]) === null || _j === void 0 ? void 0 : _j[0]) === null || _k === void 0 ? void 0 : _k["schema:streetAddress"]) === null || _l === void 0 ? void 0 : _l[0]) || "";
                        const postalCode = ((_q = (_p = (_o = (_m = obj["isLocatedAt"]) === null || _m === void 0 ? void 0 : _m[0]) === null || _o === void 0 ? void 0 : _o["schema:address"]) === null || _p === void 0 ? void 0 : _p[0]) === null || _q === void 0 ? void 0 : _q["schema:postalCode"]) || "";
                        const department = ((_v = (_u = (_t = (_s = (_r = obj["isLocatedAt"]) === null || _r === void 0 ? void 0 : _r[0]) === null || _s === void 0 ? void 0 : _s["isPartOfDepartment"]) === null || _t === void 0 ? void 0 : _t["rdfs:label"]) === null || _u === void 0 ? void 0 : _u.fr) === null || _v === void 0 ? void 0 : _v[0]) || "Département inconnu";
                        const region = ((_1 = (_0 = (_z = (_y = (_x = (_w = obj["isLocatedAt"]) === null || _w === void 0 ? void 0 : _w[0]) === null || _x === void 0 ? void 0 : _x["isPartOfDepartment"]) === null || _y === void 0 ? void 0 : _y["isPartOfRegion"]) === null || _z === void 0 ? void 0 : _z["rdfs:label"]) === null || _0 === void 0 ? void 0 : _0.fr) === null || _1 === void 0 ? void 0 : _1[0]) || "Région inconnue";
                        const latitude = ((_4 = (_3 = (_2 = obj["isLocatedAt"]) === null || _2 === void 0 ? void 0 : _2[0]) === null || _3 === void 0 ? void 0 : _3["schema:geo"]) === null || _4 === void 0 ? void 0 : _4["schema:latitude"]) || 0;
                        const longitude = ((_7 = (_6 = (_5 = obj["isLocatedAt"]) === null || _5 === void 0 ? void 0 : _5[0]) === null || _6 === void 0 ? void 0 : _6["schema:geo"]) === null || _7 === void 0 ? void 0 : _7["schema:longitude"]) ||
                            0;
                        const description = ((_11 = (_10 = (_9 = (_8 = obj["hasDescription"]) === null || _8 === void 0 ? void 0 : _8[0]) === null || _9 === void 0 ? void 0 : _9["dc:description"]) === null || _10 === void 0 ? void 0 : _10.fr) === null || _11 === void 0 ? void 0 : _11[0]) || "";
                        const types = obj["@type"] || [];
                        const lastUpdate = obj["lastUpdate"]
                            ? new Date(obj["lastUpdate"])
                            : new Date();
                        const creationDate = obj["creationDate"]
                            ? new Date(obj["creationDate"])
                            : new Date();
                        const contact = {
                            email: ((_14 = (_13 = (_12 = obj["hasContact"]) === null || _12 === void 0 ? void 0 : _12[0]) === null || _13 === void 0 ? void 0 : _13["schema:email"]) === null || _14 === void 0 ? void 0 : _14[0]) || "",
                            telephone: ((_17 = (_16 = (_15 = obj["hasContact"]) === null || _15 === void 0 ? void 0 : _15[0]) === null || _16 === void 0 ? void 0 : _16["schema:telephone"]) === null || _17 === void 0 ? void 0 : _17[0]) || "",
                            fax: ((_20 = (_19 = (_18 = obj["hasContact"]) === null || _18 === void 0 ? void 0 : _18[0]) === null || _19 === void 0 ? void 0 : _19["schema:faxNumber"]) === null || _20 === void 0 ? void 0 : _20[0]) || "",
                            website: ((_22 = (_21 = obj["hasBeenCreatedBy"]) === null || _21 === void 0 ? void 0 : _21["foaf:homepage"]) === null || _22 === void 0 ? void 0 : _22[0]) || "",
                        };
                        const logo = ((_27 = (_26 = (_25 = (_24 = (_23 = obj["hasMainRepresentation"]) === null || _23 === void 0 ? void 0 : _23[0]) === null || _24 === void 0 ? void 0 : _24["ebucore:hasRelatedResource"]) === null || _25 === void 0 ? void 0 : _25[0]) === null || _26 === void 0 ? void 0 : _26["ebucore:locator"]) === null || _27 === void 0 ? void 0 : _27[0]) || "";
                        const openingHours = ((_30 = (_29 = (_28 = obj["isLocatedAt"]) === null || _28 === void 0 ? void 0 : _28[0]) === null || _29 === void 0 ? void 0 : _29["schema:openingHoursSpecification"]) === null || _30 === void 0 ? void 0 : _30.map((hour) => {
                            var _a;
                            return ({
                                dayOfWeek: ((_a = hour["@type"]) === null || _a === void 0 ? void 0 : _a[0]) || "Jour inconnu",
                                opens: hour["schema:opens"] || "06:00",
                                closes: hour["schema:closes"] || "23:00",
                            });
                        })) || [];
                        console.log(`✅ Traitement de l'établissement : ${establishmentName}`);
                        let dbEstablishment = yield Establishment_1.default.findOne({
                            name: establishmentName,
                            "address.city": city,
                        });
                        if (!dbEstablishment) {
                            const newEstablishment = new Establishment_1.default({
                                name: establishmentName,
                                type: types,
                                creationDate,
                                lastUpdate,
                                address: {
                                    street,
                                    city,
                                    postalCode,
                                    department,
                                    region,
                                    country: "France",
                                },
                                location: { lat: latitude, lng: longitude },
                                contact,
                                description,
                                openingHours,
                                logo,
                            });
                            yield newEstablishment.save();
                            createdEstablishments.push({
                                id: newEstablishment._id,
                                name: newEstablishment.name,
                            });
                            console.info(`✅ Nouvel établissement ajouté : ${newEstablishment.name}`);
                        }
                        else {
                            dbEstablishment.lastUpdate = lastUpdate;
                            dbEstablishment.description =
                                description || dbEstablishment.description;
                            dbEstablishment.location = { lat: latitude, lng: longitude };
                            dbEstablishment.address = {
                                street,
                                city,
                                postalCode,
                                department,
                                region,
                                country: "France",
                            };
                            dbEstablishment.contact = contact;
                            dbEstablishment.openingHours = openingHours;
                            dbEstablishment.logo = logo;
                            yield dbEstablishment.save();
                            updatedEstablishments.push({
                                id: dbEstablishment._id,
                                name: dbEstablishment.name,
                            });
                            console.info(`♻️ Établissement mis à jour : ${dbEstablishment.name}`);
                        }
                    }
                    catch (error) {
                        console.error(`❌ Erreur lors du traitement de ${file} :`, error);
                    }
                }
            }
            catch (error) {
                unmatchedFiles.push(file);
                console.error(`❌ Erreur de lecture du fichier ${file} :`, error);
            }
        }
        return res.status(200).json({
            message: "Traitement terminé.",
            updatedEstablishments,
            createdEstablishments,
            unmatchedFiles,
        });
    }
    catch (error) {
        console.error("❌ Erreur globale :", error);
        return res
            .status(500)
            .json({ message: "Erreur lors du traitement.", error });
    }
});
const getEstablishmentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const establishment = yield Establishment_1.default.findById(id).populate("owner");
        if (!establishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        return res.status(200).json(establishment);
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to retrieve establishment" });
    }
});
const updateEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const updatedEstablishment = yield Establishment_1.default.findByIdAndUpdate(id, updatedData, { new: true });
        if (!updatedEstablishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        return res.status(200).json(updatedEstablishment);
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to update establishment" });
    }
});
const deleteEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const deletedEstablishment = yield Establishment_1.default.findByIdAndDelete(id);
        if (!deletedEstablishment) {
            return res.status(404).json({ message: "Establishment not found" });
        }
        yield Owner_1.default.updateOne({ establishments: id }, { $pull: { establishments: id } });
        return res.status(200).json({ message: "Establishment deleted" });
    }
    catch (error) {
        return res.status(500).json({ error: "Failed to delete establishment" });
    }
});
exports.default = {
    createEstablishment,
    getEstablishmentById,
    fetchEstablishmentsByJson,
    updateEstablishment,
    deleteEstablishment,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBQ3ZDLGdEQUF3QjtBQUN4Qiw0Q0FBb0I7QUFFcEIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBR3pDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDaEUsTUFBTSxFQUNKLFFBQVEsRUFDUixPQUFPLEVBQ1AsUUFBUSxFQUNSLFNBQVMsRUFDVCxPQUFPLEVBQ1AsV0FBVyxFQUNYLE9BQU8sRUFDUCxLQUFLLEVBQ0wsTUFBTSxFQUNOLElBQUksRUFDSixHQUFHLEVBQ0gsZUFBZSxHQUNoQixHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7SUFFYixJQUNFLENBQUMsUUFBUTtRQUNULENBQUMsV0FBVztRQUNaLENBQUMsT0FBTztRQUNSLENBQUMsS0FBSztRQUNOLENBQUMsTUFBTTtRQUNQLENBQUMsSUFBSTtRQUNMLENBQUMsR0FBRyxFQUNKLENBQUM7UUFDRCxnQkFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFcEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDNUIsZ0JB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