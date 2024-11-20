"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const OwnerSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true },
    account: {
        name: { type: String, required: true },
        firstname: { type: String, required: true },
        phoneNumber: { type: Number, required: true },
    },
    establishments: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "Establishment",
        },
    ],
    picture: {
        url: String,
        public_id: String,
    },
    cni: {
        url: String,
        public_id: String,
    },
    customerAccount: { type: mongoose_1.Schema.Types.ObjectId, ref: "Customer" },
    isValidated: { type: Boolean, default: false },
    token: { type: String },
    hash: { type: String, required: true },
    salt: { type: String, required: true },
});
const Owner = (0, mongoose_1.model)("Owner", OwnerSchema);
exports.default = Owner;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3duZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbW9kZWxzL093bmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQXlDO0FBR3pDLE1BQU0sV0FBVyxHQUFHLElBQUksaUJBQU0sQ0FBUztJQUNyQyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRTtJQUNyRCxPQUFPLEVBQUU7UUFDUCxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7UUFDdEMsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO1FBQzNDLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtLQUM5QztJQUNELGNBQWMsRUFBRTtRQUNkO1lBQ0UsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVE7WUFDM0IsR0FBRyxFQUFFLGVBQWU7U0FDckI7S0FDRjtJQUNELE9BQU8sRUFBRTtRQUNQLEdBQUcsRUFBRSxNQUFNO1FBQ1gsU0FBUyxFQUFFLE1BQU07S0FDbEI7SUFDRCxHQUFHLEVBQUU7UUFDSCxHQUFHLEVBQUUsTUFBTTtRQUNYLFNBQVMsRUFBRSxNQUFNO0tBQ2xCO0lBQ0QsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLGlCQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsVUFBVSxFQUFFO0lBQ2pFLFdBQVcsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRTtJQUM5QyxLQUFLLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFO0lBQ3ZCLElBQUksRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRTtJQUN0QyxJQUFJLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Q0FDdkMsQ0FBQyxDQUFDO0FBRUgsTUFBTSxLQUFLLEdBQUcsSUFBQSxnQkFBSyxFQUFTLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztBQUVsRCxrQkFBZSxLQUFLLENBQUMifQ==