
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    console.log("M-Pesa Webhook Received (mock):", JSON.stringify(payload, null, 2));

    return NextResponse.json({ message: "Webhook received successfully." }, { status: 200 });

  } catch (error: any) {
    console.error("Error processing M-Pesa webhook:", error);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }
}
