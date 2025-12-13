// src/controllers/Tools.ts
import { Request, Response } from "express";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -------------------- GENERATION / COMPLETION DU DESCRIPTIF -------------------- */

const generateEventDescriptionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const {
      title,
      partialDescription,
      lang = "fr", // peut être "fr", "en", "es", "de", "it", "eu", etc.
      themes = [],
      startingDate,
      endingDate,
      address,
    } = req.body as {
      title: string;
      partialDescription?: string;
      lang?: string;
      themes?: string[];
      startingDate?: string;
      endingDate?: string;
      address?: string;
    };

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

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const text: string = (response as any).output_text?.trim() || "";

    if (!text) {
      return res.status(500).json({
        message: "Impossible de générer un descriptif pour le moment.",
      });
    }

    return res.json({ description: text });
  } catch (error) {
    console.error("Erreur IA description :", error);
    return res.status(500).json({
      message: "Erreur lors de la génération du descriptif.",
    });
  }
};

/* ------------------------------- TRADUCTION IA ------------------------------- */

const translateController = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      baseLang = "fr",
      targetLangs,
    } = req.body as {
      title?: string;
      description?: string;
      baseLang?: string;
      targetLangs: string[];
    };

    if (!process.env.OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ message: "OPENAI_API_KEY manquant dans le .env" });
    }

    if (
      !targetLangs ||
      !Array.isArray(targetLangs) ||
      targetLangs.length === 0
    ) {
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

- Chaque clé (en, es, de, it, eu, etc.) DOIT exister et correspondre aux codes donnés dans ${JSON.stringify(
      uniqueLangs,
    )}.
- Pas d'autres clés, pas de commentaires.
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    const raw = (response as any).output_text?.trim() || "";

    let parsed: any;
    try {
      // On isole juste la partie JSON (au cas où le modèle serait un peu bavard)
      let jsonText = raw;
      const firstBrace = raw.indexOf("{");
      const lastBrace = raw.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = raw.slice(firstBrace, lastBrace + 1);
      }

      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("Réponse de traduction non JSON :", raw);
      // Fallback : on renvoie juste la langue de base non traduite
      const fallback: Record<string, { title: string; description: string }> =
        {};
      uniqueLangs.forEach((code) => {
        fallback[code] = {
          title: title || "",
          description: description || "",
        };
      });
      return res.status(200).json({
        translations: fallback,
        warning:
          "Impossible de parser le JSON de traduction, fallback sur le texte source.",
      });
    }

    // On s’assure que toutes les langues sont présentes
    const translations: Record<string, { title: string; description: string }> =
      {};

    uniqueLangs.forEach((code) => {
      const entry = parsed[code] || {};
      translations[code] = {
        title: entry.title ?? title ?? "",
        description: entry.description ?? description ?? "",
      };
    });

    return res.json({ translations });
  } catch (error) {
    console.error("Erreur traduction IA :", error);
    return res.status(500).json({
      message: "Erreur lors de la traduction IA.",
    });
  }
};
export default { generateEventDescriptionController, translateController };
