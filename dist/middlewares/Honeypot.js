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
exports.honeypot = honeypot;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const LOG_DIR = path_1.default.join(__dirname, "../logs");
const LOG_FILE = path_1.default.join(LOG_DIR, "honeypot.log");
const BYTE_DELAY_MS = 5000;
const MAX_BYTES = 60;
const SUSPICIOUS_PATTERNS = [
    /\.env$/i,
    /\.ya?ml$/i,
    /\.json$/i,
    /\.bak$/i,
    /\.save$/i,
    /\.old$/i,
    /config\./i,
    /wp-config/i,
    /\.git/i,
    /phpmyadmin/i,
    /\.htaccess/i,
    /\.DS_Store/i,
    /^\/(admin|debug|test|backup|shared|objects|config|phpinfo)/i,
];
const blacklist = new Map();
const BLACKLIST_MIN = 30;
function isSuspicious(path) {
    const lower = path.toLowerCase();
    return SUSPICIOUS_PATTERNS.some((re) => re.test(lower));
}
function logSuspicious(req_1) {
    return __awaiter(this, arguments, void 0, function* (req, msg = "Suspicious honeypot hit") {
        const entry = {
            ts: new Date().toISOString(),
            ip: req.ip || req.socket.remoteAddress || "unknown",
            ua: req.get("user-agent") || "-",
            method: req.method,
            path: req.originalUrl || req.path,
            msg,
        };
        try {
            yield promises_1.default.mkdir(LOG_DIR, { recursive: true });
            yield promises_1.default.appendFile(LOG_FILE, JSON.stringify(entry) + "\n");
        }
        catch (_a) { }
    });
}
function honeypot(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        const ip = req.ip || req.socket.remoteAddress || "unknown";
        const expire = blacklist.get(ip);
        if (expire && Date.now() < expire) {
            res.status(429).json({ error: "Too Many Requests – calm down" });
            return;
        }
        if (!isSuspicious(req.path)) {
            return next();
        }
        yield logSuspicious(req);
        res.set({
            "Content-Type": "text/plain",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        });
        res.status(200);
        let sent = 0;
        const interval = setInterval(() => {
            if (sent >= MAX_BYTES || res.writableEnded) {
                clearInterval(interval);
                res.end();
                return;
            }
            res.write("x");
            sent++;
        }, BYTE_DELAY_MS);
        req.on("close", () => {
            clearInterval(interval);
            res.end();
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiSG9uZXlwb3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbWlkZGxld2FyZXMvSG9uZXlwb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFtREEsNEJBZ0RDO0FBbEdELDJEQUE2QjtBQUM3QixnREFBd0I7QUFFeEIsTUFBTSxPQUFPLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDaEQsTUFBTSxRQUFRLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7QUFFcEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBQzNCLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQztBQUVyQixNQUFNLG1CQUFtQixHQUFhO0lBQ3BDLFNBQVM7SUFDVCxXQUFXO0lBQ1gsVUFBVTtJQUNWLFNBQVM7SUFDVCxVQUFVO0lBQ1YsU0FBUztJQUNULFdBQVc7SUFDWCxZQUFZO0lBQ1osUUFBUTtJQUNSLGFBQWE7SUFDYixhQUFhO0lBQ2IsYUFBYTtJQUNiLDZEQUE2RDtDQUM5RCxDQUFDO0FBR0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7QUFDNUMsTUFBTSxhQUFhLEdBQUcsRUFBRSxDQUFDO0FBRXpCLFNBQVMsWUFBWSxDQUFDLElBQVk7SUFDaEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ2pDLE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDMUQsQ0FBQztBQUVELFNBQWUsYUFBYTt5REFBQyxHQUFZLEVBQUUsR0FBRyxHQUFHLHlCQUF5QjtRQUN4RSxNQUFNLEtBQUssR0FBRztZQUNaLEVBQUUsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFB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