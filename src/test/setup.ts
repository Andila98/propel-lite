import { vi } from 'vitest';

vi.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminInitialized: true,
  auth: {
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    setCustomUserClaims: vi.fn(),
    verifySessionCookie: vi.fn(),
    getUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    revokeRefreshTokens: vi.fn(),
    verifyIdToken: vi.fn(),
    createSessionCookie: vi.fn(),
    generatePasswordResetLink: vi.fn(),
  },
  firestore: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ exists: false, data: () => ({}) }),
          })),
        })),
      })),
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
        orderBy: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
          limit: vi.fn(() => ({
            get: vi.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
          })),
        })),
      })),
      add: vi.fn(),
      batch: vi.fn(() => ({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn().mockResolvedValue(undefined),
      })),
      runTransaction: vi.fn(),
    })),
    collectionGroup: vi.fn(() => ({
      where: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
      })),
      get: vi.fn().mockResolvedValue({ docs: [], empty: true, size: 0 }),
    })),
  },
  storage: {
    bucket: vi.fn(),
  },
  admin: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => new Date()),
    delete: vi.fn(),
  },
}));
