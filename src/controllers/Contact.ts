import { NextFunction, Request, Response } from "express";
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");

// Models
import Contact from "../models/Contact";

const createContact = async (req: Request, res: Response) => {
  const { email, name, content } = req.body;

  const contact = new Contact({
    email,
    name,
    content,
  });

  return await contact
    .save()
    .then((contact) =>
      res.status(201).json({ message: "Contact created", contact: contact })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

const readContact = async (req: Request, res: Response, next: NextFunction) => {
  const contactId = req.params.contactId;

  return await Contact.findById(contactId)
    .then((contact) =>
      contact
        ? res.status(200).json({ message: contact })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

const deleteContact = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const contactId = req.params.contactId;

  return await Contact.findByIdAndDelete(contactId)
    .then((contact) =>
      contact
        ? res.status(200).json({ message: "Contact is deleted" })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

export default {
  createContact,
  readContact,
  deleteContact,
};
