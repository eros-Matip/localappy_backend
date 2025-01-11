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
exports.createOwner = void 0;
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
        console.log("fileKeys", fileKeys);
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
                from: "locaLappy",
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
exports.createOwner = createOwner;
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
        const { id } = req.params;
        const deletedOwner = yield Owner_1.default.findByIdAndDelete(id);
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
exports.default = { createOwner: exports.createOwner, getOwnerById, updateOwner, deleteOwner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvT3duZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2QyxrRUFBMEM7QUFDMUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDM0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDbEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLG9EQUE0QjtBQUM1QixtQ0FBcUM7QUFDckMsOERBQXNDO0FBQ3RDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUd6QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDO0FBQ2xELE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUM7QUFDaEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxnQkFBTSxFQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQztBQUc3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLGdCQUFNLENBQUMsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFHeEUsTUFBTSxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsRUFBRSxDQUFPLEdBQVEsRUFBRSxFQUFFOztJQUMxRCxJQUFJLENBQUM7UUFDSCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7UUFDbkMsTUFBTSxLQUFLLEdBQUcsTUFBTSxlQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTVDLElBQUksS0FBSyxJQUFJLENBQUMsS0FB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