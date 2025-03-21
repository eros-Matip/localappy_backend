"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const auditLogSchema = new mongoose_1.Schema({
    action: String,
    email: String,
    role: String,
    ip: String,
    details: Object,
}, { timestamps: true });
const AuditLog = (0, mongoose_1.model)("AuditLog", auditLogSchema);
exports.default = AuditLog;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXVkaXRMb2cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL2F1ZGl0TG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sY0FBYyxHQUFHLElBQUksaUJBQU0sQ0FDL0I7SUFDRSxNQUFNLEVBQUUsTUFBTTtJQUNkLEtBQUssRUFBRSxNQUFNO0lBQ2IsSUFBSSxFQUFFLE1BQU07SUFDWixFQUFFLEVBQUUsTUFBTTtJQUNWLE9BQU8sRUFBRSxNQUFNO0NBQ2hCLEVBQ0QsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQ3JCLENBQUM7QUFFRixNQUFNLFFBQVEsR0FBRyxJQUFBLGdCQUFLLEVBQVksVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO0FBQzlELGtCQUFlLFFBQVEsQ0FBQyJ9