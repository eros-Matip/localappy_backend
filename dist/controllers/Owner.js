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
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = (0, twilio_1.default)(accountSid, authToken);
const agenda = new agenda_1.Agenda({ db: { address: `${config_1.default.mongooseUrl}` } });
agenda.define("delete unverified owner", (job) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ownerId } = job.attrs.data;
        const owner = yield Owner_1.default.findById(ownerId);
        if (owner && !owner.isVerified) {
            Retour_1.default.log(`Unverified owner ${owner.email} deleted after 1 hour.`);
            yield Owner_1.default.findByIdAndDelete(ownerId);
        }
        else if (owner && owner.isVerified) {
            Retour_1.default.log(`Owner with ID ${ownerId} is verified. No action taken.`);
        }
        else {
            Retour_1.default.log(`Owner with ID ${ownerId} is verified. No action taken.`);
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
        yield owner.save();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29udHJvbGxlcnMvT3duZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsNERBQW9DO0FBQ3BDLCtEQUF1QztBQUN2QyxrRUFBMEM7QUFDMUMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDM0MsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFDbEQsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRTdCLG9EQUE0QjtBQUM1QixtQ0FBcUM7QUFDckMsOERBQXNDO0FBR3RDLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7QUFDbEQsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQztBQUNoRCxNQUFNLE1BQU0sR0FBRyxJQUFBLGdCQUFNLEVBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBRzdDLE1BQU0sTUFBTSxHQUFHLElBQUksZUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsZ0JBQU0sQ0FBQyxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUd4RSxNQUFNLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLENBQU8sR0FBUSxFQUFFLEVBQUU7SUFDMUQsSUFBSSxDQUFDO1FBQ0gsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ25DLE1BQU0sS0FBSyxHQUFHLE1BQU0sZUFBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUU1QyxJQUFJLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMvQixnQkFBTSxDQUFDLEdBQUcsQ0FB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