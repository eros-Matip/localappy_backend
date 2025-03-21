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
exports.logAudit = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const logAudit = (_a) => __awaiter(void 0, [_a], void 0, function* ({ action, email, role, ip, details = {}, }) {
    try {
        yield AuditLog_1.default.create({ action, email, role, ip, details });
    }
    catch (err) {
        console.error("Erreur lors de l'enregistrement du log :", err);
    }
});
exports.logAudit = logAudit;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTG9nQXVkaXQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGlicmFyeS9Mb2dBdWRpdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSxrRUFBMEM7QUFFbkMsTUFBTSxRQUFRLEdBQUcsS0FZckIsRUFBRSw0Q0FaMEIsRUFDN0IsTUFBTSxFQUNOLEtBQUssRUFDTCxJQUFJLEVBQ0osRUFBRSxFQUNGLE9BQU8sR0FBRyxFQUFFLEdBT2I7SUFDQyxJQUFJLENBQUM7UUFDSCxNQUFNLGtCQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7QUFDSCxDQUFDLENBQUEsQ0FBQztBQWxCVyxRQUFBLFFBQVEsWUFrQm5CIn0=