"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdModel = void 0;
const mongoose_1 = require("mongoose");
const adSchema = new mongoose_1.Schema({
    type: { type: String, required: true, enum: ["ad"] },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: [{ type: String, required: true }],
    event: { type: mongoose_1.Schema.Types.ObjectId, ref: "Event" },
    clics: [
        {
            source: String,
            date: Date,
        },
    ],
});
exports.AdModel = (0, mongoose_1.model)("Ad", adSchema);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL21vZGVscy9BZHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQU0sQ0FBTTtJQUMvQixJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUU7SUFDcEQsS0FBSyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO0lBQ3ZDLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtJQUM3QyxLQUFLLEVBQUUsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDO0lBQ3pDLEtBQUssRUFBRSxFQUFFLElBQUksRUFBRSxpQkFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRTtJQUNwRCxLQUFLLEVBQUU7UUFDTDtZQUNFLE1BQU0sRUFBRSxNQUFNO1lBQ2QsSUFBSSxFQUFFLElBQUk7U0FDWDtLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRVUsUUFBQSxPQUFPLEdBQUcsSUFBQSxnQkFBSyxFQUFNLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQyJ9