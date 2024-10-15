import { Request, Response } from "express";
import Retour from "../library/Retour";
import Owner from "../models/Owner";
import Customer from "../models/Customer";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");

const loginRoute = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const ownerFinded = await Owner.findOne({ email: email });
    const customerFinded = await Customer.findOne({ email: email });

    if (ownerFinded) {
      const hashToLog: string = SHA256(password + ownerFinded.salt).toString(
        encBase64
      );
      if (hashToLog === ownerFinded.hash) {
        Retour.log(
          `${ownerFinded.account.firstname} ${ownerFinded.account.name} is logged`
        );
        return res.status(200).json({ message: "Logged", ownerFinded });
      } else {
        Retour.error("not authorized to connect");
        return res.status(401).json({ message: "not authorized to connect" });
      }
    } else if (customerFinded) {
      const hashToLog: string = SHA256(password + customerFinded.salt).toString(
        encBase64
      );
      if (hashToLog === customerFinded.hash) {
        Retour.log(
          `${customerFinded.account.firstname} ${customerFinded.account.name} is logged`
        );
        return res.status(200).json({ message: "Logged", customerFinded });
      } else {
        Retour.error("not authorized to connect");
        return res.status(401).json({ message: "not authorized to connect" });
      }
    } else {
      Retour.error("Account was not found");
      return res.status(401).json({ message: "Account was not found" });
    }
  } catch (error) {
    Retour.error({ message: "error catched", error });
    return res.status(500).json({ message: "error catched", error });
  }
};

export default loginRoute;
