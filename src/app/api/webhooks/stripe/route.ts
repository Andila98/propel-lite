
import { type NextRequest, NextResponse } from 'next/server';
// import Stripe from 'stripe';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature') as string;

    // let event: Stripe.Event;

    // try {
    //   event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    // } catch (err: any) {
    //   console.error(`Stripe webhook signature error: ${err.message}`);
    //   return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    // }
    
    const event = JSON.parse(body); // For now, just parse it.
    console.log("Stripe Webhook Received:", JSON.stringify(event, null, 2));

    // Handle the event
    // switch (event.type) {
    //   case 'checkout.session.completed':
    //     const session = event.data.object;
    //     // TODO: Fulfill the purchase...
    //     // 1. Parse the transaction data from the session
    //     // 2. Store the transaction in Firestore: /payments/{landlordId}/{paymentId}
    //     // 3. Update the tenant's rent status
    //     // 4. Generate and send a receipt
    //     break;
    //   // ... handle other event types
    //   default:
    //     console.log(`Unhandled Stripe event type: ${event.type}`);
    // }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
     console.error("Error processing Stripe webhook:", error);
     return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 500 });
  }
}
