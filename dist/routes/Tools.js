"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Tools_1 = __importDefault(require("../controllers/Tools"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const router = express_1.default.Router();
router.post("/generateDescription", Tools_1.default.generateEventDescriptionController);
router.post("/translate", Tools_1.default.translateController);
router.post("/customer/generate-descriptif", IsAuthenticated_1.default, Tools_1.default.generateCustomerDescriptifFromThemesController);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL1Rvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QyxxRkFBcUU7QUFFckUsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLENBQUMsSUFBSSxDQUNULHNCQUFzQixFQUN0QixlQUFVLENBQUMsa0NBQWtDLENBQzlDLENBQUM7QUFFRixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxlQUFVLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUUxRCxNQUFNLENBQUMsSUFBSSxDQUNULCtCQUErQixFQUMvQix5QkFBdUIsRUFDdkIsZUFBVSxDQUFDLDhDQUE4QyxDQUMxRCxDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIn0=