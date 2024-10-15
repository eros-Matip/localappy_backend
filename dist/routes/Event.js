"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Event_1 = __importDefault(require("../controllers/Event"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const router = express_1.default.Router();
router.post("/create", OwnerIsAuthenticated_1.default, Event_1.default.createEvent);
router.post("/createForAnEstablishment/:establishmentId", OwnerIsAuthenticated_1.default, Event_1.default.createEventForAnEstablishment);
router.get("/get/:eventId", Event_1.default.readEvent);
router.get("/get/", Event_1.default.readAll);
router.get("/getAllByZip/:postalCode", Event_1.default.getEventsByPostalCode);
router.put("/update/:eventId", OwnerIsAuthenticated_1.default, Event_1.default.updateEvent);
router.put("/updateAllFromJSON/", OwnerIsAuthenticated_1.default, Event_1.default.updateOrCreateEventsFromJSON);
router.delete("/delete/:eventId", OwnerIsAuthenticated_1.default, Event_1.default.deleteEvent);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QywrRkFBdUU7QUFFdkUsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUVoQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckUsTUFBTSxDQUFDLElBQUksQ0FDVCw0Q0FBNEMsRUFDNUMsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyw2QkFBNkIsQ0FDekMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsRCxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxlQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEMsTUFBTSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxlQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN6RSxNQUFNLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLDhCQUFvQixFQUFFLGVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM3RSxNQUFNLENBQUMsR0FBRyxDQUNSLHFCQUFxQixFQUNyQiw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLDRCQUE0QixDQUN4QyxDQUFDO0FBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFaEYsa0JBQWUsTUFBTSxDQUFDIn0=