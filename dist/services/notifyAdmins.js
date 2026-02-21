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
exports.notifyAdminsNewOwner = notifyAdminsNewOwner;
exports.notifyAdminsNewEstablishment = notifyAdminsNewEstablishment;
exports.notifyAdminsActivationRequest = notifyAdminsActivationRequest;
const Admin_1 = __importDefault(require("../models/Admin"));
const expo_server_sdk_1 = require("expo-server-sdk");
const expo = new expo_server_sdk_1.Expo();
function sendToAdmins(messages) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!messages.length)
            return;
        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
            yield expo.sendPushNotificationsAsync(chunk);
        }
    });
}
function notifyAdminsNewOwner(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const admins = yield Admin_1.default.find({ expoPushToken: { $exists: true, $ne: null } }, { expoPushToken: 1 }).lean();
        const messages = [];
        for (const admin of admins) {
            const token = admin.expoPushToken;
            if (!token || !expo_server_sdk_1.Expo.isExpoPushToken(token))
                continue;
            messages.push({
                to: token,
                sound: "default",
                title: "Nouveau compte Organisateur créé",
                body: `${params.ownerFirstname} ${params.ownerName} vient de créer un compte.`,
                data: Object.assign({ type: "NEW_OWNER_CREATED" }, params),
            });
        }
        yield sendToAdmins(messages);
    });
}
function notifyAdminsNewEstablishment(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const admins = yield Admin_1.default.find({ expoPushToken: { $exists: true, $ne: null } }, { expoPushToken: 1 }).lean();
        const messages = [];
        for (const admin of admins) {
            const token = admin.expoPushToken;
            if (!token || !expo_server_sdk_1.Expo.isExpoPushToken(token))
                continue;
            const label = params.legalForm === "association" ? "Association" : "Entreprise";
            messages.push({
                to: token,
                sound: "default",
                title: `Nouvel établissement (${label})`,
                body: `${params.establishmentName} a été créé par ${params.ownerFirstname} ${params.ownerName}.`,
                data: Object.assign({ type: "NEW_ESTABLISHMENT_CREATED" }, params),
            });
        }
        yield sendToAdmins(messages);
    });
}
function notifyAdminsActivationRequest(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const admins = yield Admin_1.default.find({ expoPushToken: { $exists: true, $ne: null } }, { expoPushToken: 1 }).lean();
        const messages = [];
        for (const admin of admins) {
            const token = admin.expoPushToken;
            if (!token || !expo_server_sdk_1.Expo.isExpoPushToken(token))
                continue;
            const label = params.legalForm === "association" ? "Association" : "Entreprise";
            messages.push({
                to: token,
                sound: "default",
                title: `Demande d’activation (${label})`,
                body: `${params.establishmentName} — demande par ${params.ownerFirstname} ${params.ownerName}.`,
                data: Object.assign({ type: "ESTABLISHMENT_ACTIVATION_REQUEST" }, params),
            });
        }
        yield sendToAdmins(messages);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZ5QWRtaW5zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3NlcnZpY2VzL25vdGlmeUFkbWlucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQWNBLG9EQTJCQztBQUVELG9FQWdDQztBQUdELHNFQWdDQztBQTlHRCw0REFBb0M7QUFDcEMscURBQXdEO0FBRXhELE1BQU0sSUFBSSxHQUFHLElBQUksc0JBQUksRUFBRSxDQUFDO0FBRXhCLFNBQWUsWUFBWSxDQUFDLFFBQTJCOztRQUNyRCxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU07WUFBRSxPQUFPO1FBRTdCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNyRCxLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzNCLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQy9DLENBQUM7SUFDSCxDQUFDO0NBQUE7QUFFRCxTQUFzQixvQkFBb0IsQ0FBQyxNQUsxQzs7UUFDQyxNQUFNLE1BQU0sR0FBRyxNQUFNLGVBQUssQ0FBQyxJQUFJLENBQzdCLEVBQUUsYUFBYSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFDL0MsRUFBRSxhQUFhLEVBQUUsQ0FBQyxFQUFFLENBQ3JCLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFVCxNQUFNLFFBQVEsR0FBc0IsRUFBRSxDQUFDO1FBRXZDLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFLENBQUM7WUFDM0IsTUFBTSxLQUFLLEdBQUksS0FBYSxDQUFDLGFBQWEsQ0FBQztZQUMzQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsc0JBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDO2dCQUFFLFNBQVM7WUFFckQsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFD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