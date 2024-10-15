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
        const owner = yield Owner_1.default.findById(ownerId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9jb250cm9sbGVycy9Fc3RhYmxpc2htZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBRUEsa0RBQTBCO0FBQzFCLDREQUFvQztBQUNwQyw0RUFBb0Q7QUFFcEQsOERBQXNDO0FBR3RDLE1BQU0sbUJBQW1CLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDaEUsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxHQUN2RSxHQUFHLENBQUMsSUFBSSxDQUFDO0lBRVgsSUFBSSxDQUFDO1FBRUgsTUFBTSxLQUFLLEdBQUcsTUFBTSxlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFHRCxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLENBQUM7UUFHRCxNQUFNLGFBQWEsR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQ3BDLDRCQUE0QixFQUM1QixJQUFJLGVBQWUsQ0FBQztZQUNsQixVQUFVLEVBQUUsb0JBQW9CO1lBQ2hDLFNBQVMsRUFBRSxHQUFHLGdCQUFNLENBQUMsUUFBUSxFQUFFO1lBQy9CLGFBQWEsRUFBRSxHQUFHLGdCQUFNLENBQUMsY0FBYyxFQUFFO1NBQzFD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