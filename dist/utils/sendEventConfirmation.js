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
exports.sendEventConfirmationEmail = void 0;
const mailersend_1 = require("mailersend");
const sendEventConfirmationEmail = (_a) => __awaiter(void 0, [_a], void 0, function* ({ to, firstName, eventTitle, eventDate, eventAddress, quantity, eventLink, invoiceUrl, }) {
    const mailerSend = new mailersend_1.MailerSend({
        apiKey: `${process.env.MAILERSEND_KEY}`,
    });
    const sentFrom = new mailersend_1.Sender("noreply@localappy.fr", "Localappy");
    const recipients = [new mailersend_1.Recipient(to, firstName)];
    const personalization = [
        {
            email: to,
            data: {
                firstName,
                eventTitle,
                eventDate,
                eventAddress,
                quantity,
                eventLink,
                invoiceUrl,
                year: new Date().getFullYear(),
            },
        },
    ];
    const emailParams = new mailersend_1.EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setSubject(`Confirmation d'inscription à ${eventTitle}`)
        .setTemplateId("351ndgwq02qgzqx8")
        .setPersonalization(personalization);
    yield mailerSend.email.send(emailParams);
});
exports.sendEventConfirmationEmail = sendEventConfirmationEmail;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZEV2ZW50Q29uZmlybWF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NlbmRFdmVudENvbmZpcm1hdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBd0U7QUFFakUsTUFBTSwwQkFBMEIsR0FBRyxLQWtCdkMsRUFBRSw0Q0FsQjRDLEVBQy9DLEVBQUUsRUFDRixTQUFTLEVBQ1QsVUFBVSxFQUNWLFNBQVMsRUFDVCxZQUFZLEVBQ1osUUFBUSxFQUNSLFNBQVMsRUFDVCxVQUFVLEdBVVg7SUFDQyxNQUFNLFVBQVUsR0FBRyxJQUFJLHVCQUFVLENBQUM7UUFDaEMsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLEVBQUU7S0FDeEMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBTSxDQUFDLHNCQUFzQixFQUFFLFdBQVcsQ0FBQyxDQUFDO0lBRWpFLE1BQU0sVUFBVSxHQUFnQixDQUFDLElBQUksc0JBQVMsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUUvRCxNQUFNLGVBQWUsR0FBRztRQUN0QjtZQUNFLEtBQUssRUFBRSxFQUFFO1lBQ1QsSUFBSSxFQUFFO2dCQUNKLFNBQVM7Z0JBQ1QsVUFBVTtnQkFDVixTQUFTO2dCQUNULFlBQVk7Z0JBQ1osUUFBUTtnQkFDUixTQUFTO2dCQUNULFVBQVU7Z0JBQ1YsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQy9CO1NBQ0Y7S0FDRixDQUFDO0lBRUYsTUFBTSxXQUFXLEdBQUcsSUFBSSx3QkFBVyxFQUFFO1NBQ2xDLE9BQU8sQ0FBQyxRQUFRLENBQUM7U0FDakIsS0FBSyxDQUFDLFVBQVUsQ0FBQztTQUNqQixVQUFVLENBQUMsZ0NBQWdDLFVBQVUsRUFBRSxDQUFDO1NBQ3hELGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQztTQUNqQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUV2QyxNQUFNLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQSxDQUFDO0FBbkRXLFFBQUEsMEJBQTBCLDhCQW1EckMifQ==