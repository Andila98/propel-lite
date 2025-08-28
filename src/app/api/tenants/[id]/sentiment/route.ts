
import { NextResponse, type NextRequest } from 'next/server';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// This is a MOCK route. A real implementation would use a Genkit flow.
// POST /api/tenants/{tenantId}/sentiment
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isFirebaseAdminInitialized) {
    return NextResponse.json({ error: 'Backend services are not configured. Please contact support.' }, { status: 500 });
  }
  try {
    const tenantId = params.id;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required.' }, { status: 400 });
    }

    // Mocked AI analysis
    const sentiments = ['Positive', 'Neutral', 'Negative'];
    const summaries = {
        'Positive': 'The tenant seems happy and has expressed satisfaction with the property.',
        'Neutral': 'Communication has been purely transactional, with no strong sentiment detected.',
        'Negative': 'The tenant has expressed frustration regarding maintenance issues and may be a churn risk.',
    };

    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const summary = (summaries as any)[randomSentiment];

    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate AI processing time

    return NextResponse.json({ sentiment: randomSentiment, summary });

  } catch (error: any) {
    console.error(`[ERROR: /api/tenants/{id}/sentiment GET]`, error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
