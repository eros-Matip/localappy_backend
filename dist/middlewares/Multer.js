"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerConfig = void 0;
const crypto_1 = require("crypto");
const multer_1 = require("multer");
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        filename: (req, file, callback) => {
            const extensions = {
                "image/jpeg": ".jpg",
                "image/jpg": ".jpg",
                "image/png": ".png",
                "image/heic": ".heic",
                "image/heif": ".heif",
                "application/pdf": ".pdf",
                "audio/mpeg": ".mp3",
                "video/quicktime": ".mov",
            };
            (0, crypto_1.randomBytes)(16, (error, hash) => {
                if (error)
                    return callback(error, file.originalname);
                const ext = extensions[file.mimetype];
                if (!ext) {
                    return callback(new Error(`Format not accepted: ${file.mimetype}`), file.originalname);
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
        }
        else {
            callback(new Error(`Format not accepted: ${file.mimetype}`));
        }
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTXVsdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL011bHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBcUM7QUFDckMsbUNBQThDO0FBRWpDLFFBQUEsWUFBWSxHQUFHO0lBQzFCLE9BQU8sRUFBRSxJQUFBLG9CQUFXLEVBQUM7UUFDbkIsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUNoQyxNQUFNLFVBQVUsR0FBMkI7Z0JBQ3pDLFlBQVksRUFBRSxNQUFNO2dCQUNwQixXQUFXLEVBQUUsTUFBTTtnQkFDbkIsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLFlBQVksRUFBRSxPQUFPO2dCQUNyQixZQUFZLEVBQUUsT0FBTztnQkFDckIsaUJBQWlCLEVBQUUsTUFBTTtnQkFDekIsWUFBWSxFQUFFLE1BQU07Z0JBQ3BCLGlCQUFpQixFQUFFLE1BQU07YUFDMUIsQ0FBQztZQUVGLElBQUEsb0JBQVcsRUFBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEVBQUU7Z0JBQzlCLElBQUksS0FBSztvQkFBRSxPQUFPLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUVyRCxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7b0JBQ1QsT0FBTyxRQUFRLENBQ2IsSUFBSSxLQUFLLENBQUMsd0JBQXdCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUNsRCxJQUFJLENBQUMsWUFBWSxDQUNsQixDQUFDO2dCQUNKLENBQUM7Z0JBRUQsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUNsRCxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUM7S0FDRixDQUFDO0lBRUYsTUFBTSxFQUFFO1FBQ04sUUFBUSxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSTtLQUMzQjtJQUVELFVBQVUsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUU7UUFDbEMsTUFBTSxPQUFPLEdBQUc7WUFDZCxZQUFZO1lBQ1osV0FBVztZQUNYLFdBQVc7WUFDWCxZQUFZO1lBQ1osWUFBWTtZQUNaLGlCQUFpQjtZQUNqQixZQUFZO1lBQ1osaUJBQWlCO1NBQ2xCLENBQUM7UUFFRixJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDcEMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUN2QixDQUFDO2FBQU0sQ0FBQztZQUNOLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvRCxDQUFDO0lBQ0gsQ0FBQztDQUNTLENBQUMifQ==