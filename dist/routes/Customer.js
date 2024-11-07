"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Customer_1 = __importDefault(require("../controllers/Customer"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const multer_1 = __importDefault(require("multer"));
const Multer_1 = require("../middlewares/Multer");
const router = express_1.default.Router();
const upload = (0, multer_1.default)(Multer_1.multerConfig);
const cpUpload = upload.fields([{ name: "file", maxCount: 3 }]);
router.post("/create", Customer_1.default.createCustomer);
router.get("/get/:customerId", Customer_1.default.readCustomer);
router.get("/get/", Customer_1.default.readAll);
router.put("/update/:customerId", IsAuthenticated_1.default, cpUpload, Customer_1.default.updateCustomer);
router.put("/addingOrRemoveFavorites", IsAuthenticated_1.default, Customer_1.default.addingOrRemoveFavorites);
router.delete("/delete", IsAuthenticated_1.default, Customer_1.default.deleteCustomer);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0N1c3RvbWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLHVFQUFpRDtBQUNqRCxxRkFBa0U7QUFDbEUsb0RBQTRCO0FBQzVCLGtEQUFxRDtBQUVyRCxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sTUFBTSxHQUFHLElBQUEsZ0JBQU0sRUFBQyxxQkFBWSxDQUFDLENBQUM7QUFDcEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBRWhFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGtCQUFVLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDbEQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxrQkFBVSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3hELE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLGtCQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDeEMsTUFBTSxDQUFDLEdBQUcsQ0FDUixxQkFBcUIsRUFDckIseUJBQW9CLEVBQ3BCLFFBQVEsRUFDUixrQkFBVSxDQUFDLGNBQWMsQ0FDMUIsQ0FBQztBQUNGLE1BQU0sQ0FBQyxHQUFHLENBQ1IsMEJBQTBCLEVBQzFCLHlCQUFvQixFQUNwQixrQkFBVSxDQUFDLHVCQUF1QixDQUNuQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUseUJBQW9CLEVBQUUsa0JBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUUxRSxrQkFBZSxNQUFNLENBQUMifQ==