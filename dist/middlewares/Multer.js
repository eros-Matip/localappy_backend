"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.multerConfig = void 0;
const crypto_1 = require("crypto");
const multer_1 = require("multer");
exports.multerConfig = {
    storage: (0, multer_1.diskStorage)({
        filename: (req, file, callback) => {
            const formatsImage = ['image/jpeg', 'image/jpg', 'image/png'];
            (0, crypto_1.randomBytes)(16, (error, hash) => {
                if (error) {
                    callback(error, file.filename);
                }
                if (file.mimetype.includes('application/pdf')) {
                    const applicationFilename = `${hash.toString('hex')}${file.mimetype.replace('application/', '.')}`;
                    callback(null, applicationFilename);
                }
                else if (formatsImage.includes(file.mimetype)) {
                    const imageFilename = `${hash.toString('hex')}${file.mimetype.replace('image/', '.')}`;
                    callback(null, imageFilename);
                }
                else {
                    const audioFilename = `${hash.toString('hex')}${file.mimetype.replace('audio/', '.')}`;
                    callback(null, audioFilename);
                }
            });
        }
    }),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (req, file, callback) => {
        const formats = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'audio/mpeg'];
        if (formats.includes(file.mimetype)) {
            callback(null, true);
        }
        else {
            callback(new Error('Format not accepted'));
        }
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTXVsdGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21pZGRsZXdhcmVzL011bHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBcUM7QUFDckMsbUNBQThDO0FBRWpDLFFBQUEsWUFBWSxHQUFHO0lBQ3hCLE9BQU8sRUFBRSxJQUFBLG9CQUFXLEVBQUM7UUFDakIsUUFBUSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRTtZQUM5QixNQUFNLFlBQVksR0FBRyxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFDOUQsSUFBQSxvQkFBVyxFQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDNUIsSUFBSSxLQUFLLEVBQUUsQ0FBQztvQkFDUixRQUFRLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbkMsQ0FBQztnQkFDRCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztvQkFDNUMsTUFBTSxtQkFBbUIsR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7b0JBQ25HLFFBQVEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztnQkFDeEMsQ0FBQztxQkFBTSxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQzlDLE1BQU0sYUFBYSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdkYsUUFBUSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDbEMsQ0FBQztxQkFBTSxDQUFDO29CQUNKLE1BQU0sYUFBYSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDdkYsUUFBUSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDbEMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUNKLENBQUM7SUFDRixNQUFNLEVBQUU7UUFDSixRQUFRLEVBQUUsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJO0tBQzVCO0lBRUQsVUFBVSxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsRUFBRTtRQUNoQyxNQUFNLE9BQU8sR0FBRyxDQUFDLFlBQVksRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzFGLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ0osUUFBUSxDQUFDLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUMvQyxDQUFDO0lBQ0wsQ0FBQztDQUNPLENBQUMifQ==