import express, { Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
import Retour from "../library/Retour";
import AdminIsAuthenticated from "../middlewares/IsAuthenticated";

import Customer from "../models/Customer";
import Owner from "../models/Owner";
import Admin from "../models/Admin";

const router = express.Router();

router.post(
  "/login",
  AdminIsAuthenticated,
  async (req: Request, res: Response) => {
    try {
      if (req.body.admin) {
        const customerFindedByToken = await Customer.findById(
          req.body.admin
        ).populate([
          { path: "themesFavorites", model: "Theme" },
          { path: "eventsFavorites", model: "Event" },
          { path: "ownerAccount", model: "Owner", populate: "establishments" },
        ]);

        if (!customerFindedByToken) {
          return res.status(404).json({ message: "Customer not found" });
        }

        if (req.body.expoPushToken) {
          customerFindedByToken.expoPushToken = req.body.expoPushToken;
          await customerFindedByToken.save();
        }

        return res.status(200).json({
          message: "Logged in with token",
          customer: customerFindedByToken,
        });
      }

      const { email, password, expoPushToken } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const [customerFinded, adminFinded] = await Promise.all([
        Customer.findOne({ email }).populate([
          { path: "themesFavorites", model: "Theme" },
          { path: "eventsFavorites", model: "Event" },
          { path: "ownerAccount", model: "Owner", populate: "establishments" },
        ]),
        Admin.findOne({ email }),
      ]);

      if (!customerFinded && !adminFinded) {
        Retour.error("Account was not found");
        return res.status(401).json({ message: "Account was not found" });
      }

      let ownerFinded = null;
      if (customerFinded?.ownerAccount) {
        ownerFinded = await Owner.findById(customerFinded.ownerAccount);
      }

      const hashToLog = customerFinded
        ? SHA256(password + customerFinded.salt).toString(encBase64)
        : null;

      const adminHashToLog = adminFinded
        ? SHA256(password + adminFinded.salt).toString(encBase64)
        : null;

      if (customerFinded && hashToLog && hashToLog === customerFinded.hash) {
        Retour.log(
          `${customerFinded.account.firstname} ${customerFinded.account.name} is logged`
        );

        const newToken: string = uid2(26);
        customerFinded.token = newToken;

        if (ownerFinded) {
          ownerFinded.token = newToken;
          await ownerFinded.save();
        }

        if (expoPushToken) {
          customerFinded.expoPushToken = expoPushToken;
        }

        await customerFinded.save();

        return res.status(200).json({
          message: "Logged in with email and password",
          customer: customerFinded,
        });
      } else if (
        adminFinded &&
        adminHashToLog &&
        adminHashToLog === adminFinded.hash
      ) {
        return res.status(200).json({
          message: "Admin logged in successfully",
          admin: {
            id: adminFinded._id,
            email: adminFinded.email,
            account: adminFinded.account,
          },
        });
      } else {
        Retour.error("Invalid password");
        return res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      Retour.error({ message: "Error caught", error });
      return res.status(500).json({ message: "Error caught", error });
    }
  }
);

export default router;
