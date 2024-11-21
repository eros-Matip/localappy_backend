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
            Retour_1.default.error("establishment not found in INSEE database");
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
            Retour_1.default.error("An establishment with the same name and location already exists");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFDcEQsK0RBQXVDO0FBQ3ZDLDhEQUFzQztBQUd0QyxNQUFNLG1CQUFtQixHQUFHLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFO0lBQ2hFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FDdkUsR0FBRyxDQUFDLElBQUksQ0FBQztJQUVYLElBQUksQ0FBQztRQUVILE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBRTdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFHRCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFHRCxNQUFNLGFBQWEsR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQ3BDLDRCQUE0QixFQUM1QixJQUFJLGVBQWUsQ0FBQztZQUNsQixVQUFVLEVBQUUsb0JBQW9CO1lBQ2hDLFNBQVMsRUFBRSxHQUFHLGdCQUFNLENBQUMsUUFBUSxFQUFFO1lBQy9CLGFBQWEsRUFBRSxHQUFHLGdCQUFNLENBQUMsY0FBYyxFQUFFO1NB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