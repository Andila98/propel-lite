
#!/usr/-bin/env node

/**
 * User Seeding Script for PropelLite/RentEase
 * 
 * This script creates users in both Firebase Auth and Firestore
 * Usage: npm run seed:users
 * 
 * Environment variables required:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL  
 * - FIREBASE_PRIVATE_KEY
 */

import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error('🔴 Firebase Admin credentials not found in environment variables. Make sure your .env file is set up. Exiting.');
      process.exit(1);
  }

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

// User data to seed
const usersToSeed = [
  {
    email: 'landlord1@demo.com',
    password: 'Password123!',
    displayName: 'John Smith',
    role: 'landlord',
  },
  {
    email: 'manager1@demo.com',
    password: 'Password123!',
    displayName: 'Jane Manager',
    role: 'manager',
  },
  {
    email: 'tenant1@demo.com',
    password: 'Password123!',
    displayName: 'Mike Wilson',
    role: 'tenant',
  },
];

interface UserToSeed {
  email: string;
  password: string;
  displayName: string;
  role: 'landlord' | 'tenant' | 'admin' | 'manager';
}

async function createUser(userData: UserToSeed): Promise<UserRecord | null> {
  try {
    console.log(`Creating user: ${userData.email}`);

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(userData.email);
      console.log(`⚠️  User ${userData.email} already exists (UID: ${existingUser.uid})`);
      return existingUser;
    } catch (error: any) {
      // User doesn't exist, proceed with creation
      if (error.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.displayName,
      emailVerified: true, // For demo purposes
    });

    console.log(`✅ Created Firebase Auth user: ${userRecord.uid}`);

    // Set custom claims for role-based access
    await auth.setCustomUserClaims(userRecord.uid, {
      role: userData.role,
    });

    console.log(`✅ Set custom claims: role = ${userData.role}`);

    // Create user document in Firestore
    const userDoc = {
      uid: userRecord.uid,
      email: userData.email,
      name: userData.displayName,
      role: userData.role,
      createdAt: FieldValue.serverTimestamp(),
      isActive: true,
      profileComplete: true, // Assuming seeded users are complete
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc);

    console.log(`✅ Created Firestore document for: ${userData.email}`);
    console.log(`🎉 Successfully created ${userData.role}: ${userData.email}\n`);
    
    return userRecord;

  } catch (error: any) {
    console.error(`❌ Error creating user ${userData.email}:`, error.message);
    
    // If Firestore creation failed but Auth user was created, clean up
    if (error.message.includes('Firestore')) {
      try {
        const user = await auth.getUserByEmail(userData.email);
        await auth.deleteUser(user.uid);
        console.log(`🧹 Cleaned up Auth user due to Firestore error`);
      } catch (cleanupError) {
        console.error(`❌ Failed to cleanup Auth user:`, cleanupError);
      }
    }
    return null;
  }
}

async function seedAllUsers(): Promise<void> {
  console.log('🌱 Starting user seeding process...\n');
  let landlord1Uid = '';

  for (const userData of usersToSeed) {
      const userRecord = await createUser(userData);
      if (userRecord && userData.email === 'landlord1@demo.com') {
          landlord1Uid = userRecord.uid;
      }
  }

  console.log('='.repeat(50));
  console.log('🎉 User seeding complete!');
  if (landlord1Uid) {
      console.log(`🔑 Landlord 'landlord1@demo.com' UID for property seeding: ${landlord1Uid}`);
  } else {
      console.warn(`⚠️ Could not find or create 'landlord1@demo.com'. Property seeding might fail.`);
  }
  console.log('='.repeat(50));
}


// Run the script
seedAllUsers().catch(error => {
    console.error('❌ Top-level error during user seeding:', error);
    process.exit(1);
});
