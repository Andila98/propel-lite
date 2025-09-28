import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpUser } from '../auth-service';
import type { UserRecord } from 'firebase-admin/auth';
import type { auth, firestore } from 'firebase-admin';

describe('Auth Service', () => {
  let mockAuth: vi.Mocked<typeof auth>;
  let mockFirestore: vi.Mocked<typeof firestore>;

  beforeEach(async () => {
    // Reset modules to ensure mocks are fresh for each test
    vi.resetModules();
    
    // Dynamically import the mocked modules after resetting
    const admin = await import('../firebase-admin');
    mockAuth = admin.auth as vi.Mocked<typeof auth>;
    mockFirestore = admin.firestore as vi.Mocked<typeof firestore>;
    
    // Clear mocks before each test
    vi.clearAllMocks();
  });

  describe('signUpUser', () => {
    it('should create a new user and landlord profile successfully', async () => {
      // Arrange: Mock the return values for the Firebase calls
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

      // When checking for existing user, pretend they don't exist
      mockAuth.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
      // When creating a user, return our mock user record
      mockAuth.createUser.mockResolvedValue(mockUserRecord);

      // Act: Call the function we are testing
      const result = await signUpUser(newUser);

      // Assert: Check that the correct functions were called with the right data
      expect(result).toEqual(mockUserRecord);
      
      // Check that user was created in Firebase Auth
      expect(mockAuth.createUser).toHaveBeenCalledWith({
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName,
      });

      // Check that custom claims were set correctly
      expect(mockAuth.setCustomUserClaims).toHaveBeenCalledWith(mockUserRecord.uid, {
        role: 'landlord',
        profileComplete: false,
      });

      // Check that a document was created in the 'landlords' collection
      expect(mockFirestore.collection).toHaveBeenCalledWith('landlords');
      expect(mockFirestore.doc).toHaveBeenCalledWith(mockUserRecord.uid);
      expect(mockFirestore.set).toHaveBeenCalledWith({
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
            email: existingUser.email
        } as UserRecord;

        // When checking for an existing user, pretend they DO exist
        mockAuth.getUserByEmail.mockResolvedValue(mockUserRecord);

        // Act & Assert: Expect the function to throw an error
        await expect(signUpUser(existingUser)).rejects.toThrow(
            'An account with this email already exists.'
        );
        
        // Ensure we didn't try to create a new user
        expect(mockAuth.createUser).not.toHaveBeenCalled();
    });
  });
});
