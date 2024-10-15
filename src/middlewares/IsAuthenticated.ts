import { Request, Response, NextFunction } from "express";
const CryptoJS = require("crypto-js");
import Customer from "../models/Customer";

const AdminIsAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.headers.authorization) {
    const CustomerFinded = await Customer.findOne({
      token: req.headers.authorization.replace("Bearer ", ""),
    });
    if (req.originalUrl.split("/").includes("test") === false) {
      const toFind = `${req.originalUrl.split("/")[2].split("")[0].toUpperCase()}_${req.originalUrl.split("/")[1]}`;
      if (!CustomerFinded || !CustomerFinded?.premiumStatus) {
        return res.status(401).json({ error: "Unauthorized" });
      } else {
        req.body.admin = CustomerFinded;
        return next();
      }
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  } else {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
export default AdminIsAuthenticated;
