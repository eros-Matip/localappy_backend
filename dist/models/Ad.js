"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdModel = void 0;
const mongoose_1 = require("mongoose");
const adSchema = new mongoose_1.Schema({
    _id: { type: String, required: true },
    type: { type: String, required: true, enum: ["ad"] },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    event: { type: mongoose_1.Schema.Types.ObjectId, ref: "Event" },
    clics: [
        {
            source: String,
            date: Date,
        },
    ],
});
exports.AdModel = (0, mongoose_1.model)("Ad", adSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHVDQUF5QztBQUd6QyxNQUFNLFFBQVEsR0FBRyxJQUFJLGlCQUFNLENBQU07SUFDL0IsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0lBQ3JDLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRTtJQUNwRCxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7SUFDdkMsV0FBVyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0lBQzdDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtJQUN2QyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsaUJBQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7SUFDcEQsS0FBSyxFQUFFO1FBQ0w7WUFDRSxNQUFNLEVBQUUsTUFBTTtZQUNkLElBQUksRUFBRSxJQUFJO1NBQ1g7S0FDRjtDQUNGLENBQUMsQ0FBQztBQUVVLFFBQUEsT0FBTyxHQUFHLElBQUEsZ0JBQUssRUFBTSxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUMifQ==