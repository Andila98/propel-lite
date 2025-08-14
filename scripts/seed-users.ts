

/**
 * @fileoverview User Seeding Script
 *
 * Description:
 * This script seeds the Firebase project with users for development and testing.
 * It can create a predefined set of users or a single user based on command-line arguments.
 *
 * It handles:
 * - Creation of users in Firebase Authentication.
 * - Creation of corresponding user profiles in Firestore.
 * - Setting of custom claims for role-based access control.
 *
 * Usage:
 * - To seed all predefined users: `npm run seed:users`
 * - To create a single user: `npm run seed:user <email> <role>`
 *   (e.g., `npm run seed:user new.user@example.com landlord`)
 *
 * Security Note:
 * This script uses Firebase Admin privileges and is intended for development environments only.
 * Ensure your service account credentials in the .env file are kept secure.
 */
import * as dotenv from 'dotenv';
import { initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';


// Load environment variables from .env file
dotenv.config();

type Role = 'landlord' | 'tenant' | 'admin';

interface UserSeedData {
  email: string;
  password?: string;
  displayName: string;
  role: Role;
  profile?: Record<string, any>;
}

const PREDEFINED_USERS: UserSeedData[] = [
  { email: 'landlord1@demo.com', displayName: 'John Smith', role: 'landlord', profile: { phone: '+254712345678' } },
  { email: 'landlord2@demo.com', displayName: 'Sarah Johnson', role: 'landlord', profile: { phone: '+254712345679' } },
  { email: 'tenant1@demo.com', displayName: 'Mike Wilson', role: 'tenant', profile: { landlordId: 'landlord1@demo.com' } }, // Placeholder landlordId
  { email: 'tenant2@demo.com', displayName: 'Emily Davis', role: 'tenant', profile: { landlordId: 'landlord2@demo.com' } }, // Placeholder landlordId
  { email: 'admin@demo.com', displayName: 'System Admin', role: 'admin', password: 'AdminPass123!' },
];

class UserSeeder {
  private static instance: UserSeeder;
  private app: App;

  private constructor() {
    const serviceAccount = this.getServiceAccount();
    this.app = initializeApp({
      credential: cert(serviceAccount),
    });
  }

  public static getInstance(): UserSeeder {
    if (!UserSeeder.instance) {
      UserSeeder.instance = new UserSeeder();
    }
    return UserSeeder.instance;
  }

  private getServiceAccount() {
    const serviceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };
    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error('Missing Firebase Admin SDK credentials in .env file.');
    }
    return serviceAccount;
  }

  public async createUser(userData: UserSeedData): Promise<{ email: string, status: 'created' | 'exists' | 'error', error?: any }> {
    const { email, password = 'Password123!', displayName, role, profile } = userData;
    const auth = getAuth(this.app);
    const db = getFirestore(this.app);

    try {
      // Check if user already exists
      try {
        await auth.getUserByEmail(email);
        console.log(`- User ${email} already exists. Skipping.`);
        return { email, status: 'exists' };
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error; // Re-throw unexpected errors
        }
        // User does not exist, so we can proceed
      }

      // 1. Create user in Firebase Authentication
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });

      // 2. Set custom claims for role
      await auth.setCustomUserClaims(userRecord.uid, { role });

      // 3. Create user document in Firestore
      const userRef = db.collection('users').doc(userRecord.uid);
      await userRef.set({
        uid: userRecord.uid,
        email,
        name: displayName,
        role,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isActive: true,
        profileComplete: false,
        ...profile, // Add any extra profile data
      });

      console.log(`+ Successfully created user: ${email} (Role: ${role})`);
      return { email, status: 'created' };

    } catch (error: any) {
      console.error(`x Failed to create user ${email}. Error: ${error.message}`);
      // Clean up partially created user if something failed
      try {
        const user = await auth.getUserByEmail(email);
        await auth.deleteUser(user.uid);
        console.log(`- Cleaned up partially created user ${email}.`);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      return { email, status: 'error', error: error.message };
    }
  }

  public async seedMultiple(users: UserSeedData[]) {
    console.log(`\n🌱 Starting to seed ${users.length} users...`);
    const results = await Promise.all(users.map(user => this.createUser(user)));
    console.log('\n--- Seeding Summary ---');
    const created = results.filter(r => r.status === 'created').length;
    const existed = results.filter(r => r.status === 'exists').length;
    const errors = results.filter(r => r.status === 'error').length;
    console.log(`✅ Created: ${created}`);
    console.log(`- Existed: ${existed}`);
    console.log(`x Errors:  ${errors}`);
    console.log('----------------------\n');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const seeder = UserSeeder.getInstance();

  if (args.length === 0) {
    // Seed all predefined users
    await seeder.seedMultiple(PREDEFINED_USERS);
  } else if (args.length === 2) {
    // Seed a single user
    const [email, role] = args;
    if (!['landlord', 'tenant', 'admin'].includes(role)) {
      console.error('Invalid role specified. Must be one of: landlord, tenant, admin');
      process.exit(1);
    }
    const user: UserSeedData = {
      email,
      role: role as Role,
      displayName: email.split('@')[0], // Simple display name from email
    };
    await seeder.seedMultiple([user]);
  } else {
    console.error('Invalid arguments. Usage:');
    console.error('  - To seed all predefined users: npm run seed:users');
    console.error('  - To seed a single user: npm run seed:user <email> <role>');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('An unexpected error occurred during seeding:', error);
  process.exit(1);
});
