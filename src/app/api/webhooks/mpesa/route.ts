
import { type NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("M-Pesa Webhook Received:", JSON.stringify(payload, null, 2));

    // In a real application, you would:
    // 1. Validate the M-Pesa callback.
    // 2. Parse the payload to get transaction details (e.g., amount, phone number, transaction ID).
    // 3. Find the corresponding tenant and invoice.
    // 4. Create a payment record in Firestore.
    // 5. Update the tenant's rent status.

    await firestore.collection('mpesaCallbacks').add({
        payload,
        receivedAt: firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error: any) {
    console.error("Error processing M-Pesa webhook:", error);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Failed" }, { status: 400 });
  }
}
