"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Event_1 = __importDefault(require("../controllers/Event"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const router = express_1.default.Router();
router.post("/createForAnEstablishment/:establishmentId", OwnerIsAuthenticated_1.default, Event_1.default.createEventForAnEstablishment);
router.get("/get/:eventId", Event_1.default.readEvent);
router.get("/get/", Event_1.default.readAll);
router.get("/getAllByZip/:postalCode", Event_1.default.getEventsByPostalCode);
router.get("/getAllByLocalisation", Event_1.default.getEventsByPosition);
router.put("/update/:eventId", OwnerIsAuthenticated_1.default, Event_1.default.updateEvent);
router.delete("/delete/:eventId", OwnerIsAuthenticated_1.default, Event_1.default.deleteEvent);
router.delete("/deleteDuplicateEvents", Event_1.default.deleteDuplicateEvents);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QywrRkFBdUU7QUFFdkUsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLENBQUMsSUFBSSxDQUNULDRDQUE0QyxFQUM1Qyw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLDZCQUE2QixDQUN6QyxDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsZUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ2xELE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUN4QyxNQUFNLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLGVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBQ3pFLE1BQU0sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLEVBQUUsZUFBVSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDcEUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDN0UsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDaEYsTUFBTSxDQUFDLE1BQU0sQ0FBQyx3QkFBd0IsRUFBRSxlQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUMxRSxrQkFBZSxNQUFNLENBQUMifQ==