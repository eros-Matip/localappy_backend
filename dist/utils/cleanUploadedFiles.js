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
exports.cleanUploadedFiles = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const cleanUploadedFiles = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (files = []) {
    const deletePromises = files.map((file) => promises_1.default.unlink(file.path).catch(() => { }));
    yield Promise.all(deletePromises);
});
exports.cleanUploadedFiles = cleanUploadedFiles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xlYW5VcGxvYWRlZEZpbGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL2NsZWFuVXBsb2FkZWRGaWxlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFBQSwyREFBNkI7QUFFdEIsTUFBTSxrQkFBa0IsR0FBRyxZQUEwQyxFQUFFLG1EQUFyQyxRQUErQixFQUFFO0lBQ3hFLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUN4QyxrQkFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUNyQyxDQUFDO0lBQ0YsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQSxDQUFDO0FBTFcsUUFBQSxrQkFBa0Isc0JBSzdCIn0=