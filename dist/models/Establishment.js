"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const EstablishmentSchema = new mongoose_1.Schema({
    name: { type: String },
    email: String,
    phone: String,
    type: { type: [String] },
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
    logo: { type: String },
    photos: { type: [String] },
    openingHours: [
        {
            dayOfWeek: { type: String },
            opens: { type: String },
            closes: { type: String },
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
        insuranceCertificate: { type: String },
        KBis: { public_id: String, secure_url: String },
        activityCodeNAF: { type: String },
    },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: "Owner" },
    events: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
    activated: { type: Boolean, default: false },
}, { timestamps: true });
const Establishment = (0, mongoose_1.model)("Establishment", EstablishmentSchema);
exports.default = Establishment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbHMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUF5QztBQUd6QyxNQUFNLG1CQUFtQixHQUFHLElBQUksaUJBQU0sQ0FDcEM7SUFDRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQ3RCLEtBQUssRUFBRSxNQUFNO0lBQ2IsS0FBSyxFQUFFLE1BQU07SUFDYixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRTtJQUN4QixPQUFPLEVBQUU7UUFDUCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1FBQ3hCLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDdEIsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtRQUM1QixVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1FBQzVCLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDeEIsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtLQUMxQjtJQUVELFFBQVEsRUFBRTtRQUNSLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDckIsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtLQUN0QjtJQUVELE9BQU8sRUFBRTtRQUNQLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDdkIsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtRQUMzQixHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1FBQ3JCLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDekIsV0FBVyxFQUFFO1lBQ1gsSUFBSSxFQUFFLElBQUksaUJBQU0sQ0FDZDtnQkFDRSxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO2dCQUMxQixTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO2dCQUMzQixPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO2FBQzFCLEVBQ0QsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQ2Y7WUFDRCxPQUFPLEVBQUUsU0FBUztTQUNuQjtLQUNGO0lBRUQsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtJQUM3QixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQ3RCLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFO0lBQzFCLFlBQVksRUFBRTtRQUNaO1lBQ0UsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUMzQixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQ3ZCLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDeEIsR0FBRyxFQUFFLEtBQUs7U0FDWDtLQUNGO0lBRUQsZ0JBQWdCLEVBQUU7UUFDaEI7WUFDRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQ3RCLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7U0FDeEI7S0FDRjtJQUNELFNBQVMsRUFBRTtRQUNULG9CQUFvQixFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtRQUN0QyxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUU7UUFDL0MsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtLQUNsQztJQUNELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRTtJQUNwRCxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ3ZELFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtDQUM3QyxFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQUcsSUFBQSxnQkFBSyxFQUN6QixlQUFlLEVBQ2YsbUJBQW1CLENBQ3BCLENBQUM7QUFFRixrQkFBZSxhQUFhLENBQUMifQ==