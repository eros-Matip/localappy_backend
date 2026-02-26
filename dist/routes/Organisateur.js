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
const Event_1 = __importDefault(require("../models/Event"));
const Establishment_1 = __importDefault(require("../models/Establishment"));
const Event_2 = __importDefault(require("../models/Event"));
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
router.get("/organisateurs", AdminIsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const events = yield Event_1.default.find().select("organizer").lean();
        const uniqueOrganizersMap = new Map();
        for (const event of events) {
            const organizer = event.organizer;
            if (organizer) {
                const key = [
                    ((_a = organizer.legalName) === null || _a === void 0 ? void 0 : _a.toLowerCase().trim()) || "",
                    ((_b = organizer.email) === null || _b === void 0 ? void 0 : _b.toLowerCase().trim()) || "",
                    ((_c = organizer.phone) === null || _c === void 0 ? void 0 : _c.toLowerCase().trim()) || "",
                ].join("|");
                if (!uniqueOrganizersMap.has(key)) {
                    uniqueOrganizersMap.set(key, organizer);
                }
            }
        }
        const uniqueOrganizers = Array.from(uniqueOrganizersMap.values());
        const createdEstablishments = [];
        for (const org of uniqueOrganizers) {
            const exists = yield Establishment_1.default.findOne({
                name: org.legalName,
                phone: org.phone,
            });
            if (!exists) {
                const newEstablishment = new Establishment_1.default({
                    name: org.legalName,
                    email: org.email,
                    phone: org.phone,
                });
                yield newEstablishment.save();
                createdEstablishments.push(newEstablishment);
            }
        }
        return res.status(200).json({
            message: "Établissements créés depuis organisateurs uniques",
            countCreated: createdEstablishments.length,
            establishments: createdEstablishments,
        });
    }
    catch (error) {
        console.error("Erreur lors de la création des établissements :", error);
        return res.status(500).json({
            message: "Erreur serveur lors de la création des établissements",
            error,
        });
    }
}));
router.get("/events/assignToEstablishments", AdminIsAuthenticated_1.default, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const etablissements = yield Establishment_1.default.find();
        const events = yield Event_2.default.find({
            "organizer.establishment": { $exists: false },
            "organizer.legalName": { $ne: null },
        }, { title: 1, "organizer.legalName": 1 });
        console.log(`📦 ${events.length} événements non liés à traiter...`);
        let eventsUpdated = 0;
        let etablissementsUpdated = 0;
        for (const event of events) {
            const legalName = (_b = (_a = event.organizer) === null || _a === void 0 ? void 0 : _a.legalName) === null || _b === void 0 ? void 0 : _b.trim();
            if (!legalName)
                continue;
            const etab = etablissements.find((e) => { var _a; return ((_a = e.name) === null || _a === void 0 ? void 0 : _a.trim().toLowerCase()) === legalName.toLowerCase(); });
            if (!etab) {
                console.warn(`❌ Aucun établissement trouvé pour : "${legalName}"`);
                continue;
            }
            yield Event_2.default.updateOne({ _id: event._id }, { $set: { "organizer.establishment": etab._id } });
            console.log(`📌 Événement "${event.title}" lié à l’établissement "${etab.name}"`);
            eventsUpdated++;
            if (!((_c = etab.events) === null || _c === void 0 ? void 0 : _c.some((e) => e.toString() === event._id.toString()))) {
                yield Establishment_1.default.updateOne({ _id: etab._id }, { $addToSet: { events: event._id } });
                console.log(`➕ Ajout de l’événement "${event.title}" à "${etab.name}"`);
                etablissementsUpdated++;
            }
        }
        return res.status(200).json({
            message: "✅ Liens événements ↔ établissements mis à jour.",
            eventsUpdated,
            etablissementsUpdated,
        });
    }
    catch (error) {
        console.error("💥 Erreur serveur :", error);
        return res.status(500).json({
            message: "Erreur serveur lors du lien événements/établissements",
            error,
        });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3JnYW5pc2F0ZXVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9PcmdhbmlzYXRldXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBcUQ7QUFDckQsNERBQXlDO0FBQ3pDLDRFQUFvRDtBQUVwRCw0REFBb0M7QUFDcEMsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSxDQUFDLEdBQUcsQ0FDUixnQkFBZ0IsRUFDaEIsOEJBQW9CLEVBQ3BCLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxFQUFFOztJQUNwQyxJQUFJLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFbEUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsRUFHaEMsQ0FBQztRQUVKLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7WUFDM0IsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQztZQUNsQyxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNkLE1BQU0sR0FBRyxHQUFHO29CQUNWLENBQUEsTUFBQSxTQUFTLENBQUMsU0FBUywwQ0FBRSxXQUFXLEdBQUcsSUFBSSxFQUFFLEtBQUksRUFBRTtvQkFDL0MsQ0FBQSxNQUFBLFNBQVMsQ0FBQyxLQUFLLDBDQUFFLFdBQVcsR0FBRyxJQUFJLEVBQUUsS0FBSSxFQUFFO29CQUMzQyxDQUFBLE1BQUEsU0FBUyxDQUFDLEtBQUssMENBQUUsV0FBVyxHQUFHLElBQUksRUFBRSxLQUFJLEVBQUU7aUJBQzVDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUVaLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVB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