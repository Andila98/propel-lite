
'use server';

/**
 * @fileoverview A mock service for sending emails.
 * In a real application, this would integrate with an email provider like SendGrid, Resend, or Nodemailer.
 */

interface EmailPayload {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: {
        filename: string;
        content: string; // base64 encoded content
        encoding: 'base64';
        contentType: 'application/pdf';
    }[];
}

/**
 * Simulates sending an email by logging its content to the console.
 *
 * @param payload - The email details.
 * @returns A promise that resolves when the simulation is complete.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  console.log("--- SIMULATING EMAIL ---");
  console.log(`To: ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  if (payload.attachments && payload.attachments.length > 0) {
      console.log(`Attachments: ${payload.attachments.map(a => a.filename).join(', ')}`);
  }
  console.log("--- HTML BODY ---");
  console.log(payload.html);
  console.log("----------------------");

  // In a real implementation, you would make an API call to your email provider here.
  // For example, using Resend:
  //
  // import { Resend } from 'resend';
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send(payload);

  // This simulation just resolves after a short delay.
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`[EMAIL_SIMULATION] Successfully "sent" email to ${payload.to}`);
}
