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
exports.trackCityConsultationStat = void 0;
const DailyCityConsultationStat_1 = __importDefault(require("../models/DailyCityConsultationStat"));
const getTodayDateString = () => {
    return new Date().toISOString().slice(0, 10);
};
const trackCityConsultationStat = (_a) => __awaiter(void 0, [_a], void 0, function* ({ city, }) {
    const date = getTodayDateString();
    const normalizedCity = city === null || city === void 0 ? void 0 : city.trim();
    if (!normalizedCity)
        return;
    let stat = yield DailyCityConsultationStat_1.default.findOne({
        date,
        city: normalizedCity,
    });
    if (!stat) {
        stat = new DailyCityConsultationStat_1.default({
            date,
            city: normalizedCity,
            totalConsultations: 0,
        });
    }
    stat.totalConsultations += 1;
    yield stat.save();
});
exports.trackCityConsultationStat = trackCityConsultationStat;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhY2tDaXR5Q29uc3VsdGF0aW9uU3RhdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWJyYXJ5L1RyYWNrQ2l0eUNvbnN1bHRhdGlvblN0YXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0dBQTRFO0FBTTVFLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO0lBQzlCLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQztBQUVLLE1BQU0seUJBQXlCLEdBQUcsS0FFTCxFQUFFLDRDQUZVLEVBQzlDLElBQUksR0FDNEI7SUFDaEMsTUFBTSxJQUFJLEdBQUcsa0JBQWtCLEVBQUUsQ0FBQztJQUVsQyxNQUFNLGNBQWMsR0FBRyxJQUFJLGFBQUosSUFBSSx1QkFBSixJQUFJLENBQUUsSUFBSSxFQUFFLENBQUM7SUFFcEMsSUFBSSxDQUFDLGNBQWM7UUFBRSxPQUFPO0lBRTVCLElBQUksSUFBSSxHQUFHLE1BQU0sbUNBQXlCLENBQUMsT0FBTyxDQUFDO1FBQ2pELElBQUk7UUFDSixJQUFJLEVBQUUsY0FBYztLQUNyQixDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDVixJQUFJLEdBQUcsSUFBSSxtQ0FBeUIsQ0FBQztZQUNuQyxJQUFJO1lBQ0osSUFBSSxFQUFFLGNBQWM7WUFDcEIsa0JBQWtCLEVBQUUsQ0FBQztTQUN0QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsSUFBSSxDQUFDLGtCQUFrQixJQUFJLENBQUMsQ0FBQztJQUU3QixNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwQixDQUFDLENBQUEsQ0FBQztBQXpCVyxRQUFBLHlCQUF5Qiw2QkF5QnBDIn0=