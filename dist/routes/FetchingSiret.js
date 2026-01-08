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
router.post("/fetchSiretEntreprise", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
    try {
        const { siret } = req.body;
        if (!siret || typeof siret !== "string") {
            return res.status(400).json({ message: "SIRET manquant ou invalide." });
        }
        let inseeData;
        try {
            const entrepriseResponse = yield axios_1.default.get(`https://api.insee.fr/api-sirene/3.11/siret/${siret}`, {
                headers: {
                    "X-INSEE-Api-Key-Integration": String((_a = process.env.API_SIRET_CLIENT_ID) !== null && _a !== void 0 ? _a : ""),
                    Accept: "application/json",
                },
            });
            console.log("entrepriseResponse", entrepriseResponse);
            inseeData = entrepriseResponse.data;
        }
        catch (err) {
            Retour_1.default.error(`Entreprise with SIRET ${siret} not found.`);
            return res
                .status(404)
                .json({ message: `Entreprise with SIRET ${siret} not found.` });
        }
        const etab = inseeData === null || inseeData === void 0 ? void 0 : inseeData.etablissement;
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
        const uniteLegale = (_b = etab.uniteLegale) !== null && _b !== void 0 ? _b : {};
        const adresse = (_c = etab.adresseEtablissement) !== null && _c !== void 0 ? _c : {};
        const periode = (_d = etab.periodesEtablissement) === null || _d === void 0 ? void 0 : _d[0];
        const codeEffectif = etab.trancheEffectifsEtablissement;
        const numberOfEmployed = codeEffectif && codeEffectif !== "NN"
            ? ((_f = (_e = codes.find((c) => c.code === Number(codeEffectif))) === null || _e === void 0 ? void 0 : _e.value) !== null && _f !== void 0 ? _f : "Inconnu")
            : "Unité non employeuse";
        const codeNAF = (_g = uniteLegale.activitePrincipaleUniteLegale) !== null && _g !== void 0 ? _g : "";
        const libelleNAF = getLibelleByCodeNAF(codeNAF);
        return res.status(200).json({
            etablissement: {
                society: (_h = uniteLegale.denominationUniteLegale) !== null && _h !== void 0 ? _h : null,
                currentName: (_k = (_j = uniteLegale.denominationUsuelle1UniteLegale) !== null && _j !== void 0 ? _j : periode === null || periode === void 0 ? void 0 : periode.enseigne1Etablissement) !== null && _k !== void 0 ? _k : null,
                siret,
                adressLabel: `${(_l = adresse.numeroVoieEtablissement) !== null && _l !== void 0 ? _l : ""} ${(_m = adresse.typeVoieEtablissement) !== null && _m !== void 0 ? _m : ""} ${(_o = adresse.libelleVoieEtablissement) !== null && _o !== void 0 ? _o : ""} ${(_p = adresse.codePostalEtablissement) !== null && _p !== void 0 ? _p : ""} ${(_q = adresse.libelleCommuneEtablissement) !== null && _q !== void 0 ? _q : ""}`.trim(),
                adress: `${(_r = adresse.numeroVoieEtablissement) !== null && _r !== void 0 ? _r : ""} ${(_s = adresse.typeVoieEtablissement) !== null && _s !== void 0 ? _s : ""} ${(_t = adresse.libelleVoieEtablissement) !== null && _t !== void 0 ? _t : ""}`.trim(),
                zip: String((_u = adresse.codePostalEtablissement) !== null && _u !== void 0 ? _u : ""),
                city: String((_v = adresse.libelleCommuneEtablissement) !== null && _v !== void 0 ? _v : ""),
                adressComplement: String((_w = adresse.complementAdresseEtablissement) !== null && _w !== void 0 ? _w : ""),
                administratifStateOpen: (periode === null || periode === void 0 ? void 0 : periode.dateFin) === null,
                headquartersSociety: Boolean(etab.etablissementSiege),
                numberOfEmployed,
                codeNAF: String(codeNAF),
                activityLabel: libelleNAF,
            },
        });
    }
    catch (error) {
        console.error("INSEE fetch error:", {
            message: error === null || error === void 0 ? void 0 : error.message,
            status: (_x = error === null || error === void 0 ? void 0 : error.response) === null || _x === void 0 ? void 0 : _x.status,
            data: (_y = error === null || error === void 0 ? void 0 : error.response) === null || _y === void 0 ? void 0 : _y.data,
            url: (_z = error === null || error === void 0 ? void 0 : error.config) === null || _z === void 0 ? void 0 : _z.url,
        });
        return res.status(500).json({
            message: "An error occurred while fetching SIRET data.",
            error: {
                message: error === null || error === void 0 ? void 0 : error.message,
                status: (_0 = error === null || error === void 0 ? void 0 : error.response) === null || _0 === void 0 ? void 0 : _0.status,
                url: (_1 = error === null || error === void 0 ? void 0 : error.config) === null || _1 === void 0 ? void 0 : _1.url,
            },
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRmV0Y2hpbmdTaXJldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRmV0Y2hpbmdTaXJldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBLHNEQUFtRTtBQUNuRSxrREFBMEI7QUFDMUIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBdUM7QUFHdkMsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUdoQyxNQUFNLGtCQUFrQixHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLHFCQUFxQixDQUFDLENBQUM7QUFDOUUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFFaEYsTUFBTSxZQUFZLEdBQUcsQ0FBQyxJQUFZLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFFNUUsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLE9BQWUsRUFBaUIsRUFBRTs7SUFDN0QsTUFBTSxJQUFJLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLE1BQU0sUUFBUSxHQUFHLE1BQUEsY0FBYyxhQUFkLGNBQWMsdUJBQWQsY0FBYyxDQUFFLEdBQUcsMENBQUUsSUFBSSxDQUFDLENBQUMsS0FBVSxFQUFFLEVBQUU7O1FBQ3hELE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxNQUFBLE1BQUEsS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksbUNBQUksS0FBSyxhQUFMLEtBQUssdUJBQUwsS0FBSyxDQUFFLElBQUksbUNBQUksRUFBRSxDQUFDLENBQUM7UUFDakUsT0FBTyxTQUFT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