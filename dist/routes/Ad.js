"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Ad_1 = __importDefault(require("../controllers/Ad"));
const multer_1 = __importDefault(require("multer"));
const Multer_1 = require("../middlewares/Multer");
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);
router.post("/create", cpUpload, Ad_1.default.createAd);
router.get("/get/:adId", Ad_1.default.getAdById);
router.get("/get/", Ad_1.default.getAds);
router.put("/update/:adId", Ad_1.default.updateAd);
router.delete("/delete", Ad_1.default.deleteAd);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLDJEQUEyQztBQUMzQyxvREFBNEI7QUFDNUIsa0RBQXFEO0FBRXJELE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQkFBTSxFQUFDLHFCQUFZLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFaEUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLFlBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUN0RCxNQUFNLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxZQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDL0MsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsWUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLFlBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqRCxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxZQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFOUMsa0JBQWUsTUFBTSxDQUFDIn0=