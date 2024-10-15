"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Establishment_1 = __importDefault(require("../controllers/Establishment"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const router = express_1.default.Router();
router.post("/create", OwnerIsAuthenticated_1.default, Establishment_1.default.createEstablishment);
router.get("/get/:establishmentId", Establishment_1.default.getEstablishmentById);
router.put("/update/:establishmentId", OwnerIsAuthenticated_1.default, Establishment_1.default.updateEstablishment);
router.delete("/delete", OwnerIsAuthenticated_1.default, Establishment_1.default.deleteEstablishment);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHNEQUE4QjtBQUM5QixpRkFBc0Q7QUFDdEQsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsOEJBQW9CLEVBQUUsdUJBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQzdFLE1BQU0sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsdUJBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQ3JFLE1BQU0sQ0FBQyxHQUFHLENBQ1IsMEJBQTBCLEVBQzFCLDhCQUFvQixFQUNwQix1QkFBVSxDQUFDLG1CQUFtQixDQUMvQixDQUFDO0FBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsOEJBQW9CLEVBQUUsdUJBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRS9FLGtCQUFlLE1BQU0sQ0FBQyJ9