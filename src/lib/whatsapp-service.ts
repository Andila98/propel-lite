
'use server';

/**
 * @fileoverview A mock service for sending WhatsApp messages.
 * In a real application, this would integrate with a WhatsApp Business API
 * provider like Twilio or the Meta Cloud API.
 */

/**
 * Simulates sending a WhatsApp message.
 * This function logs the message to the console for demonstration purposes.
 *
 * @param to - The recipient's phone number in international format (e.g., +254712345678).
 * @param message - The text content of the message to send.
 * @returns A promise that resolves when the simulation is complete.
 */
export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  console.log("--- SIMULATING WHATSAPP MESSAGE ---");
  console.log(`To: ${to}`);
  console.log(`Message: ${message}`);
  console.log("-------------------------------------");

  // In a real implementation, you would make an API call here.
  // For example, using Twilio:
  //
  // const twilio = require('twilio');
  // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  //
  // await client.messages.create({
  //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
  //   body: message,
  //   to: `whatsapp:${to}`
  // });
  //
  // This simulation just resolves after a short delay.
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`[WHATSAPP_SIMULATION] Successfully sent message to ${to}`);
}
