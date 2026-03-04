"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Owner_1 = __importDefault(require("../controllers/Owner"));
const AdminIsAuthenticated_1 = __importDefault(require("../middlewares/AdminIsAuthenticated"));
const router = express_1.default.Router();
router.get("/owners", AdminIsAuthenticated_1.default, Owner_1.default.getOwnersForAdmin);
router.get("/owners/:ownerId", AdminIsAuthenticated_1.default, Owner_1.default.getOwnerDetailsForAdmin);
router.patch("/owners/:ownerId/set-validated", AdminIsAuthenticated_1.default, Owner_1.default.setOwnerValidatedForAdmin);
router.patch("/owners/:ownerId/set-verified", AdminIsAuthenticated_1.default, Owner_1.default.setOwnerVerifiedForAdmin);
router.patch("/owners/:ownerId/reset-attempts", AdminIsAuthenticated_1.default, Owner_1.default.resetOwnerAttemptsForAdmin);
router.patch("/owners/:ownerId/reset-password-losted", AdminIsAuthenticated_1.default, Owner_1.default.resetOwnerPasswordLostedForAdmin);
router.patch("/owners/:ownerId/link-establishment", AdminIsAuthenticated_1.default, Owner_1.default.linkOwnerToEstablishmentForAdmin);
router.patch("/owners/:ownerId/unlink-establishment", AdminIsAuthenticated_1.default, Owner_1.default.unlinkOwnerFromEstablishmentForAdmin);
router.delete("/owners/:ownerId", AdminIsAuthenticated_1.default, Owner_1.default.deleteOwnerForAdmin);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Pd25lckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0FkbWluT3duZXJDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QywrRkFBdUU7QUFFdkUsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQVFoQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSw4QkFBb0IsRUFBRSxlQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUcxRSxNQUFNLENBQUMsR0FBRyxDQUNSLGtCQUFrQixFQUNsQiw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLHVCQUF1QixDQUNuQyxDQUFDO0FBR0YsTUFBTSxDQUFDLEtBQUssQ0FDVixnQ0FBZ0MsRUFDaEMsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyx5QkFBeUIsQ0FDckMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxLQUFLLENBQ1YsK0JBQStCLEVBQy9CLDhCQUFvQixFQUNwQixlQUFVLENBQUMsd0JBQXdCLENBQ3BDLENBQUM7QUFDRixNQUFNLENBQUMsS0FBSyxDQUNWLGlDQUFpQyxFQUNqQyw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLDBCQUEwQixDQUN0QyxDQUFDO0FBQ0YsTUFBTSxDQUFDLEtBQUssQ0FDVix3Q0FBd0MsRUFDeEMsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxnQ0FBZ0MsQ0FDNUMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxLQUFLLENBQ1YscUNBQXFDLEVBQ3JDLDhCQUFvQixFQUNwQixlQUFVLENBQUMsZ0NBQWdDLENBQzVDLENBQUM7QUFDRixNQUFNLENBQUMsS0FBSyxDQUNWLHVDQUF1QyxFQUN2Qyw4QkFBb0IsRUFDcEIsZUFBVSxDQUFDLG9DQUFvQyxDQUNoRCxDQUFDO0FBR0YsTUFBTSxDQUFDLE1BQU0sQ0FDWCxrQkFBa0IsRUFDbEIsOEJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxtQkFBbUIsQ0FDL0IsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyJ9