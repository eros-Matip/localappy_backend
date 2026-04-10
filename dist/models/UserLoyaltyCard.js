"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const UserLoyaltyCardSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Customer",
        required: true,
    },
    establishmentId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Establishment",
        required: true,
    },
    loyaltyProgramId: {
        type: mongoose_1.Schema.Types.ObjectId,
        required: true,
    },
    currentStamps: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ["active", "reward_available"],
        default: "active",
    },
    completedCardsCount: {
        type: Number,
        default: 0,
    },
    lastScannedAt: {
        type: Date,
        default: null,
    },
    lastRewardRedeemedAt: {
        type: Date,
        default: null,
    },
}, { timestamps: true });
UserLoyaltyCardSchema.index({ userId: 1, establishmentId: 1, loyaltyProgramId: 1 }, { unique: true });
exports.default = (0, mongoose_1.model)("UserLoyaltyCard", UserLoyaltyCardSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVXNlckxveWFsdHlDYXJkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVscy9Vc2VyTG95YWx0eUNhcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSx1Q0FBeUM7QUFFekMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLGlCQUFNLENBQ3RDO0lBQ0UsTUFBTSxFQUFFO1FBQ04sSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVE7UUFDM0IsR0FBRyxFQUFFLFVBQVU7UUFDZixRQUFRLEVBQUUsSUFBSTtLQUNmO0lBQ0QsZUFBZSxFQUFFO1FBQ2YsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVE7UUFDM0IsR0FBRyxFQUFFLGVBQWU7UUFDcEIsUUFBUSxFQUFFLElBQUk7S0FDZjtJQUNELGdCQUFnQixFQUFFO1FBQ2hCLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRO1FBQzNCLFFBQVEsRUFBRSxJQUFJO0tBQ2Y7SUFDRCxhQUFhLEVBQUU7UUFDYixJQUFJLEVBQUUsTUFBTTtRQUNaLE9BQU8sRUFBRSxDQUFDO0tBQ1g7SUFDRCxNQUFNLEVBQUU7UUFDTixJQUFJLEVBQUUsTUFBTTtRQUNaLElBQUksRUFBRSxDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQztRQUNwQyxPQUFPLEVBQUUsUUFBUTtLQUNsQjtJQUNELG1CQUFtQixFQUFFO1FBQ25CLElBQUksRUFBRSxNQUFNO1FBQ1osT0FBTyxFQUFFLENBQUM7S0FDWDtJQUNELGFBQWEsRUFBRTtRQUNiLElBQUksRUFBRSxJQUFJO1FBQ1YsT0FBTyxFQUFFLElBQUk7S0FDZDtJQUNELG9CQUFvQixFQUFFO1FBQ3BCLElBQUksRUFBRSxJQUFJO1FBQ1YsT0FBTyxFQUFFLElBQUk7S0FDZDtDQUNGLEVBQ0QsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQ3JCLENBQUM7QUFFRixxQkFBcUIsQ0FBQyxLQUFLLENBQ3pCLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxlQUFlLEVBQUUsQ0FBQyxFQUFFLGdCQUFnQixFQUFFLENBQUMsRUFBRSxFQUN0RCxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FDakIsQ0FBQztBQUVGLGtCQUFlLElBQUEsZ0JBQUssRUFBQyxpQkFBaUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDIn0=