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
const openai_1 = __importDefault(require("openai"));
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const generateEventDescriptionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, partialDescription, lang = "fr", themes = [], startingDate, endingDate, address, } = req.body;
        if (!process.env.OPENAI_API_KEY) {
            return res
                .status(500)
                .json({ message: "OPENAI_API_KEY manquant dans le .env" });
        }
        if (!title) {
            return res.status(400).json({ message: "Le titre est obligatoire." });
        }
        const prompt = `
Tu es le rédacteur officiel de Localappy, l'application dédiée aux événements de proximité.

OBJECTIF :
Générer ou compléter la description d'un événement dans la langue : ${lang}.
Si une description existe déjà, tu dois la conserver et l'améliorer.
Si elle est absente ou très courte, tu en rédiges une complète.

CONTRAINTES :
- 6 à 10 phrases.
- Style : chaleureux, clair, concret (on explique ce qu'il va se passer).
- Ton : positif, accessible au grand public.
- Pas de markdown, pas de titre.
- Terminer par une phrase douce, par exemple : "Nous serons ravis de vous accueillir."

DONNÉES DE L'ÉVÉNEMENT :
- Titre : "${title}"
- Thèmes : ${themes.length ? themes.join(", ") : "non précisés"}
- Adresse : ${address || "non précisée"}
- Date de début : ${startingDate || "non précisée"}
- Date de fin : ${endingDate || "non précisée"}

DESCRIPTION EXISTANTE A ENRICHIR (peut être vide) :
${partialDescription || "Aucune description fournie."}

INSTRUCTION FINALE :
Renvoie UNIQUEMENT la description finale complète, sans guillemets, sans explication supplémentaire.
`.trim();
        const response = yield openai.responses.create({
            model: "gpt-4.1-mini",
            input: prompt,
        });
        const text = ((_a = response.output_text) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        if (!text) {
            return res.status(500).json({
                message: "Impossible de générer un descriptif pour le moment.",
            });
        }
        return res.json({ description: text });
    }
    catch (error) {
        console.error("Erreur IA description :", error);
        return res.status(500).json({
            message: "Erreur lors de la génération du descriptif.",
        });
    }
});
const translateController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { title, description, baseLang = "fr", targetLangs, } = req.body;
        if (!process.env.OPENAI_API_KEY) {
            return res
                .status(500)
                .json({ message: "OPENAI_API_KEY manquant dans le .env" });
        }
        if (!targetLangs ||
            !Array.isArray(targetLangs) ||
            targetLangs.length === 0) {
            return res.status(400).json({ message: "targetLangs est requis." });
        }
        if (!title && !description) {
            return res.status(400).json({
                message: "Renseigner au moins un titre ou une description.",
            });
        }
        const uniqueLangs = Array.from(new Set(targetLangs));
        const prompt = `
Tu es un traducteur professionnel.

TEXTE SOURCE :
- Langue source : ${baseLang}
- Titre : ${title || ""}
- Description : ${description || ""}

TÂCHE :
Traduire ce titre et cette description dans chacune des langues suivantes :
${JSON.stringify(uniqueLangs)}

CONTRAINTES :
- Respecter le sens et le ton.
- Adapter légèrement le style pour que ce soit naturel dans chaque langue cible.
- Ne PAS résumer, ne PAS rallonger inutilement.

FORMAT DE RÉPONSE :
Tu DOIS renvoyer STRICTEMENT un JSON valide, sans texte avant ou après, de la forme :

{
  "en": { "title": "...", "description": "..." },
  "es": { "title": "...", "description": "..." },
  ...
}

- Chaque clé (en, es, de, it, eu, etc.) DOIT exister et correspondre aux codes donnés dans ${JSON.stringify(uniqueLangs)}.
- Pas d'autres clés, pas de commentaires.
`.trim();
        const response = yield openai.responses.create({
            model: "gpt-4.1-mini",
            input: prompt,
        });
        const raw = ((_a = response.output_text) === null || _a === void 0 ? void 0 : _a.trim()) || "";
        let parsed;
        try {
            let jsonText = raw;
            const firstBrace = raw.indexOf("{");
            const lastBrace = raw.lastIndexOf("}");
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                jsonText = raw.slice(firstBrace, lastBrace + 1);
            }
            parsed = JSON.parse(jsonText);
        }
        catch (e) {
            console.error("Réponse de traduction non JSON :", raw);
            const fallback = {};
            uniqueLangs.forEach((code) => {
                fallback[code] = {
                    title: title || "",
                    description: description || "",
                };
            });
            return res.status(200).json({
                translations: fallback,
                warning: "Impossible de parser le JSON de traduction, fallback sur le texte source.",
            });
        }
        const translations = {};
        uniqueLangs.forEach((code) => {
            var _a, _b, _c, _d;
            const entry = parsed[code] || {};
            translations[code] = {
                title: (_b = (_a = entry.title) !== null && _a !== void 0 ? _a : title) !== null && _b !== void 0 ? _b : "",
                description: (_d = (_c = entry.description) !== null && _c !== void 0 ? _c : description) !== null && _d !== void 0 ? _d : "",
            };
        });
        return res.json({ translations });
    }
    catch (error) {
        console.error("Erreur traduction IA :", error);
        return res.status(500).json({
            message: "Erreur lors de la traduction IA.",
        });
    }
});
exports.default = { generateEventDescriptionController, translateController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFFQSxvREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBTSxDQUFDO0lBQ3hCLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7Q0FDbkMsQ0FBQyxDQUFDO0FBSUgsTUFBTSxrQ0FBa0MsR0FBRyxDQUN6QyxHQUFZLEVBQ1osR0FBYSxFQUNiLEVBQUU7O0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUNKLEtBQUssRUFDTCxrQkFBa0IsRUFDbEIsSUFBSSxHQUFHLElBQUksRUFDWCxNQUFNLEdBQUcsRUFBRSxFQUNYLFlBQVksRUFDWixVQUFVLEVBQ1YsT0FBTyxHQUNSLEdBQUcsR0FBRyxDQUFDLElBUVAsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRzs7OztzRUFJbUQsSUFBSTs7Ozs7Ozs7Ozs7O2FBWTdELEtBQUs7YUFDTCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjO2NBQ2pELE9BQU8sSUFBSSxjQUFjO29CQUNuQixZQUFZ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