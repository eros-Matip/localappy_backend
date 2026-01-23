"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Owner_1 = __importDefault(require("../controllers/Owner"));
const OwnerIsAuthenticated_1 = __importDefault(require("../middlewares/OwnerIsAuthenticated"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const multer_1 = __importDefault(require("multer"));
const Multer_1 = require("../middlewares/Multer");
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 1 }]);
router.post("/create", IsAuthenticated_1.default, cpUpload, Owner_1.default.createOwner);
router.get("/get/:ownerId", OwnerIsAuthenticated_1.default, Owner_1.default.getOwnerById);
router.put("/update/:ownerId", OwnerIsAuthenticated_1.default, Owner_1.default.updateOwner);
router.delete("/delete/:ownerId", OwnerIsAuthenticated_1.default, Owner_1.default.deleteOwner);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL093bmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QywrRkFBdUU7QUFDdkUscUZBQWtFO0FBQ2xFLG9EQUE0QjtBQUM1QixrREFBcUQ7QUFFckQsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMscUJBQVksQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUVoRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSx5QkFBb0IsRUFBRSxRQUFRLEVBQUUsZUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQy9FLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLDhCQUFvQixFQUFFLGVBQVUsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUMzRSxNQUFNLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLDhCQUFvQixFQUFFLGVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM3RSxNQUFNLENBQUMsTUFBTSxDQUFDLGtCQUFrQixFQUFFLDhCQUFvQixFQUFFLGVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUVoRixrQkFBZSxNQUFNLENBQUMifQ==