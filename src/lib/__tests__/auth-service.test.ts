import { describe, it, expect, vi, beforeEach } from 'vitest';
import { signUpUser } from '../auth-service';
import type { UserRecord } from 'firebase-admin/auth';
import { auth, firestore } from 'firebase-admin';

// Mock the entire firebase-admin module
vi.mock('firebase-admin', async () => {
  const actual = await vi.importActual('firebase-admin');
  const firestoreDocMock = {
    set: vi.fn().mockResolvedValue(undefined),
  };
  const firestoreCollectionMock = {
    doc: vi.fn(() => firestoreDocMock),
  };
  return {
    ...actual,
    auth: () => ({
      createUser: vi.fn(),
      getUserByEmail: vi.fn(),
      setCustomUserClaims: vi.fn(),
    }),
    firestore: () => ({
      collection: vi.fn(() => firestoreCollectionMock),
      // Add any other firestore top-level methods if needed
    }),
  };
});


describe('Auth Service', () => {
  // We need to cast the mocked functions to be able to use them
  const mockedAuth = auth as unknown as () => ReturnType<typeof auth>;
  const mockedFirestore = firestore as unknown as () => ReturnType<typeof firestore>;

  beforeEach(() => {
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
      
      const docSetSpy = vi.fn().mockResolvedValue(undefined);
      const docSpy = vi.fn(() => ({ set: docSetSpy }));

      mockedAuth().getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
      mockedAuth().createUser.mockResolvedValue(mockUserRecord);
      (mockedFirestore().collection as vi.Mock).mockReturnValue({ doc: docSpy });


      // Act
      const result = await signUpUser(newUser);

      // Assert
      expect(result).toEqual(mockUserRecord);
      
      expect(mockedAuth().createUser).toHaveBeenCalledWith({
        email: newUser.email,
        password: newUser.password,
        displayName: newUser.displayName,
      });

      expect(mockedAuth().setCustomUserClaims).toHaveBeenCalledWith(mockUserRecord.uid, {
        role: 'landlord',
        profileComplete: false,
      });
      
      expect(mockedFirestore().collection).toHaveBeenCalledWith('landlords');
      expect(docSpy).toHaveBeenCalledWith(mockUserRecord.uid);
      expect(docSetSpy).toHaveBeenCalledWith({
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

        mockedAuth().getUserByEmail.mockResolvedValue(mockUserRecord);

        // Act & Assert
        await expect(signUpUser(existingUser)).rejects.toThrow(
            'An account with this email already exists.'
        );
        
        expect(mockedAuth().createUser).not.toHaveBeenCalled();
    });
  });
});
