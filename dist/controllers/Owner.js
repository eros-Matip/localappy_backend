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
const Owner_1 = __importDefault(require("../models/Owner"));
const Retour_1 = __importDefault(require("../library/Retour"));
const Customer_1 = __importDefault(require("../models/Customer"));
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const uid2 = require("uid2");
const twilio_1 = __importDefault(require("twilio"));
const agenda_1 = require("agenda");
const config_1 = __importDefault(require("../config/config"));
const notifyAdmins_1 = require("../services/notifyAdmins");
const cloudinary = require("cloudinary");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
const agenda = new agenda_1.Agenda({ db: { address: `${config_1.default.mongooseUrl}` } });
agenda.define("delete unverified owner", (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { ownerId } = job.attrs.data;
        const owner = yield Owner_1.default.findById(ownerId);
        if (!owner) {
            Retour_1.default.log(`Owner with ID ${ownerId} not found. No action taken.`);
            return;
        }
        if (owner.isVerified) {
            Retour_1.default.log(`Owner with ID ${ownerId} is verified. No action taken.`);
            return;
        }
        Retour_1.default.log(`Unverified owner ${owner.email} deleted after 1 hour.`);
        if ((_a = owner.cni) === null || _a === void 0 ? void 0 : _a.public_id) {
            yield cloudinary.uploader.destroy(owner.cni.public_id);
            Retour_1.default.log(`Deleted CNI file: ${owner.cni.public_id}`);
        }
        const folderName = `${owner.account.firstname}_${owner.account.name}_folder`;
        try {
            const { resources } = yield cloudinary.api.resources({
                type: "upload",
                prefix: folderName,
                max_results: 500,
            });
            for (const file of resources) {
                yield cloudinary.uploader.destroy(file.public_id);
            }
            yield cloudinary.api.delete_folder(folderName);
            Retour_1.default.log(`Deleted Cloudinary folder: ${folderName}`);
        }
        catch (e) {
            console.warn(`Cloudinary cleanup warning for folder ${folderName}:`, e);
        }
        const customerFinded = yield Customer_1.default.findOne({ ownerAccount: owner._id });
        if (customerFinded) {
            customerFinded.ownerAccount = null;
            yield customerFinded.save();
        }
        yield owner.deleteOne();
    }
    catch (error) {
        const ownerId = (_b = job.attrs.data) === null || _b === void 0 ? void 0 : _b.ownerId;
        Retour_1.default.error(`Failed to delete unverified owner with ID ${ownerId}`);
        console.error(`Failed to delete unverified owner with ID ${ownerId}:`, error);
    }
}));
const createOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, name, firstname, customerId, phoneNumber, password, passwordConfirmed, } = req.body;
        if (!email ||
            !name ||
            !firstname ||
            !phoneNumber ||
            !password ||
            !passwordConfirmed) {
            Retour_1.default.error("All fields are required");
            return res.status(400).json({ error: "All fields are required" });
        }
        if (password !== passwordConfirmed) {
            Retour_1.default.error("Passwords do not match");
            return res.status(400).json({ error: "Passwords do not match" });
        }
        const ownerFinded = yield Owner_1.default.findOne({ email });
        if (ownerFinded) {
            Retour_1.default.error("Account already exists");
            return res.status(400).json({ error: "Account already exists" });
        }
        const customerFinded = yield Customer_1.default.findById(customerId);
        if (!customerFinded) {
            Retour_1.default.error("Customer not found");
            return res.status(404).json({ error: "Customer not found" });
        }
        const fileKeys = req.files ? Object(req.files).file : [];
        if (!fileKeys.length) {
            console.error("Identity document is missing");
            return res.status(400).json({ message: "Identity document is missing" });
        }
        const token = uid2(26);
        const salt = uid2(26);
        const hash = SHA256(password + salt).toString(encBase64);
        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        const formattedPhoneNumber = phoneNumber
            .replace(/\D/g, "")
            .replace(/^0/, "33");
        if (!/^(33)[6-7]\d{8}$/.test(formattedPhoneNumber)) {
            Retour_1.default.error("Invalid phone number format");
            return res.status(400).json({ error: "Invalid phone number format" });
        }
        try {
            yield client.messages.create({
                body: `Votre code d'activation est: ${verificationCode}`,
                from: "Localappy",
                to: `+${formattedPhoneNumber}`,
            });
        }
        catch (smsError) {
            console.error("Twilio error:", smsError);
            Retour_1.default.error("Twilio error");
            return res.status(500).json({
                error: "Failed to send SMS verification code",
                details: smsError,
            });
        }
        const owner = new Owner_1.default({
            email,
            account: {
                name,
                firstname,
                phoneNumber,
            },
            token,
            hash,
            salt,
            establishments: [],
            isVerified: false,
            verificationCode,
            customerAccount: customerFinded,
        });
        const result = yield cloudinary.v2.uploader.upload(fileKeys[0].path, {
            folder: `${owner.account.firstname}_${owner.account.name}_folder`,
        });
        owner.cni = {
            public_id: result.public_id,
            url: result.secure_url,
        };
        yield owner.save();
        Object(customerFinded).ownerAccount = owner;
        yield Object(customerFinded).save();
        yield agenda.start();
        yield agenda.schedule("in 1 hour", "delete unverified owner", {
            ownerId: owner._id,
        });
        yield (0, notifyAdmins_1.notifyAdminsNewOwner)({
            ownerId: String(owner._id),
            ownerFirstname: owner.account.firstname,
            ownerName: owner.account.name,
            customerId: String(customerFinded._id),
        });
        Retour_1.default.info("Owner created. Verification code sent via SMS.");
        return res.status(201).json({
            message: "Owner created. Verification code sent via SMS.",
            ownerId: owner._id,
            token: owner.token,
        });
    }
    catch (error) {
        console.error("Error creating owner:", error);
        Retour_1.default.error("Failed to create owner");
        return res
            .status(500)
            .json({ error: "Failed to create owner", details: error });
    }
});
const getOwnerById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const owner = yield Owner_1.default.findById(id).populate("establishments");
        if (!owner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json(owner);
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to retrieve owner", details: error });
    }
});
const updateOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const updatedOwner = yield Owner_1.default.findByIdAndUpdate(id, updatedData, {
            new: true,
        });
        if (!updatedOwner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json(updatedOwner);
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to update owner", details: error });
    }
});
const deleteOwner = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = req.params;
        const deletedOwner = yield Owner_1.default.findByIdAndDelete(ownerId);
        if (!deletedOwner) {
            return res.status(404).json({ message: "Owner not found" });
        }
        return res.status(200).json({ message: "Owner deleted successfully" });
    }
    catch (error) {
        return res
            .status(500)
            .json({ error: "Failed to delete owner", details: error });
    }
});
exports.default = { createOwner, getOwnerById, updateOwner, deleteOwner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvT3duZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0REFBb0M7QUFDcEMsK0RBQXVDO0FBQ3ZDLGtFQUEwQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0Isb0RBQTRCO0FBQzVCLG1DQUFxQztBQUNyQyw4REFBc0M7QUFFdEMsMkRBQWdFO0FBRWhFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUd6QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO0FBQ2xELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUM7QUFDaEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQkFBTSxFQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUc3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLGdCQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFHeEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxDQUFPLEdBQVEsRUFBRSxFQUFFOztJQUMxRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUEyQixDQUFDO1FBRTFELE1BQU0sS0FBSyxHQUFHLE1BQU0sZUFBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxJQUFJLENBQUMs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