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
exports.fetchSiretEntreprise = void 0;
const axios_1 = __importDefault(require("axios"));
const Retour_1 = __importDefault(require("../library/Retour"));
const fetchSiretEntreprise = (req, res, next) => {
    try {
        const siret = req.params.siret;
        const options = {
            method: "POST",
            url: "https://api.insee.fr/token",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            data: new URLSearchParams({
                grant_type: "client_credentials",
                client_id: `${process.env.API_SIRET_CLIENT_ID}`,
                client_secret: `${process.env.API_SIRET_CLIENT_SECRET}`,
            }),
        };
        axios_1.default.request(options).then(function (response) {
            return __awaiter(this, void 0, void 0, function* () {
                let entreprise = {};
                (() => __awaiter(this, void 0, void 0, function* () {
                    try {
                        entreprise = yield axios_1.default.get(`https://api.insee.fr/entreprises/sirene/V3/siret/${siret}`, {
                            headers: {
                                Authorization: `Bearer ${response.data.access_token}`,
                                "Content-Type": "multipart/form-data",
                            },
                        });
                    }
                    catch (err) {
                        Retour_1.default.error(`Error 404... entreprise ${siret} not found`);
                        console.error(Object(err).data);
                    }
                    finally {
                        if (Object(entreprise).data === undefined) {
                            Retour_1.default.error("error catched");
                            return res.status(400).json({ message: "error catched" });
                        }
                        else {
                            let codes = [
                                { code: "NN", value: "Unité non employeuse" },
                                { code: 0, value: " 0 salarié" },
                                { code: 1, value: "1 ou 2 salariés" },
                                { code: 2, value: "3 à 5 salariés" },
                                { code: 3, value: "6 à 9 salariés" },
                                { code: 11, value: "10 à 19 salariés" },
                                { code: 12, value: "20 à 49 salariés" },
                                { code: 21, value: "50 à 99 salariés" },
                                { code: 22, value: "100 à 199 salariés" },
                                { code: 31, value: "200 à 249 salariés" },
                                { code: 32, value: "250 à 499 salariés" },
                                { code: 41, value: "500 à 999 salariés" },
                                { code: 42, value: "1 000 à 1 999 salariés" },
                                { code: 51, value: "2 000 à 4 999 salariés" },
                                { code: 52, value: "5 000 à 9 999 salariés" },
                                { code: 53, value: "10 000 salariés et plus" },
                            ];
                            return res.status(200).json({
                                etablissement: {
                                    society: Object(entreprise).data.etablissement.uniteLegale
                                        .denominationUniteLegale,
                                    currentName: Object(entreprise).data.etablissement.uniteLegale
                                        .denominationUsuelle1UniteLegale === null
                                        ? Object(entreprise).data.etablissement
                                            .periodesEtablissement[0].enseigne1Etablissement
                                        : Object(entreprise).data.etablissement.uniteLegale
                                            .denominationUsuelle1UniteLegale,
                                    siret,
                                    adressLabel: `${Object(entreprise).data.etablissement.adresseEtablissement
                                        .numeroVoieEtablissement === null
                                        ? ""
                                        : Object(entreprise).data.etablissement.adresseEtablissement
                                            .numeroVoieEtablissement} ${Object(entreprise).data.etablissement.adresseEtablissement.typeVoieEtablissement} ${Object(entreprise).data.etablissement.adresseEtablissement
                                        .libelleVoieEtablissement} ${Object(entreprise).data.etablissement.adresseEtablissement.codePostalEtablissement} ${Object(entreprise).data.etablissement.adresseEtablissement
                                        .libelleCommuneEtablissement}`.trim(),
                                    adress: `${Object(entreprise).data.etablissement.adresseEtablissement
                                        .numeroVoieEtablissement === null
                                        ? ""
                                        : Object(entreprise).data.etablissement.adresseEtablissement
                                            .numeroVoieEtablissement} ${Object(entreprise).data.etablissement.adresseEtablissement.typeVoieEtablissement} ${Object(entreprise).data.etablissement.adresseEtablissement
                                        .libelleVoieEtablissement}`.trim(),
                                    zip: `${Object(entreprise).data.etablissement.adresseEtablissement.codePostalEtablissement}`,
                                    city: `${Object(entreprise).data.etablissement.adresseEtablissement.libelleCommuneEtablissement}`,
                                    adressComplement: `${Object(entreprise).data.etablissement.adresseEtablissement.complementAdresseEtablissement}`,
                                    administratifStateOpen: `${Object(entreprise).data.etablissement.periodesEtablissement[0]
                                        .dateFin === null
                                        ? true
                                        : false}`,
                                    headquartersSociety: `${Object(entreprise).data.etablissement.etablissementSiege}`,
                                    numberOfEmployed: Object(entreprise).data.etablissement
                                        .trancheEffectifsEtablissement !== "NN"
                                        ? `${codes[codes.findIndex((code) => code.code ===
                                            Number(Object(entreprise).data.etablissement
                                                .trancheEffectifsEtablissement))].value}`
                                        : "Unité non employeuse",
                                    codeNAF: `${Object(entreprise).data.etablissement.uniteLegale.activitePrincipaleUniteLegale}`,
                                },
                            });
                        }
                    }
                }))();
            });
        });
    }
    catch (error) {
        console.error({
            message: "error catched",
            error: {
                message: Object(error).message,
                method: Object(error).config.method,
                url: Object(error).config.url,
                code: Object(error).code,
            },
        });
        return res.status(500).json({
            message: "error catched",
            error: {
                message: Object(error).message,
                method: Object(error).config.method,
                url: Object(error).config.url,
                code: Object(error).code,
            },
        });
    }
};
exports.fetchSiretEntreprise = fetchSiretEntreprise;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmV0Y2hpbmdTaXJldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRmV0Y2hpbmdTaXJldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrREFBMEI7QUFFMUIsK0RBQXVDO0FBRWhDLE1BQU0sb0JBQW9CLEdBQUcsQ0FDbEMsR0FBWSxFQUNaLEdBQWEsRUFDYixJQUFrQixFQUNsQixFQUFFO0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7UUFFL0IsTUFBTSxPQUFPLEdBQUc7WUFDZCxNQUFNLEVBQUUsTUFBTTtZQUNkLEdBQUcsRUFBRSw0QkFBNEI7WUFDakMsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLG1DQUFtQyxFQUFFO1lBQ2hFLElBQUksRUFBRSxJQUFJLGVBQWUsQ0FBQztnQkFDeEIsVUFBVSxFQUFFLG9CQUFvQjtnQkFDaEMsU0FBUyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRTtnQkFDL0MsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRTthQUN4RCxDQUFDO1NBQ0gsQ0FBQztRQUdGLGVBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQWdCLFFBQVE7O2dCQUNsRCxJQUFJLFVBQVUsR0FBVyxFQUFFLENBQUM7Z0JBQzVCLENBQUMsR0FBUyxFQUFFO29CQUNWLElBQUksQ0FBQzt3QkFDSCxVQUFVLEdBQUcsTUFBTSxlQUFLLENBQUMsR0FBRyxDQUMxQixvREFBb0QsS0FBSyxFQUFFLEVBQzNEOzRCQUNFLE9BQU8sRUFBRTtnQ0FDUCxhQUFhLEVBQUUsVUFBVSxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtnQ0FDckQsY0FBYyxFQUFFLHFCQUFxQjs2QkFDdEM7eUJBQ0YsQ0FDRixDQUFDO29C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