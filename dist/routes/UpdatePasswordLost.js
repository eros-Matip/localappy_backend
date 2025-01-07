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
const express = require("express");
const Retour_1 = __importDefault(require("../library/Retour"));
const mailersend_1 = require("mailersend");
const googleapis_1 = require("googleapis");
const Customer_1 = __importDefault(require("../models/Customer"));
const Owner_1 = __importDefault(require("../models/Owner"));
const nodemailer = require("nodemailer");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const mailerSend = new mailersend_1.MailerSend({
    apiKey: `${process.env.MAILERSEND_KEY}`,
});
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const oAuth2Client = new googleapis_1.google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
const updatePasswordLosted = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = req.body.email;
        const customerFinded = yield Customer_1.default.findOne({ email });
        const ownerFinded = yield Owner_1.default.findOne({ email });
        const utilisateurFinded = customerFinded || ownerFinded;
        if (utilisateurFinded) {
            const randomStr = (len, arr) => {
                let ans = "";
                for (let i = len; i > 0; i--) {
                    ans += arr[Math.floor(Math.random() * arr.length)];
                }
                return ans;
            };
            const newPassword = randomStr(9, "1234567890abcdefghijklmnoqprstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
            utilisateurFinded.passwordLosted = {
                status: true,
                code: newPassword,
            };
            const sentFrom = new mailersend_1.Sender("MS_cV2Ndk@reseau-acor.com", "contact@a-co-r.com");
            const recipients = [new mailersend_1.Recipient(utilisateurFinded.email)];
            const emailParams = new mailersend_1.EmailParams()
                .setFrom(sentFrom)
                .setTo(recipients)
                .setReplyTo(sentFrom)
                .setSubject("Réinitialisation de mot de passe")
                .setTemplateId("ynrw7gy6mmjl2k8e");
            const variables = [
                {
                    email: utilisateurFinded.email,
                    substitutions: [
                        { var: "nom", value: utilisateurFinded.account.name },
                        { var: "code", value: newPassword },
                        { var: "prenom", value: utilisateurFinded.account.firstname },
                    ],
                },
            ];
            yield mailerSend.email.send(emailParams);
            yield utilisateurFinded.save();
            return res.status(200).json({ message: "Nouveau mot de passe envoyé." });
        }
        else {
            Retour_1.default.info("Utilisateur introuvable");
            return res.status(404).json("Utilisateur introuvable");
        }
    }
    catch (error) {
        Retour_1.default.info({ message: "Erreur attrapée", error });
        return res.status(500).json({ message: "Une erreur est survenue.", error });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXBkYXRlUGFzc3dvcmRMb3N0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9VcGRhdGVQYXNzd29yZExvc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFBQSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFFbkMsK0RBQXVDO0FBQ3ZDLDJDQUF3RTtBQUN4RSwyQ0FBb0M7QUFDcEMsa0VBQTBDO0FBQzFDLDREQUFvQztBQUVwQyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7QUFDekMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDM0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDbEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLE1BQU0sVUFBVSxHQUFHLElBQUksdUJBQVUsQ0FBQztJQUNoQyxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRTtDQUN4QyxDQUFDLENBQUM7QUFFSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQztBQUN4QyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQztBQUNoRCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztBQUM5QyxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQztBQUVoRCxNQUFNLFlBQVksR0FBRyxJQUFJLG1CQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FDekMsU0FBUyxFQUNULGFBQWEsRUFDYixZQUFZLENBQ2IsQ0FBQztBQUNGLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLENB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