import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

export const sendEventConfirmationEmail = async ({
  to,
  firstName,
  eventTitle,
  eventDate,
  eventAddress,
  quantity,
  eventLink,
  invoiceUrl,
}: {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: string;
  eventAddress: string;
  quantity: number;
  eventLink: string;
  invoiceUrl: string;
}) => {
  const mailerSend = new MailerSend({
    apiKey:
      "mlsn.3768c10bb2da50c79c893df8c05d442a6bda0de344a67dea1d737ff81b4d4ccc",
  });

  const sentFrom = new Sender("noreply@localappy.fr", "Localappy");

  const recipients: Recipient[] = [new Recipient(to, firstName)];

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

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(`Confirmation d'inscription à ${eventTitle}`)
    .setTemplateId("351ndgwq02qgzqx8")
    .setPersonalization(personalization);

  await mailerSend.email.send(emailParams);
};
