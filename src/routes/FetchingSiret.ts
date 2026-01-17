import express, { NextFunction, Request, Response } from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import Retour from "../library/Retour";

const router = express.Router();

/**
 * -------------------------------
 * NAF libellés (entreprises)
 * -------------------------------
 */
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

/**
 * -------------------------------
 * Associations (dépt 64) – load once
 * -------------------------------
 */
const ASSOCIATIONS_64_PATH = path.resolve(
  process.cwd(),
  "data/associations_dpt_64.json"
);

let ASSOCIATIONS_64: any[] = [];
try {
  if (fs.existsSync(ASSOCIATIONS_64_PATH)) {
    ASSOCIATIONS_64 = JSON.parse(
      fs.readFileSync(ASSOCIATIONS_64_PATH, "utf-8")
    );
    console.log(`✅ Associations 64 chargées: ${ASSOCIATIONS_64.length}`);
  } else {
    console.warn(
      `⚠️ associations_dpt_64.json introuvable: ${ASSOCIATIONS_64_PATH}`
    );
  }
} catch (e) {
  console.error("❌ Erreur lecture associations_dpt_64.json:", e);
}

const normalizeText = (v: string) =>
  (v ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Accepte:
 * - W641000001
 * - 641000001
 * - w641000001
 * - " W 641000001 "
 * Retourne: "W641000001" ou null
 */
const normalizeRna = (input: string): string | null => {
  if (!input) return null;

  const cleaned = input
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9]/g, "");

  if (/^W\d{9}$/.test(cleaned)) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return `W${cleaned}`;

  return null;
};

const isSiret = (v: string) => /^\d{14}$/.test(String(v ?? "").trim());
const isDigitsOnly = (v: string) => /^\d+$/.test(String(v ?? "").trim());

/**
 * -------------------------------
 * POST /fetchSiretEntreprise
 * Body:
 *  - { query: "12345678901234" } => entreprise (INSEE)
 *  - { query: "W641000001" } ou { query: "641000001" } => association (RNA)
 *  - { query: "ASSOCIATION ..." } => association (nom -> suggestions ou exact)
 *
 * Réponse:
 *  ✅ toujours { etablissement: {...} } quand une sélection unique est possible
 *  ⚠️ si recherche NOM renvoie plusieurs résultats => 409 + suggestions
 * -------------------------------
 */
router.post(
  "/fetchSiretEntreprise",
  async (req: Request, res: Response, _next: NextFunction) => {
    try {
      const queryRaw = String(req.body?.query ?? req.body?.siret ?? "").trim();
      if (!queryRaw) {
        return res.status(400).json({ message: "query/siret manquant." });
      }

      const qNorm = normalizeText(queryRaw);
      const rnaNormalized = normalizeRna(queryRaw);

      const respondEtab = (etablissement: any) =>
        res.status(200).json({ etablissement });

      /**
       * ======================================================
       * 1) RNA (W######### OU #########) -> association par RNA (exact)
       * ======================================================
       */
      if (rnaNormalized) {
        const found = ASSOCIATIONS_64.find(
          (a) => normalizeRna(String(a?.rna ?? "")) === rnaNormalized
        );

        if (!found) {
          return res.status(404).json({
            message: `Association introuvable pour RNA ${rnaNormalized}`,
          });
        }

        const address = String(found.address ?? "").trim();
        const zip = String(found.zip ?? "").trim();
        const city = String(found.city ?? "").trim();

        return respondEtab({
          society: found.name ?? null,
          currentName: null,
          siret: found.siret ?? null,
          rna: found.rna ?? null,
          adressLabel: `${address} ${zip} ${city}`.trim(),
          adress: address || null,
          zip,
          city,
          adressComplement: "",
          administratifStateOpen:
            found.position !== undefined && found.position !== null
              ? String(found.position).trim() === "A"
              : true,
          headquartersSociety: true,
          numberOfEmployed: "Unité non employeuse",
          codeNAF: "",
          activityLabel: found.objet ?? "Association",
        });
      }

      /**
       * ======================================================
       * 2) SIRET (14 chiffres) -> INSEE
       * ======================================================
       */
      if (isSiret(queryRaw)) {
        const apiKey = String(process.env.API_SIRET_CLIENT_ID ?? "").trim();
        if (!apiKey) {
          return res.status(500).json({
            message: "Clé INSEE manquante (API_SIRET_CLIENT_ID).",
          });
        }

        let inseeData: any;
        try {
          const entrepriseResponse = await axios.get(
            `https://api.insee.fr/api-sirene/3.11/siret/${encodeURIComponent(
              queryRaw
            )}`,
            {
              headers: {
                "X-INSEE-Api-Key-Integration": apiKey,
                Accept: "application/json",
              },
              timeout: 15000,
            }
          );
          inseeData = entrepriseResponse.data;
        } catch (_err) {
          Retour.error(`SIRET ${queryRaw} not found.`);
          return res.status(404).json({
            message: `Aucune structure trouvée pour ${queryRaw}`,
          });
        }

        const etab = inseeData?.etablissement;
        if (!etab) {
          return res
            .status(404)
            .json({ message: "Etablissement introuvable." });
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

        const adressLabel = `${adresse.numeroVoieEtablissement ?? ""} ${
          adresse.typeVoieEtablissement ?? ""
        } ${adresse.libelleVoieEtablissement ?? ""} ${
          adresse.codePostalEtablissement ?? ""
        } ${adresse.libelleCommuneEtablissement ?? ""}`.trim();

        const adress = `${adresse.numeroVoieEtablissement ?? ""} ${
          adresse.typeVoieEtablissement ?? ""
        } ${adresse.libelleVoieEtablissement ?? ""}`.trim();

        return respondEtab({
          society: uniteLegale.denominationUniteLegale ?? null,
          currentName:
            uniteLegale.denominationUsuelle1UniteLegale ??
            periode?.enseigne1Etablissement ??
            null,
          siret: queryRaw,
          adressLabel,
          adress,
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
        });
      }

      /**
       * ======================================================
       * 3) Si chiffres mais pas 14 -> invalide
       * ======================================================
       */
      if (isDigitsOnly(queryRaw) && queryRaw.length !== 14) {
        return res.status(400).json({
          message: "SIRET invalide : 14 chiffres requis.",
        });
      }

      /**
       * ======================================================
       * 4) Sinon -> association par NOM (insensible casse+accents)
       *  - si 1 correspondance EXACTE normalisée => { etablissement }
       *  - sinon 409 + suggestions (le front doit choisir, puis rappeler avec RNA)
       * ======================================================
       */
      if (qNorm.length < 2) {
        return res.status(400).json({ message: "Tape au moins 2 caractères." });
      }

      const matches = ASSOCIATIONS_64.filter((a) => {
        const n = normalizeText(String(a?.name ?? ""));
        return n.includes(qNorm);
      });

      const exact = matches.find(
        (a) => normalizeText(String(a?.name ?? "")) === qNorm
      );

      if (exact) {
        const address = String(exact.address ?? "").trim();
        const zip = String(exact.zip ?? "").trim();
        const city = String(exact.city ?? "").trim();

        return respondEtab({
          society: exact.name ?? null,
          currentName: null,
          siret: exact.siret ?? null,
          adressLabel: `${address} ${zip} ${city}`.trim(),
          adress: address || null,
          zip,
          city,
          adressComplement: "",
          administratifStateOpen:
            exact.position !== undefined && exact.position !== null
              ? String(exact.position).trim() === "A"
              : true,
          headquartersSociety: true,
          numberOfEmployed: "Unité non employeuse",
          codeNAF: "",
          activityLabel: exact.objet ?? "Association",
        });
      }

      return res.status(409).json({
        message: "Plusieurs associations trouvées. Veuillez sélectionner.",
        suggestions: matches.slice(0, 20).map((a) => ({
          rna: a.rna ?? null,
          name: a.name ?? null,
          zip: a.zip ?? null,
          city: a.city ?? null,
          address: a.address ?? null,
          siret: a.siret ?? null,
        })),
      });
    } catch (error: any) {
      console.error("fetchSiretEntreprise error:", {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
        url: error?.config?.url,
      });

      return res.status(500).json({
        message: "An error occurred while fetching data.",
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
