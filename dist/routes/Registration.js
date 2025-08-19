"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Registration_1 = __importDefault(require("../controllers/Registration"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const router = express_1.default.Router();
router.get("/get/:registrationId", IsAuthenticated_1.default, Registration_1.default.readRegistration);
router.get("/get/", IsAuthenticated_1.default, Registration_1.default.readAll);
router.put("/update/:registrationId", IsAuthenticated_1.default, Registration_1.default.updateRegistration);
router.delete("/delete", IsAuthenticated_1.default, Registration_1.default.deleteRegistration);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmVnaXN0cmF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JvdXRlcy9SZWdpc3RyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSxzREFBOEI7QUFDOUIsK0VBQXFEO0FBQ3JELHFGQUFxRTtBQUVyRSxNQUFNLE1BQU0sR0FBRyxpQkFBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhDLE1BQU0sQ0FBQyxHQUFHLENBQ1Isc0JBQXNCLEVBQ3RCLHlCQUF1QixFQUN2QixzQkFBVSxDQUFDLGdCQUFnQixDQUM1QixDQUFDO0FBQ0YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUseUJBQXVCLEVBQUUsc0JBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNqRSxNQUFNLENBQUMsR0FBRyxDQUNSLHlCQUF5QixFQUN6Qix5QkFBdUIsRUFDdkIsc0JBQVUsQ0FBQyxrQkFBa0IsQ0FDOUIsQ0FBQztBQUNGLE1BQU0sQ0FBQyxNQUFNLENBQ1gsU0FBUyxFQUNULHlCQUF1QixFQUN2QixzQkFBVSxDQUFDLGtCQUFrQixDQUM5QixDQUFDO0FBRUYsa0JBQWUsTUFBTSxDQUFDIn0=