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
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "photos", maxCount: 10 }]);
router.post("/create", cpUpload, OwnerIsAuthenticated_1.default, Establishment_1.default.createEstablishment);
router.get("/getInformations/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.getAllInformation);
router.get("/getPublicInformation/:establishmentId", Establishment_1.default.getPublicInformation);
router.get("/getTicketsStatsByEstablishment/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.getTicketsStatsByEstablishment);
router.put("/update/:establishmentId", cpUpload, OwnerIsAuthenticated_1.default, Establishment_1.default.updateEstablishment);
router.post("/request-activation/:establishmentId", Establishment_1.default.requestActivation);
router.post("/establishment/approve-activation/:establishmentId", AdminIsAuthenticated_1.default, Establishment_1.default.approveActivation);
router.post("/establishment/reject-activation/:establishmentId", AdminIsAuthenticated_1.default, Establishment_1.default.rejectActivation);
router.delete("/delete", OwnerIsAuthenticated_1.default, Establishment_1.default.deleteEstablishment);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHNEQUE4QjtBQUM5QixpRkFBc0Q7QUFDdEQsK0ZBQXVFO0FBQ3ZFLG9EQUE0QjtBQUM1QixrREFBcUQ7QUFDckQsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDaEMsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQkFBTSxFQUFDLHFCQUFZLENBQUMsQ0FBQztBQUNwQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFbkUsTUFBTSxDQUFDLElBQUksQ0FDVCxTQUFTLEVBQ1QsUUFBUSxFQUNSLDhCQUFvQixFQUNwQix1QkFBVSxDQUFDLG1CQUFtQixDQUMvQixDQUFDO0FBT0YsTUFBTSxDQUFDLEdBQUcsQ0FDUixtQ0FBbUMsRUFDbkMsOEJBQW9CLEVBQ3BCLHVCQUFVLENBQUMsaUJBQWlCLENBQzdCLENBQUM7QUFFRixNQUFNLENBQUMsR0FBRyxDQUNSLHdDQUF3QyxFQUN4Qyx1QkFBVSxDQUFDLG9CQUFvQixDQUNoQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FDUixrREFBa0QsRUFDbEQsOEJBQW9CLEVBQ3BCLHVCQUFVLENBQUMsOEJBQThCLENBQzFDLENBQUM7QUFDRixNQUFNLENBQUMsR0FBRyxDQUNSLDBCQUEwQixFQUMxQixRQUFRLEVBQ1IsOEJBQW9CLEVBQ3BCLHVCQUFVLENBQUMsbUJBQW1CLENBQy9CLENBQUM7QUFDRixNQUFNLENBQUMsSUFBSSxDQUNULHNDQUFzQyxFQUN0Qyx1QkFBVSxDQUFDLGlCQUFpQixDQUM3QixDQUFDO0FBQ0YsTUFBTSxDQUFDLElBQUksQ0FDVCxvREFBb0QsRUFDcEQsOEJBQW9CLEVBQ3BCLHVCQUFVLENBQUMsaUJBQWlCLENBQzdCLENBQUM7QUFFRixNQUFNLENBQUMsSUFBSSxDQUNULG1EQUFtRCxFQUNuRCw4QkFBb0IsRUFDcEIsdUJBQVUsQ0FBQyxnQkFBZ0IsQ0FDNUIsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFFLDhCQUFvQixFQUFFLHVCQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUUvRSxrQkFBZSxNQUFNLENBQUMifQ==