"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Contact_1 = __importDefault(require("../controllers/Contact"));
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
router.post("/create", Contact_1.default.createContact);
router.get("/get/:contactId", AdminIsAuthenticated_1.default, Contact_1.default.readContact);
router.delete("/delete", AdminIsAuthenticated_1.default, Contact_1.default.deleteContact);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udGFjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9yb3V0ZXMvQ29udGFjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7OztBQUFBLHNEQUE4QjtBQUM5QixxRUFBZ0Q7QUFDaEQsK0ZBQXVFO0FBRXZFLE1BQU0sTUFBTSxHQUFHLGlCQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsaUJBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUNqRCxNQUFNLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLDhCQUFvQixFQUFFLGlCQUFVLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDNUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsOEJBQW9CLEVBQUUsaUJBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUV6RSxrQkFBZSxNQUFNLENBQUMifQ==