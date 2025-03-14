"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const EstablishmentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    type: { type: [String], required: true },
    address: {
        street: { type: String },
        city: { type: String, required: true },
        postalCode: { type: String, required: true },
        department: { type: String, required: true },
        region: { type: String, required: true },
        country: { type: String, required: true },
    },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
    },
    contact: {
        email: { type: String },
        telephone: { type: String },
        fax: { type: String },
        website: { type: String },
        socialMedia: {
            facebook: { type: String },
            instagram: { type: String },
            twitter: { type: String },
        },
    },
    description: { type: String },
    logo: { type: String },
    openingHours: [
        {
            dayOfWeek: { type: String, required: true },
            opens: { type: String, required: true },
            closes: { type: String, required: true },
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
}, { timestamps: true });
const Establishment = (0, mongoose_1.model)("Establishment", EstablishmentSchema);
exports.default = Establishment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbHMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUF5QztBQUd6QyxNQUFNLG1CQUFtQixHQUFHLElBQUksaUJBQU0sQ0FDcEM7SUFDRSxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7SUFDdEMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtJQUN4QyxPQUFPLEVBQUU7UUFDUCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1FBQ3hCLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtRQUN0QyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7UUFDNUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO1FBQzVDLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtRQUN4QyxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7S0FDMUM7SUFFRCxRQUFRLEVBQUU7UUFDUixHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7UUFDckMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0tBQ3RDO0lBRUQsT0FBTyxFQUFFO1FBQ1AsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtRQUN2QixTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1FBQzNCLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDckIsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtRQUN6QixXQUFXLEVBQUU7WUFDWCxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQzFCLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7WUFDM0IsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtTQUMxQjtLQUNGO0lBRUQsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtJQUM3QixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBRXRCLFlBQVksRUFBRTtRQUNaO1lBQ0UsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO1lBQzNDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtZQUN2QyxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7U0FDekM7S0FDRjtJQUVELGdCQUFnQixFQUFFO1FBQ2hCO1lBQ0UsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRTtZQUN0QixLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1NBQ3hCO0tBQ0Y7SUFDRCxTQUFTLEVBQUU7UUFDVCxvQkFBb0IsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7UUFDdEMsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFO1FBQy9DLGVBQWUsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7S0FDbEM7SUFDRCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7SUFDcEQsTUFBTSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQztDQUN4RCxFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQUcsSUFBQSxnQkFBSyxFQUN6QixlQUFlLEVBQ2YsbUJBQW1CLENBQ3BCLENBQUM7QUFFRixrQkFBZSxhQUFhLENBQUMifQ==