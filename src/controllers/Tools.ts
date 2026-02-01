// src/controllers/Tools.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import OpenAI from "openai";
import Customer from "../models/Customer";

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

/* -------------------------------------------------------------------------- */
/*                                   GEANEATION DE DESCRIPTIF IA PAR THEME                                    */
/* -------------------------------------------------------------------------- */

type ThemeDoc = { theme: string };
type ThemeMap = Record<string, string>;

type Bucket =
  | "culture"
  | "sport"
  | "food"
  | "pro"
  | "market"
  | "nature"
  | "family"
  | "travel"
  | "other";

type Lang = "fr" | "en" | "de" | "es" | "it" | "eu";

/* -------------------------------------------------------------------------- */
/*                              THEME LABELS I18N                             */
/* -------------------------------------------------------------------------- */

const THEMES_LABELS: Record<Lang, ThemeMap> = {
  fr: {
    EntertainmentAndEvent: "Divertissement et événement",
    Market: "Marché",
    PointOfInterest: "Point d'intérêt",
    SaleEvent: "Vente",
    Conference: "Conférence",
    CulturalEvent: "Événement culturel",
    ShowEvent: "Spectacle",
    Concert: "Concert",
    LocalAnimation: "Animation locale",
    SocialEvent: "Événement social",
    TheaterEvent: "Théâtre",
    BricABrac: "Bric-à-brac",
    GarageSale: "Vide-grenier",
    Exhibition: "Exposition",
    SportsCompetition: "Compétition sportive",
    SportsEvent: "Événement sportif",
    FairOrShow: "Foire ou salon",
    Festival: "Festival",
    Rambling: "Randonnée",
    Game: "Jeu",
    Practice: "Pratique",
    Product: "Produit",
    Traineeship: "Stage",
    OpenDay: "Journée portes ouvertes",
    ScreeningEvent: "Projection",
    ArtistSigning: "Dédicace",
    Visit: "Visite",
    Parade: "Parade",
    Rally: "Rallye",
    Commemoration: "Commémoration",
    VisualArtsEvent: "Arts visuels",
    ReligiousEvent: "Événement religieux",
    TraditionalCelebration: "Célébration traditionnelle",
    Carnival: "Carnaval",
    BusinessEvent: "Événement professionnel",
    Congress: "Congrès",
    Seminar: "Séminaire",
    Opera: "Opéra",
    ChildrensEvent: "Événement enfants",
    CircusEvent: "Cirque",
    Recital: "Récital",
    TrainingWorkshop: "Atelier de formation",
    Reading: "Lecture",
    SportsDemonstration: "Démonstration sportive",
    DanceEvent: "Danse",
    PilgrimageAndProcession: "Pèlerinage et procession",
    Harvest: "Récolte",
    IntroductionCourse: "Cours d'initiation",
    PlaceOfInterest: "Lieu d'intérêt",
    SportsAndLeisurePlace: "Sport et loisirs",
    Theater: "Théâtre",
    Cinema: "Cinéma",
    Cinematheque: "Cinémathèque",
    FreePractice: "Pratique libre",
    Course: "Cours",
    Accommodation: "Hébergement",
    RentalAccommodation: "Location de logement",
    ActivityProvider: "Prestataire d'activités",
    WorkMeeting: "Réunion de travail",
    CircusPlace: "Lieu de cirque",
    AntiqueAndSecondhandGoodDealer: "Antiquaire et brocante",
    Store: "Magasin",
    CulturalSite: "Site culturel",
    Competition: "Compétition",
    Tasting: "Dégustation",
    Tour: "Visite guidée",
    WalkingTour: "Promenade",
    NaturalHeritage: "Patrimoine naturel",
    Soiree: "Soirée",
  },
  en: {
    EntertainmentAndEvent: "Entertainment & Events",
    Market: "Market",
    PointOfInterest: "Point of interest",
    SaleEvent: "Sale",
    Conference: "Conference",
    CulturalEvent: "Cultural event",
    ShowEvent: "Show",
    Concert: "Concert",
    LocalAnimation: "Local activities",
    SocialEvent: "Social event",
    TheaterEvent: "Theatre",
    BricABrac: "Flea market",
    GarageSale: "Garage sale",
    Exhibition: "Exhibition",
    SportsCompetition: "Sports competition",
    SportsEvent: "Sports event",
    FairOrShow: "Fair / trade show",
    Festival: "Festival",
    Rambling: "Hiking",
    Game: "Game",
    Practice: "Practice",
    Product: "Product",
    Traineeship: "Internship",
    OpenDay: "Open day",
    ScreeningEvent: "Screening",
    ArtistSigning: "Signing",
    Visit: "Visit",
    Parade: "Parade",
    Rally: "Rally",
    Commemoration: "Commemoration",
    VisualArtsEvent: "Visual arts",
    ReligiousEvent: "Religious event",
    TraditionalCelebration: "Traditional celebration",
    Carnival: "Carnival",
    BusinessEvent: "Business event",
    Congress: "Congress",
    Seminar: "Seminar",
    Opera: "Opera",
    ChildrensEvent: "Kids event",
    CircusEvent: "Circus",
    Recital: "Recital",
    TrainingWorkshop: "Training workshop",
    Reading: "Reading",
    SportsDemonstration: "Sports demo",
    DanceEvent: "Dance event",
    PilgrimageAndProcession: "Pilgrimage / procession",
    Harvest: "Harvest",
    IntroductionCourse: "Intro course",
    PlaceOfInterest: "Place of interest",
    SportsAndLeisurePlace: "Sports & leisure",
    Theater: "Theatre",
    Cinema: "Cinema",
    Cinematheque: "Cinematheque",
    FreePractice: "Free practice",
    Course: "Course",
    Accommodation: "Accommodation",
    RentalAccommodation: "Rental accommodation",
    ActivityProvider: "Activity provider",
    WorkMeeting: "Work meeting",
    CircusPlace: "Circus venue",
    AntiqueAndSecondhandGoodDealer: "Antiques & second-hand",
    Store: "Store",
    CulturalSite: "Cultural site",
    Competition: "Competition",
    Tasting: "Tasting",
    Tour: "Guided tour",
    WalkingTour: "Walking tour",
    NaturalHeritage: "Natural heritage",
    Soiree: "Evening",
  },
  de: {
    EntertainmentAndEvent: "Unterhaltung & Veranstaltung",
    Market: "Markt",
    PointOfInterest: "Sehenswürdigkeit",
    SaleEvent: "Verkaufsveranstaltung",
    Conference: "Konferenz",
    CulturalEvent: "Kulturelles Ereignis",
    ShowEvent: "Show",
    Concert: "Konzert",
    LocalAnimation: "Lokale Animation",
    SocialEvent: "Soziales Ereignis",
    TheaterEvent: "Theater",
    BricABrac: "Flohmarkt",
    GarageSale: "Garagenverkauf",
    Exhibition: "Ausstellung",
    SportsCompetition: "Sportwettbewerb",
    SportsEvent: "Sportveranstaltung",
    FairOrShow: "Messe oder Ausstellung",
    Festival: "Festival",
    Rambling: "Wandern",
    Game: "Spiel",
    Practice: "Praxis",
    Product: "Produkt",
    Traineeship: "Praktikum",
    OpenDay: "Tag der offenen Tür",
    ScreeningEvent: "Vorführung",
    ArtistSigning: "Künstler-Signierstunde",
    Visit: "Besuch",
    Parade: "Parade",
    Rally: "Rallye",
    Commemoration: "Gedenkveranstaltung",
    VisualArtsEvent: "Veranstaltung der bildenden Kunst",
    ReligiousEvent: "Religiöse Veranstaltung",
    TraditionalCelebration: "Traditionelle Feier",
    Carnival: "Karneval",
    BusinessEvent: "Geschäftsveranstaltung",
    Congress: "Kongress",
    Seminar: "Seminar",
    Opera: "Oper",
    ChildrensEvent: "Kinderveranstaltung",
    CircusEvent: "Zirkus",
    Recital: "Rezital",
    TrainingWorkshop: "Training Workshop",
    Reading: "Lesung",
    SportsDemonstration: "Sportdemonstration",
    DanceEvent: "Tanzveranstaltung",
    PilgrimageAndProcession: "Pilgerfahrt & Prozession",
    Harvest: "Ernte",
    IntroductionCourse: "Einführungskurs",
    PlaceOfInterest: "Sehenswürdigkeit",
    SportsAndLeisurePlace: "Sport- & Freizeitanlage",
    Theater: "Theater",
    Cinema: "Kino",
    Cinematheque: "Kinemathek",
    FreePractice: "Freies Training",
    Course: "Kurs",
    Accommodation: "Unterkunft",
    RentalAccommodation: "Mietunterkunft",
    ActivityProvider: "Aktivitätsanbieter",
    WorkMeeting: "Arbeitstreffen",
    CircusPlace: "Zirkusplatz",
    AntiqueAndSecondhandGoodDealer: "Antiquitätenhändler",
    Store: "Geschäft",
    CulturalSite: "Kulturstätte",
    Competition: "Wettbewerb",
    Tasting: "Verkostung",
    Tour: "Geführte Tour",
    WalkingTour: "Spaziergang",
    Cirque: "Zirkus",
    NaturalHeritage: "Naturerbe",
    Soiree: "Abendveranstaltung",
  },
  es: {
    EntertainmentAndEvent: "Entretenimiento y Evento",
    Market: "Mercado",
    PointOfInterest: "Punto de interés",
    SaleEvent: "Evento de venta",
    Conference: "Conferencia",
    CulturalEvent: "Evento cultural",
    ShowEvent: "Espectáculo",
    Concert: "Concierto",
    LocalAnimation: "Animación local",
    SocialEvent: "Evento social",
    TheaterEvent: "Teatro",
    BricABrac: "Mercadillo",
    GarageSale: "Venta de garaje",
    Exhibition: "Exposición",
    SportsCompetition: "Competición deportiva",
    SportsEvent: "Evento deportivo",
    FairOrShow: "Feria o Salón",
    Festival: "Festival",
    Rambling: "Senderismo",
    Game: "Juego",
    Practice: "Práctica",
    Product: "Producto",
    Traineeship: "Pasantía",
    OpenDay: "Jornada de puertas abiertas",
    ScreeningEvent: "Proyección",
    ArtistSigning: "Firma de artista",
    Visit: "Visita",
    Parade: "Desfile",
    Rally: "Rally",
    Commemoration: "Conmemoración",
    VisualArtsEvent: "Evento de artes visuales",
    ReligiousEvent: "Evento religioso",
    TraditionalCelebration: "Celebración tradicional",
    Carnival: "Carnaval",
    BusinessEvent: "Evento empresarial",
    Congress: "Congreso",
    Seminar: "Seminario",
    Opera: "Ópera",
    ChildrensEvent: "Evento infantil",
    CircusEvent: "Circo",
    Recital: "Recital",
    TrainingWorkshop: "Taller de formación",
    Reading: "Lectura",
    SportsDemonstration: "Demostración deportiva",
    DanceEvent: "Evento de danza",
    PilgrimageAndProcession: "Peregrinación y procesión",
    Harvest: "Cosecha",
    IntroductionCourse: "Curso de iniciación",
    PlaceOfInterest: "Lugar de interés",
    SportsAndLeisurePlace: "Lugar de deporte y ocio",
    Theater: "Teatro",
    Cinema: "Cine",
    Cinematheque: "Cinemateca",
    FreePractice: "Práctica libre",
    Course: "Curso",
    Accommodation: "Alojamiento",
    RentalAccommodation: "Alojamiento en alquiler",
    ActivityProvider: "Proveedor de actividad",
    WorkMeeting: "Reunión de trabajo",
    CircusPlace: "Lugar de circo",
    AntiqueAndSecondhandGoodDealer: "Anticuario y segunda mano",
    Store: "Tienda",
    CulturalSite: "Sitio cultural",
    Competition: "Competición",
    Tasting: "Degustación",
    Tour: "Visita guiada",
    WalkingTour: "Paseo",
    Cirque: "Circo",
    NaturalHeritage: "Patrimonio natural",
    Soiree: "Velada",
  },
  it: {
    EntertainmentAndEvent: "Intrattenimento ed Evento",
    Market: "Mercato",
    PointOfInterest: "Punto di interesse",
    SaleEvent: "Evento di vendita",
    Conference: "Conferenza",
    CulturalEvent: "Evento culturale",
    ShowEvent: "Spettacolo",
    Concert: "Concerto",
    LocalAnimation: "Animazione locale",
    SocialEvent: "Evento sociale",
    TheaterEvent: "Teatro",
    BricABrac: "Mercatino",
    GarageSale: "Vendita da garage",
    Exhibition: "Mostra",
    SportsCompetition: "Competizione sportiva",
    SportsEvent: "Evento sportivo",
    FairOrShow: "Fiera o Salone",
    Festival: "Festival",
    Rambling: "Escursionismo",
    Game: "Gioco",
    Practice: "Pratica",
    Product: "Prodotto",
    Traineeship: "Tirocinio",
    OpenDay: "Giornata porte aperte",
    ScreeningEvent: "Proiezione",
    ArtistSigning: "Firma d'autore",
    Visit: "Visita",
    Parade: "Parata",
    Rally: "Raduno",
    Commemoration: "Commemorazione",
    VisualArtsEvent: "Evento arti visive",
    ReligiousEvent: "Evento religioso",
    TraditionalCelebration: "Celebrazione tradizionale",
    Carnival: "Carnevale",
    BusinessEvent: "Evento aziendale",
    Congress: "Congresso",
    Seminar: "Seminario",
    Opera: "Opera",
    ChildrensEvent: "Evento per bambini",
    CircusEvent: "Circo",
    Recital: "Recital",
    TrainingWorkshop: "Laboratorio di formazione",
    Reading: "Lettura",
    SportsDemonstration: "Dimostrazione sportiva",
    DanceEvent: "Evento di danza",
    PilgrimageAndProcession: "Pellegrinaggio e processione",
    Harvest: "Raccolto",
    IntroductionCourse: "Corso introduttivo",
    PlaceOfInterest: "Luogo di interesse",
    SportsAndLeisurePlace: "Luogo sportivo e ricreativo",
    Theater: "Teatro",
    Cinema: "Cinema",
    Cinematheque: "Cineteca",
    FreePractice: "Pratica libera",
    Course: "Corso",
    Accommodation: "Alloggio",
    RentalAccommodation: "Alloggio in affitto",
    ActivityProvider: "Fornitore di attività",
    WorkMeeting: "Riunione di lavoro",
    CircusPlace: "Luogo circense",
    AntiqueAndSecondhandGoodDealer: "Antiquario",
    Store: "Negozio",
    CulturalSite: "Sito culturale",
    Competition: "Competizione",
    Tasting: "Degustazione",
    Tour: "Visita guidata",
    WalkingTour: "Passeggiata",
    Cirque: "Circo",
    NaturalHeritage: "Patrimonio naturale",
    Soiree: "Serata",
  },
  eu: {
    EntertainmentAndEvent: "Aisialdia eta Ekitaldia",
    Market: "Merkatua",
    PointOfInterest: "Interesgunea",
    SaleEvent: "Salmenta ekitaldia",
    Conference: "Hitzaldia",
    CulturalEvent: "Kultura ekitaldia",
    ShowEvent: "Ikuskizuna",
    Concert: "Kontzertua",
    LocalAnimation: "Animazio lokala",
    SocialEvent: "Gizarte ekitaldia",
    TheaterEvent: "Antzerkia",
    BricABrac: "Merkatu txikia",
    GarageSale: "Garaje salmenta",
    Exhibition: "Erakusketa",
    SportsCompetition: "Kirol lehiaketa",
    SportsEvent: "Kirol ekitaldia",
    FairOrShow: "Azoka edo Aretoa",
    Festival: "Jaialdia",
    Rambling: "Ibilaldia",
    Game: "Jokoa",
    Practice: "Praktika",
    Product: "Produktua",
    Traineeship: "Praktikaldia",
    OpenDay: "Ate irekiak",
    ScreeningEvent: "Proiekzioa",
    ArtistSigning: "Sinadura saioa",
    Visit: "Bisita",
    Parade: "Desfilea",
    Rally: "Rallia",
    Commemoration: "Oroitzapena",
    VisualArtsEvent: "Arte bisualen ekitaldia",
    ReligiousEvent: "Erlijio ekitaldia",
    TraditionalCelebration: "Ohitura ospakizuna",
    Carnival: "Inauteriak",
    BusinessEvent: "Enpresa ekitaldia",
    Congress: "Kongresua",
    Seminar: "Mintegia",
    Opera: "Opera",
    ChildrensEvent: "Haurrentzako ekitaldia",
    CircusEvent: "Zirkoa",
    Recital: "Errezitaldia",
    TrainingWorkshop: "Prestakuntza tailerra",
    Reading: "Irakurketa",
    SportsDemonstration: "Kirol erakustaldia",
    DanceEvent: "Dantza ekitaldia",
    PilgrimageAndProcession: "Erromesaldia eta prozesioa",
    Harvest: "Uzta",
    IntroductionCourse: "Sarrera ikastaroa",
    PlaceOfInterest: "Interesgunea",
    SportsAndLeisurePlace: "Kirol eta aisialdi gunea",
    Theater: "Antzerkia",
    Cinema: "Zinema",
    Cinematheque: "Zinemateka",
    FreePractice: "Praktika librea",
    Course: "Ikastaroa",
    Accommodation: "Ostatua",
    RentalAccommodation: "Alokairuko ostatua",
    ActivityProvider: "Jarduera hornitzailea",
    WorkMeeting: "Lan bilera",
    CircusPlace: "Zirku gunea",
    AntiqueAndSecondhandGoodDealer: "Antzinako objektu saltzailea",
    Store: "Denda",
    CulturalSite: "Kultura gunea",
    Competition: "Lehiaketa",
    Tasting: "Dastaketa",
    Tour: "Gidatutako bisita",
    WalkingTour: "Ibilaldia",
    Cirque: "Zirkoa",
    NaturalHeritage: "Ondare naturala",
    Soiree: "Gau-ekitaldia",
  },
};

/* -------------------------------------------------------------------------- */
/*                             BUCKETS PAR THÈME                              */
/* -------------------------------------------------------------------------- */

const BUCKET_BY_THEME: Record<string, Bucket> = {
  Cinema: "culture",
  Theater: "culture",
  TheaterEvent: "culture",
  Concert: "culture",
  Festival: "culture",
  Exhibition: "culture",
  VisualArtsEvent: "culture",
  Opera: "culture",
  Recital: "culture",
  Reading: "culture",
  ScreeningEvent: "culture",
  CulturalEvent: "culture",
  ShowEvent: "culture",
  Cinematheque: "culture",
  CulturalSite: "culture",

  SportsEvent: "sport",
  SportsCompetition: "sport",
  Competition: "sport",
  SportsDemonstration: "sport",
  SportsAndLeisurePlace: "sport",
  Rambling: "nature",
  NaturalHeritage: "nature",

  Tasting: "food",

  WorkMeeting: "pro",
  BusinessEvent: "pro",
  Conference: "pro",
  Seminar: "pro",
  Congress: "pro",
  TrainingWorkshop: "pro",
  IntroductionCourse: "pro",
  Course: "pro",
  Traineeship: "pro",

  Market: "market",
  SaleEvent: "market",
  Store: "market",
  Product: "market",
  BricABrac: "market",
  GarageSale: "market",
  AntiqueAndSecondhandGoodDealer: "market",

  ChildrensEvent: "family",

  Accommodation: "travel",
  RentalAccommodation: "travel",
  Tour: "travel",
  Visit: "travel",
  WalkingTour: "travel",
  PlaceOfInterest: "travel",
  PointOfInterest: "travel",

  Soiree: "other",
  SocialEvent: "other",
  LocalAnimation: "other",
  TraditionalCelebration: "other",
  Carnival: "other",
};

/* -------------------------------------------------------------------------- */
/*                              PHRASES / TEMPLATES I18N                      */
/* -------------------------------------------------------------------------- */

const BUCKET_PHRASES_I18N: Record<Lang, Record<Bucket, string[]>> = {
  /* ------------------------------------------------------------------ */
  /* 🇫🇷 FRANCAIS                                                        */
  /* ------------------------------------------------------------------ */
  fr: {
    culture: [
      "les sorties culturelles",
      "le cinéma, les spectacles et les expos",
      "la culture locale et les événements artistiques",
    ],
    sport: [
      "le sport et les événements sportifs",
      "les défis et compétitions",
      "les activités sport & loisirs",
    ],
    food: [
      "les dégustations et bons plans gourmands",
      "les expériences autour du goût",
      "les découvertes gourmandes",
    ],
    pro: [
      "les rencontres et événements pro",
      "le networking et les ateliers",
      "les échanges pros et les conférences",
    ],
    market: [
      "les marchés, ventes et bons plans",
      "les trouvailles et événements shopping",
      "les brocantes et bonnes affaires",
    ],
    nature: [
      "les balades et sorties nature",
      "les randos et le grand air",
      "le patrimoine naturel",
    ],
    family: [
      "les sorties en famille",
      "les événements pour enfants",
      "les activités à faire avec les petits",
    ],
    travel: [
      "les visites et lieux à découvrir",
      "les escapades et visites guidées",
      "les idées de sorties",
    ],
    other: [
      "les bons plans locaux",
      "les événements locaux",
      "les sorties et animations du coin",
    ],
  },
  /* ------------------------------------------------------------------ */
  /* 🇩🇪 ANGLAIS                                                        */
  /* ------------------------------------------------------------------ */
  en: {
    culture: [
      "cultural outings",
      "cinema, shows and exhibitions",
      "local culture and art events",
    ],
    sport: [
      "sports and sports events",
      "challenges and competitions",
      "sport & leisure activities",
    ],
    food: [
      "tastings and foodie spots",
      "flavour experiences",
      "food discoveries",
    ],
    pro: [
      "meetups and business events",
      "networking and workshops",
      "talks and conferences",
    ],
    market: [
      "markets, sales and good deals",
      "shopping events and finds",
      "flea markets and bargains",
    ],
    nature: [
      "walks and nature outings",
      "hikes and fresh air",
      "natural heritage",
    ],
    family: ["family outings", "kids events", "things to do with children"],
    travel: [
      "places to visit",
      "getaways and guided tours",
      "local spots to discover",
    ],
    other: ["local tips", "events near me", "things happening around town"],
  },
  /* ------------------------------------------------------------------ */
  /* 🇩🇪 ALLEMAND                                                        */
  /* ------------------------------------------------------------------ */
  de: {
    culture: [
      "kulturelle Veranstaltungen",
      "Kino, Shows und Ausstellungen",
      "lokale Kultur- und Kunstevents",
    ],
    sport: [
      "Sport und Sportveranstaltungen",
      "Wettkämpfe und sportliche Herausforderungen",
      "Sport- und Freizeitaktivitäten",
    ],
    food: [
      "Verkostungen und kulinarische Entdeckungen",
      "Genusserlebnisse",
      "kulinarische Highlights",
    ],
    pro: [
      "berufliche Treffen und Events",
      "Networking und Workshops",
      "Konferenzen und Fachveranstaltungen",
    ],
    market: [
      "Märkte, Verkäufe und gute Angebote",
      "Shopping-Events und Entdeckungen",
      "Flohmärkte und Schnäppchen",
    ],
    nature: [
      "Spaziergänge und Naturerlebnisse",
      "Wanderungen und frische Luft",
      "natürliches Kulturerbe",
    ],
    family: [
      "Aktivitäten für die ganze Familie",
      "Veranstaltungen für Kinder",
      "gemeinsame Familienerlebnisse",
    ],
    travel: [
      "Sehenswürdigkeiten und Besichtigungen",
      "Ausflüge und geführte Touren",
      "Orte zum Entdecken",
    ],
    other: [
      "lokale Highlights",
      "Veranstaltungen in meiner Nähe",
      "Aktivitäten in der Umgebung",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 🇪🇸 ESPAGNOL                                                        */
  /* ------------------------------------------------------------------ */
  es: {
    culture: [
      "salidas culturales",
      "cine, espectáculos y exposiciones",
      "eventos culturales y artísticos",
    ],
    sport: [
      "deporte y eventos deportivos",
      "competiciones y retos deportivos",
      "actividades deportivas y de ocio",
    ],
    food: [
      "degustaciones y experiencias gastronómicas",
      "descubrimientos culinarios",
      "buenos planes gastronómicos",
    ],
    pro: [
      "encuentros y eventos profesionales",
      "networking y talleres",
      "conferencias y seminarios",
    ],
    market: [
      "mercados, ventas y buenas ofertas",
      "eventos de compras y hallazgos",
      "mercadillos y gangas",
    ],
    nature: [
      "paseos y salidas a la naturaleza",
      "senderismo y aire libre",
      "patrimonio natural",
    ],
    family: [
      "actividades en familia",
      "eventos para niños",
      "planes para toda la familia",
    ],
    travel: [
      "lugares para visitar",
      "escapadas y visitas guiadas",
      "puntos de interés",
    ],
    other: ["planes locales", "eventos cerca de mí", "animación local"],
  },

  /* ------------------------------------------------------------------ */
  /* 🇮🇹 ITALIEN                                                         */
  /* ------------------------------------------------------------------ */
  it: {
    culture: [
      "eventi culturali",
      "cinema, spettacoli e mostre",
      "cultura locale ed eventi artistici",
    ],
    sport: [
      "sport ed eventi sportivi",
      "competizioni e sfide sportive",
      "attività sportive e ricreative",
    ],
    food: [
      "degustazioni ed esperienze gastronomiche",
      "scoperte culinarie",
      "buoni indirizzi gastronomici",
    ],
    pro: [
      "incontri ed eventi professionali",
      "networking e workshop",
      "conferenze e seminari",
    ],
    market: [
      "mercati, vendite e buone occasioni",
      "eventi di shopping e scoperte",
      "mercatini e affari",
    ],
    nature: [
      "passeggiate e natura",
      "escursioni e aria aperta",
      "patrimonio naturale",
    ],
    family: [
      "attività per famiglie",
      "eventi per bambini",
      "esperienze per tutta la famiglia",
    ],
    travel: [
      "luoghi da visitare",
      "gite e visite guidate",
      "punti di interesse",
    ],
    other: [
      "iniziative locali",
      "eventi vicino a me",
      "animazioni del territorio",
    ],
  },

  /* ------------------------------------------------------------------ */
  /* 🇪🇺 EUSKARA                                                         */
  /* ------------------------------------------------------------------ */
  eu: {
    culture: [
      "kultura ekitaldiak",
      "zinema, ikuskizunak eta erakusketak",
      "tokiko kultura eta arte ekitaldiak",
    ],
    sport: [
      "kirola eta kirol ekitaldiak",
      "lehiaketak eta erronkak",
      "kirol eta aisialdi jarduerak",
    ],
    food: [
      "dastaketak eta gastronomia esperientziak",
      "aurkikuntza gastronomikoak",
      "janari plan onak",
    ],
    pro: [
      "topaketa profesionalak eta ekitaldiak",
      "networking-a eta tailerrak",
      "hitzaldiak eta mintegiak",
    ],
    market: [
      "merkatuak, salmentak eta eskaintza onak",
      "erosketa ekitaldiak eta aurkikuntzak",
      "merkatu txikiak eta aukerak",
    ],
    nature: [
      "ibilaldiak eta natura",
      "mendi irteerak eta aire librea",
      "ondare naturala",
    ],
    family: [
      "familian egiteko jarduerak",
      "haurrentzako ekitaldiak",
      "familia osoarentzako planak",
    ],
    travel: [
      "bisitatzeko lekuak",
      "irteerak eta bisita gidatuak",
      "interesguneak",
    ],
    other: ["tokiko planak", "inguruko ekitaldiak", "herriko animazioa"],
  },
};

const TEMPLATES_I18N: Record<Lang, ((items: string[]) => string)[]> = {
  fr: [
    (items) => `J’aime ${joinNice(items, "fr")}.`,
    (items) => `Toujours partant pour ${joinNice(items, "fr")}.`,
    (items) => `Curieux et actif : ${joinNice(items, "fr")}.`,
    (items) => `Mon programme idéal : ${joinNice(items, "fr")}.`,
    (items) => `Ici pour découvrir ${joinNice(items, "fr")}.`,
    (items) => `Team “bons plans” : ${joinNice(items, "fr")}.`,
  ],
  en: [
    (items) => `I enjoy ${joinNice(items, "en")}.`,
    (items) => `Always up for ${joinNice(items, "en")}.`,
    (items) => `Curious and active: ${joinNice(items, "en")}.`,
    (items) => `My ideal plan: ${joinNice(items, "en")}.`,
    (items) => `Here to discover ${joinNice(items, "en")}.`,
    (items) => `Team “good deals”: ${joinNice(items, "en")}.`,
  ] /* 🇩🇪 */,
  de: [
    (items) => `Ich interessiere mich für ${joinNice(items, "de")}.`,
    (items) => `Immer bereit für ${joinNice(items, "de")}.`,
    (items) => `Neugierig und aktiv: ${joinNice(items, "de")}.`,
    (items) => `Mein ideales Programm: ${joinNice(items, "de")}.`,
    (items) => `Hier, um ${joinNice(items, "de")} zu entdecken.`,
    (items) => `Team „lokale Tipps“: ${joinNice(items, "de")}.`,
  ],

  /* 🇪🇸 */
  es: [
    (items) => `Me gusta ${joinNice(items, "es")}.`,
    (items) => `Siempre dispuesto a ${joinNice(items, "es")}.`,
    (items) => `Curioso y activo: ${joinNice(items, "es")}.`,
    (items) => `Mi plan ideal: ${joinNice(items, "es")}.`,
    (items) => `Aquí para descubrir ${joinNice(items, "es")}.`,
    (items) => `Equipo “buenos planes”: ${joinNice(items, "es")}.`,
  ],

  /* 🇮🇹 */
  it: [
    (items) => `Mi piace ${joinNice(items, "it")}.`,
    (items) => `Sempre pronto per ${joinNice(items, "it")}.`,
    (items) => `Curioso e attivo: ${joinNice(items, "it")}.`,
    (items) => `Il mio programma ideale: ${joinNice(items, "it")}.`,
    (items) => `Qui per scoprire ${joinNice(items, "it")}.`,
    (items) => `Team “buoni consigli”: ${joinNice(items, "it")}.`,
  ],

  /* 🇪🇺 */
  eu: [
    (items) => `${joinNice(items, "eu")} gustuko ditut.`,
    (items) => `${joinNice(items, "eu")} ezagutzeko prest.`,
    (items) => `Jakin-mina eta jarduera: ${joinNice(items, "eu")}.`,
    (items) => `Nire plan aproposa: ${joinNice(items, "eu")}.`,
    (items) => `${joinNice(items, "eu")} aurkitzeko hemen.`,
    (items) => `Tokiko plan onak: ${joinNice(items, "eu")}.`,
  ],
};

/* -------------------------------------------------------------------------- */
/*                              CORE GENERATION                               */
/* -------------------------------------------------------------------------- */

function buildCustomerDescriptifUnique(
  customerId: string,
  themes: ThemeDoc[],
  lang: Lang,
  maxTags = 6,
  maxPhraseItems = 3,
) {
  const themeMap = THEMES_LABELS[lang] ?? THEMES_LABELS.fr;
  const phrases = BUCKET_PHRASES_I18N[lang] ?? BUCKET_PHRASES_I18N.fr;
  const templates = TEMPLATES_I18N[lang] ?? TEMPLATES_I18N.fr;

  const keys = Array.from(new Set(themes.map((t) => t.theme))).filter(Boolean);

  const labels = keys.map((k) => themeMap[k] ?? k);
  const tags = labels.slice(0, maxTags).join(", ");

  const buckets = keys.map((k) => BUCKET_BY_THEME[k] ?? "other");
  const ranked = rankBuckets(buckets);

  const rng = seededRng(customerId);

  const phraseItems = ranked
    .slice(0, Math.min(maxPhraseItems, ranked.length))
    .map((b) => pick(rng, phrases[b]));

  const template = pick(rng, templates);
  const bio = template(phraseItems);

  return { tags, bio };
}

/* -------------------------------------------------------------------------- */
/*                                CONTROLLER                                  */
/* -------------------------------------------------------------------------- */

const generateCustomerDescriptifFromThemesController = async (
  req: Request,
  res: Response,
) => {
  try {
    const customerId = req.body.admin._id;
    console.log("customerId", customerId);

    if (!customerId || !mongoose.isValidObjectId(customerId)) {
      return res.status(401).json({ message: "Utilisateur non authentifié." });
    }

    const {
      force = false,
      save = true,
      maxTags = 6,
      maxPhraseItems = 3,
      // optionnel: forcer une langue depuis le front
      lang,
    } = req.body ?? {};

    const customer = await Customer.findById(customerId).populate({
      path: "themesFavorites",
      model: "Theme",
      select: "theme",
    });

    if (!customer)
      return res.status(404).json({ message: "Customer introuvable." });

    const themes: ThemeDoc[] = ((customer.themesFavorites ?? []) as any[])
      .map((t) =>
        t && typeof t === "object" && typeof t.theme === "string"
          ? { theme: t.theme }
          : null,
      )
      .filter(Boolean) as ThemeDoc[];

    // ✅ Lang: priorité body.lang -> customer.language -> Accept-Language -> fr
    const detected = detectLangFromHeader(req.headers["accept-language"]);
    const customerLang = (customer as any).language as Lang | undefined;

    const isSupportedLang = (x: any): x is Lang =>
      typeof x === "string" && ["fr", "en", "de", "es", "it", "eu"].includes(x);

    const finalLang: Lang = isSupportedLang(lang)
      ? lang
      : isSupportedLang(customerLang)
        ? customerLang
        : detected;

    const { tags, bio } = buildCustomerDescriptifUnique(
      String(customer._id),
      themes,
      finalLang,
      clampInt(maxTags, 1, 12),
      clampInt(maxPhraseItems, 1, 4),
    );

    const alreadyHasDescriptif = Boolean(
      ((customer as any).descriptif || "").trim(),
    );

    const shouldWrite = force || !alreadyHasDescriptif;

    // ✅ choix de stockage: tags dans descriptif
    if (save && shouldWrite) {
      (customer as any).descriptif = bio;
      // Optionnel si tu veux stocker la bio:
      // (customer as any).generatedBio = bio;
      // Optionnel si tu veux stocker la langue:
      // (customer as any).language = finalLang;

      await customer.save();
    }

    return res.status(200).json({
      message: save
        ? shouldWrite
          ? "Descriptif généré et sauvegardé."
          : "Descriptif existant conservé."
        : "Descriptif généré (non sauvegardé).",
      lang: finalLang,
      tags,
      bio,
      saved: Boolean(save && shouldWrite),
      themesCount: themes.length,
    });
  } catch (error) {
    console.error("Erreur génération descriptif customer :", error);
    return res
      .status(500)
      .json({ message: "Erreur lors de la génération du descriptif." });
  }
};

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

function detectLangFromHeader(header: unknown): Lang {
  const h = typeof header === "string" ? header.toLowerCase() : "";

  // priorité aux langues que tu supportes
  if (h.includes("eu")) return "eu";
  if (h.includes("de")) return "de";
  if (h.includes("es")) return "es";
  if (h.includes("it")) return "it";
  if (h.includes("en")) return "en";
  return "fr";
}

function rankBuckets(buckets: Bucket[]) {
  const count = new Map<Bucket, number>();
  for (const b of buckets) count.set(b, (count.get(b) ?? 0) + 1);
  return Array.from(count.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([bucket]) => bucket);
}

function joinNice(items: string[], lang: Lang) {
  if (items.length === 0)
    return lang === "en" ? "new local tips" : "de nouveaux bons plans";
  if (items.length === 1) return items[0];
  if (items.length === 2)
    return lang === "en"
      ? `${items[0]} and ${items[1]}`
      : `${items[0]} et ${items[1]}`;
  const last = items[items.length - 1];
  const start = items.slice(0, -1).join(", ");
  return lang === "en" ? `${start}, and ${last}` : `${start} et ${last}`;
}

function seededRng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function clampInt(value: any, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

/* -------------------------------------------------------------------------- */
/*                                   EXPORT                                   */
/* -------------------------------------------------------------------------- */

export default {
  generateEventDescriptionController,
  translateController,
  generateCustomerDescriptifFromThemesController,
};
