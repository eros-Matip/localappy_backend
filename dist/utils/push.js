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
const expo_server_sdk_1 = require("expo-server-sdk");
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
            }
            if (message.imageUrl) {
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
            }
        }
        return { sent: valid.length, invalidTokens: invalid, tickets };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVzaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy91dGlscy9wdXNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBV0EsOERBOENDO0FBeERELHFEQUF3RDtBQUN4RCxNQUFNLElBQUksR0FBRyxJQUFJLHNCQUFJLEVBQUUsQ0FBQztBQVN4QixTQUFzQix5QkFBeUIsQ0FDN0MsTUFBZ0IsRUFDaEIsT0FBb0I7O1FBRXBCLE1BQU0sS0FBSyxHQUFhLEVBQUUsQ0FBQztRQUMzQixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7UUFDN0IsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNO1lBQUUsQ0FBQyxzQkFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFFM0UsTUFBTSxJQUFJLEdBQXNCLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRTs7WUFDL0MsTUFBTSxDQUFDLEdBQW9CO2dCQUN6QixFQUFFO2dCQUNGLEtBQUssRUFBRSxTQUFTO2dCQUNoQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLElBQUksRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDbEIsSUFBSSxFQUFFLE1BQUEsT0FBTyxDQUFDLElBQUksbUNBQUksRUFBRTtnQkFDeEIsUUFBUSxFQUFFLE1BQU07YUFDakIsQ0FBQztZQUdGLElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUVyQixDQUFDLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDaEMsQ0FBQztZQUdELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUVyQixDQUFDLENBQUMsV0FBVyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLENBQUMsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1lBQzFCLENBQUM7WUFFRCxPQUFPLENBQUMsQ0FBQztRQUNYLENBQUMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pELE1BQU0sT0FBTyxHQUFVLEVBQUUsQ0FBQztRQUMxQixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQztnQkFDSCxNQUFNLENBQUMsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDdkQsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3JCLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUMsQ0FBQztRQUNILENBQUM7UUFDRCxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUNqRSxDQUFDO0NBQUEifQ==