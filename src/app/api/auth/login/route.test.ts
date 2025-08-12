
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { getTokens } from 'next-firebase-auth-edge/lib/next/tokens';
import { NextRequest } from 'next/server';

// Mock the getTokens function
vi.mock('next-firebase-auth-edge/lib/next/tokens', () => ({
  getTokens: vi.fn(),
}));

describe('Login API Route', () => {

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return 500 if getTokens throws an error', async () => {
    const mockError = new Error('Invalid ID token');
    (getTokens as vi.Mock).mockRejectedValue(mockError);

    const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ idToken: 'invalid-token' }),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody).toEqual({ error: 'Invalid ID token' });
  });

  it('should return a success response with tokens on valid login', async () => {
     const mockTokens = {
        decodedToken: { role: 'landlord' },
        cookie: 'session=mock-session-cookie; Path=/; HttpOnly',
    };
    (getTokens as vi.Mock).mockResolvedValue(mockTokens);

     const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ idToken: 'valid-token' }),
        headers: {
            'Content-Type': 'application/json'
        }
    });

    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.role).toBe('landlord');
    expect(response.headers.get('set-cookie')).toContain('session=mock-session-cookie');
  });

});
