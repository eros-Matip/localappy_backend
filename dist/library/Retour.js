"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const formatDate = () => new Date().toISOString();
const safeStringify = (data) => {
    try {
        return JSON.stringify(data);
    }
    catch (_a) {
        return "[Unserializable object]";
    }
};
class Retour {
    static log(message, meta) {
        this.info(message, meta);
    }
    static info(message, meta) {
        console.log(chalk_1.default.blueBright(`[INFO RESPONSE] ${formatDate()}`), typeof message === "string"
            ? chalk_1.default.greenBright(message)
            : safeStringify(message), meta ? chalk_1.default.gray(safeStringify(meta)) : "");
    }
    static warn(message, meta) {
        console.log(chalk_1.default.yellow(`[WARN RESPONSE] ${formatDate()}`), typeof message === "string"
            ? chalk_1.default.yellowBright(message)
            : safeStringify(message), meta ? chalk_1.default.gray(safeStringify(meta)) : "");
    }
    static error(message, meta) {
        console.error(chalk_1.default.red(`[ERROR RESPONSE] ${formatDate()}`), typeof message === "string"
            ? chalk_1.default.redBright(message)
            : safeStringify(message), meta ? chalk_1.default.gray(safeStringify(meta)) : "");
    }
}
exports.default = Retour;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUmV0b3VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2xpYnJhcnkvUmV0b3VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsa0RBQTBCO0FBSTFCLE1BQU0sVUFBVSxHQUFHLEdBQUcsRUFBRSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7QUFFbEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxJQUFTLEVBQUUsRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUFDLFdBQU0sQ0FBQztRQUNQLE9BQU8seUJBQXlCLENBQUM7SUFDbkMsQ0FBQztBQUNILENBQUMsQ0FBQztBQUVGLE1BQXFCLE1BQU07SUFDbEIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxPQUFZLEVBQUUsSUFBYztRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUMzQixDQUFDO0lBRU0sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFZLEVBQUUsSUFBYztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUNULGVBQUssQ0FBQyxVQUFVLENBQUMsbUJBQW1CLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFDbkQsT0FBTyxPQUFPLEtBQUssUUFBUTtZQUN6QixDQUFDLENBQUMsZUFBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUM7WUFDNUIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFDMUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQzVDLENBQUM7SUFDSixDQUFDO0lBRU0sTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFZLEVBQUUsSUFBYztRQUM3QyxPQUFPLENBQUMsR0FBRyxDQUNULGVBQUssQ0FBQyxNQUFNLENBQUMsbUJBQW1CLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFDL0MsT0FBTyxPQUFPLEtBQUssUUFBUTtZQUN6QixDQUFDLENBQUMsZUFBSyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUM7WUFDN0IsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFDMUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQzVDLENBQUM7SUFDSixDQUFDO0lBRU0sTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFZLEVBQUUsSUFBYztRQUM5QyxPQUFPLENBQUMsS0FBSyxDQUNYLGVBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLFVBQVUsRUFBRSxFQUFFLENBQUMsRUFDN0MsT0FBTyxPQUFPLEtBQUssUUFBUTtZQUN6QixDQUFDLENBQUMsZUFBSyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7WUFDMUIsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsRUFDMUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxlQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQzVDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFsQ0QseUJBa0NDIn0=