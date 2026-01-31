import { randomBytes } from "crypto";
import { Options, diskStorage } from "multer";

export const multerConfig = {
  storage: diskStorage({
    filename: (req, file, callback) => {
      const extensions: Record<string, string> = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/heic": ".heic",
        "image/heif": ".heif",
        "application/pdf": ".pdf",
        "audio/mpeg": ".mp3",
        "video/quicktime": ".mov",
      };

      randomBytes(16, (error, hash) => {
        if (error) return callback(error, file.originalname);

        const ext = extensions[file.mimetype];
        if (!ext) {
          return callback(
            new Error(`Format not accepted: ${file.mimetype}`),
            file.originalname,
          );
        }

        callback(null, `${hash.toString("hex")}${ext}`);
      });
    },
  }),

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter: (req, file, callback) => {
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/heic",
      "image/heif",
      "application/pdf",
      "audio/mpeg",
      "video/quicktime",
    ];

    if (allowed.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error(`Format not accepted: ${file.mimetype}`));
    }
  },
} as Options;
