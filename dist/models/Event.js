"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const eventSchema = new mongoose_1.Schema({
    title: String,
    theme: {
        type: [String],
        validate: {
            validator: function (themes) {
                return (themes.length > 0 && themes.every((theme) => theme.trim() !== ""));
            },
            message: "Chaque thème doit être une chaîne non vide.",
        },
    },
    startingDate: Date,
    endingDate: Date,
    address: String,
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
                        return coordinates.length === 2;
                    },
                    message: "Les coordonnées doivent contenir exactement deux valeurs : [longitude, latitude].",
                },
            },
        },
    },
    price: { type: Number, default: 0 },
    priceSpecification: {
        minPrice: Number,
        maxPrice: Number,
        priceCurrency: String,
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
    },
    capacity: { type: Number, default: 0 },
    registrationOpen: { type: Boolean, default: false },
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
    image: {
        type: [String],
        validate: {
            validator: function (images) {
                return images.every((img) => img.trim() !== "");
            },
            message: "Une ou plusieurs images sont invalides.",
        },
    },
    description: String,
    color: String,
}, { timestamps: true });
const Event = (0, mongoose_1.model)("Event", eventSchema);
exports.default = Event;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU0sQ0FDNUI7SUFDRSxLQUFLLEVBQUUsTUFBTTtJQUNiLEtBQUssRUFBRTtRQUNMLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNkLFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRSxVQUFVLE1BQWdCO2dCQUNuQyxPQUFPLENBQ0wsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUNsRSxDQUFDO1lBQ0osQ0FBQztZQUNELE9BQU8sRUFBRSw2Q0FBNkM7U0FDdkQ7S0FDRjtJQUNELFlBQVksRUFBRSxJQUFJO0lBQ2xCLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLE9BQU8sRUFBRSxNQUFNO0lBQ2YsUUFBUSxFQUFFO1FBQ1IsR0FBRyxFQUFFLE1BQU07UUFDWCxHQUFHLEVBQUUsTUFBTTtRQUNYLEdBQUcsRUFBRTtZQUNILElBQUksRUFBRTtnQkFDSixJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUM7Z0JBQ2YsUUFBUSxFQUFFLEtBQUs7YUFDaEI7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO2dCQUNkLFFBQVEsRUFBRSxLQUFLO2dCQUNmLFFBQVEsRUFBRTtvQkFDUixTQUFTLEVBQUUsVUFBVSxXQUFxQjt3QkFDeEMsT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztvQkFDbEMsQ0FBQztvQkFDRCxPQUFPLEVBQ0wsbUZBQW1GO2lCQUN0RjthQUNGO1NBQ0Y7S0FDRjtJQUNELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtJQUNuQyxrQkFBa0IsRUFBRTtRQUNsQixRQUFRLEVBQUUsTUFBTTtRQUNoQixRQUFRLEVBQUUsTUFBTTtRQUNoQixhQUFhLEVBQUUsTUFBTTtLQUN0QjtJQUNELFNBQVMsRUFBRTtRQUNUO1lBQ0UsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFO1lBQzFELElBQUksRUFBRSxJQUFJO1NBQ1g7S0FDRjtJQUNELEtBQUssRUFBRTtRQUNMO1lBQ0UsTUFBTSxFQUFFLE1BQU07WUFDZCxJQUFJLEVBQUUsSUFBSTtZQUNWLEdBQUcsRUFBRSxLQUFLO1NBQ1g7S0FDRjtJQUNELHFCQUFxQixFQUFFLENBQUMsTUFBTSxDQUFDO0lBQy9CLFNBQVMsRUFBRTtRQUNULGFBQWEsRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRTtRQUNwRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRTtRQUM1RCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUU7UUFDakQsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUU7S0FDdEQ7SUFDRCxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLEVBQUU7SUFDdEMsZ0JBQWdCLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7SUFDbkQsYUFBYSxFQUFFO1FBQ2I7WUFDRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUTtZQUMzQixHQUFHLEVBQUUsY0FBYztTQUNwQjtLQUNGO0lBQ0QsS0FBSyxFQUFFO1FBQ0w7WUFDRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUTtZQUMzQixHQUFHLEVBQUUsTUFBTTtTQUNaO0tBQ0Y7SUFDRCxLQUFLLEVBQUU7UUFDTCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7UUFDZCxRQUFRLEVBQUU7WUFDUixTQUFTLEVBQUUsVUFBVSxNQUFnQjtnQkFDbkMsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDbEQsQ0FBQztZQUNELE9BQU8sRUFBRSx5Q0FBeUM7U0FDbkQ7S0FDRjtJQUNELFdBQVcsRUFBRSxNQUFNO0lBQ25CLEtBQUssRUFBRSxNQUFNO0NBQ2QsRUFDRCxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FDckIsQ0FBQztBQUVGLE1BQU0sS0FBSyxHQUFHLElBQUEsZ0JBQUssRUFBUyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7QUFDbEQsa0JBQWUsS0FBSyxDQUFDIn0=