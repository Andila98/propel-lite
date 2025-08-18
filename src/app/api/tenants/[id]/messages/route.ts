
import { type NextRequest, NextResponse } from 'next/server';
import { mockMessages } from '@/lib/mock-data';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    const messages = mockMessages.filter(m => m.tenantId === tenantId);
    return NextResponse.json(messages);
  } catch (error: any) {
    console.error(`API Error: Failed to fetch messages for tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to fetch messages: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tenantId = params.id;
    const body = await request.json();
    const { content } = body;
    
    const newMessage = {
      id: `msg_${Date.now()}`,
      tenantId: tenantId,
      senderId: "landlord-1", // Mock landlord sender
      senderName: "Landlord",
      content,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    
    console.log(`Mock message sent to tenant ${tenantId}:`, newMessage);
    return NextResponse.json(newMessage, { status: 201 });

  } catch (error: any) {
    console.error(`API Error: Failed to send message for tenant ${params.id}:`, error);
    return NextResponse.json(
      { error: `Failed to send message: ${error.message}` },
      { status: 500 }
    );
  }
}
