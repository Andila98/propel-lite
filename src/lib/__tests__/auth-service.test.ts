
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signUpUser } from '../auth-service';
import type { UserRecord } from 'firebase-admin/auth';
import * as admin from 'firebase-admin';

// Mock the entire firebase-admin module
vi.mock('firebase-admin', () => ({
  auth: () => ({
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    setCustomUserClaims: vi.fn(),
  }),
  firestore: () => ({
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: vi.fn(),
      })),
    })),
  }),
  credential: {
    cert: vi.fn(),
  },
  initializeApp: vi.fn(),
}));

describe('Auth Service', () => {
  const mockAuth = admin.auth as unknown as () => {
    createUser: vi.Mock;
    getUserByEmail: vi.Mock;
    setCustomUserClaims: vi.Mock;
  };

  const mockFirestore = admin.firestore as unknown as () => {
    collection: vi.Mock;
  };
  
  // Mocks for individual functions
  const authCreateUserMock = vi.fn();
  const authGetUserByEmailMock = vi.fn();
  const authSetCustomUserClaimsMock = vi.fn();
  const firestoreSetMock = vi.fn();
  const firestoreDocMock = vi.fn(() => ({ set: firestoreSetMock }));
  const firestoreCollectionMock = vi.fn(() => ({ doc: firestoreDocMock }));

  beforeEach(() => {
     // Assign mocks before each test
    (mockAuth as any).createUser = authCreateUserMock;
    (mockAuth as any).getUserByEmail = authGetUserByEmailMock;
    (mockAuth as any).setCustomUserClaims = authSetCustomUserClaimsMock;
    (mockFirestore as any).collection = firestoreCollectionMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });


  describe('signUpUser', () => {
    it('should create a new user and landlord profile successfully', async () => {
      // Arrange
      const newUser = {
        email: 'newlandlord@example.com',
        password: 'password123',
        displayName: 'New Landlord',
      };

      const mockUserRecord = {
        uid: 'new-uid-123',
        email: newUser.email,
        displayName: newUser.displayName,
      } as UserRecord;

      authGetUserByEmailMock.mockRejectedValue({ code: 'auth/user-not-found' });
      authCreateUserMock.mockResolvedValue(mockUserRecord);
      firestoreSetMock.mockResolvedValue(undefined);

      // Act
      const result = await signUpUser(newUser);

      // Assert
      expect(result).toEqual(mockUserRecord);
      
      expect(authCreateUserMock).toHaveBeenCalledWith({
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName,
      });

      expect(authSetCustomUserClaimsMock).toHaveBeenCalledWith(mockUserRecord.uid, {
        role: 'landlord',
        profileComplete: false,
      });
      
      expect(firestoreCollectionMock).toHaveBeenCalledWith('landlords');
      expect(firestoreDocMock).toHaveBeenCalledWith(mockUserRecord.uid);
      expect(firestoreSetMock).toHaveBeenCalledWith({
        uid: mockUserRecord.uid,
        email: mockUserRecord.email,
        name: mockUserRecord.displayName,
        role: 'landlord',
        createdAt: expect.any(Object), // Should be a FieldValue
      });
    });

    it('should throw an error if the user already exists', async () => {
        // Arrange
         const existingUser = {
            email: 'existing@example.com',
            password: 'password123',
            displayName: 'Existing User',
        };
        const mockUserRecord = {
            uid: 'existing-uid-456',
            email: existingUser.email
        } as UserRecord;

        authGetUserByEmailMock.mockResolvedValue(mockUserRecord);

        // Act & Assert
        await expect(signUpUser(existingUser)).rejects.toThrow(
            'An account with this email already exists.'
        );
        
        expect(authCreateUserMock).not.toHaveBeenCalled();
    });
  });
});
