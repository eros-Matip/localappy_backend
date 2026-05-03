"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const GoodPlanSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
    },
    shortDescription: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1200,
        default: "",
    },
    type: {
        type: String,
        enum: [
            "discount",
            "free_item",
            "special_offer",
            "last_minute",
            "loyalty_bonus",
            "event_offer",
            "custom",
        ],
        required: true,
        default: "custom",
        index: true,
    },
    establishment: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Establishment",
        required: true,
        index: true,
    },
    createdByOwner: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Owner",
        default: null,
    },
    createdByCustomer: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Customer",
        default: null,
    },
    image: {
        type: String,
        default: null,
    },
    startDate: {
        type: Date,
        required: true,
        index: true,
    },
    endDate: {
        type: Date,
        required: true,
        index: true,
    },
    availability: {
        daysOfWeek: {
            type: [String],
            enum: [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday",
            ],
            default: [],
        },
        startTime: {
            type: String,
            default: null,
        },
        endTime: {
            type: String,
            default: null,
        },
    },
    conditions: {
        type: String,
        trim: true,
        maxlength: 600,
        default: "",
    },
    redemption: {
        mode: {
            type: String,
            enum: ["none", "code", "qr"],
            default: "none",
        },
        code: {
            type: String,
            trim: true,
            uppercase: true,
            default: null,
        },
        maxUses: {
            type: Number,
            default: null,
        },
        usesCount: {
            type: Number,
            default: 0,
        },
        oneUsePerUser: {
            type: Boolean,
            default: false,
        },
    },
    stats: {
        views: {
            type: Number,
            default: 0,
        },
        clicks: {
            type: Number,
            default: 0,
        },
        uses: {
            type: Number,
            default: 0,
        },
    },
    status: {
        type: String,
        enum: ["draft", "published", "expired", "disabled"],
        default: "draft",
        index: true,
    },
    isActive: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true,
    },
}, { timestamps: true });
GoodPlanSchema.index({ establishment: 1, status: 1, isActive: 1 });
GoodPlanSchema.index({ startDate: 1, endDate: 1 });
GoodPlanSchema.index({ type: 1, status: 1 });
GoodPlanSchema.index({ deletedAt: 1, createdAt: -1 });
GoodPlanSchema.pre("validate", function (next) {
    if (this.endDate && this.startDate && this.endDate < this.startDate) {
        return next(new Error("La date de fin ne peut pas être avant la date de début."));
    }
    if (!this.createdByOwner && !this.createdByCustomer) {
        return next(new Error("Un bon plan doit avoir un créateur Owner ou Customer."));
    }
    next();
});
const GoodPlan = (0, mongoose_1.model)("GoodPlan", GoodPlanSchema);
exports.default = GoodPlan;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR29vZFBsYW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0dvb2RQbGFuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQU0sQ0FDL0I7SUFDRSxLQUFLLEVBQUU7UUFDTCxJQUFJLEVBQUUsTUFBTTtRQUNaLFFBQVEsRUFBRSxJQUFJO1FBQ2QsSUFBSSxFQUFFLElBQUk7UUFDVixTQUFTLEVBQUUsRUFBRTtLQUNkO0lBRUQsZ0JBQWdCLEVBQUU7UUFDaEIsSUFBSSxFQUFFLE1BQU07UUFDWixRQUFRLEVBQUUsSUFBSTtRQUNkLElBQUksRUFBRSxJQUFJO1FBQ1YsU0FBUyxFQUFFLEdBQUc7S0FDZjtJQUVELFdBQVcsRUFBRTtRQUNYLElBQUksRUFBRSxNQUFNO1FBQ1osSUFBSSxFQUFFLElBQUk7UUFDVixTQUFTLEVBQUUsSUFBSTtRQUNmLE9BQU8sRUFBRSxFQUFFO0tBQ1o7SUFFRCxJQUFJLEVBQUU7UUFDSixJQUFJLEVBQUUsTUFBTTtRQUNaLElBQUksRUFBRTtZQUNKLFVBQVU7WUFDVixXQUFXO1lBQ1gsZUFBZTtZQUNmLGFBQWE7WUFDYixlQUFlO1lBQ2YsYUFBYTtZQUNiLFFBQVE7U0FDVDtRQUNELFFBQVEsRUFBRSxJQUFJO1FBQ2QsT0FBTyxFQUFFLFFBQVE7UUFDakIsS0FBSyxFQUFFLElBQUk7S0FDWjtJQUVELGFBQWEsRUFBRTtRQUNiLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRO1FBQzNCLEdBQUcsRUFBRSxlQUFlO1FBQ3BCLFFBQVEsRUFBRSxJQUFJO1FBQ2QsS0FBSyxFQUFFLElBQUk7S0FDWjtJQUVELGNBQWMsRUFBRTtRQUNkLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRO1FBQzNCLEdBQUcsRUFBRSxPQUFPO1FBQ1osT0FBTyxFQUFFLElBQUk7S0FDZDtJQUVELGlCQUFpQixF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