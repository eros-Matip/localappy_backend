"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Establishment_1 = __importDefault(require("../controllers/Establishment"));
const Tools_1 = __importDefault(require("../controllers/Tools"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const multer_1 = __importDefault(require("multer"));
const Multer_1 = require("../middlewares/Multer");
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "photos", maxCount: 10 }]);
router.post("/create", OwnerIsAuthenticated_1.default, cpUpload, Establishment_1.default.createEstablishment);
router.get("/getInformations/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.getAllInformation);
router.get("/getPublicInformation/:establishmentId", Establishment_1.default.getPublicInformation);
router.get("/getTicketsStatsByEstablishment/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.getTicketsStatsByEstablishment);
router.put("/update/:establishmentId", OwnerIsAuthenticated_1.default, cpUpload, Establishment_1.default.updateEstablishment);
router.post("/upload-legal-doc/:establishmentId", OwnerIsAuthenticated_1.default, cpUpload, Establishment_1.default.uploadLegalDoc);
router.post("/request-activation/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.requestActivation);
router.post("/approve-activation/:establishmentId", AdminIsAuthenticated_1.default, Establishment_1.default.approveActivation);
router.post("/translate-descriptif", OwnerIsAuthenticated_1.default, Tools_1.default.translateEstablishmentDescriptionController);
router.post("/reject-activation/:establishmentId", AdminIsAuthenticated_1.default, Establishment_1.default.rejectActivation);
router.delete("/delete", OwnerIsAuthenticated_1.default, Establishment_1.default.deleteEstablishment);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHNEQUE4QjtBQUM5QixpRkFBc0Q7QUFDdEQsaUVBQW1EO0FBQ25ELCtGQUF1RTtBQUN2RSxvREFBNEI7QUFDNUIsa0RBQXFEO0FBQ3JELCtGQUF1RTtBQUV2RSxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2hDLE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sRUFBQyxxQkFBWSxDQUFDLENBQUM7QUFDcEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRW5FLE1BQU0sQ0FBQyxJQUFJLENBQ1QsU0FBUyxFQUNULDhCQUFvQixFQUNwQixRQUFRLEVBQ1IsdUJBQVUsQ0FBQyxtQkFBbUIsQ0FDL0IsQ0FBQztBQU9GLE1BQU0sQ0FBQyxHQUFHLENBQ1IsbUNBQW1DLEVBQ25DLDhCQUFvQixFQUNwQix1QkFBVSxDQUFDLGlCQUFpQixDQUM3QixDQUFDO0FBRUYsTUFBTSxDQUFDLEdBQUcsQ0FDUix3Q0FBd0MsRUFDeEMsdUJBQVUsQ0FBQyxvQkFBb0IsQ0FDaEMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQ1Isa0RBQWtELEVBQ2xELDhCQUFvQixFQUNwQix1QkFBVSxDQUFDLDhCQUE4QixDQUMxQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FDUiwwQkFBMEIsRUFDMUIsOEJBQW9CLEVBQ3BCLFFBQVEsRUFDUix1QkFBVSxDQUFDLG1CQUFtQixDQUMvQixDQUFDO0FBRUYsTUFBTSxDQUFDLElBQUksQ0FDVCxvQ0FBb0MsRUFDcEMsOEJBQW9CLEVBQ3BCLFFBQVEsRUFDUix1QkFBVSxDQUFDLGNBQWMsQ0FDMUIsQ0FBQztBQUVGLE1BQU0sQ0FBQyxJQUFJLENBQ1Qsc0NBQXNDLEVBQ3RDLDhCQUFvQixFQUNwQix1QkFBVSxDQUFDLGlCQUFpQixDQUM3QixDQUFDO0FBQ0YsTUFBTSxDQUFDLElBQUksQ0FDVCxzQ0FBc0MsRUFDdEMsOEJBQW9CLEVBQ3BCLHVCQUFVLENBQUMsaUJBQWlCLENBQzdCLENBQUM7QUFFRixNQUFNLENBQUMsSUFBSSxDQUNULHVCQUF1QixFQUN2Qiw4QkFBb0IsRUFDcEIsZUFBZSxDQUFDLDJDQUEyQyxDQUM1RCxDQUFDO0FBRUYsTUFBTSxDQUFDLElBQUksQ0FDVCxxQ0FBcUMsRUFDckMsOEJBQW9CLEVBQ3BCLHVCQUFVLENBQUMsZ0JBQWdCLENBQzVCLENBQUM7QUFDRixNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSw4QkFBb0IsRUFBRSx1QkFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFL0Usa0JBQWUsTUFBTSxDQUFDIn0=