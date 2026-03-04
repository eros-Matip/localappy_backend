"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const QrScanSchema = new mongoose_1.default.Schema({
    establishment: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Establishment",
        required: true,
        index: true,
    },
    customer: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "Customer",
    },
    scannedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    device: String,
    source: {
        type: String,
        enum: ["flyer", "table", "sticker", "unknown"],
        default: "unknown",
    },
});
exports.default = mongoose_1.default.model("QrScan", QrScanSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXJTY2FuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVscy9RclNjYW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSx3REFBZ0M7QUFFaEMsTUFBTSxZQUFZLEdBQUcsSUFBSSxrQkFBUSxDQUFDLE1BQU0sQ0FBQztJQUN2QyxhQUFhLEVBQUU7UUFDYixJQUFJLEVBQUUsa0JBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVE7UUFDcEMsR0FBRyxFQUFFLGVBQWU7UUFDcEIsUUFBUSxFQUFFLElBQUk7UUFDZCxLQUFLLEVBQUUsSUFBSTtLQUNaO0lBQ0QsUUFBUSxFQUFFO1FBQ1IsSUFBSSxFQUFFLGtCQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRO1FBQ3BDLEdBQUcsRUFBRSxVQUFVO0tBQ2hCO0lBQ0QsU0FBUyxFQUFFO1FBQ1QsSUFBSSxFQUFFLElBQUk7UUFDVixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUc7UUFDakIsS0FBSyxFQUFFLElBQUk7S0FDWjtJQUNELE1BQU0sRUFBRSxNQUFNO0lBQ2QsTUFBTSxFQUFFO1FBQ04sSUFBSSxFQUFFLE1BQU07UUFDWixJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUM7UUFDOUMsT0FBTyxFQUFFLFNBQVM7S0FDbkI7Q0FDRixDQUFDLENBQUM7QUFFSCxrQkFBZSxrQkFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUMifQ==