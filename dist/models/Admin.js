"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const adminSchema = new mongoose_1.Schema({
    email: String,
    account: {
        name: String,
        firstname: String,
        phoneNumber: Number,
    },
    token: String,
    hash: String,
    salt: String,
}, { timestamps: true });
const Admin = (0, mongoose_1.model)("Admin", adminSchema);
exports.default = Admin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQWRtaW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL0FkbWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU0sQ0FDNUI7SUFDRSxLQUFLLEVBQUUsTUFBTTtJQUNiLE9BQU8sRUFBRTtRQUNQLElBQUksRUFBRSxNQUFNO1FBQ1osU0FBUyxFQUFFLE1BQU07UUFDakIsV0FBVyxFQUFFLE1BQU07S0FDcEI7SUFDRCxLQUFLLEVBQUUsTUFBTTtJQUNiLElBQUksRUFBRSxNQUFNO0lBQ1osSUFBSSxFQUFFLE1BQU07Q0FDYixFQUNELEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUNyQixDQUFDO0FBRUYsTUFBTSxLQUFLLEdBQUcsSUFBQSxnQkFBSyxFQUFTLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztBQUNsRCxrQkFBZSxLQUFLLENBQUMifQ==