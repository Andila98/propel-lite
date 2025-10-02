
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import * as authUtils from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Tenant } from '@/lib/types';
import type { Timestamp } from 'firebase-admin/firestore';

// Mocks
vi.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminInitialized: true,
  firestore: {
    collection: vi.fn(),
  },
}));

vi.mock('@/lib/auth-utils', () => ({
  getLandlordAndActor: vi.fn(),
}));

const mockTenants: Partial<Tenant>[] = [
  { id: 'tenant1', name: 'Alice', rentStatus: 'Paid', createdAt: { toDate: () => new Date('2023-01-15') } as any },
  { id: 'tenant2', name: 'Bob', rentStatus: 'Overdue', createdAt: { toDate: () => new Date('2023-01-10') } as any },
  { id: 'tenant3', name: 'Charlie', rentStatus: 'Paid', createdAt: { toDate: () => new Date('2023-01-20') } as any },
];

const mockActor = (role: string, permissions: any) => ({
    customClaims: { role, permissions }
}) as any;

describe('GET /api/tenants', () => {

  beforeEach(() => {
    vi.resetAllMocks();
     vi.mocked(firestore.collection).mockReturnValue({
      where: () => ({
        get: vi.fn().mockResolvedValue({
          docs: mockTenants.map(t => ({ id: t.id, data: () => t })),
        }),
      }),
    } as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    const request = new NextRequest('http://localhost/api/tenants');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 401 if landlord context cannot be established', async () => {
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: null, actor: null, error: { message: 'Unauthorized' } as any });
    
    const request = new NextRequest('http://localhost/api/tenants', {
        headers: { cookie: `${authConfig.cookieName}=test-cookie` }
    });
    const response = await GET(request);
    expect(response.status).toBe(401);
  });
  
  it('should return 403 if manager lacks canViewTenants permission', async () => {
    const managerActor = mockActor('manager', { canViewTenants: false });
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: managerActor, error: undefined });

    const request = new NextRequest('http://localhost/api/tenants', {
        headers: { cookie: `${authConfig.cookieName}=test-cookie` }
    });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("You don't have permission to view tenants.");
  });

  it('should return tenants and metadata for a landlord', async () => {
    const landlordActor = mockActor('landlord', {});
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: landlordActor, error: undefined });

    const request = new NextRequest('http://localhost/api/tenants', {
        headers: { cookie: `${authConfig.cookieName}=test-cookie` }
    });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tenants).toHaveLength(3);
    // Check sorting (newest first)
    expect(body.tenants[0].name).toBe('Charlie');
    expect(body.tenants[1].name).toBe('Alice');
    
    expect(body.meta.totalTenants).toBe(3);
    expect(body.meta.activeTenants).toBe(2);
    expect(body.meta.overdueTenants).toBe(1);
    expect(body.meta.occupancyRate).toBeCloseTo(66.67);
  });
  
   it('should return tenants and metadata for a manager with permissions', async () => {
    const managerActor = mockActor('manager', { canViewTenants: true });
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: managerActor, error: undefined });

    const request = new NextRequest('http://localhost/api/tenants', {
        headers: { cookie: `${authConfig.cookieName}=test-cookie` }
    });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tenants).toHaveLength(3);
    expect(body.meta.totalTenants).toBe(3);
  });
  
  it('should handle zero tenants correctly', async () => {
    vi.mocked(firestore.collection).mockReturnValue({
      where: () => ({
        get: vi.fn().mockResolvedValue({ docs: [] }),
      }),
    } as any);

    const landlordActor = mockActor('landlord', {});
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: landlordActor, error: undefined });
    
    const request = new NextRequest('http://localhost/api/tenants', {
        headers: { cookie: `${authConfig.cookieName}=test-cookie` }
    });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.tenants).toHaveLength(0);
    expect(body.meta.totalTenants).toBe(0);
    expect(body.meta.activeTenants).toBe(0);
    expect(body.meta.overdueTenants).toBe(0);
    expect(body.meta.occupancyRate).toBe(0);
  });
  
   it('should return 500 on database error', async () => {
    vi.mocked(firestore.collection).mockReturnValue({
      where: () => ({
        get: vi.fn().mockRejectedValue(new Error('DB error')),
      }),
    } as any);
    
    const landlordActor = mockActor('landlord', {});
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: landlordActor, error: undefined });
    
    const request = new NextRequest('http://localhost/api/tenants', {
        headers: { cookie: `${authConfig.cookieName}=test-cookie` }
    });
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain('Failed to fetch tenants');
  });
});
