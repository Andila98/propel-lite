
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("M-Pesa Webhook Received:", JSON.stringify(payload, null, 2));

    // TODO: Add logic to verify and process the M-Pesa transaction
    // 1. Verify the webhook signature/origin
    // 2. Parse the transaction data
    // 3. Check if the payment is successful
    // 4. Store the transaction in Firestore: /payments/{landlordId}/{paymentId}
    // 5. Update the tenant's rent status
    // 6. Generate and send a receipt

    return NextResponse.json({ message: "Webhook received successfully." }, { status: 200 });

  } catch (error: any) {
    console.error("Error processing M-Pesa webhook:", error);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }
}
