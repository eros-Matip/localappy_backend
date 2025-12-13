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
- Terminer par une phrase douce, par exemple : "Nous serons ravis de vous accueillir."

DONNÉES DE L'ÉVÉNEMENT :
- Titre : "${title}"
- Thèmes : ${themes.length ? themes.join(", ") : "non précisés"}
- Adresse : ${address || "non précisée"}
- Date de début : ${startingDate || "non précisée"}
- Date de fin : ${endingDate || "non précisée"}

FORMAT :
- Écris un texte fluide, composé de 2 à 4 paragraphes bien séparés.
- Chaque paragraphe doit contenir 2 à 3 phrases.
- Sauts de ligne REQUIS entre les paragraphes.

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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFFQSxvREFBNEI7QUFFNUIsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBTSxDQUFDO0lBQ3hCLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7Q0FDbkMsQ0FBQyxDQUFDO0FBSUgsTUFBTSxrQ0FBa0MsR0FBRyxDQUN6QyxHQUFZLEVBQ1osR0FBYSxFQUNiLEVBQUU7O0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUNKLEtBQUssRUFDTCxrQkFBa0IsRUFDbEIsSUFBSSxHQUFHLElBQUksRUFDWCxNQUFNLEdBQUcsRUFBRSxFQUNYLFlBQVksRUFDWixVQUFVLEVBQ1YsT0FBTyxHQUNSLEdBQUcsR0FBRyxDQUFDLElBUVAsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRzs7OztzRUFJbUQsSUFBSTs7Ozs7Ozs7Ozs7YUFXN0QsS0FBSzthQUNMLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWM7Y0FDakQsT0FBTyxJQUFJLGNBQWM7b0JBQ25CLFlBQVks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