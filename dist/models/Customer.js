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
        url: String,
        public_id: String,
    },
    descriptif: String,
    premiumStatus: { type: Boolean, default: false },
    membership: {
        startDate: Date,
        endDate: Date,
    },
    bills: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Bill" }],
    eventsAttended: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
    eventsFavorites: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Event" }],
    themesFavorites: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Theme" }],
    establishmentFavorites: [
        { type: mongoose_1.Schema.Types.ObjectId, ref: "Etablishment" },
    ],
    token: String,
    hash: String,
    salt: String,
});
const Customer = (0, mongoose_1.model)("Customer", customerSchema);
exports.default = Customer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ3VzdG9tZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0N1c3RvbWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQU0sQ0FBWTtJQUMzQyxLQUFLLEVBQUUsTUFBTTtJQUNiLE9BQU8sRUFBRTtRQUNQLElBQUksRUFBRSxNQUFNO1FBQ1osU0FBUyxFQUFFLE1BQU07UUFDakIsV0FBVyxFQUFFLE1BQU07UUFDbkIsT0FBTyxFQUFFLE1BQU07UUFDZixHQUFHLEVBQUUsTUFBTTtRQUNYLElBQUksRUFBRSxNQUFNO1FBQ1osUUFBUSxFQUFFO1lBQ1IsR0FBRyxFQUFFLE1BQU07WUFDWCxHQUFHLEVBQUUsTUFBTTtTQUNaO0tBQ0Y7SUFDRCxPQUFPLEVBQUU7UUFDUCxHQUFHLEVBQUUsTUFBTTtRQUNYLFNBQVMsRUFBRSxNQUFNO0tBQ2xCO0lBQ0QsVUFBVSxFQUFFLE1BQU07SUFDbEIsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFO0lBQ2hELFVBQVUsRUFBRTtRQUNWLFNBQVMsRUFBRSxJQUFJO1FBQ2YsT0FBTyxFQUFFLElBQUk7S0FDZDtJQUNELEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLENBQUM7SUFDckQsY0FBYyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUMvRCxlQUFlLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxDQUFDO0lBQ2hFLGVBQWUsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUM7SUFDaEUsc0JBQXNCLEVBQUU7UUFDdEIsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxjQUFjLEVBQUU7S0FDckQ7SUFDRCxLQUFLLEVBQUUsTUFBTTtJQUNiLElBQUksRUFBRSxNQUFNO0lBQ1osSUFBSSxFQUFFLE1BQU07Q0FDYixDQUFDLENBQUM7QUFFSCxNQUFNLFFBQVEsR0FBRyxJQUFBLGdCQUFLLEVBQVksVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQzlELGtCQUFlLFFBQVEsQ0FBQyJ9