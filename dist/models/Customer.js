"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const customerSchema = new mongoose_1.Schema({
    email: String,
    account: {
        name: String,
        firstname: String,
        phoneNumber: Number,
        address: String,
        zip: Number,
        city: String,
        location: {
            lng: Number,
            lat: Number,
        },
    },
    picture: {
        type: {
            url: { type: String },
            public_id: { type: String },
        },
        required: false,
    },
    descriptif: String,
    premiumStatus: { type: Boolean, default: false },
    membership: {
        startDate: Date,
        endDate: Date,
    },
    bills: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Bill" }],
    eventsAttended: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
    eventsReserved: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
    eventsFavorites: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
    themesFavorites: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Theme" }],
    customersFavorites: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Customer" }],
    establishmentFavorites: [
        { type: mongoose_1.Schema.Types.ObjectId, ref: "Etablishment" },
    ],
    ownerAccount: { type: mongoose_1.Schema.Types.ObjectId, ref: "Owner" },
    establishmentStaffOf: { type: mongoose_1.Schema.Types.ObjectId, ref: "Etablishment" },
    passwordLosted: {
        status: { type: Boolean, default: false },
        code: { type: String },
    },
    expoPushToken: String,
    token: String,
    hash: String,
    salt: String,
}, { timestamps: true });
const Customer = (0, mongoose_1.model)("Customer", customerSchema);
exports.default = Customer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0N1c3RvbWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQU0sQ0FDL0I7SUFDRSxLQUFLLEVBQUUsTUFBTTtJQUNiLE9BQU8sRUFBRTtRQUNQLElBQUksRUFBRSxNQUFNO1FBQ1osU0FBUyxFQUFFLE1BQU07UUFDakIsV0FBVyxFQUFFLE1BQU07UUFDbkIsT0FBTyxFQUFFLE1BQU07UUFDZixHQUFHLEVBQUUsTUFBTTtRQUNYLElBQUksRUFBRSxNQUFNO1FBQ1osUUFBUSxFQUFFO1lBQ1IsR0FBRyxFQUFFLE1BQU07WUFDWCxHQUFHLEVBQUUsTUFBTTtTQUNaO0tBQ0Y7SUFDRCxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQUU7WUFDSixHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO1lBQ3JCLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7U0FDNUI7UUFDRCxRQUFRLEVBQUUsS0FBSztLQUNoQjtJQUNELFVBQVUsRUFBRSxNQUFNO0lBQ2xCLGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtJQUNoRCxVQUFVLEVBQUU7UUFDVixTQUFTLEVBQUUsSUFBSTtRQUNmLE9BQU8sRUFBRSxJQUFJO0tBQ2Q7SUFDRCxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ3JELGNBQWMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDL0QsY0FBYyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUMvRCxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ2hFLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDaEUsa0JBQWtCLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxDQUFDO0lBQ3RFLHNCQUFzQixFQUFFO1FBQ3RCLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFO0tBQ3JEO0lBQ0QsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFO0lBQzNELG9CQUFvQixFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsY0FBYyxFQUFFO0lBQzFFLGNBQWMsRUFBRTtRQUNkLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtRQUN6QyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0tBQ3ZCO0lBQ0QsYUFBYSxFQUFFLE1BQU07SUFDckIsS0FBSyxFQUFFLE1BQU07SUFDYixJQUFJLEVBQUUsTUFBTTtJQUNaLElBQUksRUFBRSxNQUFNO0NBQ2IsRUFDRCxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDckIsQ0FBQztBQUVGLE1BQU0sUUFBUSxHQUFHLElBQUEsZ0JBQUssRUFBWSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFDOUQsa0JBQWUsUUFBUSxDQUFDIn0=