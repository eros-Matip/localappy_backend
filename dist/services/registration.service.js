"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegistrationAndCheckIn = validateRegistrationAndCheckIn;
const Registration_1 = __importDefault(require("../models/Registration"));
const mongoose_1 = require("mongoose");
function validateRegistrationAndCheckIn(params) {
    return __awaiter(this, void 0, void 0, function* () {
        const { registrationId, ticketNumber, merchantId } = params;
        const query = {};
        if (registrationId)
            query._id = registrationId;
        if (ticketNumber)
            query.ticketNumber = ticketNumber;
        const reg = yield Registration_1.default.findOne(query);
        if (!reg) {
            throw new Error("REGISTRATION_NOT_FOUND");
        }
        if (reg.checkInStatus === "checked-in") {
            return { code: "ALREADY_SCANNED", registration: reg };
        }
        const allowedStatuses = ["paid", "confirmed"];
        if (!allowedStatuses.includes(reg.status)) {
            throw new Error("REGISTRATION_NOT_ELIGIBLE");
        }
        reg.checkInStatus = "checked-in";
        reg.checkedInAt = new Date();
        reg.checkedInBy = new mongoose_1.Types.ObjectId(merchantId);
        yield reg.save();
        return { code: "OK", registration: reg };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cmF0aW9uLnNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvc2VydmljZXMvcmVnaXN0cmF0aW9uLnNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFRQSx3RUFzQ0M7QUE5Q0QsMEVBQWtEO0FBQ2xELHVDQUFpQztBQU9qQyxTQUFzQiw4QkFBOEIsQ0FBQyxNQUlwRDs7UUFDQyxNQUFNLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLENBQUM7UUFHNUQsTUFBTSxLQUFLLEdBQVEsRUFBRSxDQUFDO1FBQ3RCLElBQUksY0FBYztZQUFFLEtBQUssQ0FBQyxHQUFHLEdBQUcsY0FBYyxDQUFDO1FBQy9DLElBQUksWUFBWTtZQUFFLEtBQUssQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBRXBELE1BQU0sR0FBRyxHQUFHLE1BQU0sc0JBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1QsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzVDLENBQUM7UUFHRCxJQUFJLEdBQUcsQ0FBQyxhQUFhLEtBQUssWUFBWSxFQUFFLENBQUM7WUFDdkMsT0FBTyxFQUFFLElBQUksRUFBRSxpQkFBMEIsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUM7UUFDakUsQ0FBQztRQUdELE1BQU0sZUFBZSxHQUFHLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUMvQyxDQUFDO1FBR0QsR0FBRyxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUM7UUFHaEMsR0FBVyxDQUFDLFdBQVcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ3JDLEdBQVcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxnQkFBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUUxRCxNQUFNLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUVqQixPQUFPLEVBQUUsSUFBSSxFQUFFLElBQWEsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUM7SUFDcEQsQ0FBQztDQUFBIn0=