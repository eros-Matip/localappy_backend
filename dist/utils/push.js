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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpoPushNotifications = sendExpoPushNotifications;
exports.sendExpoPushNotificationsByUser = sendExpoPushNotificationsByUser;
const expo_server_sdk_1 = require("expo-server-sdk");
const notificationUtils_1 = require("./notificationUtils");
const expo = new expo_server_sdk_1.Expo();
function sendExpoPushNotifications(tokens, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const valid = [];
        const invalid = [];
        for (const t of tokens)
            (expo_server_sdk_1.Expo.isExpoPushToken(t) ? valid : invalid).push(t);
        if (!valid.length)
            return { sent: 0, invalidTokens: invalid, tickets: [] };
        const msgs = valid.map((to) => {
            var _a;
            const m = {
                to,
                sound: "default",
                title: message.title,
                body: message.body,
                data: (_a = message.data) !== null && _a !== void 0 ? _a : {},
                priority: "high",
            };
            if (message.imageUrl) {
                m.imageUrl = message.imageUrl;
                m.attachments = [{ url: message.imageUrl }];
                m.mutableContent = true;
            }
            return m;
        });
        const chunks = expo.chunkPushNotifications(msgs);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const r = yield expo.sendPushNotificationsAsync(chunk);
                tickets.push(...r);
            }
            catch (e) {
                console.error("Expo push send error:", e);
                tickets.push(...chunk.map(() => ({ status: "error", message: String(e) })));
            }
        }
        return { sent: valid.length, invalidTokens: invalid, tickets };
    });
}
function sendExpoPushNotificationsByUser(tokensByUser, message) {
    return __awaiter(this, void 0, void 0, function* () {
        const queued = yield Promise.all(Object.entries(tokensByUser).map(([userId, tokens]) => (0, notificationUtils_1.createQueuedNotification)({
            userId,
            title: message.title,
            body: message.body,
            data: message.data,
            imageUrl: message.imageUrl,
            eventId: message.eventId,
            establishmentId: message.establishmentId,
            tokens,
            ttlDays: message.ttlDays,
        })));
        const validPairs = [];
        const invalidPairs = [];
        for (const [userId, tokens] of Object.entries(tokensByUser)) {
            for (const t of tokens) {
                (expo_server_sdk_1.Expo.isExpoPushToken(t) ? validPairs : invalidPairs).push({
                    token: t,
                    userId,
                });
            }
        }
        if (!validPairs.length) {
            yield Promise.all(queued.map((doc) => (0, notificationUtils_1.finalizeNotificationSend)(String(doc._id), {
                tickets: [],
                invalidTokens: invalidPairs
                    .filter((p) => String(doc.user) === p.userId)
                    .map((p) => p.token),
                hadAnySuccess: false,
                hadAnyError: true,
            })));
            return {
                sent: 0,
                invalidTokens: invalidPairs.map((p) => p.token),
                tickets: [],
            };
        }
        const msgs = validPairs.map(({ token }) => {
            var _a;
            const m = {
                to: token,
                sound: "default",
                title: message.title,
                body: message.body,
                data: (_a = message.data) !== null && _a !== void 0 ? _a : {},
                priority: "high",
            };
            if (message.imageUrl) {
                m.imageUrl = message.imageUrl;
                m.attachments = [{ url: message.imageUrl }];
                m.mutableContent = true;
            }
            return m;
        });
        const chunks = expo.chunkPushNotifications(msgs);
        const tickets = [];
        for (const chunk of chunks) {
            try {
                const r = yield expo.sendPushNotificationsAsync(chunk);
                tickets.push(...r);
            }
            catch (e) {
                console.error("Expo push send error:", e);
                tickets.push(...chunk.map(() => ({ status: "error", message: String(e) })));
            }
        }
        const ticketsByUser = {};
        const invalidByUser = {};
        invalidPairs.forEach(({ userId, token }) => {
            var _a;
            ((_a = invalidByUser[userId]) !== null && _a !== void 0 ? _a : (invalidByUser[userId] = [])).push(token);
        });
        validPairs.forEach(({ userId }, i) => {
            var _a;
            ((_a = ticketsByUser[userId]) !== null && _a !== void 0 ? _a : (ticketsByUser[userId] = [])).push(tickets[i]);
        });
        yield Promise.all(queued.map((doc) => {
            var _a, _b;
            const userId = String(doc.user);
            const userTickets = (_a = ticketsByUser[userId]) !== null && _a !== void 0 ? _a : [];
            const userInvalid = (_b = invalidByUser[userId]) !== null && _b !== void 0 ? _b : [];
            const hadAnySuccess = userTickets.some((t) => (t === null || t === void 0 ? void 0 : t.status) === "ok" || (t === null || t === void 0 ? void 0 : t.status) === "success");
            const hadAnyError = userTickets.some((t) => (t === null || t === void 0 ? void 0 : t.status) === "error" || (t === null || t === void 0 ? void 0 : t.status) === "failed");
            return (0, notificationUtils_1.finalizeNotificationSend)(String(doc._id), {
                tickets: userTickets,
                invalidTokens: userInvalid,
                hadAnySuccess,
                hadAnyError,
            });
        }));
        return {
            sent: validPairs.length,
            invalidTokens: invalidPairs.map((p) => p.token),
            tickets,
        };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVzaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9wdXNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBdUJBLDhEQTBDQztBQVFELDBFQWdJQztBQXhNRCxxREFBd0Q7QUFDeEQsMkRBRzZCO0FBRTdCLE1BQU0sSUFBSSxHQUFHLElBQUksc0JBQUksRUFBRSxDQUFDO0FBZ0J4QixTQUFzQix5QkFBeUIsQ0FDN0MsTUFBZ0IsRUFDaEIsT0FBb0I7O1FBRXBCLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztRQUMzQixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNO1lBQUUsQ0FBQyxzQkFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFFM0UsTUFBTSxJQUFJLEdBQXNCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTs7WUFDL0MsTUFBTSxDQUFDLEdBQW9CO2dCQUN6QixFQUFFO2dCQUNGLEtBQUssRUFBRSxTQUFTO2dCQUNoQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDbEIsSUFBSSxFQUFFLE1BQUEsT0FBTyxDQUFDLElBQUksbUNBQUksRUFBRTtnQkFDeEIsUUFBUSxFQUFFLE1BQU07YUFDakIsQ0FBQztZQUNGLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUVyQixDQUFDLENBQUMsUUFBUSxHQUFH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