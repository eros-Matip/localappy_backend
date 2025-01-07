"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const EstablishmentSchema = new mongoose_1.Schema({
    name: String,
    type: String,
    siret: String,
    picture: { public_id: String, secure_url: String },
    address: {
        street: String,
        city: String,
        postalCode: String,
        country: String,
    },
    location: {
        lat: Number,
        lng: Number,
    },
    contact: {
        website: String,
        socialMedia: { facebook: String, instagram: String, twitter: String },
    },
    legalInfo: {
        registrationNumber: String,
        insuranceCertificate: String,
        KBis: Object,
    },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: "Owner" },
    events: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
}, { timestamps: true });
const Establishment = (0, mongoose_1.model)("Establishment", EstablishmentSchema);
exports.default = Establishment;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXN0YWJsaXNobWVudC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbHMvRXN0YWJsaXNobWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUF5QztBQUd6QyxNQUFNLG1CQUFtQixHQUFHLElBQUksaUJBQU0sQ0FDcEM7SUFDRSxJQUFJLEVBQUUsTUFBTTtJQUNaLElBQUksRUFBRSxNQUFNO0lBQ1osS0FBSyxFQUFFLE1BQU07SUFDYixPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUU7SUFDbEQsT0FBTyxFQUFFO1FBQ1AsTUFBTSxFQUFFLE1BQU07UUFDZCxJQUFJLEVBQUUsTUFBTTtRQUNaLFVBQVUsRUFBRSxNQUFNO1FBQ2xCLE9BQU8sRUFBRSxNQUFNO0tBQ2hCO0lBQ0QsUUFBUSxFQUFFO1FBQ1IsR0FBRyxFQUFFLE1BQU07UUFDWCxHQUFHLEVBQUUsTUFBTTtLQUNaO0lBQ0QsT0FBTyxFQUFFO1FBQ1AsT0FBTyxFQUFFLE1BQU07UUFDZixXQUFXLEVBQUUsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtLQUN0RTtJQUNELFNBQVMsRUFBRTtRQUNULGtCQUFrQixFQUFFLE1BQU07UUFDMUIsb0JBQW9CLEVBQUUsTUFBTTtRQUM1QixJQUFJLEVBQUUsTUFBTTtLQUNiO0lBQ0QsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFO0lBQ3BELE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUM7Q0FDeEQsRUFDRCxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDckIsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUFHLElBQUEsZ0JBQUssRUFDekIsZUFBZSxFQUNmLG1CQUFtQixDQUNwQixDQUFDO0FBRUYsa0JBQWUsYUFBYSxDQUFDIn0=