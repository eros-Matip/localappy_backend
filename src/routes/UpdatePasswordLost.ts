const express = require("express");
import { NextFunction, Request, Response } from "express";
import Retour from "../library/Retour";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
import { google } from "googleapis";
import Customer from "../models/Customer";
import Owner from "../models/Owner";

const nodemailer = require("nodemailer");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

const mailerSend = new MailerSend({
  apiKey: `${process.env.MAILERSEND_KEY}`,
});

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const updatePasswordLosted = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const email = req.body.email;

    // Rechercher dans les modèles Customer et Owner
    const customerFinded = await Customer.findOne({ email });
    const ownerFinded = await Owner.findOne({ email });

    // Vérifier si l'utilisateur existe dans l'un des modèles
    const utilisateurFinded = customerFinded || ownerFinded;

    if (utilisateurFinded) {
      // Fonction pour générer une chaîne aléatoire
      const randomStr = (len: number, arr: string): string => {
        let ans = "";
        for (let i = len; i > 0; i--) {
          ans += arr[Math.floor(Math.random() * arr.length)];
        }
        return ans;
      };

      // Génération d'un nouveau mot de passe, sel et hash
      const newPassword = randomStr(
        9,
        "1234567890abcdefghijklmnoqprstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
      );

      // Mise à jour des champs
      utilisateurFinded.passwordLosted = {
        status: true,
        code: newPassword,
      };

      // Préparer les variables pour l'email
      const sentFrom = new Sender(
        "MS_cV2Ndk@reseau-acor.com",
        "contact@a-co-r.com"
      );
      const recipients = [new Recipient(utilisateurFinded.email)];
      const emailParams = new EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setReplyTo(sentFrom)
        .setSubject("Réinitialisation de mot de passe")
        .setTemplateId("ynrw7gy6mmjl2k8e");

      // Ajout des variables au moment de l'envoi
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

      // Envoyer l'email et sauvegarder les modifications
      await mailerSend.email.send(emailParams);
      await utilisateurFinded.save();

      return res.status(200).json({ message: "Nouveau mot de passe envoyé." });
    } else {
      Retour.info("Utilisateur introuvable");
      return res.status(404).json("Utilisateur introuvable");
    }
  } catch (error) {
    Retour.info({ message: "Erreur attrapée", error });
    return res.status(500).json({ message: "Une erreur est survenue.", error });
  }
};
