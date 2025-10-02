
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpUser } from '../auth-service';
import type { UserRecord } from 'firebase-admin/auth';
import admin from 'firebase-admin';

// Mock firebase-admin
const mockAuth = {
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
  setCustomUserClaims: vi.fn(),
};

const mockFirestore = {
  collection: vi.fn(() => ({
    doc: vi.fn(() => ({
      set: vi.fn().mockResolvedValue(undefined),
    })),
  })),
};

vi.mock('firebase-admin', () => ({
  auth: () => mockAuth,
  firestore: () => mockFirestore,
  // Mock other exports if they are used, like FieldValue
  firestore_v1: {
    FieldValue: {
      serverTimestamp: () => new Date(),
    },
  },
}));


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

      const mockUserRecord: Partial<UserRecord> = {
        uid: 'new-uid-123',
        email: newUser.email,
        displayName: newUser.displayName,
      };

      // Set up mock implementations for this specific test
      mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
      mockAuth.createUser.mockResolvedValue(mockUserRecord as UserRecord);
      
      // Act
      const result = await signUpUser(newUser);

      // Assert
      expect(result).toEqual(mockUserRecord);

      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName,
      });

      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(mockUserRecord.uid, {
        role: 'landlord',
        profileComplete: false,
      });

      expect(mockFirestore.collection).toHaveBeenCalledWith('landlords');
    });

    it('should throw an error if the user already exists', async () => {
      // Arrange
      const existingUser = {
        email: 'existing@example.com',
        password: 'password123',
        displayName: 'Existing User',
      };
      const mockUserRecord: Partial<UserRecord> = {
        uid: 'existing-uid-456',
        email: existingUser.email,
      };

      mockAuth.getUserByEmail.mockResolvedValue(mockUserRecord as UserRecord);

      // Act & Assert
      await expect(signUpUser(existingUser)).rejects.toThrow(
        'An account with this email already exists.'
      );

      expect(mockAuth.createUser).not.toHaveBeenCalled();
    });
  });
});
