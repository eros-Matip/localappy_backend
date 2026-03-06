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
exports.trackLoginStat = void 0;
const DailyLogin_1 = __importDefault(require("../models/DailyLogin"));
const getTodayDateString = () => {
    return new Date().toISOString().slice(0, 10);
};
const trackLoginStat = (_a) => __awaiter(void 0, [_a], void 0, function* ({ role }) {
    const date = getTodayDateString();
    let stat = yield DailyLogin_1.default.findOne({ date });
    if (!stat) {
        stat = new DailyLogin_1.default({
            date,
            totalConnections: 0,
            customerConnections: 0,
            ownerConnections: 0,
            adminConnections: 0,
        });
    }
    stat.totalConnections += 1;
    if (role === "customer") {
        stat.customerConnections += 1;
    }
    else if (role === "owner") {
        stat.ownerConnections += 1;
    }
    else if (role === "admin") {
        stat.adminConnections += 1;
    }
    yield stat.save();
});
exports.trackLoginStat = trackLoginStat;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhY2tsb2dpblN0YXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGlicmFyeS9UcmFja2xvZ2luU3RhdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxzRUFBa0Q7QUFRbEQsTUFBTSxrQkFBa0IsR0FBRyxHQUFHLEVBQUU7SUFDOUIsT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDO0FBRUssTUFBTSxjQUFjLEdBQUcsS0FBdUMsRUFBRSw0Q0FBbEMsRUFBRSxJQUFJLEVBQXdCO0lBQ2pFLE1BQU0sSUFBSSxHQUFHLGtCQUFrQixFQUFFLENBQUM7SUFFbEMsSUFBSSxJQUFJLEdBQUcsTUFBTSxvQkFBYyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFFbEQsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ1YsSUFBSSxHQUFHLElBQUksb0JBQWMsQ0FBQztZQUN4QixJQUFJO1lBQ0osZ0JBQWdCLEVBQUUsQ0FBQztZQUNuQixtQkFBbUIsRUFBRSxDQUFDO1lBQ3RCLGdCQUFnQixFQUFFLENBQUM7WUFDbkIsZ0JBQWdCLEVBQUUsQ0FBQztTQUNwQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQztJQUUzQixJQUFJLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsbUJBQW1CLElBQUksQ0FBQyxDQUFDO0lBQ2hDLENBQUM7U0FBTSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFDO0lBQzdCLENBQUM7U0FBTSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwQixDQUFDLENBQUEsQ0FBQztBQTFCVyxRQUFBLGNBQWMsa0JBMEJ6QiJ9