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
const cloudinary = require("cloudinary");
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
const agenda = new agenda_1.Agenda({ db: { address: `${config_1.default.mongooseUrl}` } });
agenda.define("delete unverified owner", (job) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { ownerId } = job.attrs.data;
        const owner = yield Owner_1.default.findById(ownerId);
        if (owner && !owner.isVerified) {
            Retour_1.default.log(`Unverified owner ${owner.email} deleted after 1 hour.`);
            if ((_a = owner.cni) === null || _a === void 0 ? void 0 : _a.public_id) {
                yield cloudinary.uploader.destroy(owner.cni.public_id);
                Retour_1.default.log(`Deleted CNI file: ${owner.cni.public_id}`);
            }
            const folderName = `${owner.account.firstname}_${owner.account.name}_folder`;
            const { resources } = yield cloudinary.api.resources({
                type: "upload",
                prefix: folderName,
            });
            for (const file of resources) {
                yield cloudinary.uploader.destroy(file.public_id);
            }
            yield cloudinary.api.delete_folder(folderName);
            Retour_1.default.log(`Deleted Cloudinary folder: ${folderName}`);
            yield owner.deleteOne();
        }
        else if (owner && owner.isVerified) {
            Retour_1.default.log(`Owner with ID ${ownerId} is verified. No action taken.`);
        }
        else {
            Retour_1.default.log(`Owner with ID ${ownerId} not found. No action taken.`);
        }
    }
    catch (error) {
        Retour_1.default.error(`Failed to delete unverified owner with ID ${job.attrs.data.ownerId}`);
        console.error(`Failed to delete unverified owner with ID ${job.attrs.data.ownerId}:`, error);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvT3duZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFDQSw0REFBb0M7QUFDcEMsK0RBQXVDO0FBQ3ZDLGtFQUEwQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMzQyxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQUNsRCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7QUFFN0Isb0RBQTRCO0FBQzVCLG1DQUFxQztBQUNyQyw4REFBc0M7QUFDdEMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBR3pDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7QUFDbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztBQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBRzdDLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsZ0JBQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUd4RSxNQUFNLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLENBQU8sR0FBUSxFQUFFLEVBQUU7O0lBQzFELElBQUksQ0FBQztRQUNILE1BQU0sRUFBRSxPQUFPLEVBQUUsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQztRQUNuQyxNQUFNLEtBQUssR0FBRyxNQUFNLGVBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFNUMsSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFL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