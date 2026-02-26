"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Tools_1 = __importDefault(require("../controllers/Tools"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const router = express_1.default.Router();
router.post("/generateDescription", Tools_1.default.generateEventDescriptionController);
router.post("/translate", Tools_1.default.translateController);
router.post("/customer/generate-descriptif", IsAuthenticated_1.default, Tools_1.default.generateCustomerDescriptifFromThemesController);
router.post("/tools/establishment/description/generate", OwnerIsAuthenticated_1.default, Tools_1.default.generateEstablishmentDescriptionFromTypesController);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL1Rvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QyxxRkFBcUU7QUFDckUsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSxDQUFDLElBQUksQ0FDVCxzQkFBc0IsRUFDdEIsZUFBVSxDQUFDLGtDQUFrQyxDQUM5QyxDQUFDO0FBRUYsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsZUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFFMUQsTUFBTSxDQUFDLElBQUksQ0FDVCwrQkFBK0IsRUFDL0IseUJBQXVCLEVBQ3ZCLGVBQVUsQ0FBQyw4Q0FBOEMsQ0FDMUQsQ0FBQztBQUVGLE1BQU0sQ0FBQyxJQUFJLENBQ1QsMkNBQTJDLEVBQzNDLDhCQUFvQixFQUNwQixlQUFVLENBQUMsbURBQW1ELENBQy9ELENBQUM7QUFFRixrQkFBZSxNQUFNLENBQUMifQ==