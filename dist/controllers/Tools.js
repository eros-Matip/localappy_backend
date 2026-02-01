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
const generateCustomerDescriptifFromThemesController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const customerId = req.body.admin._id;
        console.log("customerId", customerId);
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
        if (save && shouldWrite) {
            customer.descriptif = bio;
            yield customer.save();
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
    }
    catch (error) {
        console.error("Erreur génération descriptif customer :", error);
        return res
            .status(500)
            .json({ message: "Erreur lors de la génération du descriptif." });
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
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFFQSx3REFBZ0M7QUFDaEMsb0RBQTRCO0FBQzVCLGtFQUEwQztBQUUxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdCQUFNLENBQUM7SUFDeEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYztDQUNuQyxDQUFDLENBQUM7QUFJSCxNQUFNLGtDQUFrQyxHQUFHLENBQ3pDLEdBQVksRUFDWixHQUFhLEVBQ2IsRUFBRTs7SUFDRixJQUFJLENBQUM7UUFDSCxNQUFNLEVBQ0osS0FBSyxFQUNMLGtCQUFrQixFQUNsQixJQUFJLEdBQUcsSUFBSSxFQUNYLE1BQU0sR0FBRyxFQUFFLEVBQ1gsWUFBWSxFQUNaLFVBQVUsRUFDVixPQUFPLEdBQ1IsR0FBRyxHQUFHLENBQUMsSUFRUCxDQUFDO1FBRUYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDaEMsT0FBTyxHQUFHO2lCQUNQLE1BQU0sQ0FBQyxHQUFHLENBQUM7aUJBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLHNDQUFzQyxFQUFFLENBQUMsQ0FBQztRQUMvRCxDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHOzs7O3NFQUltRCxJQUFJOzs7Ozs7Ozs7OzthQVc3RCxLQUFLO2FBQ0wsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYztjQUNqRCxPQUFPLElBQUksY0FBYztvQkFDbkIsWUFBWSxJQUFJLGNBQWM7a0JBQ2hDLFVBQVUsSUFBSSxjQUFjOzs7Ozs7OztFQVE1QyxrQkFBa0IsSUFBSSw2QkFBNkI7Ozs7Q0FJcEQsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVMLE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDN0MsS0FBSyxFQUFFLGNBQWM7WUFDckIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFFSCxNQUFNLElBQUksR0FBVyxDQUFBLE1BQUMsUUFBZ0IsQ0FBQyxXQUFXLDBDQUFFLElBQUksRUFBRSxLQUFJLEVBQUUsQ0FBQztRQUVqRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLEVBQUUscURBQXFEO2FBQy9ELENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsNkNBQTZDO1NBQ3ZELENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQUlGLE1BQU0sbUJBQW1CLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7O0lBQ2hFLElBQUksQ0FBQztRQUNILE1BQU0sRUFDSixLQUFLLEVBQ0wsV0FBVyxFQUNYLFFBQVEsR0FBRyxJQUFJLEVBQ2YsV0FBVyxHQUNaLEdBQUcsR0FBRyxDQUFDLElBS1AsQ0FBQztRQUVGLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sR0FBRztpQkFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2lCQUNYLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxzQ0FBc0MsRUFBRSxDQUFDLENBQUM7UUFDL0QsQ0FBQztRQUVELElBQ0UsQ0FBQyxXQUFXO1lBQ1osQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztZQUMzQixXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFDeEIsQ0FBQztZQUNELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDM0IsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsT0FBTyxFQUFFLGtEQUFrRDthQUM1RCxDQUFDLENBQUM7UUFDTCxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBRXJELE1BQU0sTUFBTSxHQUFHOzs7O29CQUlDLFFBQVE7WUFDaEIsS0FBSyxJQUFJLEVBQUU7a0JBQ0wsV0FBVyxJQUFJLEVBQUU7Ozs7RUFJakMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUM7Ozs7Ozs7Ozs7Ozs7Ozs7NkZBZ0JnRSxJQUFJLENBQUMsU0FBUyxDQUNyRyxXQUFXLENBQ1o7O0NBRUosQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVMLE1BQU0sUUFBUSxHQUFHLE1BQU0sTUFBTSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7WUFDN0MsS0FBSyxFQUFFLGNBQWM7WUFDckIsS0FBSyxFQUFFLE1BQU07U0FDZCxDQUFDLENBQUM7UUFFSCxNQUFNLEdBQUcsR0FBRyxDQUFBLE1BQUMsUUFBZ0IsQ0FBQyxXQUFXLDBDQUFFLElBQUksRUFBRSxLQUFJLEVBQUUsQ0FBQztRQUV4RCxJQUFJLE1BQVcsQ0FBQztRQUNoQixJQUFJLENBQUM7WUFFSCxJQUFJLFFBQVEsR0FBRyxHQUFHLENBQUM7WUFDbkIsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxJQUFJLFNBQVMsS0FBSyxDQUFDLENBQUMsSUFBSSxTQUFTLEdBQUcsVUFBVSxFQUFFLENBQUM7Z0JBQ3BFLFFBQVEsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxTQUFTLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUVELE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2hDLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1gsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUV2RCxNQUFNLFFBQVEsR0FDWixFQUFFLENBQUM7WUFDTCxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7Z0JBQzNCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRztvQkFDZixLQUFLLEVBQUUsS0FBSyxJQUFJLEVBQUU7b0JBQ2xCLFdBQVcsRUFBRSxXQUFXLElBQUksRUFBRTtpQkFDL0IsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1lBQ0gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFDMUIsWUFBWSxFQUFFLFFBQVE7Z0JBQ3RCLE9BQU8sRUFDTCwyRUFBMkU7YUFDOUUsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUdELE1BQU0sWUFBWSxHQUNoQixFQUFFLENBQUM7UUFFTCxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7O1lBQzNCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHO2dCQUNuQixLQUFLLEVBQUUsTUFBQSxNQUFBLEtBQUssQ0FBQyxLQUFLLG1DQUFJLEtBQUssbUNBQUksRUFBRTtnQkFDakMsV0FBVyxFQUFFLE1BQUEsTUFBQSxLQUFLLENBQUMsV0FBVyxtQ0FBSSxXQUFXLG1DQUFJLEVBQUU7YUFDcEQsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsa0NBQWtDO1NBQzVDLENBQUMsQ0FBQztJQUNMLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQTBCRixNQUFNLGFBQWEsR0FBMkI7SUFDNUMsRUFBRSxFQUFFO1FBQ0YscUJBQXFCLEVBQUUsNkJBQTZCO1FBQ3BELE1BQU0sRUFBRSxRQUFRO1FBQ2hCLGVBQWUsRUFBRSxpQkFBaUI7UUFDbEMsU0FBUyxFQUFFLE9BQU87UUFDbEIsVUFBVSxFQUFFLFlBQVk7UUFDeEIsYUFBYSxFQUFFLG9CQUFvQjtRQUNuQyxTQUFTLEVBQUUsV0FBVztRQUN0QixPQUFPLEVBQUUsU0FBUztRQUNsQixjQUFjLEVBQUUsa0JBQWtCO1FBQ2xDLFdBQVcsRUFBRSxrQkFBa0I7UUFDL0IsWUFBWSxFQUFFLFNBQVM7UUFDdkIsU0FBUyxFQUFFLGFBQWE7UUFDeEIsVUFBVSxFQUFFLGNBQWM7UUFDMUIsVUFBVSxFQUFFLFlBQVk7UUFDeEIsaUJBQWlCLEVBQUUsc0JBQXNCO1FBQ3pDLFdBQVcsRUFBRSxtQkFBbUI7UUFDaEMsVUFBVSxFQUFFLGdCQUFnQjtRQUM1QixRQUFRLEVBQUUsVUFBVTtRQUNwQixRQUFRLEVBQUUsV0FBVztRQUNyQixJQUFJLEVBQUUsS0FBSztRQUNYLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLFdBQVcsRUFBRSxPQUFPO1FBQ3BCLE9BQU8sRUFBRSx5QkFBeUI7UUFDbEMsY0FBYyxFQUFFLFlBQVk7UUFDNUIsYUFBYSxFQUFFLFVBQVU7UUFDekIsS0FBSyxFQUFFLFFBQVE7UUFDZixNQUFNLEVBQUUsUUFBUTtRQUNoQixLQUFLLEVBQUUsUUFBUTtRQUNmLGFBQWEsRUFBRSxlQUFlO1FBQzlCLGVBQWUsRUFBRSxjQUFjO1FBQy9CLGNBQWMsRUFBRSxxQkFBcUI7UUFDckMsc0JBQXNCLEVBQUUsNEJBQTRCO1FBQ3BELFFBQVEsRUFBRSxVQUFVO1FBQ3BCLGFBQWEsRUFBRSx5QkFBeUI7UUFDeEMsUUFBUSxFQUFFLFNBQVM7UUFDbkIsT0FBTyxFQUFFLFdBQVc7UUFDcEIsS0FBSyxFQUFFLE9BQU87UUFDZCxjQUFjLEVBQUUsbUJBQW1CO1FBQ25DLFdBQVcsRUFBRSxRQUFRO1FBQ3JCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLGdCQUFnQixFQUFFLHNCQUFzQjtRQUN4QyxPQUFPLEVBQUUsU0FBUztRQUNsQixtQkFBbUIsRUFBRSx3QkFBd0I7UUFDN0MsVUFBVSxFQUFFLE9BQU87UUFDbkIsdUJBQXVCLEVBQUUsMEJBQTBCO1FBQ25ELE9BQU8sRUFBRSxTQUFTO1FBQ2xCLGtCQUFrQixFQUFFLG9CQUFvQjtRQUN4QyxlQUFlLEVBQUUsZ0JBQWdCO1FBQ2pDLHFCQUFxQixFQUFFLGtCQUFrQjtRQUN6QyxPQUFPLEVBQUUsU0FBUztRQUNsQixNQUFNLEVBQUUsUUFBUTtRQUNoQixZQUFZLEVBQUUsY0FBYztRQUM1QixZQUFZLEVBQUUsZ0JBQWdCO1FBQzlCLE1BQU0sRUFBRSxPQUFPO1FBQ2YsYUFBYSxFQUFFLGFBQWE7UUFDNUIsbUJBQW1CLEVBQUUsc0JBQXNCO1FBQzNDLGdCQUFnQixFQUFFLHlCQUF5QjtRQUMzQyxXQUFXLEVBQUUsb0JBQW9CO1FBQ2pDLFdBQVcsRUFBRSxnQkFBZ0I7UUFDN0IsOEJBQThCLEVBQUUsd0JBQXdCO1FBQ3hELEtBQUssRUFBRSxTQUFTO1FBQ2hCLFlBQVksRUFBRSxlQUFlO1FBQzdCLFdBQVcsRUFBRSxhQUFhO1FBQzFCLE9BQU8sRUFBRSxhQUFhO1FBQ3RCLElBQUksRUFBRSxlQUFlO1FBQ3JCLFdBQVcsRUFBRSxXQUFXO1FBQ3hCLGVBQWUsRUFBRSxvQkFBb0I7UUFDckMsTUFBTSxFQUFFLFFBQVE7S0FDakI7SUFDRCxFQUFFLEVBQUU7UUFDRixxQkFBcUIsRUFBRSx3QkFBd0I7UUFDL0MsTUFBTSxFQUFFLFFBQVE7UUFDaEIsZUFBZSxFQUFFLG1CQUFtQjtRQUNwQyxTQUFTLEVBQUUsTUFBTTtRQUNqQixVQUFVLEVBQUUsWUFBWTtRQUN4QixhQUFhLEVBQUUsZ0JBQWdCO1FBQy9CLFNBQVMsRUFBRSxNQUFNO1FBQ2pCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsV0FBVyxFQUFFLGNBQWM7UUFDM0IsWUFBWSxFQUFFLFNBQVM7UUFDdkIsU0FBUyxFQUFFLGFBQWE7UUFDeEIsVUFBVSxFQUFFLGFBQWE7UUFDekIsVUFBVSxFQUFFLFlBQVk7UUFDeEIsaUJBQWlCLEVBQUUsb0JBQW9CO1FBQ3ZDLFdBQVcsRUFBRSxjQUFjO1FBQzNCLFVBQVUsRUFBRSxtQkFBbUI7UUFDL0IsUUFBUSxFQUFFLFVBQVU7UUFDcEIsUUFBUSxFQUFFLFFBQVE7UUFDbEIsSUFBSSxFQUFFLE1BQU07UUFDWixRQUFRLEVBQUUsVUFBVTtRQUNwQixPQUFPLEVBQUUsU0FBUztRQUNsQixXQUFXLEVBQUUsWUFBWTtRQUN6QixPQUFPLEVBQUUsVUFBVTtRQUNuQixjQUFjLEVBQUUsV0FBVztRQUMzQixhQUFhLEVBQUUsU0FBUztRQUN4QixLQUFLLEVBQUUsT0FBTztRQUNkLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLEtBQUssRUFBRSxPQUFPO1FBQ2QsYUFBYSxFQUFFLGVBQWU7UUFDOUIsZUFBZSxFQUFFLGFBQWE7UUFDOUIsY0FBYyxFQUFFLGlCQUFpQjtRQUNqQyxzQkFBc0IsRUFBRSx5QkFBeUI7UUFDakQsUUFBUSxFQUFFLFVBQVU7UUFDcEIsYUFBYSxFQUFFLGdCQUFnQjtRQUMvQixRQUFRLEVBQUUsVUFBVTtRQUNwQixPQUFPLEVBQUUsU0FBUztRQUNsQixLQUFLLEVBQUUsT0FBTztRQUNkLGNBQWMsRUFBRSxZQUFZO1FBQzVCLFdBQVcsRUFBRSxRQUFRO1FBQ3JCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLGdCQUFnQixFQUFFLG1CQUFtQjtRQUNyQyxPQUFPLEVBQUUsU0FBUztRQUNsQixtQkFBbUIsRUFBRSxhQUFhO1FBQ2xDLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLHVCQUF1QixFQUFFLHlCQUF5QjtRQUNsRCxPQUFPLEVBQUUsU0FBUztRQUNsQixrQkFBa0IsRUFBRSxjQUFjO1FBQ2xDLGVBQWUsRUFBRSxtQkFBbUI7UUFDcEMscUJBQXFCLEVBQUUsa0JBQWtCO1FBQ3pDLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLFlBQVksRUFBRSxjQUFjO1FBQzVCLFlBQVksRUFBRSxlQUFlO1FBQzdCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLGFBQWEsRUFBRSxlQUFlO1FBQzlCLG1CQUFtQixFQUFFLHNCQUFzQjtRQUMzQyxnQkFBZ0IsRUFBRSxtQkFBbUI7UUFDckMsV0FBVyxFQUFFLGNBQWM7UUFDM0IsV0FBVyxFQUFFLGNBQWM7UUFDM0IsOEJBQThCLEVBQUUsd0JBQXdCO1FBQ3hELEtBQUssRUFBRSxPQUFPO1FBQ2QsWUFBWSxFQUFFLGVBQWU7UUFDN0IsV0FBVyxFQUFFLGFBQWE7UUFDMUIsT0FBTyxFQUFFLFNBQVM7UUFDbEIsSUFBSSxFQUFFLGFBQWE7UUFDbkIsV0FBVyxFQUFFLGNBQWM7UUFDM0IsZUFBZSxFQUFFLGtCQUFrQjtRQUNuQyxNQUFNLEVBQUUsU0FBUztLQUNsQjtJQUNELEVBQUUsRUFBRTtRQUNGLHFCQUFxQixFQUFFLDhCQUE4QjtRQUNyRCxNQUFNLEVBQUUsT0FBTztRQUNmLGVBQWUsRUFBRSxrQkFBa0I7UUFDbkMsU0FBUyxFQUFFLHVCQUF1QjtRQUNsQyxVQUFVLEVBQUUsV0FBVztRQUN2QixhQUFhLEVBQUUsc0JBQXNCO1FBQ3JDLFNBQVMsRUFBRSxNQUFNO1FBQ2pCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsV0FBVyxFQUFFLG1CQUFtQjtRQUNoQyxZQUFZLEVBQUUsU0FBUztRQUN2QixTQUFTLEVBQUUsV0FBVztRQUN0QixVQUFVLEVBQUUsZ0JBQWdCO1FBQzVCLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLGlCQUFpQixFQUFFLGlCQUFpQjtRQUNwQyxXQUFXLEVBQUUsb0JBQW9CO1FBQ2pDLFVBQVUsRUFBRSx3QkFBd0I7UUFDcEMsUUFBUSxFQUFFLFVBQVU7UUFDcEIsUUFBUSxFQUFFLFNBQVM7UUFDbkIsSUFBSSxFQUFFLE9BQU87UUFDYixRQUFRLEVBQUUsUUFBUTtRQUNsQixPQUFPLEVBQUUsU0FBUztRQUNsQixXQUFXLEVBQUUsV0FBVztRQUN4QixPQUFPLEVBQUUscUJBQXFCO1FBQzlCLGNBQWMsRUFBRSxZQUFZO1FBQzVCLGFBQWEsRUFBRSx3QkFBd0I7UUFDdkMsS0FBSyxFQUFFLFFBQVE7UUFDZixNQUFNLEVBQUUsUUFBUTtRQUNoQixLQUFLLEVBQUUsUUFBUTtRQUNmLGFBQWEsRUFBRSxxQkFBcUI7UUFDcEMsZUFBZSxFQUFFLG1DQUFtQztRQUNwRCxjQUFjLEVBQUUseUJBQXlCO1FBQ3pDLHNCQUFzQixFQUFFLHFCQUFxQjtRQUM3QyxRQUFRLEVBQUUsVUFBVTtRQUNwQixhQUFhLEVBQUUsd0JBQXdCO1FBQ3ZDLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLEtBQUssRUFBRSxNQUFNO1FBQ2IsY0FBYyxFQUFFLHFCQUFxQjtRQUNyQyxXQUFXLEVBQUUsUUFBUTtRQUNyQixPQUFPLEVBQUUsU0FBUztRQUNsQixnQkFBZ0IsRUFBRSxtQkFBbUI7UUFDckMsT0FBTyxFQUFFLFFBQVE7UUFDakIsbUJBQW1CLEVBQUUsb0JBQW9CO1FBQ3pDLFVBQVUsRUFBRSxtQkFBbUI7UUFDL0IsdUJBQXVCLEVBQUUsMEJBQTBCO1FBQ25ELE9BQU8sRUFBRSxPQUFPO1FBQ2hCLGtCQUFrQixFQUFFLGlCQUFpQjtRQUNyQyxlQUFlLEVBQUUsa0JBQWtCO1FBQ25DLHFCQUFxQixFQUFFLHlCQUF5QjtRQUNoRCxPQUFPLEVBQUUsU0FBUztRQUNsQixNQUFNLEVBQUUsTUFBTTtRQUNkLFlBQVksRUFBRSxZQUFZO1FBQzFCLFlBQVksRUFBRSxpQkFBaUI7UUFDL0IsTUFBTSxFQUFFLE1BQU07UUFDZCxhQUFhLEVBQUUsWUFBWTtRQUMzQixtQkFBbUIsRUFBRSxnQkFBZ0I7UUFDckMsZ0JBQWdCLEVBQUUsb0JBQW9CO1FBQ3RDLFdBQVcsRUFBRSxnQkFBZ0I7UUFDN0IsV0FBVyxFQUFFLGFBQWE7UUFDMUIsOEJBQThCLEVBQUUscUJBQXFCO1FBQ3JELEtBQUssRUFBRSxVQUFVO1FBQ2pCLFlBQVksRUFBRSxjQUFjO1FBQzVCLFdBQVcsRUFBRSxZQUFZO1FBQ3pCLE9BQU8sRUFBRSxZQUFZO1FBQ3JCLElBQUksRUFBRSxlQUFlO1FBQ3JCLFdBQVcsRUFBRSxhQUFhO1FBQzFCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLGVBQWUsRUFBRSxXQUFXO1FBQzVCLE1BQU0sRUFBRSxvQkFBb0I7S0FDN0I7SUFDRCxFQUFFLEVBQUU7UUFDRixxQkFBcUIsRUFBRSwwQkFBMEI7UUFDakQsTUFBTSxFQUFFLFNBQVM7UUFDakIsZUFBZSxFQUFFLGtCQUFrQjtRQUNuQyxTQUFTLEVBQUUsaUJBQWlCO1FBQzVCLFVBQVUsRUFBRSxhQUFhO1FBQ3pCLGFBQWEsRUFBRSxpQkFBaUI7UUFDaEMsU0FBUyxFQUFFLGFBQWE7UUFDeEIsT0FBTyxFQUFFLFdBQVc7UUFDcEIsY0FBYyxFQUFFLGlCQUFpQjtRQUNqQyxXQUFXLEVBQUUsZUFBZTtRQUM1QixZQUFZLEVBQUUsUUFBUTtRQUN0QixTQUFTLEVBQUUsWUFBWTtRQUN2QixVQUFVLEVBQUUsaUJBQWlCO1FBQzdCLFVBQVUsRUFBRSxZQUFZO1FBQ3hCLGlCQUFpQixFQUFFLHVCQUF1QjtRQUMxQyxXQUFXLEVBQUUsa0JBQWtCO1FBQy9CLFVBQVUsRUFBRSxlQUFlO1FBQzNCLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLElBQUksRUFBRSxPQUFPO1FBQ2IsUUFBUSxFQUFFLFVBQVU7UUFDcEIsT0FBTyxFQUFFLFVBQVU7UUFDbkIsV0FBVyxFQUFFLFVBQVU7UUFDdkIsT0FBTyxFQUFFLDZCQUE2QjtRQUN0QyxjQUFjLEVBQUUsWUFBWTtRQUM1QixhQUFhLEVBQUUsa0JBQWtCO1FBQ2pDLEtBQUssRUFBRSxRQUFRO1FBQ2YsTUFBTSxFQUFFLFNBQVM7UUFDakIsS0FBSyxFQUFFLE9BQU87UUFDZCxhQUFhLEVBQUUsZUFBZTtRQUM5QixlQUFlLEVBQUUsMEJBQTBCO1FBQzNDLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsc0JBQXNCLEVBQUUseUJBQXlCO1FBQ2pELFFBQVEsRUFBRSxVQUFVO1FBQ3BCLGFBQWEsRUFBRSxvQkFBb0I7UUFDbkMsUUFBUSxFQUFFLFVBQVU7UUFDcEIsT0FBTyxFQUFFLFdBQVc7UUFDcEIsS0FBSyxFQUFFLE9BQU87UUFDZCxjQUFjLEVBQUUsaUJBQWlCO1FBQ2pDLFdBQVcsRUFBRSxPQUFPO1FBQ3BCLE9BQU8sRUFBRSxTQUFTO1FBQ2xCLGdCQUFnQixFQUFFLHFCQUFxQjtRQUN2QyxPQUFPLEVBQUUsU0FBUztRQUNsQixtQkFBbUIsRUFBRSx3QkFBd0I7UUFDN0MsVUFBVSxFQUFFLGlCQUFpQjtRQUM3Qix1QkFBdUIsRUFBRSwyQkFBMkI7UUFDcEQsT0FBTyxFQUFFLFNBQVM7UUFDbEIsa0JBQWtCLEVBQUUscUJBQXFCO1FBQ3pDLGVBQWUsRUFBRSxrQkFBa0I7UUFDbkMscUJBQXFCLEVBQUUseUJBQXlCO1FBQ2hELE9BQU8sRUFBRSxRQUFRO1FBQ2pCLE1BQU0sRUFBRSxNQUFNO1FBQ2QsWUFBWSxFQUFFLFlBQVk7UUFDMUIsWUFBWSxFQUFFLGdCQUFnQjtRQUM5QixNQUFNLEVBQUUsT0FBTztRQUNmLGFBQWEsRUFBRSxhQUFhO1FBQzVCLG1CQUFtQixFQUFFLHlCQUF5QjtRQUM5QyxnQkFBZ0IsRUFBRSx3QkFBd0I7UUFDMUMsV0FBVyxFQUFFLG9CQUFvQjtRQUNqQyxXQUFXLEVBQUUsZ0JBQWdCO1FBQzdCLDhCQUE4QixFQUFFLDJCQUEyQjtRQUMzRCxLQUFLLEVBQUUsUUFBUTtRQUNmLFlBQVksRUFBRSxnQkFBZ0I7UUFDOUIsV0FBVyxFQUFFLGFBQWE7UUFDMUIsT0FBTyxFQUFFLGFBQWE7UUFDdEIsSUFBSSxFQUFFLGVBQWU7UUFDckIsV0FBVyxFQUFFLE9BQU87UUFDcEIsTUFBTSxFQUFFLE9BQU87UUFDZixlQUFlLEVBQUUsb0JBQW9CO1FBQ3JDLE1BQU0sRUFBRSxRQUFRO0tBQ2pCO0lBQ0QsRUFBRSxFQUFFO1FBQ0YscUJBQXFCLEVBQUUsMkJBQTJCO1FBQ2xELE1BQU0sRUFBRSxTQUFTO1FBQ2pCLGVBQWUsRUFBRSxvQkFBb0I7UUFDckMsU0FBUyxFQUFFLG1CQUFtQjtRQUM5QixVQUFVLEVBQUUsWUFBWTtRQUN4QixhQUFhLEVBQUUsa0JBQWtCO1FBQ2pDLFNBQVMsRUFBRSxZQUFZO1FBQ3ZCLE9BQU8sRUFBRSxVQUFVO1FBQ25CLGNBQWMsRUFBRSxtQkFBbUI7UUFDbkMsV0FBVyxFQUFFLGdCQUFnQjtRQUM3QixZQUFZLEVBQUUsUUFBUTtRQUN0QixTQUFTLEVBQUUsV0FBVztRQUN0QixVQUFVLEVBQUUsbUJBQW1CO1FBQy9CLFVBQVUsRUFBRSxRQUFRO1FBQ3BCLGlCQUFpQixFQUFFLHVCQUF1QjtRQUMxQyxXQUFXLEVBQUUsaUJBQWlCO1FBQzlCLFVBQVUsRUFBRSxnQkFBZ0I7UUFDNUIsUUFBUSxFQUFFLFVBQVU7UUFDcEIsUUFBUSxFQUFFLGVBQWU7UUFDekIsSUFBSSxFQUFFLE9BQU87UUFDYixRQUFRLEVBQUUsU0FBUztRQUNuQixPQUFPLEVBQUUsVUFBVTtRQUNuQixXQUFXLEVBQUUsV0FBVztRQUN4QixPQUFPLEVBQUUsdUJBQXVCO1FBQ2hDLGNBQWMsRUFBRSxZQUFZO1FBQzVCLGFBQWEsRUFBRSxnQkFBZ0I7UUFDL0IsS0FBSyxFQUFFLFFBQVE7UUFDZixNQUFNLEVBQUUsUUFBUTtRQUNoQixLQUFLLEVBQUUsUUFBUTtRQUNmLGFBQWEsRUFBRSxnQkFBZ0I7UUFDL0IsZUFBZSxFQUFFLG9CQUFvQjtRQUNyQyxjQUFjLEVBQUUsa0JBQWtCO1FBQ2xDLHNCQUFzQixFQUFFLDJCQUEyQjtRQUNuRCxRQUFRLEVBQUUsV0FBVztRQUNyQixhQUFhLEVBQUUsa0JBQWtCO1FBQ2pDLFFBQVEsRUFBRSxXQUFXO1FBQ3JCLE9BQU8sRUFBRSxXQUFXO1FBQ3BCLEtBQUssRUFBRSxPQUFPO1FBQ2QsY0FBYyxFQUFFLG9CQUFvQjtRQUNwQyxXQUFXLEVBQUUsT0FBTztRQUNwQixPQUFPLEVBQUUsU0FBUztRQUNsQixnQkFBZ0IsRUFBRSwyQkFBMkI7UUFDN0MsT0FBTyxFQUFFLFNBQVM7UUFDbEIsbUJBQW1CLEVBQUUsd0JBQXdCO1FBQzdDLFVBQVUsRUFBRSxpQkFBaUI7UUFDN0IsdUJBQXVCLEVBQUUsOEJBQThCO1FBQ3ZELE9BQU8sRUFBRSxVQUFVO1FBQ25CLGtCQUFrQixFQUFFLG9CQUFvQjtRQUN4QyxlQUFlLEVBQUUsb0JBQW9CO1FBQ3JDLHFCQUFxQixFQUFFLDZCQUE2QjtRQUNwRCxPQUFPLEVBQUUsUUFBUTtRQUNqQixNQUFNLEVBQUUsUUFBUTtRQUNoQixZQUFZLEVBQUUsVUFBVTtRQUN4QixZQUFZLEVBQUUsZ0JBQWdCO1FBQzlCLE1BQU0sRUFBRSxPQUFPO1FBQ2YsYUFBYSxFQUFFLFVBQVU7UUFDekIsbUJBQW1CLEVBQUUscUJBQXFCO1FBQzFDLGdCQUFnQixFQUFFLHVCQUF1QjtRQUN6QyxXQUFXLEVBQUUsb0JBQW9CO1FBQ2pDLFdBQVcsRUFBRSxnQkFBZ0I7UUFDN0IsOEJBQThCLEVBQUUsWUFBWTtRQUM1QyxLQUFLLEVBQUUsU0FBUztRQUNoQixZQUFZLEVBQUUsZ0JBQWdCO1FBQzlCLFdBQVcsRUFBRSxjQUFjO1FBQzNCLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLElBQUksRUFBRSxnQkFBZ0I7UUFDdEIsV0FBVyxFQUFFLGFBQWE7UUFDMUIsTUFBTSxFQUFFLE9BQU87UUFDZixlQUFlLEVBQUUscUJBQXFCO1FBQ3RDLE1BQU0sRUFBRSxRQUFRO0tBQ2pCO0lBQ0QsRUFBRSxFQUFFO1FBQ0YscUJBQXFCLEVBQUUseUJBQXlCO1FBQ2hELE1BQU0sRUFBRSxVQUFVO1FBQ2xCLGVBQWUsRUFBRSxjQUFjO1FBQy9CLFNBQVMsRUFBRSxvQkFBb0I7UUFDL0IsVUFBVSxFQUFFLFdBQVc7UUFDdkIsYUFBYSxFQUFFLG1CQUFtQjtRQUNsQyxTQUFTLEVBQUUsWUFBWTtRQUN2QixPQUFPLEVBQUUsWUFBWTtRQUNyQixjQUFjLEVBQUUsaUJBQWlCO1FBQ2pDLFdBQVcsRUFBRSxtQkFBbUI7UUFDaEMsWUFBWSxFQUFFLFdBQVc7UUFDekIsU0FBUyxFQUFFLGdCQUFnQjtRQUMzQixVQUFVLEVBQUUsaUJBQWlCO1FBQzdCLFVBQVUsRUFBRSxZQUFZO1FBQ3hCLGlCQUFpQixFQUFFLGlCQUFpQjtRQUNwQyxXQUFXLEVBQUUsaUJBQWlCO1FBQzlCLFVBQVUsRUFBRSxrQkFBa0I7UUFDOUIsUUFBUSxFQUFFLFVBQVU7UUFDcEIsUUFBUSxFQUFFLFdBQVc7UUFDckIsSUFBSSxFQUFFLE9BQU87UUFDYixRQUFRLEVBQUUsVUFBVTtRQUNwQixPQUFPLEVBQUUsV0FBVztRQUNwQixXQUFXLEVBQUUsY0FBYztRQUMzQixPQUFPLEVBQUUsYUFBYTtRQUN0QixjQUFjLEVBQUUsWUFBWTtRQUM1QixhQUFhLEVBQUUsZ0JBQWdCO1FBQy9CLEtBQUssRUFBRSxRQUFRO1FBQ2YsTUFBTSxFQUFFLFVBQVU7UUFDbEIsS0FBSyxFQUFFLFFBQVE7UUFDZixhQUFhLEVBQUUsYUFBYTtRQUM1QixlQUFlLEVBQUUseUJBQXlCO1FBQzFDLGNBQWMsRUFBRSxtQkFBbUI7UUFDbkMsc0JBQXNCLEVBQUUsb0JBQW9CO1FBQzVDLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLGFBQWEsRUFBRSxtQkFBbUI7UUFDbEMsUUFBUSxFQUFFLFdBQVc7UUFDckIsT0FBTyxFQUFFLFVBQVU7UUFDbkIsS0FBSyxFQUFFLE9BQU87UUFDZCxjQUFjLEVBQUUsd0JBQXdCO1FBQ3hDLFdBQVcsRUFBRSxRQUFRO1FBQ3JCLE9BQU8sRUFBRSxjQUFjO1FBQ3ZCLGdCQUFnQixFQUFFLHVCQUF1QjtRQUN6QyxPQUFPLEVBQUUsWUFBWTtRQUNyQixtQkFBbUIsRUFBRSxvQkFBb0I7UUFDekMsVUFBVSxFQUFFLGtCQUFrQjtRQUM5Qix1QkFBdUIsRUFBRSw0QkFBNEI7UUFDckQsT0FBTyxFQUFFLE1BQU07UUFDZixrQkFBa0IsRUFBRSxtQkFBbUI7UUFDdkMsZUFBZSxFQUFFLGNBQWM7UUFDL0IscUJBQXFCLEVBQUUsMEJBQTBCO1FBQ2pELE9BQU8sRUFBRSxXQUFXO1FBQ3BCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLFlBQVksRUFBRSxZQUFZO1FBQzFCLFlBQVksRUFBRSxpQkFBaUI7UUFDL0IsTUFBTSxFQUFFLFdBQVc7UUFDbkIsYUFBYSxFQUFFLFNBQVM7UUFDeEIsbUJBQW1CLEVBQUUsb0JBQW9CO1FBQ3pDLGdCQUFnQixFQUFFLHVCQUF1QjtRQUN6QyxXQUFXLEVBQUUsWUFBWTtRQUN6QixXQUFXLEVBQUUsYUFBYTtRQUMxQiw4QkFBOEIsRUFBRSw4QkFBOEI7UUFDOUQsS0FBSyxFQUFFLE9BQU87UUFDZCxZQUFZLEVBQUUsZUFBZTtRQUM3QixXQUFXLEVBQUUsV0FBVztRQUN4QixPQUFPLEVBQUUsV0FBVztRQUNwQixJQUFJLEVBQUUsbUJBQW1CO1FBQ3pCLFdBQVcsRUFBRSxXQUFXO1FBQ3hCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLGVBQWUsRUFBRSxpQkFBaUI7UUFDbEMsTUFBTSxFQUFFLGVBQWU7S0FDeEI7Q0FDRixDQUFDO0FBTUYsTUFBTSxlQUFlLEdBQTJCO0lBQzlDLE1BQU0sRUFBRSxTQUFTO0lBQ2pCLE9BQU8sRUFBRSxTQUFTO0lBQ2xCLFlBQVksRUFBRSxTQUFTO0lBQ3ZCLE9BQU8sRUFBRSxTQUFTO0lBQ2xCLFFBQVEsRUFBRSxTQUFTO0lBQ25CLFVBQVUsRUFBRSxTQUFTO0lBQ3JCLGVBQWUsRUFBRSxTQUFTO0lBQzFCLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE9BQU8sRUFBRSxTQUFTO0lBQ2xCLE9BQU8sRUFBRSxTQUFTO0lBQ2xCLGNBQWMsRUFBRSxTQUFTO0lBQ3pCLGFBQWEsRUFBRSxTQUFTO0lBQ3hCLFNBQVMsRUFBRSxTQUFTO0lBQ3BCLFlBQVksRUFBRSxTQUFTO0lBQ3ZCLFlBQVksRUFBRSxTQUFTO0lBRXZCLFdBQVcsRUFBRSxPQUFPO0lBQ3BCLGlCQUFpQixFQUFFLE9BQU87SUFDMUIsV0FBVyxFQUFFLE9BQU87SUFDcEIsbUJBQW1CLEVBQUUsT0FBTztJQUM1QixxQkFBcUIsRUFBRSxPQUFPO0lBQzlCLFFBQVEsRUFBRSxRQUFRO0lBQ2xCLGVBQWUsRUFBRSxRQUFRO0lBRXpCLE9BQU8sRUFBRSxNQUFNO0lBRWYsV0FBVyxFQUFFLEtBQUs7SUFDbEIsYUFBYSxFQUFFLEtBQUs7SUFDcEIsVUFBVSxFQUFFLEtBQUs7SUFDakIsT0FBTyxFQUFFLEtBQUs7SUFDZCxRQUFRLEVBQUUsS0FBSztJQUNmLGdCQUFnQixFQUFFLEtBQUs7SUFDdkIsa0JBQWtCLEVBQUUsS0FBSztJQUN6QixNQUFNLEVBQUUsS0FBSztJQUNiLFdBQVcsRUFBRSxLQUFLO0lBRWxCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLFNBQVMsRUFBRSxRQUFRO0lBQ25CLEtBQUssRUFBRSxRQUFRO0lBQ2YsT0FBTyxFQUFFLFFBQVE7SUFDakIsU0FBUyxFQUFFLFFBQVE7SUFDbkIsVUFBVSxFQUFFLFFBQVE7SUFDcEIsOEJBQThCLEVBQUUsUUFBUTtJQUV4QyxjQUFjLEVBQUUsUUFBUTtJQUV4QixhQUFhLEVBQUUsUUFBUTtJQUN2QixtQkFBbUIsRUFBRSxRQUFRO0lBQzdCLElBQUksRUFBRSxRQUFRO0lBQ2QsS0FBSyxFQUFFLFFBQVE7SUFDZixXQUFXLEVBQUUsUUFBUTtJQUNyQixlQUFlLEVBQUUsUUFBUTtJQUN6QixlQUFlLEVBQUUsUUFBUTtJQUV6QixNQUFNLEVBQUUsT0FBTztJQUNmLFdBQVcsRUFBRSxPQUFPO0lBQ3BCLGNBQWMsRUFBRSxPQUFPO0lBQ3ZCLHNCQUFzQixFQUFFLE9BQU87SUFDL0IsUUFBUSxFQUFFLE9BQU87Q0FDbEIsQ0FBQztBQU1GLE1BQU0sbUJBQW1CLEdBQTJDO0lBSWxFLEVBQUUsRUFBRTtRQUNGLE9BQU8sRUFBRTtZQUNQLHlCQUF5QjtZQUN6Qix3Q0FBd0M7WUFDeEMsaURBQWlEO1NBQ2xEO1FBQ0QsS0FBSyxFQUFFO1lBQ0wscUNBQXFDO1lBQ3JDLDJCQUEyQjtZQUMzQiwrQkFBK0I7U0FDaEM7UUFDRCxJQUFJLEVBQUU7WUFDSiwwQ0FBMEM7WUFDMUMsZ0NBQWdDO1lBQ2hDLDRCQUE0QjtTQUM3QjtRQUNELEdBQUcsRUFBRTtZQUNILGtDQUFrQztZQUNsQywrQkFBK0I7WUFDL0Isc0NBQXNDO1NBQ3ZDO1FBQ0QsTUFBTSxFQUFFO1lBQ04sbUNBQW1DO1lBQ25DLHdDQUF3QztZQUN4QyxrQ0FBa0M7U0FDbkM7UUFDRCxNQUFNLEVBQUU7WUFDTiwrQkFBK0I7WUFDL0IsNEJBQTRCO1lBQzVCLHVCQUF1QjtTQUN4QjtRQUNELE1BQU0sRUFBRTtZQUNOLHdCQUF3QjtZQUN4Qiw2QkFBNkI7WUFDN0IsdUNBQXVDO1NBQ3hDO1FBQ0QsTUFBTSxFQUFFO1lBQ04sa0NBQWtDO1lBQ2xDLGtDQUFrQztZQUNsQyxzQkFBc0I7U0FDdkI7UUFDRCxLQUFLLEVBQUU7WUFDTCx1QkFBdUI7WUFDdkIsdUJBQXVCO1lBQ3ZCLG1DQUFtQztTQUNwQztLQUNGO0lBSUQsRUFBRSxFQUFFO1FBQ0YsT0FBTyxFQUFFO1lBQ1Asa0JBQWtCO1lBQ2xCLCtCQUErQjtZQUMvQiw4QkFBOEI7U0FDL0I7UUFDRCxLQUFLLEVBQUU7WUFDTCwwQkFBMEI7WUFDMUIsNkJBQTZCO1lBQzdCLDRCQUE0QjtTQUM3QjtRQUNELElBQUksRUFBRTtZQUNKLDJCQUEyQjtZQUMzQixxQkFBcUI7WUFDckIsa0JBQWtCO1NBQ25CO1FBQ0QsR0FBRyxFQUFFO1lBQ0gsNkJBQTZCO1lBQzdCLDBCQUEwQjtZQUMxQix1QkFBdUI7U0FDeEI7UUFDRCxNQUFNLEVBQUU7WUFDTiwrQkFBK0I7WUFDL0IsMkJBQTJCO1lBQzNCLDJCQUEyQjtTQUM1QjtRQUNELE1BQU0sRUFBRTtZQUNOLDBCQUEwQjtZQUMxQixxQkFBcUI7WUFDckIsa0JBQWtCO1NBQ25CO1FBQ0QsTUFBTSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxFQUFFLDRCQUE0QixDQUFDO1FBQ3ZFLE1BQU0sRUFBRTtZQUNOLGlCQUFpQjtZQUNqQiwyQkFBMkI7WUFDM0IseUJBQXlCO1NBQzFCO1FBQ0QsS0FBSyxFQUFFLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLDhCQUE4QixDQUFDO0tBQ3hFO0lBSUQsRUFBRSxFQUFFO1FBQ0YsT0FBTyxFQUFFO1lBQ1AsNEJBQTRCO1lBQzVCLCtCQUErQjtZQUMvQixnQ0FBZ0M7U0FDakM7UUFDRCxLQUFLLEVBQUU7WUFDTCxnQ0FBZ0M7WUFDaEMsNkNBQTZDO1lBQzdDLGdDQUFnQztTQUNqQztRQUNELElBQUksRUFBRTtZQUNKLDRDQUE0QztZQUM1QyxrQkFBa0I7WUFDbEIseUJBQXlCO1NBQzFCO1FBQ0QsR0FBRyxFQUFFO1lBQ0gsK0JBQStCO1lBQy9CLDBCQUEwQjtZQUMxQixxQ0FBcUM7U0FDdEM7UUFDRCxNQUFNLEVBQUU7WUFDTixvQ0FBb0M7WUFDcEMsa0NBQWtDO1lBQ2xDLDRCQUE0QjtTQUM3QjtRQUNELE1BQU0sRUFBRTtZQUNOLGtDQUFrQztZQUNsQyw4QkFBOEI7WUFDOUIsd0JBQXdCO1NBQ3pCO1FBQ0QsTUFBTSxFQUFFO1lBQ04sbUNBQW1DO1lBQ25DLDRCQUE0QjtZQUM1QiwrQkFBK0I7U0FDaEM7UUFDRCxNQUFNLEVBQUU7WUFDTix1Q0FBdUM7WUFDdkMsOEJBQThCO1lBQzlCLG9CQUFvQjtTQUNyQjtRQUNELEtBQUssRUFBRTtZQUNMLG1CQUFtQjtZQUNuQixnQ0FBZ0M7WUFDaEMsNkJBQTZCO1NBQzlCO0tBQ0Y7SUFLRCxFQUFFLEVBQUU7UUFDRixPQUFPLEVBQUU7WUFDUCxvQkFBb0I7WUFDcEIsbUNBQW1DO1lBQ25DLGlDQUFpQztTQUNsQztRQUNELEtBQUssRUFBRTtZQUNMLDhCQUE4QjtZQUM5QixrQ0FBa0M7WUFDbEMsa0NBQWtDO1NBQ25DO1FBQ0QsSUFBSSxFQUFFO1lBQ0osNENBQTRDO1lBQzVDLDRCQUE0QjtZQUM1Qiw2QkFBNkI7U0FDOUI7UUFDRCxHQUFHLEVBQUU7WUFDSCxvQ0FBb0M7WUFDcEMsdUJBQXVCO1lBQ3ZCLDJCQUEyQjtTQUM1QjtRQUNELE1BQU0sRUFBRTtZQUNOLG1DQUFtQztZQUNuQyxnQ0FBZ0M7WUFDaEMsc0JBQXNCO1NBQ3ZCO1FBQ0QsTUFBTSxFQUFFO1lBQ04sa0NBQWtDO1lBQ2xDLHlCQUF5QjtZQUN6QixvQkFBb0I7U0FDckI7UUFDRCxNQUFNLEVBQUU7WUFDTix3QkFBd0I7WUFDeEIsb0JBQW9CO1lBQ3BCLDZCQUE2QjtTQUM5QjtRQUNELE1BQU0sRUFBRTtZQUNOLHNCQUFzQjtZQUN0Qiw2QkFBNkI7WUFDN0IsbUJBQW1CO1NBQ3BCO1FBQ0QsS0FBSyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLENBQUM7S0FDcEU7SUFLRCxFQUFFLEVBQUU7UUFDRixPQUFPLEVBQUU7WUFDUCxrQkFBa0I7WUFDbEIsNkJBQTZCO1lBQzdCLG9DQUFvQztTQUNyQztRQUNELEtBQUssRUFBRTtZQUNMLDBCQUEwQjtZQUMxQiwrQkFBK0I7WUFDL0IsZ0NBQWdDO1NBQ2pDO1FBQ0QsSUFBSSxFQUFFO1lBQ0osMENBQTBDO1lBQzFDLG9CQUFvQjtZQUNwQiw4QkFBOEI7U0FDL0I7UUFDRCxHQUFHLEVBQUU7WUFDSCxrQ0FBa0M7WUFDbEMsdUJBQXVCO1lBQ3ZCLHVCQUF1QjtTQUN4QjtRQUNELE1BQU0sRUFBRTtZQUNOLG9DQUFvQztZQUNwQywrQkFBK0I7WUFDL0Isb0JBQW9CO1NBQ3JCO1FBQ0QsTUFBTSxFQUFFO1lBQ04sc0JBQXNCO1lBQ3RCLDBCQUEwQjtZQUMxQixxQkFBcUI7U0FDdEI7UUFDRCxNQUFNLEVBQUU7WUFDTix1QkFBdUI7WUFDdkIsb0JBQW9CO1lBQ3BCLGtDQUFrQztTQUNuQztRQUNELE1BQU0sRUFBRTtZQUNOLG9CQUFvQjtZQUNwQix1QkFBdUI7WUFDdkIsb0JBQW9CO1NBQ3JCO1FBQ0QsS0FBSyxFQUFFO1lBQ0wsbUJBQW1CO1lBQ25CLG9CQUFvQjtZQUNwQiwyQkFBMkI7U0FDNUI7S0FDRjtJQUtELEVBQUUsRUFBRTtRQUNGLE9BQU8sRUFBRTtZQUNQLG9CQUFvQjtZQUNwQixxQ0FBcUM7WUFDckMsb0NBQW9DO1NBQ3JDO1FBQ0QsS0FBSyxFQUFFO1lBQ0wsNkJBQTZCO1lBQzdCLHlCQUF5QjtZQUN6Qiw4QkFBOEI7U0FDL0I7UUFDRCxJQUFJLEVBQUU7WUFDSiwwQ0FBMEM7WUFDMUMsNEJBQTRCO1lBQzVCLGtCQUFrQjtTQUNuQjtRQUNELEdBQUcsRUFBRTtZQUNILHVDQUF1QztZQUN2Qyw0QkFBNEI7WUFDNUIsMEJBQTBCO1NBQzNCO1FBQ0QsTUFBTSxFQUFFO1lBQ04seUNBQXlDO1lBQ3pDLHNDQUFzQztZQUN0Qyw2QkFBNkI7U0FDOUI7UUFDRCxNQUFNLEVBQUU7WUFDTix1QkFBdUI7WUFDdkIsZ0NBQWdDO1lBQ2hDLGlCQUFpQjtTQUNsQjtRQUNELE1BQU0sRUFBRTtZQUNOLDRCQUE0QjtZQUM1Qix5QkFBeUI7WUFDekIsNkJBQTZCO1NBQzlCO1FBQ0QsTUFBTSxFQUFFO1lBQ04sb0JBQW9CO1lBQ3BCLDhCQUE4QjtZQUM5QixlQUFlO1NBQ2hCO1FBQ0QsS0FBSyxFQUFFLENBQUMsZUFBZSxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDO0tBQ3JFO0NBQ0YsQ0FBQztBQUVGLE1BQU0sY0FBYyxHQUFrRDtJQUNwRSxFQUFFLEVBQUU7UUFDRixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsVUFBVSxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQzdDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyx5QkFBeUIsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUM1RCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsc0JBQXNCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDekQsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLHlCQUF5QixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQzVELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxzQkFBc0IsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUN6RCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsdUJBQXVCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7S0FDM0Q7SUFDRCxFQUFFLEVBQUU7UUFDRixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsV0FBVyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQzlDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUNwRCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsdUJBQXVCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDMUQsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQ3JELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUN2RCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsc0JBQXNCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7S0FDMUQ7SUFDRCxFQUFFLEVBQUU7UUFDRixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsNkJBQTZCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDaEUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQ3ZELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUMzRCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsMEJBQTBCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDN0QsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLFlBQVksUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCO1FBQzVELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztLQUM1RDtJQUdELEVBQUUsRUFBRTtRQUNGLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxZQUFZLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDL0MsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLHVCQUF1QixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQzFELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUN4RCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsa0JBQWtCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDckQsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLHVCQUF1QixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQzFELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQywyQkFBMkIsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztLQUMvRDtJQUdELEVBQUUsRUFBRTtRQUNGLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxZQUFZLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDL0MsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQ3hELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxxQkFBcUIsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUN4RCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsNEJBQTRCLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDL0QsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLG9CQUFvQixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQ3ZELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQywwQkFBMEIsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztLQUM5RDtJQUdELEVBQUUsRUFBRTtRQUNGLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtRQUNwRCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxvQkFBb0I7UUFDdkQsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLDRCQUE0QixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO1FBQy9ELENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyx1QkFBdUIsUUFBUSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRztRQUMxRCxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxvQkFBb0I7UUFDdkQsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLHFCQUFxQixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHO0tBQ3pEO0NBQ0YsQ0FBQztBQU1GLFNBQVMsNkJBQTZCLENBQ3BDLFVBQWtCLEVBQ2xCLE1BQWtCLEVBQ2xCLElBQVUsRUFDVixPQUFPLEdBQUcsQ0FBQyxFQUNYLGNBQWMsR0FBRyxDQUFDOztJQUVsQixNQUFNLFFBQVEsR0FBRyxNQUFBLGFBQWEsQ0FBQyxJQUFJLENBQUMsbUNBQUksYUFBYSxDQUFDLEVBQUUsQ0FBQztJQUN6RCxNQUFNLE9BQU8sR0FBRyxNQUFBLG1CQUFtQixDQUFDLElBQUksQ0FBQyxtQ0FBSSxtQkFBbUIsQ0FBQyxFQUFFLENBQUM7SUFDcEUsTUFBTSxTQUFTLEdBQUcsTUFBQSxjQUFjLENBQUMsSUFBSSxDQUFDLG1DQUFJLGNBQWMsQ0FBQyxFQUFFLENBQUM7SUFFNUQsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUU3RSxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsV0FBQyxPQUFBLE1BQUEsUUFBUSxDQUFDLENBQUMsQ0FBQyxtQ0FBSSxDQUFDLENBQUEsRUFBQSxDQUFDLENBQUM7SUFDakQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRWpELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxXQUFDLE9BQUEsTUFBQSxlQUFlLENBQUMsQ0FBQyxDQUFDLG1DQUFJLE9BQU8sQ0FBQSxFQUFBLENBQUMsQ0FBQztJQUMvRCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFcEMsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBRWxDLE1BQU0sV0FBVyxHQUFHLE1BQU07U0FDdkIsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDakQsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN0QyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUM7SUFFbEMsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUN2QixDQUFDO0FBTUQsTUFBTSw4Q0FBOEMsR0FBRyxDQUNyRCxHQUFZLEVBQ1osR0FBYSxFQUNiLEVBQUU7O0lBQ0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1FBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXRDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxrQkFBUSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3pELE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFFRCxNQUFNLEVBQ0osS0FBSyxHQUFHLEtBQUssRUFDYixJQUFJLEdBQUcsSUFBSSxFQUNYLE9BQU8sR0FBRyxDQUFDLEVBQ1gsY0FBYyxHQUFHLENBQUMsRUFFbEIsSUFBSSxHQUNMLEdBQUcsTUFBQSxHQUFHLENBQUMsSUFBSSxtQ0FBSSxFQUFFLENBQUM7UUFFbkIsTUFBTSxRQUFRLEdBQUcsTUFBTSxrQkFBUSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFDNUQsSUFBSSxFQUFFLGlCQUFpQjtZQUN2QixLQUFLLEVBQUUsT0FBTztZQUNkLE1BQU0sRUFBRSxPQUFPO1NBQ2hCLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxRQUFRO1lBQ1gsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxDQUFDLENBQUM7UUFFcEUsTUFBTSxNQUFNLEdBQWdCLENBQUMsTUFBQSxRQUFRLENBQUMsZUFBZSxtQ0FBSSxFQUFFLENBQVc7YUFDbkUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDVCxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssUUFBUSxJQUFJLE9BQU8sQ0FBQyxDQUFDLEtBQUssS0FBSyxRQUFRO1lBQ3ZELENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFO1lBQ3BCLENBQUMsQ0FBQyxJQUFJLENBQ1Q7YUFDQSxNQUFNLENBQUMsT0FBTyxDQUFlLENBQUM7UUFHakMsTUFBTSxRQUFRLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDdEUsTUFBTSxZQUFZLEdBQUksUUFBZ0IsQ0FBQyxRQUE0QixDQUFDO1FBRXBFLE1BQU0sZUFBZSxHQUFHLENBQUMsQ0FBTSxFQUFhLEVBQUUsQ0FDNUMsT0FBTyxDQUFDLEtBQUssUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFNUUsTUFBTSxTQUFTLEdBQVMsZUFBZSxDQUFDLElBQUksQ0FBQztZQUMzQyxDQUFDLENBQUMsSUFBSTtZQUNOLENBQUMsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDO2dCQUM3QixDQUFDLENBQUMsWUFBWTtnQkFDZCxDQUFDLENBQUMsUUFBUSxDQUFDO1FBRWYsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyw2QkFBNkIsQ0FDakQsTUFBTSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFDcEIsTUFBTSxFQUNOLFNBQVMsRUFDVCxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsRUFDeEIsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQy9CLENBQUM7UUFFRixNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FDbEMsQ0FBRSxRQUFnQixDQUFDLFVBQVUsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FDNUMsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFHLEtBQUssSUFBSSxDQUFDLG9CQUFvQixDQUFDO1FBR25ELElBQUksSUFBSSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLFFBQWdCLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztZQU1uQyxNQUFNLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4QixDQUFDO1FBRUQsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMxQixPQUFPLEVBQUUsSUFBSTtnQkFDWCxDQUFDLENBQUMsV0FBVztvQkFDWCxDQUFDLENBQUMsa0NBQWtDO29CQUNwQyxDQUFDLENBQUMsK0JBQStCO2dCQUNuQyxDQUFDLENBQUMscUNBQXFDO1lBQ3pDLElBQUksRUFBRSxTQUFTO1lBQ2YsSUFBSTtZQUNKLEdBQUc7WUFDSCxLQUFLLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSxXQUFXLENBQUM7WUFDbkMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxNQUFNO1NBQzNCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5Q0FBeUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRSxPQUFPLEdBQUc7YUFDUCxNQUFNLENBQUMsR0FBRyxDQUFDO2FBQ1gsSUFBSSxDQUFDLEVBQUUsT0FBTyxFQUFFLDZDQUE2QyxFQUFFLENBQUMsQ0FBQztJQUN0RSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUFNRixTQUFTLG9CQUFvQixDQUFDLE1BQWU7SUFDM0MsTUFBTSxDQUFDLEdBQUcsT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUdqRSxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDbEMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ2xDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQztJQUNsQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDO1FBQUUsT0FBTyxJQUFJLENBQUM7SUFDbEMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDO0lBQ2xDLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLE9BQWlCOztJQUNwQyxNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztJQUN4QyxLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU87UUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLE1BQUEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsbUNBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDL0QsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztTQUMvQixJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQzNCLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQy9CLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxLQUFlLEVBQUUsSUFBVTtJQUMzQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUNwQixPQUFPLElBQUksS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQztJQUNyRSxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO1FBQ3BCLE9BQU8sSUFBSSxLQUFLLElBQUk7WUFDbEIsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUMvQixDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDbkMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckMsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDNUMsT0FBTyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssU0FBUyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxFQUFFLENBQUM7QUFDekUsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLElBQVk7SUFDN0IsSUFBSSxDQUFDLEdBQUcsVUFBVSxDQUFDO0lBQ25CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDckMsQ0FBQyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEIsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFDRCxJQUFJLEtBQUssR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3BCLE9BQU8sR0FBRyxFQUFFO1FBQ1YsS0FBSyxJQUFJLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDckIsS0FBSyxJQUFJLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDdEIsS0FBSyxJQUFJLEtBQUssSUFBSSxDQUFDLENBQUM7UUFDcEIsT0FBTyxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUM7SUFDcEMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUVELFNBQVMsSUFBSSxDQUFJLEdBQWlCLEVBQUUsR0FBUTtJQUMxQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxLQUFVLEVBQUUsR0FBVyxFQUFFLEdBQVc7SUFDcEQsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3hCLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUFFLE9BQU8sR0FBRyxDQUFDO0lBQ3BDLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQztBQU1ELGtCQUFlO0lBQ2Isa0NBQWtDO0lBQ2xDLG1CQUFtQjtJQUNuQiw4Q0FBOEM7Q0FDL0MsQ0FBQyJ9