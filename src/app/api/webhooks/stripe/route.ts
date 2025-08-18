
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    console.log("Stripe Webhook Received (mock):", JSON.stringify(event, null, 2));

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
     console.error("Error processing Stripe webhook:", error);
     return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 500 });
  }
}
