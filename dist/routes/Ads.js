"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Ads_1 = __importDefault(require("../controllers/Ads"));
const multer_1 = __importDefault(require("multer"));
const Multer_1 = require("../middlewares/Multer");
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);
router.post("/create/:establishmentId", cpUpload, OwnerIsAuthenticated_1.default, Ads_1.default.createAd);
router.get("/get/:adId", Ads_1.default.getAdById);
router.get("/get/", Ads_1.default.getAds);
router.put("/update/:adId", cpUpload, OwnerIsAuthenticated_1.default, Ads_1.default.updateAd);
router.delete("/delete", OwnerIsAuthenticated_1.default, Ads_1.default.deleteAd);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9BZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxzREFBOEI7QUFDOUIsNkRBQTRDO0FBQzVDLG9EQUE0QjtBQUM1QixrREFBcUQ7QUFDckQsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQkFBTSxFQUFDLHFCQUFZLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFaEUsTUFBTSxDQUFDLElBQUksQ0FDVCwwQkFBMEIsRUFDMUIsUUFBUSxFQUNSLDhCQUFvQixFQUNwQixhQUFVLENBQUMsUUFBUSxDQUNwQixDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxZQUFZLEVBQUUsYUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQy9DLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGFBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN2QyxNQUFNLENBQUMsR0FBRyxDQUNSLGVBQWUsRUFDZixRQUFRLEVBQ1IsOEJBQW9CLEVBQ3BCLGFBQVUsQ0FBQyxRQUFRLENBQ3BCLENBQUM7QUFDRixNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSw4QkFBb0IsRUFBRSxhQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFcEUsa0JBQWUsTUFBTSxDQUFDIn0=