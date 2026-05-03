import { model, Schema } from "mongoose";
import IGoodPlan from "../interfaces/GoodPlan";

const GoodPlanSchema = new Schema<IGoodPlan>(
  {
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
      type: Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
      index: true,
    },

    createdByOwner: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      default: null,
    },

    createdByCustomer: {
      type: Schema.Types.ObjectId,
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
  },
  { timestamps: true },
);

GoodPlanSchema.index({ establishment: 1, status: 1, isActive: 1 });
GoodPlanSchema.index({ startDate: 1, endDate: 1 });
GoodPlanSchema.index({ type: 1, status: 1 });
GoodPlanSchema.index({ deletedAt: 1, createdAt: -1 });

GoodPlanSchema.pre("validate", function (next) {
  if (this.endDate && this.startDate && this.endDate < this.startDate) {
    return next(
      new Error("La date de fin ne peut pas être avant la date de début."),
    );
  }

  if (!this.createdByOwner && !this.createdByCustomer) {
    return next(
      new Error("Un bon plan doit avoir un créateur Owner ou Customer."),
    );
  }

  next();
});

const GoodPlan = model<IGoodPlan>("GoodPlan", GoodPlanSchema);

export default GoodPlan;
