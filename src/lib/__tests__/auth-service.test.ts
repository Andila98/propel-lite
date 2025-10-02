
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { signUpUser } from '../auth-service';
import type { UserRecord } from 'firebase-admin/auth';
import { auth, firestore } from 'firebase-admin';

// Mock the individual exports from 'firebase-admin'
vi.mock('firebase-admin', () => ({
  auth: vi.fn(() => ({
    createUser: vi.fn(),
    getUserByEmail: vi.fn(),
    setCustomUserClaims: vi.fn(),
  })),
  firestore: vi.fn(() => ({
    collection: vi.fn(),
  })),
}));

describe('Auth Service', () => {
  const mockedAuth = auth as unknown as ReturnType<typeof vi.fn>;
  const mockedFirestore = firestore as unknown as ReturnType<typeof vi.fn>;
  
  let authCreateUserMock: ReturnType<typeof vi.fn>;
  let authGetUserByEmailMock: ReturnType<typeof vi.fn>;
  let authSetCustomUserClaimsMock: ReturnType<typeof vi.fn>;
  let firestoreCollectionMock: ReturnType<typeof vi.fn>;
  let firestoreDocMock: ReturnType<typeof vi.fn>;
  let firestoreSetMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset and re-assign mocks before each test
    authCreateUserMock = vi.fn();
    authGetUserByEmailMock = vi.fn();
    authSetCustomUserClaimsMock = vi.fn();
    mockedAuth.mockReturnValue({
        createUser: authCreateUserMock,
        getUserByEmail: authGetUserByEmailMock,
        setCustomUserClaims: authSetCustomUserClaimsMock
    });

    firestoreSetMock = vi.fn();
    firestoreDocMock = vi.fn(() => ({ set: firestoreSetMock }));
    firestoreCollectionMock = vi.fn(() => ({ doc: firestoreDocMock }));
    mockedFirestore.mockReturnValue({
        collection: firestoreCollectionMock
    });
  });

  afterEach(() => {
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
