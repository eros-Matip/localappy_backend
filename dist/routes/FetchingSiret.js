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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
const normalizeRna = (input) => {
    if (!input)
        return null;
    const cleaned = input
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
router.post("/fetchSiretEntreprise", (req, res, _next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17;
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
            const address = String((_e = found.address) !== null && _e !== void 0 ? _e : "").trim();
            const zip = String((_f = found.zip) !== null && _f !== void 0 ? _f : "").trim();
            const city = String((_g = found.city) !== null && _g !== void 0 ? _g : "").trim();
            return respondEtab({
                society: (_h = found.name) !== null && _h !== void 0 ? _h : null,
                currentName: null,
                siret: (_j = found.siret) !== null && _j !== void 0 ? _j : null,
                rna: (_k = found.rna) !== null && _k !== void 0 ? _k : null,
                adressLabel: `${address} ${zip} ${city}`.trim(),
                adress: address || null,
                zip,
                city,
                adressComplement: "",
                administratifStateOpen: found.position !== undefined && found.position !== null
                    ? String(found.position).trim() === "A"
                    : true,
                headquartersSociety: true,
                numberOfEmployed: "Unité non employeuse",
                codeNAF: "",
                activityLabel: (_l = found.objet) !== null && _l !== void 0 ? _l : "Association",
            });
        }
        if (isSiret(queryRaw)) {
            const apiKey = String((_m = process.env.API_SIRET_CLIENT_ID) !== null && _m !== void 0 ? _m : "").trim();
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
            const uniteLegale = (_o = etab.uniteLegale) !== null && _o !== void 0 ? _o : {};
            const adresse = (_p = etab.adresseEtablissement) !== null && _p !== void 0 ? _p : {};
            const periode = (_q = etab.periodesEtablissement) === null || _q === void 0 ? void 0 : _q[0];
            const codeEffectif = etab.trancheEffectifsEtablissement;
            const numberOfEmployed = codeEffectif && codeEffectif !== "NN"
                ? ((_s = (_r = codes.find((c) => c.code === Number(codeEffectif))) === null || _r === void 0 ? void 0 : _r.value) !== null && _s !== void 0 ? _s : "Inconnu")
                : "Unité non employeuse";
            const codeNAF = (_t = uniteLegale.activitePrincipaleUniteLegale) !== null && _t !== void 0 ? _t : "";
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
            const adressLabel = `${(_u = adresse.numeroVoieEtablissement) !== null && _u !== void 0 ? _u : ""} ${(_v = adresse.typeVoieEtablissement) !== null && _v !== void 0 ? _v : ""} ${(_w = adresse.libelleVoieEtablissement) !== null && _w !== void 0 ? _w : ""} ${(_x = adresse.codePostalEtablissement) !== null && _x !== void 0 ? _x : ""} ${(_y = adresse.libelleCommuneEtablissement) !== null && _y !== void 0 ? _y : ""}`.trim();
            const adress = `${(_z = adresse.numeroVoieEtablissement) !== null && _z !== void 0 ? _z : ""} ${(_0 = adresse.typeVoieEtablissement) !== null && _0 !== void 0 ? _0 : ""} ${(_1 = adresse.libelleVoieEtablissement) !== null && _1 !== void 0 ? _1 : ""}`.trim();
            return respondEtab({
                society: denomination,
                currentName: (_3 = (_2 = uniteLegale.denominationUsuelle1UniteLegale) !== null && _2 !== void 0 ? _2 : periode === null || periode === void 0 ? void 0 : periode.enseigne1Etablissement) !== null && _3 !== void 0 ? _3 : null,
                siret: queryRaw,
                adressLabel,
                adress,
                zip: String((_4 = adresse.codePostalEtablissement) !== null && _4 !== void 0 ? _4 : ""),
                city: String((_5 = adresse.libelleCommuneEtablissement) !== null && _5 !== void 0 ? _5 : ""),
                adressComplement: String((_6 = adresse.complementAdresseEtablissement) !== null && _6 !== void 0 ? _6 : ""),
                administratifStateOpen: (periode === null || periode === void 0 ? void 0 : periode.dateFin) === null,
                headquartersSociety: Boolean(etab.etablissementSiege),
                numberOfEmployed,
                codeNAF: String(codeNAF),
                activityLabel: libelleNAF,
            });
        }
        if (isDigitsOnly(queryRaw) && queryRaw.length !== 14) {
            return res.status(400).json({
                message: "SIRET invalide : 14 chiffres requis.",
            });
        }
        if (qNorm.length < 2) {
            return res.status(400).json({ message: "Tape au moins 2 caractères." });
        }
        const matches = ASSOCIATIONS_64.filter((a) => {
            var _a;
            const n = normalizeText(String((_a = a === null || a === void 0 ? void 0 : a.name) !== null && _a !== void 0 ? _a : ""));
            return n.includes(qNorm);
        });
        const exact = matches.find((a) => { var _a; return normalizeText(String((_a = a === null || a === void 0 ? void 0 : a.name) !== null && _a !== void 0 ? _a : "")) === qNorm; });
        if (exact) {
            const address = String((_7 = exact.address) !== null && _7 !== void 0 ? _7 : "").trim();
            const zip = String((_8 = exact.zip) !== null && _8 !== void 0 ? _8 : "").trim();
            const city = String((_9 = exact.city) !== null && _9 !== void 0 ? _9 : "").trim();
            return respondEtab({
                society: (_10 = exact.name) !== null && _10 !== void 0 ? _10 : null,
                currentName: null,
                siret: (_11 = exact.siret) !== null && _11 !== void 0 ? _11 : null,
                adressLabel: `${address} ${zip} ${city}`.trim(),
                adress: address || null,
                zip,
                city,
                adressComplement: "",
                administratifStateOpen: exact.position !== undefined && exact.position !== null
                    ? String(exact.position).trim() === "A"
                    : true,
                headquartersSociety: true,
                numberOfEmployed: "Unité non employeuse",
                codeNAF: "",
                activityLabel: (_12 = exact.objet) !== null && _12 !== void 0 ? _12 : "Association",
            });
        }
        return res.status(409).json({
            message: "Plusieurs associations trouvées. Veuillez sélectionner.",
            suggestions: matches.slice(0, 20).map((a) => {
                var _a, _b, _c, _d, _e, _f;
                return ({
                    rna: (_a = a.rna) !== null && _a !== void 0 ? _a : null,
                    name: (_b = a.name) !== null && _b !== void 0 ? _b : null,
                    zip: (_c = a.zip) !== null && _c !== void 0 ? _c : null,
                    city: (_d = a.city) !== null && _d !== void 0 ? _d : null,
                    address: (_e = a.address) !== null && _e !== void 0 ? _e : null,
                    siret: (_f = a.siret) !== null && _f !== void 0 ? _f : null,
                });
            }),
        });
    }
    catch (error) {
        console.error("fetchSiretEntreprise error:", {
            message: error === null || error === void 0 ? void 0 : error.message,
            status: (_13 = error === null || error === void 0 ? void 0 : error.response) === null || _13 === void 0 ? void 0 : _13.status,
            data: (_14 = error === null || error === void 0 ? void 0 : error.response) === null || _14 === void 0 ? void 0 : _14.data,
            url: (_15 = error === null || error === void 0 ? void 0 : error.config) === null || _15 === void 0 ? void 0 : _15.url,
        });
        return res.status(500).json({
            message: "An error occurred while fetching data.",
            error: {
                message: error === null || error === void 0 ? void 0 : error.message,
                status: (_16 = error === null || error === void 0 ? void 0 : error.response) === null || _16 === void 0 ? void 0 : _16.status,
                url: (_17 = error === null || error === void 0 ? void 0 : error.config) === null || _17 === void 0 ? void 0 : _17.url,
            },
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmV0Y2hpbmdTaXJldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRmV0Y2hpbmdTaXJldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFtRTtBQUNuRSxrREFBMEI7QUFDMUIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBdUM7QUFFdkMsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQU9oQyxNQUFNLGtCQUFrQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDOUUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFFaEYsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFFNUUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLE9BQWUsRUFBaUIsRUFBRTs7SUFDN0QsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLE1BQU0sUUFBUSxHQUFHLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLEdBQUcsMENBQUUsSUFBSSxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7O1FBQ3hELE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxNQUFBLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksbUNBQUksS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksbUNBQUksRUFBRSxDQUFDLENBQUM7UUFDakUsT0FBTyxTQUFTLEtBQUssSUFBSSxDQUFDO0lBQzVCLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQztJQUUzQixPQUFPLENBQ0wsTUFBQSxNQUFBLFFBQVEsQ0FBQywrQ0FBK0MsQ0FBQyxtQ0FDekQsUUFBUSxDQUFDLDRDQUE0QyxDQUFDLG1DQUN0RCxJQUFJLENBQ0wsQ0FBQztBQUNKLENBQUMsQ0FBQztBQU9GLE1BQU0sb0JBQW9CLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FDdkMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUNiLCtCQUErQixDQUNoQyxDQUFDO0FBRUYsSUFBSSxlQUFlLEdBQVUsRUFBRSxDQUFDO0FBQ2hDLElBQUksQ0FBQztJQUNILElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7UUFDeEMsZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQzFCLFlBQUUsQ0FBQyxZQUFZLENBQUMsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLENBQy9DLENBQUM7UUFDRixPQUFPLENBQUMsR0FBRyxDQUFDLCtCQUErQixlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN2RSxDQUFDO1NBQU0sQ0FBQztRQUNOLE9BQU8sQ0FBQyxJQUFJLENBQ1YsNENBQTRDLG9CQUFvQixFQUFFLENBQ25FLENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7SUFDWCxPQUFPLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLENBQUM7QUFFRCxNQUFNLGFBQWEsR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQ2xDLENBQUMsQ0FBQyxhQUFELENBQUMsY0FBRCxDQUFDLEdBQUksRUFBRSxDQUFDO0tBQ04sUUFBUSxFQUFFO0tBQ1YsSUFBSSxFQUFFO0tBQ04sV0FBVyxFQUFFO0tBQ2IsU0FBUyxDQUFDLEtBQUssQ0FBQztLQUNoQixPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFVckMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxLQUFhLEVBQWlCLEVBQUU7SUFDcEQsSUFBSSxDQUFDLEtBQUs7UUFBRSxPQUFPLElBQUksQ0FBQztJQUV4QixNQUFNLE9BQU8sR0FBRyxLQUFLO1NBQ2xCLFdBQVcsRUFBRTtTQUNiLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1NBQ25CLE9BQU8sQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFN0IsSUFBSSxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztRQUFFLE9BQU8sT0FBTyxDQUFDO0lBQzdDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUM7UUFBRSxPQUFPLElBQUksT0FBTyxFQUFFLENBQUM7SUFFbEQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFELENBQUMsY0FBRCxDQUFDLEdBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUN2RSxNQUFNLFlBQVksR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFELENBQUMsY0FBRCxDQUFDLEdBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQWV6RSxNQUFNLENBQUMsSUFBSSxDQUNULHVCQUF1QixFQUN2QixDQUFPLEdBQVksRUFBRSxHQUFhLEVBQUUsS0FBbUIsRUFBRSxFQUFFOztJQUN6RCxJQUFJLENBQUM7UUFDSCxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBQSxNQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksMENBQUUsS0FBSyxtQ0FBSSxNQUFBLEdBQUcsQ0FBQyxJQUFJLDBDQUFFLEtBQUssbUNBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFDcEUsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QyxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7UUFFN0MsTUFBTSxXQUFXLEdBQUcsQ0FBQyxhQUFrQixFQUFFLEVBQUUsQ0FDekMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBTzFDLElBQUksYUFBYSxFQUFFLENBQUM7WUFDbEIsTUFBTSxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FDaEMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFDLE9BQUEsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFBLENBQUMsYUFBRCxDQUFDLHVCQUFELENBQUMsQ0FBRSxHQUFHLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLEtBQUssYUFBYSxDQUFBLEVBQUEsQ0FDNUQsQ0FBQztZQUVGLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDWCxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO29CQUMxQixPQUFPLEVBQUUsb0NBQW9DLGFBQWEsRUFBRTtpQkFDN0QsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFBLEtBQUssQ0FBQyxPQUFPLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25ELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFBLEtBQUssQ0FBQyxHQUFHLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFBLEtBQUssQ0FBQyxJQUFJLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdDLE9BQU8sV0FBVyxDQUFDO2dCQUNqQixPQUFPLEVBQUUsTUFBQSxLQUFLLENBQUMsSUFBSSxtQ0FBSSxJQUFJO2dCQUMzQixXQUFXLEVBQUUsSUFBSTtnQkFDakIsS0FBSyxFQUFFLE1BQUEsS0FBSyxDQUFDLEtBQUssbUNBQUksSUFBSTtnQkFDMUIsR0FBRyxFQUFFLE1BQUEsS0FBSyxDQUFDLEdBQUcsbUNBQUksSUFBSTtnQkFDdEIsV0FBVyxFQUFFLEdBQUcsT0FBTyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0JBQy9DLE1BQU0sRUFBRSxPQUFPLElBQUksSUFBSTtnQkFDdkIsR0FBRztnQkFDSCxJQUFJO2dCQUNKLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLHNCQUFzQixFQUNwQixLQUFLLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLElBQUk7b0JBQ3JELENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEdBQUc7b0JBQ3ZDLENBQUMsQ0FBQyxJQUFJO2dCQUNWLG1CQUFtQixFQUFFLElBQUk7Z0JBQ3pCLGdCQUFnQixFQUFFLHNCQUFzQjtnQkFDeEMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsYUFBYSxFQUFFLE1BQUEsS0FBSyxDQUFDLEtBQUssbUNBQUksYUFBYTthQUM1QyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBT0QsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUN0QixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsTUFBQSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixtQ0FBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztvQkFDMUIsT0FBTyxFQUFFLDRDQUE0QztpQkFDdEQsQ0FBQyxDQUFDO1lBQ0wsQ0FBQztZQUVELElBQUksU0FBYyxDQUFDO1lBQ25CLElBQUksQ0FBQztnQkFDSCxNQUFNLGtCQUFrQixHQUFHLE1BQU0sZUFBSyxDQUFDLEdBQUcsQ0FDeEMsOENBQThDLGtCQUFrQixDQUM5RCxRQUFRLENBQ1QsRUFBRSxFQUNIO29CQUNFLE9BQU8sRUFBRTt3QkFDUCw2QkFBNkIsRUFBRSxNQUFNO3dCQUNyQyxNQUFNLEVBQUUsa0JBQWtCO3FCQUMzQjtvQkFDRCxPQUFPLEVBQUUsS0FBSztpQkFDZixDQUNGLENBQUM7Z0JBQ0YsU0FBUyxHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQztZQUN0QyxDQUFDO1lBQUMsT0FBTyxJQUFJLEVBQUUsQ0FBQztnQkFDZCxnQkFBTSxDQUFDLEtBQUssQ0FBQyxTQUFTLFFBQVEsYUFBYSxDQUFDLENBQUM7Z0JBQzdDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzFCLE9BQU8sRUFBRSxpQ0FBaUMsUUFBUSxFQUFFO2lCQUNyRCxDQUFDLENBQUM7WUFDTCxDQUFDO1lBRUQsTUFBTSxJQUFJLEdBQUcsU0FBUyxhQUFULFNBQVMsdUJBQVQsU0FBUyxDQUFFLGFBQWEsQ0FBQztZQUN0QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxHQUFHO3FCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7cUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLENBQUMsQ0FBQztZQUNyRCxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUc7Z0JBQ1osRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxzQkFBc0IsRUFBRTtnQkFDN0MsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUU7Z0JBQy9CLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLEVBQUU7Z0JBQ3JDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ3BDLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQ3BDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQ3ZDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQ3ZDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQ3ZDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ3pDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ3pDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ3pDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ3pDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7Z0JBQzdDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7Z0JBQzdDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7Z0JBQzdDLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUseUJBQXlCLEVBQUU7YUFDL0MsQ0FBQztZQUVGLE1BQU0sV0FBVyxHQUFHLE1BQUEsSUFBSSxDQUFDLFdBQVcsbUNBQUksRUFBRSxDQUFDO1lBQzNDLE1BQU0sT0FBTyxHQUFHLE1BQUEsSUFBSSxDQUFDLG9CQUFvQixtQ0FBSSxFQUFFLENBQUM7WUFDaEQsTUFBTSxPQUFPLEdBQUcsTUFBQSxJQUFJLENBQUMscUJBQXFCLDBDQUFHLENBQUMsQ0FBQyxDQUFDO1lBRWhELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQztZQUN4RCxNQUFNLGdCQUFnQixHQUNwQixZQUFZLElBQUksWUFBWSxLQUFLLElBQUk7Z0JBQ25DLENBQUMsQ0FBQyxDQUFDLE1BQUEsTUFBQSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQywwQ0FBRSxLQUFLLG1DQUMxRCxTQUFTLENBQUM7Z0JBQ1osQ0FBQyxDQUFDLHNCQUFzQixDQUFDO1lBRTdCLE1BQU0sT0FBTyxHQUFHLE1BQUEsV0FBVyxDQUFDLDZCQUE2QixtQ0FBSSxFQUFFLENBQUM7WUFDaEUsTUFBTSxVQUFVLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7WUFLaEQsTUFBTSxZQUFZLEdBQUcsQ0FBQyxHQUFHLEVBQUU7O2dCQUN6QixNQUFNLEtBQUssR0FBRyxNQUFNLENBQ2xCLE1BQUEsV0FBVyxDQUFDLHVCQUF1QixtQ0FBSSxFQUFFLENBQzFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxLQUFLO29CQUFFLE9BQU8sS0FBSyxDQUFDO2dCQUV4QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQ2hCLE1BQUEsTUFBQSxXQUFXLENBQUMsbUJBQW1CLG1DQUFJLFdBQVcsQ0FBQyxjQUFjLG1DQUFJLEVBQUUsQ0FDcEUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFVCxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQ25CLE1BQUEsTUFBQSxXQUFXLENBQUMsa0JBQWtCLG1DQUM1QixXQUFXLENBQUMsc0JBQXNCLG1DQUNsQyxFQUFFLENBQ0wsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFFVCxNQUFNLFNBQVMsR0FBRyxHQUFHLE1BQU0sSUFBSSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDNUMsT0FBTyxTQUFTLElBQUksSUFBSSxDQUFDO1lBQzNCLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFTCxNQUFNLFdBQVcsR0FBRyxHQUFHLE1BQUEsT0FBTyxDQUFDLHVCQUF1QixtQ0FBSSxFQUFFLElBQzFELE1BQUEsT0FBTyxDQUFDLHFCQUFxQixtQ0FBSSxFQUNuQyxJQUFJLE1BQUEsT0FBTyxDQUFDLHdCQUF3QixtQ0FBSSxFQUFFLElBQ3hDLE1BQUEsT0FBTyxDQUFDLHVCQUF1QixtQ0FBSSxFQUNyQyxJQUFJLE1BQUEsT0FBTyxDQUFDLDJCQUEyQixtQ0FBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUV2RCxNQUFNLE1BQU0sR0FBRyxHQUFHLE1BQUEsT0FBTyxDQUFDLHVCQUF1QixtQ0FBSSxFQUFFLElBQ3JELE1BQUEsT0FBTyxDQUFDLHFCQUFxQixtQ0FBSSxFQUNuQyxJQUFJLE1BQUEsT0FBTyxDQUFDLHdCQUF3QixtQ0FBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUVwRCxPQUFPLFdBQVcsQ0FBQztnQkFDakIsT0FBTyxFQUFFLFlBQVk7Z0JBQ3JCLFdBQVcsRUFDVCxNQUFBLE1BQUEsV0FBVyxDQUFDLCtCQUErQixtQ0FDM0MsT0FBTyxhQUFQLE9BQU8sdUJBQVAsT0FBTyxDQUFFLHNCQUFzQixtQ0FDL0IsSUFBSTtnQkFDTixLQUFLLEVBQUUsUUFBUTtnQkFDZixXQUFXO2dCQUNYLE1BQU07Z0JBQ04sR0FBRyxFQUFFLE1BQU0sQ0FBQyxNQUFBLE9BQU8sQ0FBQyx1QkFBdUIsbUNBQUksRUFBRSxDQUFDO2dCQUNsRCxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQUEsT0FBTyxDQUFDLDJCQUEyQixtQ0FBSSxFQUFFLENBQUM7Z0JBQ3ZELGdCQUFnQixFQUFFLE1BQU0sQ0FDdEIsTUFBQSxPQUFPLENBQUMsOEJBQThCLG1DQUFJLEVBQUUsQ0FDN0M7Z0JBQ0Qsc0JBQXNCLEVBQUUsQ0FBQSxPQUFPLGFBQVAsT0FBTyx1QkFBUCxPQUFPLENBQUUsT0FBTyxNQUFLLElBQUk7Z0JBQ2pELG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUM7Z0JBQ3JELGdCQUFnQjtnQkFDaEIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUM7Z0JBQ3hCLGFBQWEsRUFBRSxVQUFVO2FBQzFCLENBQUMsQ0FBQztRQUNMLENBQUM7UUFPRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ3JELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQzFCLE9BQU8sRUFBRSxzQ0FBc0M7YUFDaEQsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQVNELElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFOztZQUMzQyxNQUFNLENBQUMsR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLElBQUksbUNBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztZQUMvQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsSUFBSSxDQUN4QixDQUFDLENBQUMsRUFBRSxFQUFFLFdBQUMsT0FBQSxhQUFhLENBQUMsTUFBTSxDQUFDLE1BQUEsQ0FBQyxhQUFELENBQUMsdUJBQUQsQ0FBQyxDQUFFLElBQUksbUNBQUksRUFBRSxDQUFDLENBQUMsS0FBSyxLQUFLLENBQUEsRUFBQSxDQUN0RCxDQUFDO1FBRUYsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNWLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFBLEtBQUssQ0FBQyxPQUFPLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25ELE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFBLEtBQUssQ0FBQyxHQUFHLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzNDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFBLEtBQUssQ0FBQyxJQUFJLG1DQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO1lBRTdDLE9BQU8sV0FBVyxDQUFDO2dCQUNqQixPQUFPLEVBQUUsT0FBQSxLQUFLLENBQUMsSUFBSSxxQ0FBSSxJQUFJO2dCQUMzQixXQUFXLEVBQUUsSUFBSTtnQkFDakIsS0FBSyxFQUFFLE9BQUEsS0FBSyxDQUFDLEtBQUsscUNBQUksSUFBSTtnQkFDMUIsV0FBVyxFQUFFLEdBQUcsT0FBTyxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxJQUFJLEVBQUU7Z0JBQy9DLE1BQU0sRUFBRSxPQUFPLElBQUksSUFBSTtnQkFDdkIsR0FBRztnQkFDSCxJQUFJO2dCQUNKLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLHNCQUFzQixFQUNwQixLQUFLLENBQUMsUUFBUSxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsUUFBUSxLQUFLLElBQUk7b0JBQ3JELENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxLQUFLLEdBQUc7b0JBQ3ZDLENBQUMsQ0FBQyxJQUFJO2dCQUNWLG1CQUFtQixFQUFFLElBQUk7Z0JBQ3pCLGdCQUFnQixFQUFFLHNCQUFzQjtnQkFDeEMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsYUFBYSxFQUFFLE9BQUEsS0FBSyxDQUFDLEtBQUsscUNBQUksYUFBYTthQUM1QyxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUseURBQXlEO1lBQ2xFLFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTs7Z0JBQUMsT0FBQSxDQUFDO29CQUM1QyxHQUFHLEVBQUUsTUFBQSxDQUFDLENBQUMsR0FBRyxtQ0FBSSxJQUFJO29CQUNsQixJQUFJLEVBQUUsTUFBQSxDQUFDLENBQUMsSUFBSSxtQ0FBSSxJQUFJO29CQUNwQixHQUFHLEVBQUUsTUFBQSxDQUFDLENBQUMsR0FBRyxtQ0FBSSxJQUFJO29CQUNsQixJQUFJLEVBQUUsTUFBQSxDQUFDLENBQUMsSUFBSSxtQ0FBSSxJQUFJO29CQUNwQixPQUFPLEVBQUUsTUFBQSxDQUFDLENBQUMsT0FBTyxtQ0FBSSxJQUFJO29CQUMxQixLQUFLLEVBQUUsTUFBQSxDQUFDLENBQUMsS0FBSyxtQ0FBSSxJQUFJO2lCQUN2QixDQUFDLENBQUE7YUFBQSxDQUFDO1NBQ0osQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRTtZQUMzQyxPQUFPLEVBQUUsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU87WUFDdkIsTUFBTSxFQUFFLE9BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLFFBQVEsNENBQUUsTUFBTTtZQUMvQixJQUFJLEVBQUUsT0FBQSxLQUFLLGFBQUwsS0FBSyx1QkFBTCxLQUFLLENBQUUsUUFBUSw0Q0FBRSxJQUFJO1lBQzNCLEdBQUcsRUFBRSxPQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxNQUFNLDRDQUFFLEdBQUc7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsd0NBQXdDO1lBQ2pELEtBQUssRUFBRTtnQkFDTCxPQUFPLEVBQUUsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLE9BQU87Z0JBQ3ZCLE1BQU0sRUFBRSxPQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxRQUFRLDRDQUFFLE1BQU07Z0JBQy9CLEdBQUcsRUFBRSxPQUFBLEtBQUssYUFBTCxLQUFLLHVCQUFMLEtBQUssQ0FBRSxNQUFNLDRDQUFFLEdBQUc7YUFDeEI7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQ0YsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyJ9