"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userDelete = exports.userSetPremium = exports.userDisable = exports.userActivate = exports.userUnban = exports.userBan = exports.usersList = void 0;
const Customer_1 = __importDefault(require("../models/Customer"));
const mongoose_1 = __importDefault(require("mongoose"));
const computeRole = (customer) => {
    if (customer.ownerAccount)
        return "owner";
    if (Array.isArray(customer.establishmentStaffOf) &&
        customer.establishmentStaffOf.length > 0)
        return "staff";
    return "customer";
};
const sanitizeCustomer = (customer) => {
    return {
        _id: customer._id,
        email: customer.email,
        account: customer.account,
        premiumStatus: customer.premiumStatus || false,
        createdAt: customer.createdAt,
        role: computeRole(customer),
        activated: customer.activated !== false,
        banned: customer.banned === true,
    };
};
const usersList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const customers = yield Customer_1.default.find().lean();
        const users = customers.map(sanitizeCustomer);
        const stats = {
            total: users.length,
            activated: users.filter((u) => u.activated).length,
            banned: users.filter((u) => u.banned).length,
            premium: users.filter((u) => u.premiumStatus).length,
        };
        return res.status(200).json({ users, stats });
    }
    catch (error) {
        return res.status(500).json({ message: "Error fetching users", error });
    }
});
exports.usersList = usersList;
const userBan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!mongoose_1.default.isValidObjectId(userId)) {
            return res.status(400).json({ message: "Invalid userId" });
        }
        const user = yield Customer_1.default.findByIdAndUpdate(userId, { banned: true }, { new: true });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ message: "User banned" });
    }
    catch (error) {
        return res.status(500).json({ message: "Error banning user", error });
    }
});
exports.userBan = userBan;
const userUnban = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield Customer_1.default.findByIdAndUpdate(userId, { banned: false }, { new: true });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ message: "User unbanned" });
    }
    catch (error) {
        return res.status(500).json({ message: "Error unbanning user", error });
    }
});
exports.userUnban = userUnban;
const userActivate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield Customer_1.default.findByIdAndUpdate(userId, { activated: true }, { new: true });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ message: "User activated" });
    }
    catch (error) {
        return res.status(500).json({ message: "Error activating user", error });
    }
});
exports.userActivate = userActivate;
const userDisable = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield Customer_1.default.findByIdAndUpdate(userId, { activated: false }, { new: true });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ message: "User disabled" });
    }
    catch (error) {
        return res.status(500).json({ message: "Error disabling user", error });
    }
});
exports.userDisable = userDisable;
const userSetPremium = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { premiumStatus } = req.body;
        if (typeof premiumStatus !== "boolean") {
            return res.status(400).json({ message: "premiumStatus must be boolean" });
        }
        const user = yield Customer_1.default.findByIdAndUpdate(userId, { premiumStatus }, { new: true });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ message: "Premium status updated" });
    }
    catch (error) {
        return res.status(500).json({ message: "Error updating premium", error });
    }
});
exports.userSetPremium = userSetPremium;
const userDelete = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const user = yield Customer_1.default.findByIdAndDelete(userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        return res.status(200).json({ message: "User deleted" });
    }
    catch (error) {
        return res.status(500).json({ message: "Error deleting user", error });
    }
});
exports.userDelete = userDelete;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW5Vc2Vyc0NvbnRyb2wuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvQWRtaW5Vc2Vyc0NvbnRyb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0VBQTBDO0FBRTFDLHdEQUFnQztBQU1oQyxNQUFNLFdBQVcsR0FBRyxDQUFDLFFBQWEsRUFBRSxFQUFFO0lBQ3BDLElBQUksUUFBUSxDQUFDLFlBQVk7UUFBRSxPQUFPLE9BQU8sQ0FBQztJQUMxQyxJQUNFLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDO1FBQzVDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUV4QyxPQUFPLE9BQU8sQ0FBQztJQUNqQixPQUFPLFVBQVUsQ0FBQztBQUNwQixDQUFDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLENBQUMsUUFBYSxFQUFFLEVBQUU7SUFDekMsT0FBTztRQUNMLEdBQUcsRUFBRSxRQUFRLENBQUMsR0FBRztRQUNqQixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7UUFDckIsT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO1FBQ3pCLGFBQWEsRUFBRSxRQUFRLENBQUMsYUFBYSxJQUFJLEtBQUs7UUFDOUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO1FBQzdCLElBQUksRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDO1FBQzNCLFNBQVMsRUFBRSxRQUFRLENBQUMsU0FBUyxLQUFLLEtBQUs7UUFDdkMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEtBQUssSUFBSTtLQUNqQyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBTUssTUFBTSxTQUFTLEdBQUcsQ0FBTyxHQUFZLEVBQUUsR0FBYSxFQUFFLEVBQUU7SUFDN0QsSUFBSSxDQUFDO1FBQ0gsTUFBTSxTQUFTLEdBQUcsTUFBTSxrQkFBUSxDQUFDLElBQUksRUFBRSxDQUFDLElB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