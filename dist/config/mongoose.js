"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("./config"));
const connectionCurrent = mongoose_1.default.createConnection(`${config_1.default.mongooseUrl}`, {
    retryWrites: true,
    w: "majority",
});
exports.default = { connectionCurrent };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uZ29vc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29uZmlnL21vbmdvb3NlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsd0RBQWdDO0FBQ2hDLHNEQUE4QjtBQUU5QixNQUFNLGlCQUFpQixHQUFHLGtCQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxnQkFBTSxDQUFDLFdBQVcsRUFBRSxFQUFFO0lBQzNFLFdBQVcsRUFBRSxJQUFJO0lBQ2pCLENBQUMsRUFBRSxVQUFVO0NBQ2QsQ0FBQyxDQUFDO0FBRUgsa0JBQWUsRUFBRSxpQkFBaUIsRUFBRSxDQUFDIn0=