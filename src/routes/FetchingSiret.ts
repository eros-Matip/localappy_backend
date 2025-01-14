import express from "express";
import axios from "axios";
import { NextFunction, Request, Response, Router } from "express";
import Retour from "../library/Retour";
import fs from "fs";
import path from "path";
const router = express.Router();
// Charger le fichier JSON contenant les libellés des codes NAF
const libelleCodeNafPath = path.join(__dirname, "../../libelleCodeNaf.json");
const libelleCodeNaf = JSON.parse(fs.readFileSync(libelleCodeNafPath, "utf-8"));

// Fonction pour récupérer le libellé à partir du code NAF
const getLibelleByCodeNAF = (codeNAF: string): string | null => {
  const nafEntry = libelleCodeNaf.NAF.find(
    (entry: object) => Object(entry).Code === codeNAF
  );
  return nafEntry
    ? nafEntry[" Intitulés de la  NAF rév. 2, version finale "] || null
    : null;
};

router.post(
  "/fetchSiretEntreprise",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { siret } = req.body;
      // Fonction pour extraire le token de requete
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

      // Fonction pour requeter l'API d'état
      axios.request(options).then(async function (response) {
        let entreprise: object = {};
        (async () => {
          try {
            entreprise = await axios.get(
              `https://api.insee.fr/entreprises/sirene/V3.11/siret/${siret}`,
              {
                headers: {
                  Authorization: `Bearer ${response.data.access_token}`,
                  "Content-Type": "multipart/form-data",
                },
              }
            );
          } catch (err) {
            Retour.error(`Error 404... entreprise ${siret} not found`);
            console.error(Object(err));
          } finally {
            if (Object(entreprise).data === undefined) {
              Retour.error("error catched");
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
            // Récupérer le libellé correspondant au code NAF
            const codeNAF =
              Object(entreprise).data.etablissement.uniteLegale
                .activitePrincipaleUniteLegale;

            const libelleNAF = getLibelleByCodeNAF(codeNAF);
            return res.status(200).json({
              etablissement: {
                society:
                  Object(entreprise).data.etablissement.uniteLegale
                    .denominationUniteLegale,
                currentName:
                  Object(entreprise).data.etablissement.uniteLegale
                    .denominationUsuelle1UniteLegale === null
                    ? Object(entreprise).data.etablissement
                        .periodesEtablissement[0].enseigne1Etablissement
                    : Object(entreprise).data.etablissement.uniteLegale
                        .denominationUsuelle1UniteLegale,
                siret,
                adressLabel: `${
                  Object(entreprise).data.etablissement.adresseEtablissement
                    .numeroVoieEtablissement === null
                    ? ""
                    : Object(entreprise).data.etablissement.adresseEtablissement
                        .numeroVoieEtablissement
                } ${Object(entreprise).data.etablissement.adresseEtablissement.typeVoieEtablissement} ${
                  Object(entreprise).data.etablissement.adresseEtablissement
                    .libelleVoieEtablissement
                } ${Object(entreprise).data.etablissement.adresseEtablissement.codePostalEtablissement} ${
                  Object(entreprise).data.etablissement.adresseEtablissement
                    .libelleCommuneEtablissement
                }`.trim(),
                adress: `${
                  Object(entreprise).data.etablissement.adresseEtablissement
                    .numeroVoieEtablissement === null
                    ? ""
                    : Object(entreprise).data.etablissement.adresseEtablissement
                        .numeroVoieEtablissement
                } ${Object(entreprise).data.etablissement.adresseEtablissement.typeVoieEtablissement} ${
                  Object(entreprise).data.etablissement.adresseEtablissement
                    .libelleVoieEtablissement
                }`.trim(),
                zip: `${Object(entreprise).data.etablissement.adresseEtablissement.codePostalEtablissement}`,
                city: `${Object(entreprise).data.etablissement.adresseEtablissement.libelleCommuneEtablissement}`,
                adressComplement: `${Object(entreprise).data.etablissement.adresseEtablissement.complementAdresseEtablissement}`,
                administratifStateOpen: `${
                  Object(entreprise).data.etablissement.periodesEtablissement[0]
                    .dateFin === null
                    ? true
                    : false
                }`,
                headquartersSociety: `${Object(entreprise).data.etablissement.etablissementSiege}`,
                numberOfEmployed:
                  Object(entreprise).data.etablissement
                    .trancheEffectifsEtablissement !== "NN"
                    ? `${
                        codes[
                          codes.findIndex(
                            (code) =>
                              code.code ===
                              Number(
                                Object(entreprise).data.etablissement
                                  .trancheEffectifsEtablissement
                              )
                          )
                        ].value
                      }`
                    : "Unité non employeuse",
                codeNAF: `${Object(entreprise).data.etablissement.uniteLegale.activitePrincipaleUniteLegale}`,
                activityLabel: `${libelleNAF}`,
              },
            });
          }
        })();
      });
    } catch (error) {
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
  }
);
export default router;
