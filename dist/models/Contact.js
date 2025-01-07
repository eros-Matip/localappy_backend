"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const contactSchema = new mongoose_1.Schema({
    name: String,
    email: String,
    content: String,
}, { timestamps: true });
const Contact = (0, mongoose_1.model)("Contact", contactSchema);
exports.default = Contact;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ29udGFjdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tb2RlbHMvQ29udGFjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLHVDQUF5QztBQUd6QyxNQUFNLGFBQWEsR0FBRyxJQUFJLGlCQUFNLENBQzlCO0lBQ0UsSUFBSSxFQUFFLE1BQU07SUFDWixLQUFLLEVBQUUsTUFBTTtJQUNiLE9BQU8sRUFBRSxNQUFNO0NBQ2hCLEVBQ0QsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQ3JCLENBQUM7QUFFRixNQUFNLE9BQU8sR0FBRyxJQUFBLGdCQUFLLEVBQVcsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0FBQzFELGtCQUFlLE9BQU8sQ0FBQyJ9