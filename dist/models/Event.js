"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const eventSchema = new mongoose_1.Schema({
    title: String,
    theme: [String],
    startingDate: Date,
    endingDate: Date,
    address: String,
    location: {
        lat: Number,
        lng: Number,
    },
    price: { type: Number, default: 0 },
    priceSpecification: {
        minPrice: Number,
        maxPrice: Number,
        priceCurrency: String,
    },
    favorieds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Customer" }],
    acceptedPaymentMethod: [String],
    organizer: {
        establishment: { type: mongoose_1.Schema.Types.ObjectId, ref: "Establishment" },
        legalName: { type: String, default: "Organisateur inconnu" },
        email: { type: String, default: "Email inconnu" },
        phone: { type: String, default: "Téléphone inconnu" },
    },
    image: [String],
    description: String,
    color: String,
});
const Event = (0, mongoose_1.model)("Event", eventSchema);
exports.default = Event;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU0sQ0FBUztJQUNyQyxLQUFLLEVBQUUsTUFBTTtJQUNiLEtBQUssRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNmLFlBQVksRUFBRSxJQUFJO0lBQ2xCLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLE9BQU8sRUFBRSxNQUFNO0lBQ2YsUUFBUSxFQUFFO1FBQ1IsR0FBRyxFQUFFLE1BQU07UUFDWCxHQUFHLEVBQUUsTUFBTTtLQUNaO0lBQ0QsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO0lBQ25DLGtCQUFrQixFQUFFO1FBQ2xCLFFBQVEsRUFBRSxNQUFNO1FBQ2hCLFFBQVEsRUFBRSxNQUFNO1FBQ2hCLGFBQWEsRUFBRSxNQUFNO0tBQ3RCO0lBQ0QsU0FBUyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxVQUFVLEVBQUUsQ0FBQztJQUM3RCxxQkFBcUIsRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUMvQixTQUFTLEVBQUU7UUFDVCxhQUFhLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUU7UUFDcEUsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUU7UUFDNUQsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFO1FBQ2pELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFO0tBQ3REO0lBQ0QsS0FBSyxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQ2YsV0FBVyxFQUFFLE1BQU07SUFDbkIsS0FBSyxFQUFFLE1BQU07Q0FDZCxDQUFDLENBQUM7QUFFSCxNQUFNLEtBQUssR0FBRyxJQUFBLGdCQUFLLEVBQVMsT0FBTyxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ2xELGtCQUFlLEtBQUssQ0FBQyJ9