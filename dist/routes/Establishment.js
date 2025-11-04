"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Establishment_1 = __importDefault(require("../controllers/Establishment"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const multer_1 = __importDefault(require("multer"));
const Multer_1 = require("../middlewares/Multer");
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "photos", maxCount: 10 }]);
router.post("/create", cpUpload, OwnerIsAuthenticated_1.default, Establishment_1.default.createEstablishment);
router.get("/getInformations/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.getAllInformation);
router.get("/getTicketsStatsByEstablishment/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.getTicketsStatsByEstablishment);
router.get("/getPublicInformation/:establishmentId", Establishment_1.default.getPublicInformation);
router.put("/update/:establishmentId", cpUpload, OwnerIsAuthenticated_1.default, Establishment_1.default.updateEstablishment);
router.delete("/delete", OwnerIsAuthenticated_1.default, Establishment_1.default.deleteEstablishment);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHNEQUE4QjtBQUM5QixpRkFBc0Q7QUFDdEQsK0ZBQXVFO0FBQ3ZFLG9EQUE0QjtBQUM1QixrREFBcUQ7QUFFckQsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMscUJBQVksQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUVuRSxNQUFNLENBQUMsSUFBSSxDQUNULFNBQVMsRUFDVCxRQUFRLEVBQ1IsOEJBQW9CLEVBQ3BCLHVCQUFVLENBQUMsbUJBQW1CLENBQy9CLENBQUM7QUFPRixNQUFNLENBQUMsR0FBRyxDQUNSLG1DQUFtQyxFQUNuQyw4QkFBb0IsRUFDcEIsdUJBQVUsQ0FBQyxpQkFBaUIsQ0FDN0IsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQ1Isa0RBQWtELEVBQ2xELDhCQUFvQixFQUNwQix1QkFBVSxDQUFDLDhCQUE4QixDQUMxQyxDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FDUix3Q0FBd0MsRUFDeEMsdUJBQVUsQ0FBQyxvQkFBb0IsQ0FDaEMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLENBQ1IsMEJBQTBCLEVBQzFCLFFBQVEsRUFDUiw4QkFBb0IsRUFDcEIsdUJBQVUsQ0FBQyxtQkFBbUIsQ0FDL0IsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLDhCQUFvQixFQUFFLHVCQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUUvRSxrQkFBZSxNQUFNLENBQUMifQ==