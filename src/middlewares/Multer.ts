import { randomBytes } from "crypto";
import { Options, diskStorage } from "multer";

export const multerConfig = {
  storage: diskStorage({
    filename: (req, file, callback) => {
      const formatsImage = ["image/jpeg", "image/jpg", "image/png"];
      randomBytes(16, (error, hash) => {
        if (error) {
          callback(error, file.filename);
        }
        if (file.mimetype.includes("application/pdf")) {
          const applicationFilename = `${hash.toString("hex")}${file.mimetype.replace("application/", ".")}`;
          callback(null, applicationFilename);
        } else if (formatsImage.includes(file.mimetype)) {
          const imageFilename = `${hash.toString("hex")}${file.mimetype.replace("image/", ".")}`;
          callback(null, imageFilename);
        } else {
          const audioFilename = `${hash.toString("hex")}${file.mimetype.replace("audio/", ".")}`;
          callback(null, audioFilename);
        }
      });
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, //5MB
  },

  fileFilter: (req, file, callback) => {
    const formats = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
      "audio/mpeg",
    ];
    if (formats.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error("Format not accepted"));
    }
  },
} as Options;
