"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const GoodPlanUseSchema = new mongoose_1.Schema({
    goodPlan: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "GoodPlan",
        required: true,
        index: true,
    },
    establishment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Establishment",
        required: true,
        index: true,
    },
    customer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Customer",
        required: true,
        index: true,
    },
    scannedByCustomer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Customer",
        required: true,
        index: true,
    },
    scannedByOwner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Owner",
        default: null,
    },
    source: {
        type: String,
        enum: ["qr_scan"],
        default: "qr_scan",
    },
    status: {
        type: String,
        enum: ["validated", "cancelled"],
        default: "validated",
    },
    qrIssuedAt: {
        type: Date,
        default: null,
    },
    qrExpiresAt: {
        type: Date,
        default: null,
    },
    usedAt: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });
GoodPlanUseSchema.index({ goodPlan: 1, customer: 1, status: 1 });
GoodPlanUseSchema.index({ establishment: 1, usedAt: -1 });
GoodPlanUseSchema.index({ scannedByCustomer: 1, usedAt: -1 });
const GoodPlanUse = (0, mongoose_1.model)("GoodPlanUse", GoodPlanUseSchema);
exports.default = GoodPlanUse;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR29vZFBsYW5Vc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0dvb2RQbGFuVXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBTSxDQUNsQztJQUNFLFFBQVEsRUFBRTtRQUNSLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRO1FBQzNCLEdBQUcsRUFBRSxVQUFVO1FBQ2YsUUFBUSxFQUFFLElBQUk7UUFDZCxLQUFLLEVBQUUsSUFBSTtLQUNaO0lBRUQsYUFBYSxFQUFFO1FBQ2IsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVE7UUFDM0IsR0FBRyxFQUFFLGVBQWU7UUFDcEIsUUFBUSxFQUFFLElBQUk7UUFDZCxLQUFLLEVBQUUsSUFBSTtLQUNaO0lBRUQsUUFBUSxFQUFFO1FBQ1IsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVE7UUFDM0IsR0FBRyxFQUFFLFVBQVU7UUFDZixRQUFRLEVBQUUsSUFBSTtRQUNkLEtBQUssRUFBRSxJQUFJO0tBQ1o7SUFFRCxpQkFBaUIsRUFBRTtRQUNqQixJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUTtRQUMzQixHQUFHLEVBQUUsVUFBVTtRQUNmLFFBQVEsRUFBRSxJQUFJO1FBQ2QsS0FBSyxFQUFFLElBQUk7S0FDWjtJQUVELGNBQWMsRUFBRTtRQUNkLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRO1FBQzNCLEdBQUcsRUFBRSxPQUFPO1FBQ1osT0FBTyxFQUFFLElBQUk7S0FDZDtJQUVELE1BQU0sRUFBRTtRQUNOLElBQUksRUFBRSxNQUFNO1FBQ1osSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDO1FBQ2pCLE9BQU8sRUFBRSxTQUFTO0tBQ25CO0lBRUQsTUFBTSxFQUFFO1FBQ04sSUFBSSxFQUFFLE1BQU07UUFDWixJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDO1FBQ2hDLE9BQU8sRUFBRSxXQUFXO0tBQ3JCO0lBRUQsVUFBVSxFQUFFO1FBQ1YsSUFBSSxFQUFFLElBQUk7UUFDVixPQUFPLEVBQUUsSUFBSTtLQUNkO0lBRUQsV0FBVyxFQUFFO1FBQ1gsSUFBSSxFQUFFLElBQUk7UUFDVixPQUFPLEVBQUUsSUFBSTtLQUNkO0lBRUQsTUFBTSxFQUFFO1FBQ04sSUFBSSxFQUFFLElBQUk7UUFDVixPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUc7S0FDbEI7Q0FDRixFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFDO0FBRUYsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxFQUFFLGFBQWEsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMxRCxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUU5RCxNQUFNLFdBQVcsR0FBRyxJQUFBLGdCQUFLLEVBQWUsYUFBYSxFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFFMUUsa0JBQWUsV0FBVyxDQUFDIn0=