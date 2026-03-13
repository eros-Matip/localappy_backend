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
  "data/associations_dpt_64.json",
);

let ASSOCIATIONS_64: any[] = [];

try {
  if (fs.existsSync(ASSOCIATIONS_64_PATH)) {
    ASSOCIATIONS_64 = JSON.parse(
      fs.readFileSync(ASSOCIATIONS_64_PATH, "utf-8"),
    );

    console.log(`✅ Associations 64 chargées: ${ASSOCIATIONS_64.length}`);
    if (ASSOCIATIONS_64.length > 0) {
      console.log(
        "ℹ️ Exemple de clés du 1er objet association:",
        Object.keys(ASSOCIATIONS_64[0]),
      );
    }
  } else {
    console.warn(
      `⚠️ associations_dpt_64.json introuvable: ${ASSOCIATIONS_64_PATH}`,
    );
  }
} catch (e) {
  console.error("❌ Erreur lecture associations_dpt_64.json:", e);
}

/**
 * -------------------------------
 * Helpers de normalisation
 * -------------------------------
 */
const normalizeText = (v: string) =>
  (v ?? "")
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[’`´]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

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

  const cleaned = String(input)
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
 * Helpers association
 * -------------------------------
 */
const getAssociationName = (a: any): string => {
  return String(
    a?.name ?? a?.title ?? a?.nom ?? a?.titre ?? a?.libelle ?? "",
  ).trim();
};

const getAssociationAddress = (a: any): string => {
  return String(a?.address ?? a?.adresse ?? a?.adress ?? a?.voie ?? "").trim();
};

const getAssociationZip = (a: any): string => {
  return String(a?.zip ?? a?.cp ?? a?.codePostal ?? "").trim();
};

const getAssociationCity = (a: any): string => {
  return String(a?.city ?? a?.commune ?? a?.ville ?? "").trim();
};

const getAssociationObject = (a: any): string => {
  return String(a?.objet ?? a?.object ?? "Association").trim();
};

const buildAssociationResponse = (association: any) => {
  const address = getAssociationAddress(association);
  const zip = getAssociationZip(association);
  const city = getAssociationCity(association);

  return {
    society: getAssociationName(association) || null,
    currentName: null,
    siret: association?.siret ?? null,
    rna:
      normalizeRna(String(association?.rna ?? "")) ?? association?.rna ?? null,
    adressLabel: `${address} ${zip} ${city}`.trim(),
    adress: address || null,
    zip,
    city,
    adressComplement: "",
    administratifStateOpen:
      association?.position !== undefined && association?.position !== null
        ? String(association.position).trim().toUpperCase() === "A"
        : true,
    headquartersSociety: true,
    numberOfEmployed: "Unité non employeuse",
    codeNAF: "",
    activityLabel: getAssociationObject(association),
  };
};

/**
 * Debug optionnel pour comprendre pourquoi une asso n'est pas retrouvée
 */
const debugAssociationSearch = (queryRaw: string, qNorm: string) => {
  const firstCandidates = ASSOCIATIONS_64.filter((a) => {
    const name = getAssociationName(a);
    const n = normalizeText(name);
    return n.includes(qNorm) || qNorm.includes(n);
  }).slice(0, 5);

  console.log("🔎 Debug recherche association:", {
    queryRaw,
    qNorm,
    sample: firstCandidates.map((a) => ({
      rawName: getAssociationName(a),
      normalizedName: normalizeText(getAssociationName(a)),
      rna: a?.rna ?? null,
      siret: a?.siret ?? null,
    })),
  });
};

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
          (a) => normalizeRna(String(a?.rna ?? "")) === rnaNormalized,
        );

        if (!found) {
          return res.status(404).json({
            message: `Association introuvable pour RNA ${rnaNormalized}`,
          });
        }

        return respondEtab(buildAssociationResponse(found));
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
              queryRaw,
            )}`,
            {
              headers: {
                "X-INSEE-Api-Key-Integration": apiKey,
                Accept: "application/json",
              },
              timeout: 15000,
            },
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

        const denomination = (() => {
          const denom = String(
            uniteLegale.denominationUniteLegale ?? "",
          ).trim();
          if (denom) return denom;

          const nom = String(
            uniteLegale.nomUsageUniteLegale ?? uniteLegale.nomUniteLegale ?? "",
          ).trim();

          const prenom = String(
            uniteLegale.prenom1UniteLegale ??
              uniteLegale.prenomUsuelUniteLegale ??
              "",
          ).trim();

          const nomPrenom = `${prenom} ${nom}`.trim();
          return nomPrenom || null;
        })();

        const adressLabel = `${adresse.numeroVoieEtablissement ?? ""} ${
          adresse.typeVoieEtablissement ?? ""
        } ${adresse.libelleVoieEtablissement ?? ""} ${
          adresse.codePostalEtablissement ?? ""
        } ${adresse.libelleCommuneEtablissement ?? ""}`.trim();

        const adress = `${adresse.numeroVoieEtablissement ?? ""} ${
          adresse.typeVoieEtablissement ?? ""
        } ${adresse.libelleVoieEtablissement ?? ""}`.trim();

        return respondEtab({
          society: denomination,
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
            adresse.complementAdresseEtablissement ?? "",
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
       * 3) Si chiffres mais pas 14 -> soit RNA 9 chiffres, soit invalide
       * ======================================================
       */
      if (isDigitsOnly(queryRaw)) {
        if (queryRaw.length === 9) {
          const rnaFromDigits = normalizeRna(queryRaw);

          const found = ASSOCIATIONS_64.find(
            (a) => normalizeRna(String(a?.rna ?? "")) === rnaFromDigits,
          );

          if (!found) {
            return res.status(404).json({
              message: `Association introuvable pour RNA ${rnaFromDigits}`,
            });
          }

          return respondEtab(buildAssociationResponse(found));
        }

        if (queryRaw.length !== 14) {
          return res.status(400).json({
            message:
              "Identifiant invalide : 9 chiffres pour RNA ou 14 chiffres pour SIRET.",
          });
        }
      }

      /**
       * ======================================================
       * 4) Sinon -> association par NOM (insensible casse+accents+ponctuation)
       *  - si 1 correspondance => { etablissement }
       *  - si 1 correspondance exacte normalisée => { etablissement }
       *  - sinon 409 + suggestions
       * ======================================================
       */
      if (qNorm.length < 2) {
        return res.status(400).json({ message: "Tape au moins 2 caractères." });
      }

      const matches = ASSOCIATIONS_64.filter((a) => {
        const rawName = getAssociationName(a);
        const normalizedName = normalizeText(rawName);

        if (!normalizedName) return false;

        return normalizedName.includes(qNorm) || qNorm.includes(normalizedName);
      });

      if (matches.length === 0) {
        debugAssociationSearch(queryRaw, qNorm);

        return res.status(404).json({
          message: `Aucune association trouvée pour "${queryRaw}".`,
        });
      }

      const exact = matches.find(
        (a) => normalizeText(getAssociationName(a)) === qNorm,
      );

      if (exact) {
        return respondEtab(buildAssociationResponse(exact));
      }

      if (matches.length === 1) {
        return respondEtab(buildAssociationResponse(matches[0]));
      }

      return res.status(409).json({
        message: "Plusieurs associations trouvées. Veuillez sélectionner.",
        suggestions: matches.slice(0, 20).map((a) => ({
          rna: normalizeRna(String(a?.rna ?? "")) ?? a?.rna ?? null,
          name: getAssociationName(a) || null,
          zip: getAssociationZip(a) || null,
          city: getAssociationCity(a) || null,
          address: getAssociationAddress(a) || null,
          siret: a?.siret ?? null,
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
  },
);

export default router;
