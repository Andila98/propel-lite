
import { type NextRequest, NextResponse } from 'next/server';
import { mockUsers } from '@/lib/mock-data';

export async function GET(req: NextRequest) {
  // This is a mock implementation since Firebase is removed.
  // It returns the first landlord user from mock data.
  const mockLandlord = mockUsers.find(u => u.role === 'landlord');

  if (mockLandlord) {
      return NextResponse.json(mockLandlord, { status: 200 });
  } else {
      return NextResponse.json({ error: 'Mock user not found.' }, { status: 404 });
  }
}
