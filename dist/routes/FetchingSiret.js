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
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const Retour_1 = __importDefault(require("../library/Retour"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const libelleCodeNafPath = path_1.default.join(__dirname, "../../libelleCodeNaf.json");
const libelleCodeNaf = JSON.parse(fs_1.default.readFileSync(libelleCodeNafPath, "utf-8"));
const getLibelleByCodeNAF = (codeNAF) => {
    const nafEntry = libelleCodeNaf.NAF.find((entry) => Object(entry).Code === codeNAF);
    return nafEntry
        ? nafEntry[" Intitulés de la  NAF rév. 2, version finale "] || null
        : null;
};
router.post("/fetchSiretEntreprise", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { siret } = req.body;
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
                        entreprise = yield axios_1.default.get(`https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`, {
                            headers: {
                                Authorization: `Bearer ${response.data.access_token}`,
                                "Content-Type": "multipart/form-data",
                            },
                        });
                    }
                    catch (err) {
                        Retour_1.default.error(`Error 404... entreprise ${siret} not found`);
                        console.error(Object(err));
                    }
                    finally {
                        if (Object(entreprise).data === undefined) {
                            Retour_1.default.error("error catched");
                            return res.status(400).json({ message: "error catched" });
                        }
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
                        const codeNAF = Object(entreprise).data.etablissement.uniteLegale
                            .activitePrincipaleUniteLegale;
                        const libelleNAF = getLibelleByCodeNAF(codeNAF);
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
                                activityLabel: `${libelleNAF}`,
                            },
                        });
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
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmV0Y2hpbmdTaXJldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRmV0Y2hpbmdTaXJldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUE4QjtBQUM5QixrREFBMEI7QUFFMUIsK0RBQXVDO0FBQ3ZDLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLGtCQUFrQixHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLENBQUM7QUFDN0UsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFHaEYsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLE9BQWUsRUFBaUIsRUFBRTtJQUM3RCxNQUFNLFFBQVEsR0FBRyxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FDdEMsQ0FBQyxLQUFhLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUNsRCxDQUFDO0lBQ0YsT0FBTyxRQUFRO1FBQ2IsQ0FBQyxDQUFDLFFBQVEsQ0FBQywrQ0FBK0MsQ0FBQyxJQUFJLElBQUk7UUFDbkUsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNYLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsdUJBQXVCLEVBQ3ZCLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxJQUFrQixFQUFFLEVBQUU7SUFDeEQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFFM0IsTUFBTSxPQUFPLEdBQUc7WUFDZCxNQUFNLEVBQUUsTUFBTTtZQUNkLEdBQUcsRUFBRSw0QkFBNEI7WUFDakMsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLG1DQUFtQyxFQUFFO1lBQ2hFLElBQUksRUFBRSxJQUFJLGVBQWUsQ0FBQztnQkFDeEIsVUFBVSxFQUFFLG9CQUFvQjtnQkFDaEMsU0FBUyxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRTtnQkFDL0MsYUFBYSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsRUFBRTthQUN4RCxDQUFDO1NBQ0gsQ0FBQztRQUdGLGVBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQWdCLFFBQVE7O2dCQUNsRCxJQUFJLFVBQVUsR0FBVyxFQUFFLENBQUM7Z0JBQzVCLENBQUMsR0FBUyxFQUFFO29CQUNWLElBQUksQ0FBQzt3QkFDSCxVQUFVLEdBQUcsTUFBTSxlQUFLLENBQUMsR0FBRyxDQUMxQix1REFBdUQsS0FBSyxFQUFFLEVBQzlEOzRCQUNFLE9BQU8sRUFBRTtnQ0FDUCxhQUFhLEVBQUUsVUFBVSxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtnQ0FDckQsY0FBYyxFQUFFLHFCQUFxQjs2QkFDdEM7eUJBQ0YsQ0FDRixDQUFDO29CQUNKLENBQUM7b0JBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQzt3QkFDYixnQkFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsS0FBSyxZQUFZLENBQUMsQ0FBQzt3QkFDM0QsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztvQkFDN0IsQ0FBQzs0QkFBUyxDQUFDO3dCQUNULElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQzs0QkFDMUMsZ0JBQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUM7NEJBQzlCLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQzt3QkFDNUQsQ0FBQzt3QkFFRCxJQUFJLEtBQUssR0FBRzs0QkFDVixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLHNCQUFzQixFQUFFOzRCQUM3QyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRTs0QkFDaEMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRTs0QkFDckMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRTs0QkFDcEMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRTs0QkFDcEMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRTs0QkFDdkMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRTs0QkFDdkMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxrQkFBa0IsRUFBRTs0QkFDdkMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRTs0QkFDekMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRTs0QkFDekMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRTs0QkFDekMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxvQkFBb0IsRUFBRTs0QkFDekMsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSx3QkFBd0IsRUFBRTs0QkFDN0MsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSx3QkFBd0IsRUFBRTs0QkFDN0MsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSx3QkFBd0IsRUFBRTs0QkFDN0MsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSx5QkFBeUIsRUFBRTt5QkFDL0MsQ0FBQzt3QkFFRixNQUFNLE9BQU8sR0FDWCxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXOzZCQUM5Qyw2QkFBNkIsQ0FBQzt3QkFFbkMsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7d0JBQ2hELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7NEJBQzFCLGFBQWEsRUFBRTtnQ0FDYixPQUFPLEVBQ0wsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVztxQ0FDOUMsdUJBQXVCO2dDQUM1QixXQUFXLEVBQ1QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVztxQ0FDOUMsK0JBQStCLEtBQUssSUFBSTtvQ0FDekMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYTt5Q0FDbEMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCO29DQUNwRCxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVzt5Q0FDOUMsK0JBQStCO2dDQUN4QyxLQUFLO2dDQUNMLFdBQVcsRUFBRSxHQUNYLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQjtxQ0FDdkQsdUJBQXVCLEtBQUssSUFBSTtvQ0FDakMsQ0FBQyxDQUFDLEVBQUU7b0NBQ0osQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQjt5Q0FDdkQsdUJBQ1QsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxxQkFBcUIsSUFDbEYsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CO3FDQUN2RCx3QkFDTCxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixJQUNwRixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0I7cUNBQ3ZELDJCQUNMLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0NBQ1QsTUFBTSxFQUFFLEdBQ04sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CO3FDQUN2RCx1QkFBdUIsS0FBSyxJQUFJO29DQUNqQyxDQUFDLENBQUMsRUFBRTtvQ0FDSixDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CO3lDQUN2RCx1QkFDVCxJQUFJLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixJQUNsRixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0I7cUNBQ3ZELHdCQUNMLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0NBQ1QsR0FBRyxFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUU7Z0NBQzVGLElBQUksRUFBRSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLDJCQUEyQixFQUFFO2dDQUNqRyxnQkFBZ0IsRUFBRSxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLDhCQUE4QixFQUFFO2dDQUNoSCxzQkFBc0IsRUFBRSxHQUN0QixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7cUNBQzNELE9BQU8sS0FBSyxJQUFJO29DQUNqQixDQUFDLENBQUMsSUFBSTtvQ0FDTixDQUFDLENBQUMsS0FDTixFQUFFO2dDQUNGLG1CQUFtQixFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLEVBQUU7Z0NBQ2xGLGdCQUFnQixFQUNkLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYTtxQ0FDbEMsNkJBQTZCLEtBQUssSUFBSTtvQ0FDdkMsQ0FBQyxDQUFDLEdBQ0UsS0FBSyxDQUNILEtBQUssQ0FBQyxTQUFTLENBQ2IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNQLElBQUksQ0FBQyxJQUFJO3dDQUNULE1BQU0sQ0FDSixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWE7NkNBQ2xDLDZCQUE2QixDQUNqQyxDQUNKLENBQ0YsQ0FBQyxLQUNKLEVBQUU7b0NBQ0osQ0FBQyxDQUFDLHNCQUFzQjtnQ0FDNUIsT0FBTyxFQUFFLEdBQUcsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLDZCQUE2QixFQUFFO2dDQUM3RixhQUFhLEVBQUUsR0FBRyxVQUFVLEVBQUU7NkJBQy9CO3lCQUNGLENBQUMsQ0FBQztvQkFDTCxDQUFDO2dCQUNILENBQUMsQ0FBQSxDQUFDLEVBQUUsQ0FBQztZQUNQLENBQUM7U0FBQSxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUM7WUFDWixPQUFPLEVBQUUsZUFBZTtZQUN4QixLQUFLLEVBQUU7Z0JBQ0wsT0FBTyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPO2dCQUM5QixNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNO2dCQUNuQyxHQUFHLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHO2dCQUM3QixJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUk7YUFDekI7U0FDRixDQUFDLENBQUM7UUFDSCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQzFCLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLEtBQUssRUFBRTtnQkFDTCxPQUFPLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU87Z0JBQzlCLE1BQU0sRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU07Z0JBQ25DLEdBQUcsRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUc7Z0JBQzdCLElBQUksRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSTthQUN6QjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FDRixDQUFDO0FBQ0Ysa0JBQWUsTUFBTSxDQUFDIn0=