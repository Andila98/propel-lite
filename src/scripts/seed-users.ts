#!/usr/bin/env node

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

import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
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
    profile: {
      firstName: 'John',
      lastName: 'Smith',
      phone: '+254700123456',
      address: {
        street: '123 Riverside Drive',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postalCode: '00100'
      },
      businessInfo: {
        companyName: 'Smith Properties Ltd',
        businessType: 'Individual',
        yearsInBusiness: 5
      }
    }
  },
  {
    email: 'landlord2@demo.com',
    password: 'Password123!',
    displayName: 'Sarah Johnson',
    role: 'landlord',
    profile: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+254700234567',
      address: {
        street: '456 Kilimani Road',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postalCode: '00100'
      },
      businessInfo: {
        companyName: 'Johnson Real Estate',
        businessType: 'Company',
        yearsInBusiness: 8
      }
    }
  },
  {
    email: 'tenant1@demo.com',
    password: 'Password123!',
    displayName: 'Mike Wilson',
    role: 'tenant',
    profile: {
      firstName: 'Mike',
      lastName: 'Wilson',
      phone: '+254700345678',
      address: {
        street: '789 Westlands Avenue',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postalCode: '00100'
      },
      emergencyContact: {
        name: 'Jane Wilson',
        relationship: 'Spouse',
        phone: '+254700456789'
      }
    }
  },
  {
    email: 'tenant2@demo.com',
    password: 'Password123!',
    displayName: 'Emily Davis',
    role: 'tenant',
    profile: {
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '+254700567890',
      address: {
        street: '321 Karen Road',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postalCode: '00100'
      },
      emergencyContact: {
        name: 'Robert Davis',
        relationship: 'Father',
        phone: '+254700678901'
      }
    }
  },
  {
    email: 'admin@demo.com',
    password: 'AdminPass123!',
    displayName: 'System Admin',
    role: 'admin',
    profile: {
      firstName: 'System',
      lastName: 'Admin',
      phone: '+254700000000',
      address: {
        street: 'Corporate Office',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postalCode: '00100'
      }
    }
  }
];

interface UserToSeed {
  email: string;
  password: string;
  displayName: string;
  role: 'landlord' | 'tenant' | 'admin';
  profile: any;
}

async function createUser(userData: UserToSeed): Promise<void> {
  try {
    console.log(`Creating user: ${userData.email}`);

    // Check if user already exists
    try {
      const existingUser = await auth.getUserByEmail(userData.email);
      console.log(`⚠️  User ${userData.email} already exists (UID: ${existingUser.uid})`);
      return;
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
      profile: userData.profile,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isActive: true,
      profileComplete: true,
      onboardingStep: 'completed',
      // Add role-specific fields
      ...(userData.role === 'landlord' && {
        propertiesCount: 0,
        tenantsCount: 0,
        totalRevenue: 0,
      }),
      ...(userData.role === 'tenant' && {
        currentLease: null,
        leaseHistory: [],
        paymentHistory: [],
      }),
    };

    await db.collection('users').doc(userRecord.uid).set(userDoc);

    console.log(`✅ Created Firestore document for: ${userData.email}`);
    console.log(`🎉 Successfully created ${userData.role}: ${userData.email}\n`);

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
  }
}

async function seedAllUsers(): Promise<void> {
  console.log('🌱 Starting user seeding process...\n');
  console.log(`📊 Planning to create ${usersToSeed.length} users:\n`);

  // Show summary of users to be created
  usersToSeed.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} (${user.role})`);
  });
  console.log('\n' + '='.repeat(50) + '\n');

  let successCount = 0;
  let errorCount = 0;

  for (const userData of usersToSeed) {
    try {
      await createUser(userData);
      successCount++;
    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to create user ${userData.email}:`, error);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 SEEDING SUMMARY:');
  console.log(`✅ Successfully created: ${successCount} users`);
  console.log(`❌ Failed to create: ${errorCount} users`);
  console.log(`📊 Total processed: ${successCount + errorCount} users`);
  console.log('='.repeat(50));
}

async function createSingleUser(email: string, role: 'landlord' | 'tenant' | 'admin'): Promise<void> {
  const [name] = email.split('@');
  const displayName = name.charAt(0).toUpperCase() + name.slice(1);

  const userData: UserToSeed = {
    email,
    password: 'TempPassword123!',
    displayName,
    role,
    profile: {
      firstName: displayName,
      lastName: 'User',
      phone: '+254700000000',
      address: {
        street: 'TBD',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postalCode: '00100'
      }
    }
  };

  await createUser(userData);
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  try {
    if (args.length === 0) {
      // Seed all predefined users
      await seedAllUsers();
    } else if (args.length === 2) {
      // Create single user: npm run seed:users email@example.com landlord
      const [email, role] = args;
      if (!['landlord', 'tenant', 'admin'].includes(role)) {
        throw new Error('Role must be one of: landlord, tenant, admin');
      }
      await createSingleUser(email, role as 'landlord' | 'tenant' | 'admin');
    } else {
      console.log('Usage:');
      console.log('  npm run seed:users                    # Seed all predefined users');
      console.log('  npm run seed:users email@example.com landlord  # Create single user');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Error handling for unhandled promises
process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled promise rejection:', error);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

export { createUser, seedAllUsers, createSingleUser };