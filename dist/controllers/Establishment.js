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
const config_1 = __importDefault(require("../config/config"));
const createEstablishment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { ownerId, activity, website, facebook, instagram, twitter, siret } = req.body;
    try {
        const owner = req.body.owner;
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        if (!owner.isValidated) {
            return res.status(400).json({ message: "Owner not validated" });
        }
        const tokenResponse = yield axios_1.default.post("https://api.insee.fr/token", new URLSearchParams({
            grant_type: "client_credentials",
            client_id: `${config_1.default.apiSiret}`,
            client_secret: `${config_1.default.apiSiretSecret}`,
        }), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
        const accessToken = tokenResponse.data.access_token;
        const entrepriseResponse = yield axios_1.default.get(`https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        const entreprise = entrepriseResponse.data;
        if (!entreprise) {
            return res.status(404).json({
                message: "establishment not found in INSEE database",
            });
        }
        let address = `${entreprise.etablissement.adresseEtablissement.numeroVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.typeVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.libelleVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.codePostalEtablissement} ${entreprise.etablissement.adresseEtablissement.libelleCommuneEtablissement}`;
        const responseApiGouv = yield axios_1.default.get(`https://api-adresse.data.gouv.fr/search/?q=${address}`);
        const latitude = responseApiGouv.data.features[0].geometry.coordinates[1];
        const longitude = responseApiGouv.data.features[0].geometry.coordinates[0];
        const existingEstablishment = yield Establishment_1.default.findOne({
            name: entreprise.etablissement.uniteLegale.denominationUniteLegale,
            location: {
                lat: latitude,
                lng: longitude,
            },
        });
        if (existingEstablishment) {
            return res.status(409).json({
                message: "An establishment with the same name and location already exists",
            });
        }
        const establishment = new Establishment_1.default({
            name: entreprise.etablissement.uniteLegale.denominationUniteLegale,
            type: activity,
            address: {
                street: `${entreprise.etablissement.adresseEtablissement.numeroVoieEtablissement && entreprise.etablissement.adresseEtablissement.numeroVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.typeVoieEtablissement} ${entreprise.etablissement.adresseEtablissement.libelleVoieEtablissement}`,
                city: entreprise.etablissement.adresseEtablissement
                    .libelleCommuneEtablissement,
                postalCode: entreprise.etablissement.adresseEtablissement.codePostalEtablissement,
                country: "FRANCE",
            },
            location: {
                lat: latitude,
                lng: longitude,
            },
            contact: {
                website: website,
                socialMedia: { facebook, instagram, twitter },
            },
            legalInfo: {
                registrationNumber: siret,
            },
            owner: owner._id,
            events: [],
        });
        yield establishment.save();
        owner.establishments.push(Object(establishment)._id);
        yield owner.save();
        return res.status(201).json({ establishment, entreprise });
    }
    catch (error) {
        console.error(`Error creating establishment: ${error}`);
        return res.status(500).json({
            error: "Failed to create establishment",
            details: error,
        });
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
    updateEstablishment,
    deleteEstablishment,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFFcEQsOERBQXNDO0FBR3RDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDaEUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUN2RSxHQUFHLENBQUMsSUFBSSxDQUFDO0lBRVgsSUFBSSxDQUFDO1FBRUgsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7UUFFN0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFDOUQsQ0FBQztRQUdELElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFDbEUsQ0FBQztRQUdELE1BQU0sYUFBYSxHQUFHLE1BQU0sZUFBSyxDQUFDLElBQUksQ0FDcEMsNEJBQTRCLEVBQzVCLElBQUksZUFBZSxDQUFDO1lBQ2xCLFVBQVUsRUFBRSxvQkFBb0I7WUFDaEMsU0FBUyxFQUFFLEdBQUcsZ0JBQU0sQ0FBQyxRQUFRLEVBQUU7WUFDL0IsYUFBYSxFQUFFLEdBQUcsZ0JBQU0sQ0FBQyxjQUFjLEVBQUU7U0FDMUMsQ0FBQyxFQUNG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