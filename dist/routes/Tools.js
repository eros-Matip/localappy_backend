"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Tools_1 = __importDefault(require("../controllers/Tools"));
const router = express_1.default.Router();
router.post("/generateDescription", Tools_1.default.generateEventDescriptionController);
router.post("/translate", Tools_1.default.translateController);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL1Rvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUU5QyxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sQ0FBQyxJQUFJLENBQ1Qsc0JBQXNCLEVBQ3RCLGVBQVUsQ0FBQyxrQ0FBa0MsQ0FDOUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLGVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRTFELGtCQUFlLE1BQU0sQ0FBQyJ9