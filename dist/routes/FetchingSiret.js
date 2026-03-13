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
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Retour_1 = __importDefault(require("../library/Retour"));
const router = express_1.default.Router();
const libelleCodeNafPath = path_1.default.resolve(process.cwd(), "libelleCodeNaf.json");
const libelleCodeNaf = JSON.parse(fs_1.default.readFileSync(libelleCodeNafPath, "utf-8"));
const normalizeNAF = (code) => (code || "").replace(".", "").trim();
const getLibelleByCodeNAF = (codeNAF) => {
    var _a, _b, _c;
    const code = normalizeNAF(codeNAF);
    const nafEntry = (_a = libelleCodeNaf === null || libelleCodeNaf === void 0 ? void 0 : libelleCodeNaf.NAF) === null || _a === void 0 ? void 0 : _a.find((entry) => {
        var _a, _b;
        const entryCode = normalizeNAF((_b = (_a = entry === null || entry === void 0 ? void 0 : entry.Code) !== null && _a !== void 0 ? _a : entry === null || entry === void 0 ? void 0 : entry.code) !== null && _b !== void 0 ? _b : "");
        return entryCode === code;
    });
    if (!nafEntry)
        return null;
    return ((_c = (_b = nafEntry[" Intitulés de la  NAF rév. 2, version finale "]) !== null && _b !== void 0 ? _b : nafEntry["Intitulés de la NAF rév. 2, version finale"]) !== null && _c !== void 0 ? _c : null);
};
const ASSOCIATIONS_64_PATH = path_1.default.resolve(process.cwd(), "data/associations_dpt_64.json");
let ASSOCIATIONS_64 = [];
try {
    if (fs_1.default.existsSync(ASSOCIATIONS_64_PATH)) {
        ASSOCIATIONS_64 = JSON.parse(fs_1.default.readFileSync(ASSOCIATIONS_64_PATH, "utf-8"));
        console.log(`✅ Associations 64 chargées: ${ASSOCIATIONS_64.length}`);
        if (ASSOCIATIONS_64.length > 0) {
            console.log("ℹ️ Exemple de clés du 1er objet association:", Object.keys(ASSOCIATIONS_64[0]));
        }
    }
    else {
        console.warn(`⚠️ associations_dpt_64.json introuvable: ${ASSOCIATIONS_64_PATH}`);
    }
}
catch (e) {
    console.error("❌ Erreur lecture associations_dpt_64.json:", e);
}
const normalizeText = (v) => (v !== null && v !== void 0 ? v : "")
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
const normalizeRna = (input) => {
    if (!input)
        return null;
    const cleaned = String(input)
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/[^A-Z0-9]/g, "");
    if (/^W\d{9}$/.test(cleaned))
        return cleaned;
    if (/^\d{9}$/.test(cleaned))
        return `W${cleaned}`;
    return null;
};
const isSiret = (v) => /^\d{14}$/.test(String(v !== null && v !== void 0 ? v : "").trim());
const isDigitsOnly = (v) => /^\d+$/.test(String(v !== null && v !== void 0 ? v : "").trim());
const getAssociationName = (a) => {
    var _a, _b, _c, _d, _e;
    return String((_e = (_d = (_c = (_b = (_a = a === null || a === void 0 ? void 0 : a.name) !== null && _a !== void 0 ? _a : a === null || a === void 0 ? void 0 : a.title) !== null && _b !== void 0 ? _b : a === null || a === void 0 ? void 0 : a.nom) !== null && _c !== void 0 ? _c : a === null || a === void 0 ? void 0 : a.titre) !== null && _d !== void 0 ? _d : a === null || a === void 0 ? void 0 : a.libelle) !== null && _e !== void 0 ? _e : "").trim();
};
const getAssociationAddress = (a) => {
    var _a, _b, _c, _d;
    return String((_d = (_c = (_b = (_a = a === null || a === void 0 ? void 0 : a.address) !== null && _a !== void 0 ? _a : a === null || a === void 0 ? void 0 : a.adresse) !== null && _b !== void 0 ? _b : a === null || a === void 0 ? void 0 : a.adress) !== null && _c !== void 0 ? _c : a === null || a === void 0 ? void 0 : a.voie) !== null && _d !== void 0 ? _d : "").trim();
};
const getAssociationZip = (a) => {
    var _a, _b, _c;
    return String((_c = (_b = (_a = a === null || a === void 0 ? void 0 : a.zip) !== null && _a !== void 0 ? _a : a === null || a === void 0 ? void 0 : a.cp) !== null && _b !== void 0 ? _b : a === null || a === void 0 ? void 0 : a.codePostal) !== null && _c !== void 0 ? _c : "").trim();
};
const getAssociationCity = (a) => {
    var _a, _b, _c;
    return String((_c = (_b = (_a = a === null || a === void 0 ? void 0 : a.city) !== null && _a !== void 0 ? _a : a === null || a === void 0 ? void 0 : a.commune) !== null && _b !== void 0 ? _b : a === null || a === void 0 ? void 0 : a.ville) !== null && _c !== void 0 ? _c : "").trim();
};
const getAssociationObject = (a) => {
    var _a, _b;
    return String((_b = (_a = a === null || a === void 0 ? void 0 : a.objet) !== null && _a !== void 0 ? _a : a === null || a === void 0 ? void 0 : a.object) !== null && _b !== void 0 ? _b : "Association").trim();
};
const buildAssociationResponse = (association) => {
    var _a, _b, _c, _d;
    const address = getAssociationAddress(association);
    const zip = getAssociationZip(association);
    const city = getAssociationCity(association);
    return {
        society: getAssociationName(association) || null,
        currentName: null,
        siret: (_a = association === null || association === void 0 ? void 0 : association.siret) !== null && _a !== void 0 ? _a : null,
        rna: (_d = (_c = normalizeRna(String((_b = association === null || association === void 0 ? void 0 : association.rna) !== null && _b !== void 0 ? _b : ""))) !== null && _c !== void 0 ? _c : association === null || association === void 0 ? void 0 : association.rna) !== null && _d !== void 0 ? _d : null,
        adressLabel: `${address} ${zip} ${city}`.trim(),
        adress: address || null,
        zip,
        city,
        adressComplement: "",
        administratifStateOpen: (association === null || association === void 0 ? void 0 : association.position) !== undefined && (association === null || association === void 0 ? void 0 : association.position) !== null
            ? String(association.position).trim().toUpperCase() === "A"
            : true,
        headquartersSociety: true,
        numberOfEmployed: "Unité non employeuse",
        codeNAF: "",
        activityLabel: getAssociationObject(association),
    };
};
const debugAssociationSearch = (queryRaw, qNorm) => {
    const firstCandidates = ASSOCIATIONS_64.filter((a) => {
        const name = getAssociationName(a);
        const n = normalizeText(name);
        return n.includes(qNorm) || qNorm.includes(n);
    }).slice(0, 5);
    console.log("🔎 Debug recherche association:", {
        queryRaw,
        qNorm,
        sample: firstCandidates.map((a) => {
            var _a, _b;
            return ({
                rawName: getAssociationName(a),
                normalizedName: normalizeText(getAssociationName(a)),
                rna: (_a = a === null || a === void 0 ? void 0 : a.rna) !== null && _a !== void 0 ? _a : null,
                siret: (_b = a === null || a === void 0 ? void 0 : a.siret) !== null && _b !== void 0 ? _b : null,
            });
        }),
    });
};
router.post("/fetchSiretEntreprise", (req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4;
    try {
        const queryRaw = String((_d = (_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.query) !== null && _b !== void 0 ? _b : (_c = req.body) === null || _c === void 0 ? void 0 : _c.siret) !== null && _d !== void 0 ? _d : "").trim();
        if (!queryRaw) {
            return res.status(400).json({ message: "query/siret manquant." });
        }
        const qNorm = normalizeText(queryRaw);
        const rnaNormalized = normalizeRna(queryRaw);
        const respondEtab = (etablissement) => res.status(200).json({ etablissement });
        if (rnaNormalized) {
            const found = ASSOCIATIONS_64.find((a) => { var _a; return normalizeRna(String((_a = a === null || a === void 0 ? void 0 : a.rna) !== null && _a !== void 0 ? _a : "")) === rnaNormalized; });
            if (!found) {
                return res.status(404).json({
                    message: `Association introuvable pour RNA ${rnaNormalized}`,
                });
            }
            return respondEtab(buildAssociationResponse(found));
        }
        if (isSiret(queryRaw)) {
            const apiKey = String((_e = process.env.API_SIRET_CLIENT_ID) !== null && _e !== void 0 ? _e : "").trim();
            if (!apiKey) {
                return res.status(500).json({
                    message: "Clé INSEE manquante (API_SIRET_CLIENT_ID).",
                });
            }
            let inseeData;
            try {
                const entrepriseResponse = yield axios_1.default.get(`https://api.insee.fr/api-sirene/3.11/siret/${encodeURIComponent(queryRaw)}`, {
                    headers: {
                        "X-INSEE-Api-Key-Integration": apiKey,
                        Accept: "application/json",
                    },
                    timeout: 15000,
                });
                inseeData = entrepriseResponse.data;
            }
            catch (_err) {
                Retour_1.default.error(`SIRET ${queryRaw} not found.`);
                return res.status(404).json({
                    message: `Aucune structure trouvée pour ${queryRaw}`,
                });
            }
            const etab = inseeData === null || inseeData === void 0 ? void 0 : inseeData.etablissement;
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
            const uniteLegale = (_f = etab.uniteLegale) !== null && _f !== void 0 ? _f : {};
            const adresse = (_g = etab.adresseEtablissement) !== null && _g !== void 0 ? _g : {};
            const periode = (_h = etab.periodesEtablissement) === null || _h === void 0 ? void 0 : _h[0];
            const codeEffectif = etab.trancheEffectifsEtablissement;
            const numberOfEmployed = codeEffectif && codeEffectif !== "NN"
                ? ((_k = (_j = codes.find((c) => c.code === Number(codeEffectif))) === null || _j === void 0 ? void 0 : _j.value) !== null && _k !== void 0 ? _k : "Inconnu")
                : "Unité non employeuse";
            const codeNAF = (_l = uniteLegale.activitePrincipaleUniteLegale) !== null && _l !== void 0 ? _l : "";
            const libelleNAF = getLibelleByCodeNAF(codeNAF);
            const denomination = (() => {
                var _a, _b, _c, _d, _e;
                const denom = String((_a = uniteLegale.denominationUniteLegale) !== null && _a !== void 0 ? _a : "").trim();
                if (denom)
                    return denom;
                const nom = String((_c = (_b = uniteLegale.nomUsageUniteLegale) !== null && _b !== void 0 ? _b : uniteLegale.nomUniteLegale) !== null && _c !== void 0 ? _c : "").trim();
                const prenom = String((_e = (_d = uniteLegale.prenom1UniteLegale) !== null && _d !== void 0 ? _d : uniteLegale.prenomUsuelUniteLegale) !== null && _e !== void 0 ? _e : "").trim();
                const nomPrenom = `${prenom} ${nom}`.trim();
                return nomPrenom || null;
            })();
            const adressLabel = `${(_m = adresse.numeroVoieEtablissement) !== null && _m !== void 0 ? _m : ""} ${(_o = adresse.typeVoieEtablissement) !== null && _o !== void 0 ? _o : ""} ${(_p = adresse.libelleVoieEtablissement) !== null && _p !== void 0 ? _p : ""} ${(_q = adresse.codePostalEtablissement) !== null && _q !== void 0 ? _q : ""} ${(_r = adresse.libelleCommuneEtablissement) !== null && _r !== void 0 ? _r : ""}`.trim();
            const adress = `${(_s = adresse.numeroVoieEtablissement) !== null && _s !== void 0 ? _s : ""} ${(_t = adresse.typeVoieEtablissement) !== null && _t !== void 0 ? _t : ""} ${(_u = adresse.libelleVoieEtablissement) !== null && _u !== void 0 ? _u : ""}`.trim();
            return respondEtab({
                society: denomination,
                currentName: (_w = (_v = uniteLegale.denominationUsuelle1UniteLegale) !== null && _v !== void 0 ? _v : periode === null || periode === void 0 ? void 0 : periode.enseigne1Etablissement) !== null && _w !== void 0 ? _w : null,
                siret: queryRaw,
                adressLabel,
                adress,
                zip: String((_x = adresse.codePostalEtablissement) !== null && _x !== void 0 ? _x : ""),
                city: String((_y = adresse.libelleCommuneEtablissement) !== null && _y !== void 0 ? _y : ""),
                adressComplement: String((_z = adresse.complementAdresseEtablissement) !== null && _z !== void 0 ? _z : ""),
                administratifStateOpen: (periode === null || periode === void 0 ? void 0 : periode.dateFin) === null,
                headquartersSociety: Boolean(etab.etablissementSiege),
                numberOfEmployed,
                codeNAF: String(codeNAF),
                activityLabel: libelleNAF,
            });
        }
        if (isDigitsOnly(queryRaw)) {
            if (queryRaw.length === 9) {
                const rnaFromDigits = normalizeRna(queryRaw);
                const found = ASSOCIATIONS_64.find((a) => { var _a; return normalizeRna(String((_a = a === null || a === void 0 ? void 0 : a.rna) !== null && _a !== void 0 ? _a : "")) === rnaFromDigits; });
                if (!found) {
                    return res.status(404).json({
                        message: `Association introuvable pour RNA ${rnaFromDigits}`,
                    });
                }
                return respondEtab(buildAssociationResponse(found));
            }
            if (queryRaw.length !== 14) {
                return res.status(400).json({
                    message: "Identifiant invalide : 9 chiffres pour RNA ou 14 chiffres pour SIRET.",
                });
            }
        }
        if (qNorm.length < 2) {
            return res.status(400).json({ message: "Tape au moins 2 caractères." });
        }
        const matches = ASSOCIATIONS_64.filter((a) => {
            const rawName = getAssociationName(a);
            const normalizedName = normalizeText(rawName);
            if (!normalizedName)
                return false;
            return normalizedName.includes(qNorm) || qNorm.includes(normalizedName);
        });
        if (matches.length === 0) {
            debugAssociationSearch(queryRaw, qNorm);
            return res.status(404).json({
                message: `Aucune association trouvée pour "${queryRaw}".`,
            });
        }
        const exact = matches.find((a) => normalizeText(getAssociationName(a)) === qNorm);
        if (exact) {
            return respondEtab(buildAssociationResponse(exact));
        }
        if (matches.length === 1) {
            return respondEtab(buildAssociationResponse(matches[0]));
        }
        return res.status(409).json({
            message: "Plusieurs associations trouvées. Veuillez sélectionner.",
            suggestions: matches.slice(0, 20).map((a) => {
                var _a, _b, _c, _d;
                return ({
                    rna: (_c = (_b = normalizeRna(String((_a = a === null || a === void 0 ? void 0 : a.rna) !== null && _a !== void 0 ? _a : ""))) !== null && _b !== void 0 ? _b : a === null || a === void 0 ? void 0 : a.rna) !== null && _c !== void 0 ? _c : null,
                    name: getAssociationName(a) || null,
                    zip: getAssociationZip(a) || null,
                    city: getAssociationCity(a) || null,
                    address: getAssociationAddress(a) || null,
                    siret: (_d = a === null || a === void 0 ? void 0 : a.siret) !== null && _d !== void 0 ? _d : null,
                });
            }),
        });
    }
    catch (error) {
        console.error("fetchSiretEntreprise error:", {
            message: error === null || error === void 0 ? void 0 : error.message,
            status: (_0 = error === null || error === void 0 ? void 0 : error.response) === null || _0 === void 0 ? void 0 : _0.status,
            data: (_1 = error === null || error === void 0 ? void 0 : error.response) === null || _1 === void 0 ? void 0 : _1.data,
            url: (_2 = error === null || error === void 0 ? void 0 : error.config) === null || _2 === void 0 ? void 0 : _2.url,
        });
        return res.status(500).json({
            message: "An error occurred while fetching data.",
            error: {
                message: error === null || error === void 0 ? void 0 : error.message,
                status: (_3 = error === null || error === void 0 ? void 0 : error.response) === null || _3 === void 0 ? void 0 : _3.status,
                url: (_4 = error === null || error === void 0 ? void 0 : error.config) === null || _4 === void 0 ? void 0 : _4.url,
            },
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmV0Y2hpbmdTaXJldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRmV0Y2hpbmdTaXJldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFtRTtBQUNuRSxrREFBMEI7QUFDMUIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBdUM7QUFFdkMsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQU9oQyxNQUFNLGtCQUFrQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDOUUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFFaEYsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFFNUUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLE9BQWUsRUFBaUIsRUFBRTs7SUFDN0QsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRW5DLE1BQU0sUUFBUSxHQUFHLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLEdBQUcsMENBQUUsSUFBSSxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7O1FBQ3hELE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxNQUFBLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksbUNBQUksS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksbUNBQUksRUFBRSxDQUFDLENBQUM7UUFDakUsT0FBTyxTQUFT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