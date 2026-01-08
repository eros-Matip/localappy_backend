import express, { NextFunction, Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import Retour from "../library/Retour";
import { log } from "console";

const router = express.Router();

// ⚠️ adapte le chemin si besoin
const libelleCodeNafPath = path.resolve(process.cwd(), "libelleCodeNaf.json");
const libelleCodeNaf = JSON.parse(fs.readFileSync(libelleCodeNafPath, "utf-8"));

const normalizeNAF = (code: string) => (code || "").replace(".", "").trim();

const getLibelleByCodeNAF = (codeNAF: string): string | null => {
  const code = normalizeNAF(codeNAF);
  const nafEntry = libelleCodeNaf?.NAF?.find((entry: any) => {
    const entryCode = normalizeNAF(entry?.Code ?? entry?.code ?? "");
    return entryCode === code;
  });

  if (!nafEntry) return null;

  return (
    nafEntry[" Intitulés de la  NAF rév. 2, version finale "] ??
    nafEntry["Intitulés de la NAF rév. 2, version finale"] ??
    null
  );
};

router.post(
  "/fetchSiretEntreprise",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { siret } = req.body;

      if (!siret || typeof siret !== "string") {
        return res.status(400).json({ message: "SIRET manquant ou invalide." });
      }

      // ✅ même structure que ton endpoint qui marche :
      // - URL : /api-sirene/3.11/siret/:siret
      // - Header : X-INSEE-Api-Key-Integration
      let inseeData: any;
      try {
        const entrepriseResponse = await axios.get(
          `https://api.insee.fr/api-sirene/3.11/siret/${siret}`,
          {
            headers: {
              "X-INSEE-Api-Key-Integration": String(
                process.env.API_SIRET_CLIENT_ID ?? ""
              ),
              Accept: "application/json",
            },
          }
        );
        console.log("entrepriseResponse", entrepriseResponse);
        inseeData = entrepriseResponse.data;
      } catch (err) {
        Retour.error(`Entreprise with SIRET ${siret} not found.`);
        return res
          .status(404)
          .json({ message: `Entreprise with SIRET ${siret} not found.` });
      }

      const etab = inseeData?.etablissement;
      if (!etab) {
        return res.status(404).json({ message: "Etablissement introuvable." });
      }

      const codes = [
        { code: "NN", value: "Unité non employeuse" },
        { code: 0, value: "0 salarié" },
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

      const uniteLegale = etab.uniteLegale ?? {};
      const adresse = etab.adresseEtablissement ?? {};
      const periode = etab.periodesEtablissement?.[0];

      const codeEffectif = etab.trancheEffectifsEtablissement;
      const numberOfEmployed =
        codeEffectif && codeEffectif !== "NN"
          ? (codes.find((c) => c.code === Number(codeEffectif))?.value ??
            "Inconnu")
          : "Unité non employeuse";

      const codeNAF = uniteLegale.activitePrincipaleUniteLegale ?? "";
      const libelleNAF = getLibelleByCodeNAF(codeNAF);

      return res.status(200).json({
        etablissement: {
          society: uniteLegale.denominationUniteLegale ?? null,
          currentName:
            uniteLegale.denominationUsuelle1UniteLegale ??
            periode?.enseigne1Etablissement ??
            null,
          siret,
          adressLabel: `${adresse.numeroVoieEtablissement ?? ""} ${
            adresse.typeVoieEtablissement ?? ""
          } ${adresse.libelleVoieEtablissement ?? ""} ${
            adresse.codePostalEtablissement ?? ""
          } ${adresse.libelleCommuneEtablissement ?? ""}`.trim(),
          adress: `${adresse.numeroVoieEtablissement ?? ""} ${
            adresse.typeVoieEtablissement ?? ""
          } ${adresse.libelleVoieEtablissement ?? ""}`.trim(),
          zip: String(adresse.codePostalEtablissement ?? ""),
          city: String(adresse.libelleCommuneEtablissement ?? ""),
          adressComplement: String(
            adresse.complementAdresseEtablissement ?? ""
          ),
          administratifStateOpen: periode?.dateFin === null,
          headquartersSociety: Boolean(etab.etablissementSiege),
          numberOfEmployed,
          codeNAF: String(codeNAF),
          activityLabel: libelleNAF,
        },
      });
    } catch (error: any) {
      console.error("INSEE fetch error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
      });

      return res.status(500).json({
        message: "An error occurred while fetching SIRET data.",
        error: {
          message: error?.message,
          status: error?.response?.status,
          url: error?.config?.url,
        },
      });
    }
  }
);

export default router;
