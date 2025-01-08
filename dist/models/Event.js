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
    favorieds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Customer" }],
    acceptedPaymentMethod: [String],
    organizer: {
        establishment: { type: mongoose_1.Schema.Types.ObjectId, ref: "Establishment" },
        legalName: { type: String, default: "Organisateur inconnu" },
        email: { type: String, default: "Email inconnu" },
        phone: { type: String, default: "Téléphone inconnu" },
    },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0V2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU0sQ0FDNUI7SUFDRSxLQUFLLEVBQUUsTUFBTTtJQUNiLEtBQUssRUFBRTtRQUNMLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNkLFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRSxVQUFVLE1BQWdCO2dCQUNuQyxPQUFPLENBQ0wsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUNsRSxDQUFDO1lBQ0osQ0FBQztZQUNELE9BQU8sRUFBRSw2Q0FBNkM7U0FDdkQ7S0FDRjtJQUNELFlBQVksRUFBRSxJQUFJO0lBQ2xCLFVBQVUsRUFBRSxJQUFJO0lBQ2hCLE9BQU8sRUFBRSxNQUFNO0lBQ2YsUUFBUSxFQUFFO1FBQ1IsR0FBRyxFQUFFLE1BQU07UUFDWCxHQUFHLEVBQUUsTUFBTTtRQUNYLEdBQUcsRUFBRTtZQUNILElBQUksRUFBRTtnQkFDSixJQUFJLEVBQUUsTUFBTTtnQkFDWixJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUM7Z0JBQ2YsUUFBUSxFQUFFLEtBQUs7YUFDaEI7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO2dCQUNkLFFBQVEsRUFBRSxLQUFLO2dCQUNmLFFBQVEsRUFBRTtvQkFDUixTQUFTLEVBQUUsVUFBVSxXQUFxQjt3QkFDeEMsT0FBTyxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQztvQkFDbEMsQ0FBQztvQkFDRCxPQUFPLEVBQ0wsbUZBQW1GO2lCQUN0RjthQUNGO1NBQ0Y7S0FDRjtJQUNELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtJQUNuQyxrQkFBa0IsRUFBRTtRQUNsQixRQUFRLEVBQUUsTUFBTTtRQUNoQixRQUFRLEVBQUUsTUFBTTtRQUNoQixhQUFhLEVBQUUsTUFBTTtLQUN0QjtJQUNELFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFLENBQUM7SUFDN0QscUJBQXFCLEVBQUUsQ0FBQyxNQUFNLENBQUM7SUFDL0IsU0FBUyxFQUFFO1FBQ1QsYUFBYSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsZUFBZSxFQUFFO1FBQ3BFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFO1FBQzVELEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRTtRQUNqRCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRTtLQUN0RDtJQUNELEtBQUssRUFBRTtRQUNMLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNkLFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRSxVQUFVLE1BQWdCO2dCQUNuQyxPQUFPLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUNsRCxDQUFDO1lBQ0QsT0FBTyxFQUFFLHlDQUF5QztTQUNuRDtLQUNGO0lBQ0QsV0FBVyxFQUFFLE1BQU07SUFDbkIsS0FBSyxFQUFFLE1BQU07Q0FDZCxFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsSUFBQSxnQkFBSyxFQUFTLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNsRCxrQkFBZSxLQUFLLENBQUMifQ==