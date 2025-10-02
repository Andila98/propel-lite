
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpUser } from '../auth-service';
import * as admin from 'firebase-admin';
import type { UserRecord } from 'firebase-admin/auth';

// Mock the entire firebase-admin module
vi.mock('firebase-admin', () => {
  const firestore = {
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    set: vi.fn().mockResolvedValue(undefined),
  };
  const auth = {
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    setCustomUserClaims: vi.fn(),
  };

  return {
    ...admin, // Keep other admin exports if any
    auth: () => auth,
    firestore: () => firestore,
    // Mock FieldValue.serverTimestamp as it's used in the service
    firestore: {
        ...firestore,
        FieldValue: {
            serverTimestamp: vi.fn(() => new Date()),
        },
    }
  };
});

// Create typed mocks to allow for `.mock...` methods
const mockedAuth = vi.mocked(admin.auth());
const mockedFirestore = vi.mocked(admin.firestore());

describe('Auth Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
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

      mockedAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
      mockedAuth.createUser.mockResolvedValue(mockUserRecord);
      
      // Act
      const result = await signUpUser(newUser);

      // Assert
      expect(result).toEqual(mockUserRecord);

      expect(mockedAuth.createUser).toHaveBeenCalledWith({
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName,
      });

      expect(mockedAuth.setCustomUserClaims).toHaveBeenCalledWith(mockUserRecord.uid, {
        role: 'landlord',
        profileComplete: false,
      });

      const firestoreDoc = mockedFirestore.collection('landlords').doc(mockUserRecord.uid);
      expect(firestoreDoc.set).toHaveBeenCalledWith({
        uid: mockUserRecord.uid,
        email: mockUserRecord.email,
        name: mockUserRecord.displayName,
        role: 'landlord',
        createdAt: expect.any(Date),
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
        email: existingUser.email,
      } as UserRecord;

      mockedAuth.getUserByEmail.mockResolvedValue(mockUserRecord);

      // Act & Assert
      await expect(signUpUser(existingUser)).rejects.toThrow(
        'An account with this email already exists.'
      );

      expect(mockedAuth.createUser).not.toHaveBeenCalled();
    });
  });
});
