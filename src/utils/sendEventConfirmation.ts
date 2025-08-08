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
    apiKey: process.env.MAILERSEND_API_KEY!,
  });

  const sentFrom = new Sender(
    "noreply@trial-65qngkd9dedlwr12.mlsender.net",
    "Localappy"
  );

  const recipients = [new Recipient(to, firstName)];

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
