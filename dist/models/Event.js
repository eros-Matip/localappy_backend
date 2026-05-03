"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const eventSchema = new mongoose_1.Schema({
    title: String,
    theme: {
        type: [String],
        validate: {
            validator: function (themes) {
                if (!themes || !Array.isArray(themes) || themes.length === 0) {
                    return true;
                }
                return themes.every((theme) => typeof theme === "string" && theme.trim() !== "");
            },
            message: "Chaque thème doit être une chaîne non vide.",
        },
    },
    startingDate: Date,
    endingDate: Date,
    occurrences: [
        {
            startDate: { type: Date, required: false },
            endDate: { type: Date, required: false },
            startTime: { type: String, default: null },
            endTime: { type: String, default: null },
            daysOfWeek: [
                {
                    type: String,
                    enum: [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                    ],
                },
            ],
            label: { type: String, default: null },
            isRecurring: { type: Boolean, default: false },
            _id: false,
        },
    ],
    address: String,
    addressDetails: {
        streetAddress: [String],
        postalCode: String,
        city: String,
        department: String,
        departmentCode: String,
        region: String,
        regionCode: String,
        country: String,
        insee: String,
    },
    location: {
        lat: Number,
        lng: Number,
        geo: {
            type: {
                type: String,
                enum: ["Point"],
                required: false,
            },
            coordinates: {
                type: [Number],
                required: false,
                validate: {
                    validator: function (coordinates) {
                        return (!coordinates ||
                            coordinates.length === 0 ||
                            coordinates.length === 2);
                    },
                    message: "Les coordonnées doivent contenir exactement deux valeurs : [longitude, latitude].",
                },
            },
        },
    },
    price: { type: Number, default: 0 },
    priceLabel: { type: String, default: null },
    isFree: { type: Boolean, default: false },
    priceSpecification: {
        minPrice: Number,
        maxPrice: Number,
        priceCurrency: String,
        pricingMode: String,
        pricingOffer: String,
    },
    favorieds: [
        {
            customer: { type: mongoose_1.Schema.Types.ObjectId, ref: "Customer" },
            date: Date,
        },
    ],
    clics: [
        {
            source: String,
            date: Date,
            _id: false,
        },
    ],
    acceptedPaymentMethod: [String],
    organizer: {
        establishment: { type: mongoose_1.Schema.Types.ObjectId, ref: "Establishment" },
        legalName: { type: String, default: "Organisateur inconnu" },
        email: { type: String, default: "Email inconnu" },
        phone: { type: String, default: "Téléphone inconnu" },
        website: { type: String, default: null },
    },
    contact: {
        email: { type: String, default: null },
        phone: { type: String, default: null },
        website: { type: String, default: null },
        bookingUrl: { type: String, default: null },
    },
    capacity: { type: Number, default: 0 },
    registrationOpen: { type: Boolean, default: false },
    isDraft: { type: Boolean, default: false },
    registrations: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Registration",
        },
    ],
    bills: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Bill",
        },
    ],
    entries: [
        {
            checkedInAt: Date,
            registration: { type: mongoose_1.Schema.Types.ObjectId, ref: "Registration" },
            byWho: {
                type: mongoose_1.Schema.Types.ObjectId,
                required: true,
                refPath: "byWhoModel",
            },
            byWhoModel: {
                type: String,
                required: true,
                enum: ["Customer", "Owner"],
            },
        },
    ],
    image: {
        type: [String],
        validate: {
            validator: function (images) {
                if (!images)
                    return true;
                if (!Array.isArray(images))
                    return false;
                return images.every((img) => typeof img === "string" && img.trim() !== "");
            },
            message: "Une ou plusieurs images sont invalides.",
        },
    },
    images: [
        {
            url: { type: String, required: true },
            title: { type: String, default: null },
            credits: { type: String, default: null },
            rightsStartDate: { type: Date, default: null },
            rightsEndDate: { type: Date, default: null },
            mimeType: { type: String, default: null },
            isMain: { type: Boolean, default: false },
            _id: false,
        },
    ],
    description: String,
    shortDescription: { type: String, default: null },
    longDescription: { type: String, default: null },
    translations: [
        {
            lang: { type: String, required: true },
            title: { type: String },
            description: { type: String },
            shortDescription: { type: String },
            longDescription: { type: String },
            _id: false,
        },
    ],
    externalSource: {
        name: { type: String, default: null },
        id: { type: String, default: null },
        url: { type: String, default: null },
        lastUpdate: { type: Date, default: null },
        lastUpdateDatatourisme: { type: Date, default: null },
    },
    deletedAt: {
        type: Date,
        status: null,
    },
    color: String,
}, { timestamps: true });
eventSchema.index({
    title: 1,
    address: 1,
    startingDate: 1,
});
eventSchema.index({
    "externalSource.name": 1,
    "externalSource.id": 1,
});
eventSchema.index({
    "location.geo": "2dsphere",
});
const Event = (0, mongoose_1.model)("Event", eventSchema);
exports.default = Event;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU0sQ0FDNUI7SUFDRSxLQUFLLEVBQUUsTUFBTTtJQUViLEtBQUssRUFBRTtRQUNMLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNkLFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRSxVQUFVLE1BQWdCO2dCQUNuQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM3RCxPQUFPLElBQUksQ0FBQztnQkFDZCxDQUFDO2dCQUNELE9BQU8sTUFBTSxDQUFDLEtBQUssQ0FDakIsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUM1RCxDQUFDO1lBQ0osQ0FBQztZQUNELE9BQU8sRUFBRSw2Q0FBNkM7U0FDdkQ7S0FDRjtJQUVELFlBQVksRUFBRSxJQUFJO0lBQ2xCLFVBQVUsRUFBRSxJQUFJO0lBVWhCLFdBQVcsRUFBRTtRQUNYO1lBQ0UsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFO1lBQzFDLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRTtZQUd4QyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUU7WUFDMUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFO1lBRXhDLFVBQVUsRUFBRTtnQkFDVjtvQkFD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