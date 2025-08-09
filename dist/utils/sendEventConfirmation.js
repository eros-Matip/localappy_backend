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
        apiKey: "mlsn.3768c10bb2da50c79c893df8c05d442a6bda0de344a67dea1d737ff81b4d4ccc",
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZEV2ZW50Q29uZmlybWF0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3V0aWxzL3NlbmRFdmVudENvbmZpcm1hdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBd0U7QUFFakUsTUFBTSwwQkFBMEIsR0FBRyxLQWtCdkMsRUFBRSw0Q0FsQjRDLEVBQy9DLEVBQUUsRUFDRixTQUFTLEVBQ1QsVUFBVSxFQUNWLFNBQVMsRUFDVCxZQUFZLEVBQ1osUUFBUSxFQUNSLFNBQVMsRUFDVCxVQUFVLEdBVVg7SUFDQyxNQUFNLFVBQVUsR0FBRyxJQUFJLHVCQUFVLENBQUM7UUFDaEMsTUFBTSxFQUNKLHVFQUF1RTtLQUMxRSxDQUFDLENBQUM7SUFFSCxNQUFNLFFBQVEsR0FBRyxJQUFJLG1CQUFNLENBQUMsc0JBQXNCLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFFakUsTUFBTSxVQUFVLEdBQWdCLENBQUMsSUFBSSxzQkFBUyxDQUFDLEVBQUUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBRS9ELE1BQU0sZUFBZSxHQUFHO1FBQ3RCO1lBQ0UsS0FBSyxFQUFFLEVBQUU7WUFDVCxJQUFJLEVBQUU7Z0JBQ0osU0FBUztnQkFDVCxVQUFVO2dCQUNWLFNBQVM7Z0JBQ1QsWUFBWTtnQkFDWixRQUFRO2dCQUNSLFNBQVM7Z0JBQ1QsVUFBVTtnQkFDVixJQUFJLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7YUFDL0I7U0FDRjtLQUNGLENBQUM7SUFFRixNQUFNLFdBQVcsR0FBRyxJQUFJLHdCQUFXLEVBQUU7U0FDbEMsT0FBTyxDQUFDLFFBQVEsQ0FBQztTQUNqQixLQUFLLENBQUMsVUFBVSxDQUFDO1NBQ2pCLFVBQVUsQ0FBQyxnQ0FBZ0MsVUFBVSxFQUFFLENBQUM7U0FDeEQsYUFBYSxDQUFDLGtCQUFrQixDQUFDO1NBQ2pDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRXZDLE1BQU0sVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFBLENBQUM7QUFwRFcsUUFBQSwwQkFBMEIsOEJBb0RyQyJ9