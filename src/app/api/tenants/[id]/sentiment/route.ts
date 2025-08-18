
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    console.log(`API: Getting mock sentiment for tenant ${tenantId}.`);
    
    // Mock response
    const sentimentResult = {
        sentiment: 'Positive',
        summary: 'Tenant expressed satisfaction with the recent maintenance work.'
    };
    
    return NextResponse.json(sentimentResult);
  } catch (error: any) {
    console.error(`API Error: Failed to get sentiment for tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to analyze sentiment: ${error.message}` },
      { status: 500 }
    );
  }
}
