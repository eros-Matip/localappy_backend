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
    try {
        const normalizedCity = city === null || city === void 0 ? void 0 : city.trim();
        if (!normalizedCity)
            return;
        const date = getTodayDateString();
        yield DailyCityConsultationStat_1.default.updateOne({ date, city: normalizedCity }, {
            $inc: { totalConsultations: 1 },
            $setOnInsert: {
                date,
                city: normalizedCity,
                createdAt: new Date(),
            },
            $set: {
                updatedAt: new Date(),
            },
        }, { upsert: true });
    }
    catch (error) {
        console.error("[trackCityConsultationStat] non blocking error:", error);
    }
});
exports.trackCityConsultationStat = trackCityConsultationStat;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJhY2tDaXR5Q29uc3VsdGF0aW9uU3RhdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9saWJyYXJ5L1RyYWNrQ2l0eUNvbnN1bHRhdGlvblN0YXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0dBQTRFO0FBTTVFLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO0lBQzlCLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQztBQUVLLE1BQU0seUJBQXlCLEdBQUcsS0FFTCxFQUFFLDRDQUZVLEVBQzlDLElBQUksR0FDNEI7SUFDaEMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxjQUFjLEdBQUcsSUFBSSxhQUFKLElBQUksdUJBQUosSUFBSSxDQUFFLElBQUksRUFBRSxDQUFDO1FBQ3BDLElBQUksQ0FBQyxjQUFjO1lBQUUsT0FBTztRQUU1QixNQUFNLElBQUksR0FBRyxrQkFBa0IsRUFBRSxDQUFDO1FBRWxDLE1BQU0sbUNBQXlCLENBQUMsU0FBUyxDQUN2QyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLEVBQzlCO1lBQ0UsSUFBSSxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQyxFQUFFO1lBQy9CLFlBQVksRUFBRTtnQkFDWixJQUFJO2dCQUNKLElBQUksRUFBRSxjQUFjO2dCQUNwQixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUU7YUFDdEI7WUFDRCxJQUFJLEVBQUU7Z0JBQ0osU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO2FBQ3RCO1NBQ0YsRUFDRCxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FDakIsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBRWYsT0FBTyxDQUFDLEtBQUssQ0FBQyxpREFBaUQsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRSxDQUFDO0FBQ0gsQ0FBQyxDQUFBLENBQUM7QUE1QlcsUUFBQSx5QkFBeUIsNkJBNEJwQyJ9