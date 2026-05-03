"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const EstablishmentSchema = new mongoose_1.Schema({
    name: { type: String },
    email: String,
    phone: String,
    type: { type: [String] },
    legalForm: {
        type: String,
        enum: ["company", "association"],
        default: "company",
    },
    address: {
        street: { type: String },
        city: { type: String },
        postalCode: { type: String },
        department: { type: String },
        region: { type: String },
        country: { type: String },
    },
    location: {
        lat: { type: Number },
        lng: { type: Number },
    },
    contact: {
        email: { type: String },
        telephone: { type: String },
        fax: { type: String },
        website: { type: String },
        socialMedia: {
            type: new mongoose_1.Schema({
                facebook: { type: String },
                instagram: { type: String },
                twitter: { type: String },
            }, { _id: false }),
            default: undefined,
        },
    },
    description: { type: String },
    descriptionI18n: {
        fr: String,
        en: String,
        es: String,
        de: String,
        it: String,
        eu: String,
    },
    logo: { type: String },
    photos: { type: [String] },
    openingHours: [
        {
            dayOfWeek: { type: String },
            slots: [
                {
                    opens: { type: String },
                    closes: { type: String },
                    _id: false,
                },
            ],
            _id: false,
        },
    ],
    acceptedPayments: [
        {
            type: { type: String },
            label: { type: String },
        },
    ],
    legalInfo: {
        siret: { type: String },
        insuranceCertificate: { type: String },
        KBis: {
            type: new mongoose_1.Schema({
                public_id: { type: String },
                secure_url: { type: String },
            }, { _id: false }),
            default: undefined,
        },
        activityCodeNAF: { type: String },
        rna: { type: String },
        legalDocument: {
            type: new mongoose_1.Schema({
                public_id: { type: String },
                secure_url: { type: String },
                label: { type: String },
            }, { _id: false }),
            default: undefined,
        },
        rib: {
            type: new mongoose_1.Schema({
                iban: { type: String },
                bic: { type: String },
            }, { _id: false }),
            default: undefined,
        },
        _id: false,
    },
    ads: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Ad" }],
    goodPlans: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "GoodPlan" }],
    owner: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Owner" }],
    staff: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Customer" }],
    events: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
    notifications: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Notification" }],
    activated: { type: Boolean, default: false },
    amountAvailable: { type: Number, default: 0 },
    refund: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Bill" }],
    banned: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    activationRequested: { type: Boolean, default: false },
    activationRequestedAt: { type: Date, default: null },
    activationStatus: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
    },
    activationReviewedAt: { type: Date, default: null },
    loyaltyPrograms: [
        {
            title: {
                type: String,
                default: "Carte de fidélité",
            },
            stampGoal: {
                type: Number,
                default: 10,
                min: 1,
            },
            rewardDescription: {
                type: String,
                trim: true,
            },
            isActive: {
                type: Boolean,
                default: true,
            },
            startsAt: {
                type: Date,
                default: null,
            },
            endsAt: {
                type: Date,
                default: null,
            },
            createdBy: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "Owner",
                default: null,
            },
        },
    ],
    activationReviewedBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Admin",
        default: null,
    },
}, { timestamps: true });
EstablishmentSchema.index({ activated: 1 });
EstablishmentSchema.index({ "address.department": 1, activated: 1 });
EstablishmentSchema.index({ "address.city": 1 });
EstablishmentSchema.index({ email: 1 });
EstablishmentSchema.index({ owner: 1 });
EstablishmentSchema.index({ events: 1 });
EstablishmentSchema.index({ deletedAt: 1, createdAt: -1 });
EstablishmentSchema.index({ banned: 1, activated: 1 });
EstablishmentSchema.index({ "address.postalCode": 1 });
const Establishment = (0, mongoose_1.model)("Establishment", EstablishmentSchema);
exports.default = Establishment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbHMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUF5QztBQUd6QyxNQUFNLG1CQUFtQixHQUFHLElBQUksaUJBQU0sQ0FDcEM7SUFDRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQ3RCLEtBQUssRUFBRSxNQUFNO0lBQ2IsS0FBSyxFQUFFLE1BQU07SUFDYixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtJQUV4QixTQUFTLEVBQUU7UUFDVCxJQUFJLEVBQUUsTUFBTTtRQUNaLElBQUksRUFBRSxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUM7UUFDaEMsT0FBTyxFQUFFLFNBQVM7S0FDbkI7SUFFRCxPQUFPLEVBQUU7UUFDUCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1FBQ3hCLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDdEIsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtRQUM1QixVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1FBQzVCLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDeEIsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtLQUMxQjtJQUVELFFBQVEsRUFBRTtRQUNSLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDckIsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtLQUN0QjtJQUVELE9BQU8sRUFBRTtRQUNQLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDdkIsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtRQUMzQixHQUFHLEVBQUUsRUFBRSxJ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