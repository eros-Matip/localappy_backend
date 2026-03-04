"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Owner_1 = __importDefault(require("../controllers/Owner"));
const IsAuthenticated_1 = __importDefault(require("../middlewares/IsAuthenticated"));
const router = express_1.default.Router();
router.get("/owners", IsAuthenticated_1.default, Owner_1.default.getOwnersForAdmin);
router.get("/owners/:ownerId", IsAuthenticated_1.default, Owner_1.default.getOwnerDetailsForAdmin);
router.patch("/owners/:ownerId/set-validated", IsAuthenticated_1.default, Owner_1.default.setOwnerValidatedForAdmin);
router.patch("/owners/:ownerId/set-verified", IsAuthenticated_1.default, Owner_1.default.setOwnerVerifiedForAdmin);
router.patch("/owners/:ownerId/reset-attempts", IsAuthenticated_1.default, Owner_1.default.resetOwnerAttemptsForAdmin);
router.patch("/owners/:ownerId/reset-password-losted", IsAuthenticated_1.default, Owner_1.default.resetOwnerPasswordLostedForAdmin);
router.patch("/owners/:ownerId/link-establishment", IsAuthenticated_1.default, Owner_1.default.linkOwnerToEstablishmentForAdmin);
router.patch("/owners/:ownerId/unlink-establishment", IsAuthenticated_1.default, Owner_1.default.unlinkOwnerFromEstablishmentForAdmin);
router.delete("/owners/:ownerId", IsAuthenticated_1.default, Owner_1.default.deleteOwnerForAdmin);
exports.default = router;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Pd25lckNvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvcm91dGVzL0FkbWluT3duZXJDb250cm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsc0RBQThCO0FBQzlCLGlFQUE4QztBQUM5QyxxRkFBa0U7QUFFbEUsTUFBTSxNQUFNLEdBQUcsaUJBQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQVFoQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSx5QkFBb0IsRUFBRSxlQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUcxRSxNQUFNLENBQUMsR0FBRyxDQUNSLGtCQUFrQixFQUNsQix5QkFBb0IsRUFDcEIsZUFBVSxDQUFDLHVCQUF1QixDQUNuQyxDQUFDO0FBR0YsTUFBTSxDQUFDLEtBQUssQ0FDVixnQ0FBZ0MsRUFDaEMseUJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyx5QkFBeUIsQ0FDckMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxLQUFLLENBQ1YsK0JBQStCLEVBQy9CLHlCQUFvQixFQUNwQixlQUFVLENBQUMsd0JBQXdCLENBQ3BDLENBQUM7QUFDRixNQUFNLENBQUMsS0FBSyxDQUNWLGlDQUFpQyxFQUNqQyx5QkFBb0IsRUFDcEIsZUFBVSxDQUFDLDBCQUEwQixDQUN0QyxDQUFDO0FBQ0YsTUFBTSxDQUFDLEtBQUssQ0FDVix3Q0FBd0MsRUFDeEMseUJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxnQ0FBZ0MsQ0FDNUMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxLQUFLLENBQ1YscUNBQXFDLEVBQ3JDLHlCQUFvQixFQUNwQixlQUFVLENBQUMsZ0NBQWdDLENBQzVDLENBQUM7QUFDRixNQUFNLENBQUMsS0FBSyxDQUNWLHVDQUF1QyxFQUN2Qyx5QkFBb0IsRUFDcEIsZUFBVSxDQUFDLG9DQUFvQyxDQUNoRCxDQUFDO0FBR0YsTUFBTSxDQUFDLE1BQU0sQ0FDWCxrQkFBa0IsRUFDbEIseUJBQW9CLEVBQ3BCLGVBQVUsQ0FBQyxtQkFBbUIsQ0FDL0IsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyJ9