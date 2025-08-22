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
exports.markNotificationRead = markNotificationRead;
exports.markAllNotificationsRead = markAllNotificationsRead;
exports.markNotificationClicked = markNotificationClicked;
exports.countUnread = countUnread;
exports.createQueuedNotification = createQueuedNotification;
exports.finalizeNotificationSend = finalizeNotificationSend;
const Notification_1 = __importDefault(require("../models/Notification"));
const mongoose_1 = require("mongoose");
function markNotificationRead(notificationId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return Notification_1.default.findOneAndUpdate({
            _id: new mongoose_1.Types.ObjectId(notificationId),
            user: new mongoose_1.Types.ObjectId(userId),
        }, { status: "read", readAt: new Date() }, { new: true });
    });
}
function markAllNotificationsRead(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return Notification_1.default.updateMany({ user: new mongoose_1.Types.ObjectId(userId), readAt: { $exists: false } }, { status: "read", readAt: new Date() });
    });
}
function markNotificationClicked(notificationId, userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return Notification_1.default.findOneAndUpdate({
            _id: new mongoose_1.Types.ObjectId(notificationId),
            user: new mongoose_1.Types.ObjectId(userId),
        }, { status: "clicked", clickedAt: new Date() }, { new: true });
    });
}
function countUnread(userId) {
    return __awaiter(this, void 0, void 0, function* () {
        return Notification_1.default.countDocuments({
            user: userId,
            readAt: { $exists: false },
        });
    });
}
function createQueuedNotification(opts) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const now = new Date();
        const expireAt = opts.ttlDays && opts.ttlDays > 0
            ? new Date(now.getTime() + opts.ttlDays * 24 * 3600 * 1000)
            : undefined;
        return Notification_1.default.create({
            user: new mongoose_1.Types.ObjectId(opts.userId),
            channel: "push",
            title: opts.title,
            body: opts.body,
            data: opts.data,
            imageUrl: opts.imageUrl,
            event: opts.eventId ? new mongoose_1.Types.ObjectId(opts.eventId) : undefined,
            establishment: opts.establishmentId
                ? new mongoose_1.Types.ObjectId(opts.establishmentId)
                : undefined,
            status: "queued",
            queuedAt: now,
            tokensSent: (_a = opts.tokens) !== null && _a !== void 0 ? _a : [],
            expireAt,
        });
    });
}
function finalizeNotificationSend(notificationId, payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const status = payload.hadAnySuccess
            ? "sent"
            : payload.hadAnyError
                ? "failed"
                : "sent";
        return Notification_1.default.findByIdAndUpdate(notificationId, {
            status,
            sentAt: new Date(),
            tickets: payload.tickets,
            invalidTokens: payload.invalidTokens,
        }, { new: true });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uVXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvdXRpbHMvbm90aWZpY2F0aW9uVXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7QUFJQSxvREFZQztBQUVELDREQUtDO0FBRUQsMERBWUM7QUFFRCxrQ0FLQztBQUVELDREQWlDQztBQUVELDREQXdCQztBQXhHRCwwRUFBa0Q7QUFDbEQsdUNBQWlDO0FBRWpDLFNBQXNCLG9CQUFvQixDQUN4QyxjQUFzQixFQUN0QixNQUFjOztRQUVkLE9BQU8sc0JBQVksQ0FBQyxnQkFBZ0IsQ0FDbEM7WUFDRSxHQUFHLEVBQUUsSUFBSSxnQkFBSyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7WUFDdkMsSUFBSSxFQUFFLElBQUksZ0JBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO1NBQ2pDLEVBQ0QsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxJQUFJLElBQUksRUFBRSxFQUFFLEVBQ3RDLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxDQUNkLENBQUM7SUFDSixDQUFDO0NBQUE7QUFFRCxTQUFzQix3QkFBd0IsQ0FBQyxNQUFjOztRQUMzRCxPQUFPLHNCQUFZLENBQUMsVUFBVSxDQUM1QixFQUFFLElBQUksRUFBRSxJQUFJLGdCQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUNoRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FDdkMsQ0FBQztJQUNKLENBQUM7Q0FBQTtBQUVELFNBQXNCLHVCQUF1QixDQUMzQyxjQUFzQixFQUN0QixNQUFjOztRQUVkLE9BQU8sc0JBQVksQ0FBQyxnQkFBZ0IsQ0FDbEM7WUFDRSxHQUFHLEVBQUUsSUFBSSxnQkFBSyxDQUFDLFFBQVEs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