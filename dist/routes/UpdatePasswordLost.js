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
const Retour_1 = __importDefault(require("../library/Retour"));
const Customer_1 = __importDefault(require("../models/Customer"));
const Owner_1 = __importDefault(require("../models/Owner"));
const Admin_1 = __importDefault(require("../models/Admin"));
const mailersend_1 = require("mailersend");
const router = express_1.default.Router();
router.post("/updatePasswordLosted", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!process.env.MAILERSEND_KEY) {
            throw new Error("MAILERSEND_KEY est manquant dans les variables d'environnement.");
        }
        const mailerSend = new mailersend_1.MailerSend({
            apiKey: process.env.MAILERSEND_KEY,
        });
        const sender = new mailersend_1.Sender("noreply@localappy.fr", "Localappy Support");
        const email = req.body.email;
        const customerFinded = yield Customer_1.default.findOne({ email });
        const ownerFinded = yield Owner_1.default.findOne({ email });
        const adminFinded = yield Admin_1.default.findOne({ email });
        const utilisateurFinded = customerFinded || ownerFinded || adminFinded;
        if (!utilisateurFinded) {
            Retour_1.default.info("Utilisateur introuvable");
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }
        const randomStr = (len, arr) => {
            let ans = "";
            for (let i = len; i > 0; i--) {
                ans += arr[Math.floor(Math.random() * arr.length)];
            }
            return ans;
        };
        const newPassword = randomStr(9, "1234567890abcdefghijklmnoqprstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
        utilisateurFinded.passwordLosted = utilisateurFinded.passwordLosted || {};
        utilisateurFinded.passwordLosted.status = true;
        utilisateurFinded.passwordLosted.code = newPassword;
        yield utilisateurFinded.save();
        const recipient = new mailersend_1.Recipient(utilisateurFinded.email, utilisateurFinded.email);
        const personalization = [
            {
                email: utilisateurFinded.email,
                data: {
                    code: newPassword,
                },
            },
        ];
        const emailParams = new mailersend_1.EmailParams()
            .setFrom(sender)
            .setTo([recipient])
            .setSubject("Réinitialisation de votre mot de passe")
            .setTemplateId("neqvygm5v3z40p7w")
            .setPersonalization(personalization);
        yield mailerSend.email.send(emailParams);
        return res
            .status(200)
            .json({ message: "Un nouveau mot de passe a été envoyé par email." });
    }
    catch (error) {
        Retour_1.default.info({ message: "Erreur attrapée", error });
        return res
            .status(500)
            .json({ message: "Une erreur est survenue.", error });
    }
}));
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXBkYXRlUGFzc3dvcmRMb3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9VcGRhdGVQYXNzd29yZExvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzREFBbUU7QUFDbkUsK0RBQXVDO0FBQ3ZDLGtFQUEwQztBQUMxQyw0REFBb0M7QUFDcEMsNERBQW9DO0FBQ3BDLDJDQUF3RTtBQUV4RSxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sQ0FBQyxJQUFJLENBQ1QsdUJBQXVCLEVBQ3ZCLENBQU8sR0FBWSxFQUFFLEdBQWEsRUFBRSxJQUFrQixFQUFFLEVBQUU7SUFDeEQsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDaEMsTUFBTSxJQUFJLEtBQUssQ0FDYixpRUFBaUUsQ0FDbEUsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLHVCQUFVLENBQUM7WUFDaEMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYztTQUNuQyxDQUFDLENBQUM7UUFFSCxNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFNLENBQUMsc0JBQXNCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUV2RSxNQUFNLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUc3QixNQUFNLGNBQWMsR0FBRyxNQUFNLGtCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUN6RCxNQUFNLFdBQVcsR0FBRyxNQUFNLGVBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sV0FBVyxHQUFHLE1BQU0sZUFBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFH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