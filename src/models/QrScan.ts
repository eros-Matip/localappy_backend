import mongoose from "mongoose";

const QrScanSchema = new mongoose.Schema({
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Establishment",
    required: true,
    index: true,
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
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

export default mongoose.model("QrScan", QrScanSchema);
