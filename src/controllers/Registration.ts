import { NextFunction, Request, Response } from "express";

// Models
import Registration from "../models/Registration";

const readRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const registrationId = req.params.registrationId;

  return Registration.findById(registrationId)
    .then((registration) =>
      registration
        ? res.status(200).json({ message: registration })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

const readAll = async (req: Request, res: Response, next: NextFunction) => {
  return Registration.find()
    .then((registrations) => res.status(200).json({ message: registrations }))
    .catch((error) => res.status(500).json({ error: error.message }));
};

const updateRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const registrationId = req.params.registrationId;
  return Registration.findById(registrationId).then(async (registration) => {
    if (!registration) {
      return res.status(404).json({ message: "Not found" });
    } else {
      registration.set(req.body);
      return registration
        .save()
        .then((registration) =>
          res.status(201).json({ registration: registration })
        )
        .catch((error) => res.status(500).json({ error: error.message }));
    }
  });
};

const deleteRegistration = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const registrationId = req.params.registrationId;

  return Registration.findByIdAndDelete(registrationId)
    .then((registration) =>
      registration
        ? res.status(200).json({ message: "CRE is deleted" })
        : res.status(404).json({ message: "Not found" })
    )
    .catch((error) => res.status(500).json({ error: error.message }));
};

export default {
  readRegistration,
  readAll,
  updateRegistration,
  deleteRegistration,
};
