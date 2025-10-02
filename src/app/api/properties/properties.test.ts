
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { NextRequest } from 'next/server';
import { firestore } from '@/lib/firebase-admin';
import * as authUtils from '@/lib/auth-utils';
import { authConfig } from '@/config/server-config';

// Mock dependencies
vi.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminInitialized: true,
  firestore: {
    collection: vi.fn(),
  },
}));

vi.mock('@/lib/auth-utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getLandlordAndActor: vi.fn(),
  };
});

const mockProperties = [
  { id: 'prop1', name: 'Greenview Apartments', landlordId: 'landlord1', units: [ {id: 'u1', isOccupied: true}, {id: 'u2', isOccupied: false} ] },
  { id: 'prop2', name: 'Sunset Villas', landlordId: 'landlord1', units: [ {id: 'u3', isOccupied: true} ] },
];

const mockUnits = (propertyId: string) => {
    const prop = mockProperties.find(p => p.id === propertyId);
    return {
        docs: prop ? prop.units.map(u => ({ id: u.id, data: () => u })) : []
    };
};

describe('GET /api/properties', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    const collectionMock = vi.fn((collectionName: string) => {
      if (collectionName === 'properties') {
        return {
          where: () => ({
            get: vi.fn().mockResolvedValue({
              docs: mockProperties.map(p => ({
                id: p.id,
                data: () => {
                    const { units, ...rest } = p;
                    return rest;
                },
                ref: {
                    collection: vi.fn().mockReturnValue({
                        get: vi.fn().mockResolvedValue(mockUnits(p.id))
                    })
                }
              })),
            }),
          }),
          doc: (docId: string) => ({
             collection: (subCollection: string) => {
                if (subCollection === 'units') {
                    return {
                        get: vi.fn().mockResolvedValue(mockUnits(docId))
                    }
                }
             }
          })
        };
      }
      return {};
    });

    vi.mocked(firestore.collection).mockImplementation(collectionMock as any);
  });

  it('should return 401 if not authenticated', async () => {
    const request = new NextRequest('http://localhost/api/properties');
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return 401 if landlord ID cannot be resolved', async () => {
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: null, actor: null, error: { message: 'Unauthorized' } as any });

    const request = new NextRequest('http://localhost/api/properties', {
      headers: {
        cookie: `${authConfig.cookieName}=test-cookie`,
      },
    });
    
    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('should return properties and metadata on successful request', async () => {
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: {} as any });

    const request = new NextRequest('http://localhost/api/properties', {
      headers: {
        cookie: `${authConfig.cookieName}=test-cookie`,
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.properties).toHaveLength(2);
    expect(body.properties[0].id).toBe('prop1');
    expect(body.properties[0].units).toHaveLength(2);
    expect(body.meta.totalProperties).toBe(2);
    expect(body.meta.totalUnits).toBe(3);
    expect(body.meta.occupiedUnits).toBe(2);
    expect(body.meta.occupancyRate).toBeCloseTo(66.67);
  });
  
  it('should handle zero properties correctly', async () => {
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: {} as any });
    vi.mocked(firestore.collection).mockReturnValue({
      where: () => ({
        get: vi.fn().mockResolvedValue({ docs: [] }),
      }),
    } as any);
    
     const request = new NextRequest('http://localhost/api/properties', {
      headers: {
        cookie: `${authConfig.cookieName}=test-cookie`,
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.properties).toHaveLength(0);
    expect(body.meta.totalProperties).toBe(0);
    expect(body.meta.totalUnits).toBe(0);
    expect(body.meta.occupancyRate).toBe(0);
  });
  
  it('should return 500 on firestore error', async () => {
    vi.mocked(authUtils.getLandlordAndActor).mockResolvedValue({ landlordId: 'landlord1', actor: {} as any });
    vi.mocked(firestore.collection).mockReturnValue({
        where: () => ({
            get: vi.fn().mockRejectedValue(new Error("Firestore unavailable")),
        })
    } as any);

    const request = new NextRequest('http://localhost/api/properties', {
      headers: {
        cookie: `${authConfig.cookieName}=test-cookie`,
      },
    });

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});
