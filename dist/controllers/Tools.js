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
const mongoose_1 = __importDefault(require("mongoose"));
const openai_1 = __importDefault(require("openai"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
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
const THEMES_LABELS = {
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
const BUCKET_BY_THEME = {
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
const BUCKET_PHRASES_I18N = {
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
const ORG_BUCKET_PHRASES_I18N = {
    fr: {
        culture: [
            "des sorties culturelles et des rendez-vous artistiques",
            "des spectacles, concerts et expositions",
            "la culture locale et les animations artistiques",
        ],
        sport: [
            "des activités sportives et des événements",
            "des défis, compétitions et moments sport & loisirs",
            "le sport accessible et fédérateur",
        ],
        food: [
            "des dégustations et expériences gourmandes",
            "des découvertes culinaires et bons plans food",
            "des moments conviviaux autour du goût",
        ],
        pro: [
            "des rencontres professionnelles et du networking",
            "des ateliers, conférences et échanges pro",
            "des événements pour créer du lien et des opportunités",
        ],
        market: [
            "des marchés, ventes et bonnes affaires",
            "des trouvailles locales et événements shopping",
            "des brocantes et temps forts commerçants",
        ],
        nature: [
            "des balades, randonnées et sorties nature",
            "la découverte du patrimoine naturel",
            "des activités au grand air",
        ],
        family: [
            "des sorties à faire en famille",
            "des événements pensés pour les enfants",
            "des activités intergénérationnelles",
        ],
        travel: [
            "des visites et lieux à découvrir",
            "des escapades et visites guidées",
            "des idées de découverte du territoire",
        ],
        other: [
            "des événements et animations locales",
            "des bons plans et moments conviviaux",
            "des initiatives proches de chez vous",
        ],
    },
    en: {},
    de: {},
    es: {},
    it: {},
    eu: {},
};
const ORG_LONG_TEMPLATES_FR = {
    intro: [
        (name, city) => `${name} est un lieu chaleureux et vivant${city ? ` situé à ${city}` : ""}, pensé comme un espace de rencontre, de partage et de découverte.`,
        (name, city) => `${name} s’impose comme un lieu de vie incontournable${city ? ` à ${city}` : ""}, mêlant convivialité, dynamisme et identité locale.`,
    ],
    activity: [
        (items) => `On y propose ${joinNice(items, "fr")}, avec une programmation régulière qui valorise les initiatives locales et les temps forts du territoire.`,
        (items) => `L’établissement accueille ${joinNice(items, "fr")}, offrant ainsi une expérience riche et variée tout au long de l’année.`,
    ],
    vibe: [
        () => `Accessible et inspirant, le lieu s’adresse aussi bien aux habitués qu’aux curieux en quête de nouvelles expériences.`,
        () => `Pensé pour rassembler, l’espace favorise les échanges, la découverte et les moments partagés.`,
    ],
};
const TEMPLATES_I18N = {
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
    ],
    de: [
        (items) => `Ich interessiere mich für ${joinNice(items, "de")}.`,
        (items) => `Immer bereit für ${joinNice(items, "de")}.`,
        (items) => `Neugierig und aktiv: ${joinNice(items, "de")}.`,
        (items) => `Mein ideales Programm: ${joinNice(items, "de")}.`,
        (items) => `Hier, um ${joinNice(items, "de")} zu entdecken.`,
        (items) => `Team „lokale Tipps“: ${joinNice(items, "de")}.`,
    ],
    es: [
        (items) => `Me gusta ${joinNice(items, "es")}.`,
        (items) => `Siempre dispuesto a ${joinNice(items, "es")}.`,
        (items) => `Curioso y activo: ${joinNice(items, "es")}.`,
        (items) => `Mi plan ideal: ${joinNice(items, "es")}.`,
        (items) => `Aquí para descubrir ${joinNice(items, "es")}.`,
        (items) => `Equipo “buenos planes”: ${joinNice(items, "es")}.`,
    ],
    it: [
        (items) => `Mi piace ${joinNice(items, "it")}.`,
        (items) => `Sempre pronto per ${joinNice(items, "it")}.`,
        (items) => `Curioso e attivo: ${joinNice(items, "it")}.`,
        (items) => `Il mio programma ideale: ${joinNice(items, "it")}.`,
        (items) => `Qui per scoprire ${joinNice(items, "it")}.`,
        (items) => `Team “buoni consigli”: ${joinNice(items, "it")}.`,
    ],
    eu: [
        (items) => `${joinNice(items, "eu")} gustuko ditut.`,
        (items) => `${joinNice(items, "eu")} ezagutzeko prest.`,
        (items) => `Jakin-mina eta jarduera: ${joinNice(items, "eu")}.`,
        (items) => `Nire plan aproposa: ${joinNice(items, "eu")}.`,
        (items) => `${joinNice(items, "eu")} aurkitzeko hemen.`,
        (items) => `Tokiko plan onak: ${joinNice(items, "eu")}.`,
    ],
};
const ORG_TEMPLATES_I18N = {
    fr: [
        (items, name) => `${name ? `${name}, ` : ""}c’est ${joinNice(items, "fr")}.`,
        (items, name) => `${name ? `${name} ` : "Ici,"} on vous propose ${joinNice(items, "fr")}.`,
        (items) => `Au programme : ${joinNice(items, "fr")}.`,
        (items) => `On met en avant ${joinNice(items, "fr")}.`,
        (items) => `Des idées, du lien, et ${joinNice(items, "fr")}.`,
    ],
    en: [
        (items, name) => `${name ? `${name} is` : "We are"} all about ${joinNice(items, "en")}.`,
        (items) => `What’s on: ${joinNice(items, "en")}.`,
        (items) => `We highlight ${joinNice(items, "en")}.`,
        (items) => `Good vibes and ${joinNice(items, "en")}.`,
    ],
    de: [
        (items, name) => `${name ? `${name} steht für` : "Wir stehen für"} ${joinNice(items, "de")}.`,
        (items) => `Im Fokus: ${joinNice(items, "de")}.`,
        (items) => `Programm: ${joinNice(items, "de")}.`,
    ],
    es: [
        (items, name) => `${name ? `${name} es` : "Somos"} ${joinNice(items, "es")}.`,
        (items) => `En el programa: ${joinNice(items, "es")}.`,
        (items) => `Ponemos en valor ${joinNice(items, "es")}.`,
    ],
    it: [
        (items, name) => `${name ? `${name} è` : "Siamo"} ${joinNice(items, "it")}.`,
        (items) => `In programma: ${joinNice(items, "it")}.`,
        (items) => `Mettiamo in evidenza ${joinNice(items, "it")}.`,
    ],
    eu: [
        (items, name) => `${name ? `${name}: ` : ""}${joinNice(items, "eu")} gure ardatza da.`,
        (items) => `Gaurko plana: ${joinNice(items, "eu")}.`,
        (items) => `Tokiko giroa eta ${joinNice(items, "eu")}.`,
    ],
};
function buildCustomerDescriptifUnique(customerId, themes, lang, maxTags = 6, maxPhraseItems = 3) {
    var _a, _b, _c;
    const themeMap = (_a = THEMES_LABELS[lang]) !== null && _a !== void 0 ? _a : THEMES_LABELS.fr;
    const phrases = (_b = BUCKET_PHRASES_I18N[lang]) !== null && _b !== void 0 ? _b : BUCKET_PHRASES_I18N.fr;
    const templates = (_c = TEMPLATES_I18N[lang]) !== null && _c !== void 0 ? _c : TEMPLATES_I18N.fr;
    const keys = Array.from(new Set(themes.map((t) => t.theme))).filter(Boolean);
    const labels = keys.map((k) => { var _a; return (_a = themeMap[k]) !== null && _a !== void 0 ? _a : k; });
    const tags = labels.slice(0, maxTags).join(", ");
    const buckets = keys.map((k) => { var _a; return (_a = BUCKET_BY_THEME[k]) !== null && _a !== void 0 ? _a : "other"; });
    const ranked = rankBuckets(buckets);
    const rng = seededRng(customerId);
    const phraseItems = ranked
        .slice(0, Math.min(maxPhraseItems, ranked.length))
        .map((b) => pick(rng, phrases[b]));
    const template = pick(rng, templates);
    const bio = template(phraseItems);
    return { tags, bio };
}
function buildEstablishmentDescriptionUnique(seedId, types, lang, name, maxTags = 6, maxPhraseItems = 3) {
    var _a, _b;
    const themeMap = (_a = THEMES_LABELS[lang]) !== null && _a !== void 0 ? _a : THEMES_LABELS.fr;
    const phrasesByLang = ORG_BUCKET_PHRASES_I18N[lang];
    const phrases = phrasesByLang && Object.keys(phrasesByLang).length > 0
        ? phrasesByLang
        : ORG_BUCKET_PHRASES_I18N.fr;
    const templates = (_b = ORG_TEMPLATES_I18N[lang]) !== null && _b !== void 0 ? _b : ORG_TEMPLATES_I18N.fr;
    const keys = Array.from(new Set(types)).filter(Boolean);
    const labels = keys.map((k) => { var _a; return (_a = themeMap[k]) !== null && _a !== void 0 ? _a : k; });
    const tags = labels.slice(0, maxTags).join(", ");
    const buckets = keys.map((k) => { var _a; return (_a = BUCKET_BY_THEME[k]) !== null && _a !== void 0 ? _a : "other"; });
    const ranked = rankBuckets(buckets);
    const rng = seededRng(seedId);
    const phraseItems = ranked
        .slice(0, Math.min(maxPhraseItems, ranked.length))
        .map((b) => { var _a; return pick(rng, (_a = phrases[b]) !== null && _a !== void 0 ? _a : phrases.other); });
    const template = pick(rng, templates);
    const bio = template(phraseItems, name);
    return { tags, bio };
}
function buildEstablishmentLongDescriptionFromRaw(seedId, name, city, raw, types, lang, maxPhraseItems = 3) {
    var _a;
    const rng = seededRng(seedId);
    const phrasesByLang = (_a = ORG_BUCKET_PHRASES_I18N[lang]) !== null && _a !== void 0 ? _a : ORG_BUCKET_PHRASES_I18N.fr;
    const buckets = types.map((t) => { var _a; return (_a = BUCKET_BY_THEME[t]) !== null && _a !== void 0 ? _a : "other"; });
    const ranked = rankBuckets(buckets);
    const activityItems = ranked
        .slice(0, maxPhraseItems)
        .map((b) => { var _a; return pick(rng, (_a = phrasesByLang[b]) !== null && _a !== void 0 ? _a : phrasesByLang.other); });
    const intro = pick(rng, ORG_LONG_TEMPLATES_FR.intro)(name, city);
    const activity = pick(rng, ORG_LONG_TEMPLATES_FR.activity)(activityItems);
    const vibe = pick(rng, ORG_LONG_TEMPLATES_FR.vibe)();
    const cleanedRaw = raw.trim();
    const rawSentence = cleanedRaw.length > 0
        ? cleanedRaw.endsWith(".") ||
            cleanedRaw.endsWith("!") ||
            cleanedRaw.endsWith("?")
            ? cleanedRaw
            : `${cleanedRaw}.`
        : "";
    return `${intro}\n\n${rawSentence}\n\n${activity}\n\n${vibe}`.trim();
}
const generateCustomerDescriptifFromThemesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const customerId = req.body.admin._id;
        if (!customerId || !mongoose_1.default.isValidObjectId(customerId)) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }
        const { force = false, save = true, maxTags = 6, maxPhraseItems = 3, lang, } = (_a = req.body) !== null && _a !== void 0 ? _a : {};
        const customer = yield Customer_1.default.findById(customerId).populate({
            path: "themesFavorites",
            model: "Theme",
            select: "theme",
        });
        if (!customer)
            return res.status(404).json({ message: "Customer introuvable." });
        const themes = ((_b = customer.themesFavorites) !== null && _b !== void 0 ? _b : [])
            .map((t) => t && typeof t === "object" && typeof t.theme === "string"
            ? { theme: t.theme }
            : null)
            .filter(Boolean);
        const detected = detectLangFromHeader(req.headers["accept-language"]);
        const customerLang = customer.language;
        const isSupportedLang = (x) => typeof x === "string" && ["fr", "en", "de", "es", "it", "eu"].includes(x);
        const finalLang = isSupportedLang(lang)
            ? lang
            : isSupportedLang(customerLang)
                ? customerLang
                : detected;
        const { tags, bio } = buildCustomerDescriptifUnique(String(customer._id), themes, finalLang, clampInt(maxTags, 1, 12), clampInt(maxPhraseItems, 1, 4));
        const alreadyHasDescriptif = Boolean((customer.descriptif || "").trim());
        const shouldWrite = force || !alreadyHasDescriptif;
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
    }
    catch (error) {
        console.error("Erreur génération descriptif customer :", error);
        return res
            .status(500)
            .json({ message: "Erreur lors de la génération du descriptif." });
    }
});
const generateEstablishmentDescriptionFromTypesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const requesterId = (_a = req.body) === null || _a === void 0 ? void 0 : _a.owner;
        if (!requesterId || !mongoose_1.default.isValidObjectId(requesterId)) {
            return res.status(401).json({ message: "Utilisateur non authentifié." });
        }
        const { establishmentId, force = false, save = true, maxTags = 6, maxPhraseItems = 3, lang, partialDescription, } = (_b = req.body) !== null && _b !== void 0 ? _b : {};
        if (!establishmentId || !mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "establishmentId invalide." });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Établissement introuvable." });
        }
        if (establishment.owner &&
            String(establishment.owner) !== String(requesterId._id)) {
            return res.status(403).json({ message: "Accès refusé." });
        }
        const isSupportedLang = (x) => typeof x === "string" && ["fr", "en", "de", "es", "it", "eu"].includes(x);
        const detected = detectLangFromHeader(req.headers["accept-language"]);
        const estLang = establishment.language;
        const finalLang = isSupportedLang(lang)
            ? lang
            : isSupportedLang(estLang)
                ? estLang
                : detected;
        const types = Array.isArray(establishment.type)
            ? establishment.type.filter((x) => typeof x === "string")
            : [];
        const name = String((_c = establishment.name) !== null && _c !== void 0 ? _c : "").trim() || "Cet établissement";
        const city = (_d = establishment.address) === null || _d === void 0 ? void 0 : _d.city;
        const { tags } = buildEstablishmentDescriptionUnique(String(establishment._id), types, finalLang, name, clampInt(maxTags, 1, 12), clampInt(maxPhraseItems, 1, 4));
        const rawFromDb = String((_e = establishment.descriptionRaw) !== null && _e !== void 0 ? _e : "").trim();
        const rawFromBody = String(partialDescription !== null && partialDescription !== void 0 ? partialDescription : "").trim();
        const raw = rawFromDb || rawFromBody;
        const alreadyHasFinal = Boolean(String((_f = establishment.description) !== null && _f !== void 0 ? _f : "").trim());
        const shouldWrite = force || !alreadyHasFinal;
        const safeRaw = raw.length >= 20
            ? raw
            : `Bienvenue chez ${name}${city ? `, à ${city}` : ""}.`;
        const description = buildEstablishmentLongDescriptionFromRaw(String(establishment._id), name, city, safeRaw, types, finalLang, clampInt(maxPhraseItems, 1, 4));
        if (save && shouldWrite) {
            establishment.description = description;
            if (rawFromBody && !establishment.descriptionRaw) {
                establishment.descriptionRaw = rawFromBody;
            }
            yield establishment.save();
        }
        return res.status(200).json({
            message: save
                ? shouldWrite
                    ? "Description entreprise générée et sauvegardée."
                    : "Description existante conservée."
                : "Description générée (non sauvegardée).",
            lang: finalLang,
            tags,
            description,
            saved: Boolean(save && shouldWrite),
            typesCount: types.length,
            usedRaw: Boolean(raw),
        });
    }
    catch (error) {
        console.error("Erreur génération description établissement :", error);
        return res.status(500).json({
            message: "Erreur lors de la génération de la description.",
        });
    }
});
const translateEstablishmentDescriptionController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const requesterId = (_a = req.body) === null || _a === void 0 ? void 0 : _a.owner._id;
        const { establishmentId, baseLang = "fr", targetLangs, } = req.body;
        if (!establishmentId || !mongoose_1.default.isValidObjectId(establishmentId)) {
            return res.status(400).json({ message: "establishmentId invalide." });
        }
        if (!targetLangs ||
            !Array.isArray(targetLangs) ||
            targetLangs.length === 0) {
            return res.status(400).json({ message: "targetLangs est requis." });
        }
        const establishment = yield Establishment_1.default.findById(establishmentId);
        if (!establishment) {
            return res.status(404).json({ message: "Établissement introuvable." });
        }
        if (establishment.owner &&
            String(establishment.owner) !== String(requesterId)) {
            return res.status(403).json({ message: "Accès refusé." });
        }
        const title = String((_b = establishment.name) !== null && _b !== void 0 ? _b : "");
        const description = String((_c = establishment.description) !== null && _c !== void 0 ? _c : "").trim();
        if (!description) {
            return res.status(400).json({
                message: "Aucune description à traduire. Génère d’abord la description.",
            });
        }
        const uniqueLangs = Array.from(new Set(targetLangs));
        const prompt = `
Tu es un traducteur professionnel.

TEXTE SOURCE :
- Langue source : ${baseLang}
- Titre : ${title}
- Description : ${description}

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
  "es": { "title": "...", "description": "..." }
}
`.trim();
        const response = yield openai.responses.create({
            model: "gpt-4.1-mini",
            input: prompt,
        });
        const raw = ((_d = response.output_text) === null || _d === void 0 ? void 0 : _d.trim()) || "";
        let parsed;
        try {
            const firstBrace = raw.indexOf("{");
            const lastBrace = raw.lastIndexOf("}");
            const jsonText = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace
                ? raw.slice(firstBrace, lastBrace + 1)
                : raw;
            parsed = JSON.parse(jsonText);
        }
        catch (e) {
            console.error("Réponse traduction non JSON :", raw);
            return res.status(500).json({
                message: "Impossible de parser la traduction.",
            });
        }
        const i18n = (_e = establishment.descriptionI18n) !== null && _e !== void 0 ? _e : {};
        uniqueLangs.forEach((code) => {
            var _a;
            const entry = parsed[code] || {};
            i18n[code] = (_a = entry.description) !== null && _a !== void 0 ? _a : "";
        });
        i18n[baseLang] = description;
        establishment.descriptionI18n = i18n;
        yield establishment.save();
        return res.status(200).json({
            message: "Traductions sauvegardées.",
            descriptionI18n: i18n,
        });
    }
    catch (error) {
        console.error("Erreur traduction établissement :", error);
        return res.status(500).json({
            message: "Erreur lors de la traduction.",
        });
    }
});
function detectLangFromHeader(header) {
    const h = typeof header === "string" ? header.toLowerCase() : "";
    if (h.includes("eu"))
        return "eu";
    if (h.includes("de"))
        return "de";
    if (h.includes("es"))
        return "es";
    if (h.includes("it"))
        return "it";
    if (h.includes("en"))
        return "en";
    return "fr";
}
function rankBuckets(buckets) {
    var _a;
    const count = new Map();
    for (const b of buckets)
        count.set(b, ((_a = count.get(b)) !== null && _a !== void 0 ? _a : 0) + 1);
    return Array.from(count.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([bucket]) => bucket);
}
function joinNice(items, lang) {
    if (items.length === 0)
        return lang === "en" ? "new local tips" : "de nouveaux bons plans";
    if (items.length === 1)
        return items[0];
    if (items.length === 2)
        return lang === "en"
            ? `${items[0]} and ${items[1]}`
            : `${items[0]} et ${items[1]}`;
    const last = items[items.length - 1];
    const start = items.slice(0, -1).join(", ");
    return lang === "en" ? `${start}, and ${last}` : `${start} et ${last}`;
}
function seededRng(seed) {
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
function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}
function clampInt(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n))
        return min;
    return Math.max(min, Math.min(max, Math.trunc(n)));
}
exports.default = {
    generateEventDescriptionController,
    translateController,
    generateCustomerDescriptifFromThemesController,
    generateEstablishmentDescriptionFromTypesController,
    translateEstablishmentDescriptionController,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFFQSx3REFBZ0M7QUFDaEMsb0RBQTRCO0FBQzVCLGtFQUEwQztBQUMxQyw0RUFBb0Q7QUFFcEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQkFBTSxDQUFDO0lBQ3hCLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7Q0FDbkMsQ0FBQyxDQUFDO0FBSUgsTUFBTSxrQ0FBa0MsR0FBRyxDQUN6QyxHQUFZLEVBQ1osR0FBYSxFQUNiLEVBQUU7O0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUNKLEtBQUssRUFDTCxrQkFBa0IsRUFDbEIsSUFBSSxHQUFHLElBQUksRUFDWCxNQUFNLEdBQUcsRUFBRSxFQUNYLFlBQVksRUFDWixVQUFVLEVBQ1YsT0FBTyxHQUNSLEdBQUcsR0FBRyxDQUFDLElBUVAsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBRzs7OztzRUFJbUQsSUFBSTs7Ozs7Ozs7Ozs7YUFXN0QsS0FBSzthQUNMLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFD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