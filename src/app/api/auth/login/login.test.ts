import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';
import { auth, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import * as authService from '@/lib/auth-service';
import * as rateLimiter from '@/lib/rate-limiter';
import { authConfig } from '@/config/server-config';

// Mock dependencies
vi.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminInitialized: true,
  auth: {
    verifyIdToken: vi.fn(),
  },
}));

vi.mock('@/lib/auth-service', () => ({
  createSession: vi.fn(),
}));

vi.mock('@/config/server-config', () => ({
  authConfig: {
    cookieName: 'session',
    maxAge: 3600,
  },
}));

// Mock the rate limiter to prevent 429 errors during tests
vi.mock('@/lib/rate-limiter', async (importOriginal) => {
  const actual = await importOriginal() as typeof rateLimiter;
  return {
    ...actual,
    loginRateLimit: {
      check: vi.fn().mockResolvedValue({ 
        limit: 10, 
        remaining: 9, 
        reset: Date.now() + 60000 
      }),
    },
  };
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Reset the mock behavior to the default (success)
    vi.mocked(rateLimiter.loginRateLimit.check).mockResolvedValue({ 
      limit: 10, 
      remaining: 9, 
      reset: Date.now() + 60000 
    });
  });

  const mockUser = {
    uid: 'test-uid',
    name: 'Test User',
    email: 'test@example.com',
    role: 'landlord',
    profileComplete: true,
  };

  it('should return 200 and user profile on successful login', async () => {
    const idToken = 'valid-token';
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });

    vi.mocked(authService.createSession).mockResolvedValue({
      sessionCookie: 'mock-session-cookie',
      userProfile: mockUser as any,
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(mockUser);
    expect(authService.createSession).toHaveBeenCalledWith(idToken);
    expect(response.cookies.get(authConfig.cookieName)).toBeDefined();
  });

  it('should return 401 if Authorization header is missing', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid authentication format');
  });
  
  it('should return 401 if token is empty', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' },
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Invalid authentication token');
  });

  it('should return 429 if rate limit is exceeded', async () => {
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-token' },
    });

    // Mock rate limit exceeded
    vi.mocked(rateLimiter.loginRateLimit.check).mockRejectedValue(new Error('Rate limit exceeded'));

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('Too many login attempts. Please try again later.');
  });
  
  it('should return 403 for incomplete profiles', async () => {
    const idToken = 'valid-token-incomplete-profile';
    const request = new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { Authorization: `Bearer ${idToken}` },
    });

    vi.mocked(authService.createSession).mockRejectedValue({
      message: 'Profile is incomplete.',
      code: 'INCOMPLETE_PROFILE',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Profile is incomplete.');
    expect(body.code).toBe('INCOMPLETE_PROFILE');
  });
  
  it('should handle various auth errors from createSession', async () => {
    const testCases = [
      { code: 'auth/id-token-expired', expectedStatus: 401, expectedMessage: 'Your session has expired. Please sign in again.' },
      { code: 'auth/user-disabled', expectedStatus: 401, expectedMessage: 'This account has been disabled. Please contact support.' },
      { code: 'some-other-error', expectedStatus: 500, expectedMessage: 'An unexpected error occurred during login. Please try again.' },
    ];
    
    for (const { code, expectedStatus, expectedMessage } of testCases) {
      const idToken = `token-for-${code}`;
      const request = new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
      });

      vi.mocked(authService.createSession).mockRejectedValue({ code });

      const response = await POST(request);
      const body = await response.json();
      
      expect(response.status).toBe(expectedStatus);
      expect(body.error).toBe(expectedMessage);
    }
  });

});