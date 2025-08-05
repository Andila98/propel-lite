
// scripts/seedFirestore.ts
import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { v4 as uuid } from 'uuid';
import { db, admin } from '../src/lib/firebase-admin'; // Use our existing admin instance

const auth = admin.auth();

async function main() {
  console.log('🚀 Starting RentEase Firestore seeding...');

  try {
    // 1. Create a landlord
    const landlordEmail = 'landlord@demo.com';
    let landlordUid: string;
    try {
        const landlordUser = await auth.getUserByEmail(landlordEmail);
        landlordUid = landlordUser.uid;
        console.log(`Landlord ${landlordEmail} already exists. Skipping creation.`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            const landlord = await auth.createUser({
                email: landlordEmail,
                password: 'Password123!',
                displayName: 'Demo Landlord',
            });
            landlordUid = landlord.uid;
            console.log('Created landlord:', landlordEmail);
        } else {
            throw error;
        }
    }
  
    await auth.setCustomUserClaims(landlordUid, { role: 'landlord', landlordId: landlordUid });
  
    await db.collection('users').doc(landlordUid).set({
      uid: landlordUid,
      email: landlordEmail,
      name: 'Demo Landlord',
      role: 'landlord',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  
    // 2. Create a property
    const propertyId = uuid();
    await db.collection('properties').doc(propertyId).set({
      id: propertyId,
      name: 'Greenview Apartments',
      address: '123 Demo Road, Nairobi',
      type: 'Apartment',
      description: 'A lovely apartment complex with a great view of the city park.',
      landlordId: landlordUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Created property: Greenview Apartments');
  
    // 3. Add two units (as subcollection)
    const unit1Id = uuid();
    const unit2Id = uuid();
  
    await db.collection('properties').doc(propertyId).collection('units').doc(unit1Id).set({
      id: unit1Id,
      unitNumber: 'A101',
      rent: 25000,
      size: '2 Bedroom',
      isOccupied: true,
    });
  
    await db.collection('properties').doc(propertyId).collection('units').doc(unit2Id).set({
      id: unit2Id,
      unitNumber: 'A102',
      rent: 27000,
      size: '2 Bedroom Deluxe',
      isOccupied: false,
    });
    console.log('Created two units for Greenview Apartments.');
  
    // 4. Add a manager (accepted invite)
    const managerEmail = 'manager@demo.com';
    let managerUid: string;
     try {
        const managerUser = await auth.getUserByEmail(managerEmail);
        managerUid = managerUser.uid;
        console.log(`Manager ${managerEmail} already exists. Skipping creation.`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            const manager = await auth.createUser({
                email: managerEmail,
                password: 'Password123!',
                displayName: 'Demo Manager',
            });
            managerUid = manager.uid;
            console.log('Created manager:', managerEmail);
        } else {
            throw error;
        }
    }
    
    await auth.setCustomUserClaims(managerUid, {
      role: 'manager',
      landlordId: landlordUid,
    });
  
    await db.collection('users').doc(managerUid).set({
      uid: managerUid,
      email: managerEmail,
      name: 'Demo Manager',
      role: 'manager',
      landlordId: landlordUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  
    // 5. Add a tenant assigned to Unit A101
    const tenantEmail = 'tenant@demo.com';
    let tenantUid: string;
    try {
        const tenantUser = await auth.getUserByEmail(tenantEmail);
        tenantUid = tenantUser.uid;
        console.log(`Tenant ${tenantEmail} already exists. Skipping creation.`);
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            const tenant = await auth.createUser({
                email: tenantEmail,
                password: 'Password123!',
                displayName: 'John Tenant',
            });
            tenantUid = tenant.uid;
            console.log('Created tenant:', tenantEmail);
        } else {
            throw error;
        }
    }
  
    await auth.setCustomUserClaims(tenantUid, {
      role: 'tenant',
      landlordId: landlordUid,
    });
  
    await db.collection('users').doc(tenantUid).set({
      uid: tenantUid,
      email: tenantEmail,
      name: 'John Tenant',
      role: 'tenant',
      landlordId: landlordUid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      currentUnitId: unit1Id,
      leaseStart: admin.firestore.Timestamp.fromDate(new Date('2024-08-01')),
      leaseEnd: admin.firestore.Timestamp.fromDate(new Date('2025-08-01')),
      status: 'active',
    });
    console.log('Assigned tenant to unit A101.');
  
    // 6. Add a payment record
    const paymentId = uuid();
    await db.collection('payments').doc(paymentId).set({
      id: paymentId,
      tenantId: tenantUid,
      unitId: unit1Id,
      propertyId,
      amount: 25000,
      method: 'M-Pesa',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'confirmed',
      landlordId: landlordUid,
    });
    console.log('Added a payment record for the tenant.');
  
    console.log('✅ Firestore seeding complete!');

  } catch (err) {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
  }
}

main();
