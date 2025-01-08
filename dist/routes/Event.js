"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Event_1 = __importDefault(require("../controllers/Event"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
router.post("/createForAnEstablishment/:establishmentId", OwnerIsAuthenticated_1.default, Event_1.default.createEventForAnEstablishment);
router.get("/get/:eventId", Event_1.default.readEvent);
router.get("/get/", Event_1.default.readAll);
router.get("/getAllByZip/:postalCode", Event_1.default.getEventsByPostalCode);
router.post("/getAllByLocalisation", Event_1.default.getEventsByPosition);
router.post("/getAllByDate/:month", Event_1.default.getEventByDate);
router.put("/update/:eventId", OwnerIsAuthenticated_1.default, Event_1.default.updateEvent);
router.put("/verifAllEvent", AdminIsAuthenticated_1.default, Event_1.default.verifAllEvent);
router.put("/updateUrl", AdminIsAuthenticated_1.default, Event_1.default.updateImageUrls);
router.put("/getCoordinatesFromAPI", AdminIsAuthenticated_1.default, Event_1.default.getCoordinatesFromAPI);
router.delete("/delete/:eventId", AdminIsAuthenticated_1.default, Event_1.default.deleteEvent);
router.delete("/deleteDuplicateEvents", AdminIsAuthenticated_1.default, Event_1.default.deleteDuplicateEvents);
router.delete("/removeMidnightDates", AdminIsAuthenticated_1.default, Event_1.default.removeMidnightDates);
router.delete("/removeExpiredEvents", AdminIsAuthenticated_1.default, Event_1.default.removeExpiredEvents);
router.delete("/deleteInvalidEvents", AdminIsAuthenticated_1.default, Event_1.default.deleteInvalidEvents);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QywrRkFBdUU7QUFDdkUsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFPaEMsTUFBTSxDQUFDLElBQUksQ0FDVCw0Q0FBNEMsRUFDNUMsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyw2QkFBNkIsQ0FDekMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsRCxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxlQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEMsTUFBTSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxlQUFVLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUN6RSxNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLGVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBQ3JFLE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsZUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQy9ELE1BQU0sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsOEJBQW9CLEVBQUUsZUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzdFLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsOEJBQW9CLEVBQUUsZUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQzdFLE1BQU0sQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLDhCQUFvQixFQUFFLGVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQU0zRSxNQUFNLENBQUMsR0FBRyxDQUNSLHdCQUF3QixFQUN4Qiw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLHFCQUFxQixDQUNqQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDaEYsTUFBTSxDQUFDLE1BQU0sQ0FDWCx3QkFBd0IsRUFDeEIsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxxQkFBcUIsQ0FDakMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLENBQ1gsc0JBQXNCLEVBQ3RCLDhCQUFvQixFQUNwQixlQUFVLENBQUMsbUJBQW1CLENBQy9CLENBQUM7QUFHRixNQUFNLENBQUMsTUFBTSxDQUNYLHNCQUFzQixFQUN0Qiw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLG1CQUFtQixDQUMvQixDQUFDO0FBRUYsTUFBTSxDQUFDLE1BQU0sQ0FDWCxzQkFBc0IsRUFDdEIsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxtQkFBbUIsQ0FDL0IsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyJ9