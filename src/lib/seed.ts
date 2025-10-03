
/**
 * @fileoverview This script seeds the Firestore database with sample data.
 * It's intended for development and testing purposes.
 * To run, use `npm run seed`.
 * 
 * NOTE: This script will first attempt to DELETE all existing data in the
 * collections it manages. This is a destructive operation.
 */

import { faker } from '@faker-js/faker';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { Property, Unit, Tenant, Payment, MaintenanceRequest } from './types';
import { sub, addYears } from 'date-fns';

// Load service account credentials from environment variables
const serviceAccountKeyBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
if (!serviceAccountKeyBase64) {
  console.error("CRITICAL: GOOGLE_APPLICATION_CREDENTIALS_BASE64 env var is not set.");
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf8'));

  initializeApp({
    credential: cert(serviceAccount),
  });
} catch (e: unknown) {
  const error = e as Error;
  console.error("Failed to parse or initialize Firebase Admin SDK:", error.message);
  process.exit(1);
}


const db = getFirestore();
const auth = getAuth();
const LANDLORD_EMAIL = 'landlord@example.com';
const LANDLORD_PW = 'password';

// --- Helper Functions ---

async function deleteCollection(collectionPath: string, batchSize = 50) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, resolve: (value: unknown) => void) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve(true);
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}


async function clearData() {
    console.log("Deleting existing data...");
    const collections = ['properties', 'tenants', 'payments', 'maintenanceRequests', 'landlords', 'managers', 'reminders', 'auditLogs'];
    for (const collection of collections) {
        console.log(`Deleting ${collection}...`);
        // We need to handle subcollections for properties
        if (collection === 'properties') {
            const snapshot = await db.collection('properties').get();
            for (const doc of snapshot.docs) {
                await deleteCollection(`properties/${doc.id}/units`);
            }
        }
        await deleteCollection(collection);
    }

    // Delete all users except the main landlord account
    const { users } = await auth.listUsers();
    const uidsToDelete = users
      .filter(u => u.email?.toLowerCase() !== LANDLORD_EMAIL.toLowerCase()) 
      .map(u => u.uid);
      
    if(uidsToDelete.length > 0) {
      try {
        await auth.deleteUsers(uidsToDelete);
        console.log(`Deleted ${uidsToDelete.length} users.`);
      } catch (error) {
        console.error('Error deleting users:', error);
      }
    }
    
    console.log("Data deleted successfully.");
}


async function seedDatabase() {
  console.log("Starting database seeding...");

  // 1. Clear existing data
  await clearData();
  
  // 2. Create Landlord User
  console.log("Creating landlord user...");
  let landlord;
  try {
      landlord = await auth.createUser({
          email: LANDLORD_EMAIL,
          password: LANDLORD_PW,
          displayName: "Demo Landlord",
          emailVerified: true
      });
      console.log(`New landlord user created: ${landlord.email}`);
  } catch (error: unknown) {
      const typedError = error as { code?: string };
      if (typedError.code === 'auth/email-already-exists') {
          console.log("Landlord already exists, fetching...");
          landlord = await auth.getUserByEmail(LANDLORD_EMAIL);
      } else {
          console.error("Error creating landlord:", error);
          throw error;
      }
  }
  
  // Set role and mark profile as complete since this is a seeded account
  await auth.setCustomUserClaims(landlord.uid, { role: 'landlord', profileComplete: true });
  const landlordId = landlord.uid;
  
  await db.collection('landlords').doc(landlordId).set({
      uid: landlordId,
      name: landlord.displayName,
      email: landlord.email,
      role: 'landlord',
      createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`Landlord profile configured with UID: ${landlordId}`);


  // 3. Create Properties and Units
  console.log("Creating properties and units...");
  const propertyTypes: Property['type'][] = ['Apartment', 'Apartment', 'House'];
  const properties: Property[] = [];
  const now = new Date();

  for (const type of propertyTypes) {
    const propertyRef = db.collection('properties').doc();
    const newPropertyData: Omit<Property, 'id' | 'units' | 'createdAt' | 'updatedAt'> = {
      name: `${faker.location.street()
        .split(' ').slice(1).join(' ')} Heights`,
      address: faker.location.streetAddress(false),
      type: type,
      landlordId,
      imageUrl: faker.image.urlLoremFlickr({ category: 'building', width: 800, height: 500 }),
      description: faker.lorem.paragraph(),
      currency: "KES",
    };
    
    const propertyWithTimestamp = {
        ...newPropertyData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    }

    await propertyRef.set(propertyWithTimestamp);
    
    const createdProperty: Property = {
        id: propertyRef.id,
        units: [],
        createdAt: now as unknown as Timestamp,
        updatedAt: now as unknown as Timestamp,
        ...newPropertyData
    };

    // Create Units for the property
    const unitCount = type === 'Apartment' ? faker.number.int({ min: 4, max: 10 }) : 1;
    const unitBatch = db.batch();
    for (let j = 0; j < unitCount; j++) {
      const unitRef = propertyRef.collection('units').doc();
      const newUnit: Omit<Unit, 'id'> = {
        unitNumber: type === 'Apartment' ? `A${j + 1}` : "Main House",
        rent: faker.number.int({ min: 25000, max: 150000 }),
        size: type === 'Apartment' ? `${faker.number.int({ min: 1, max: 3 })} Bedroom` : "4 Bedroom",
        isOccupied: false,
        landlordId,
      };
      unitBatch.set(unitRef, newUnit);
    }
    await unitBatch.commit();
    
    // Fetch units back to add to the property object
     const unitsSnapshot = await propertyRef.collection('units').get();
     createdProperty.units = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));

    properties.push(createdProperty);
  }
  console.log(`${properties.length} properties and their units created.`);
   

  // 4. Create Tenants
  console.log("Creating tenants...");
  const allTenants: Tenant[] = [];

  for(const property of properties) {
    const unitsToFill = property.units.slice(0, faker.number.int({ min: 2, max: property.units.length }));
    for (const unit of unitsToFill) {
       if (unit.isOccupied) continue;

       const tenantEmail = faker.internet.email({ firstName: faker.person.firstName(), lastName: faker.person.lastName() });
       const tenantName = faker.person.fullName();
       const tenantAuthUser = await auth.createUser({
         email: tenantEmail,
         displayName: tenantName,
         password: 'password',
         emailVerified: true
       });
       await auth.setCustomUserClaims(tenantAuthUser.uid, { role: 'tenant', profileComplete: true, landlordId });

       const tenantRef = db.collection('tenants').doc(tenantAuthUser.uid);
       const newTenant: Omit<Tenant, 'id'> = {
         uid: tenantAuthUser.uid,
         name: tenantName,
         email: tenantEmail,
         phone: faker.phone.number(),
         role: 'tenant',
         propertyId: property.id,
         landlordId,
         currentUnitId: unit.id,
         rentStatus: 'Paid',
         leaseStart: sub(now, { years: 1 }) as unknown as Timestamp,
         leaseEnd: addYears(now, 1) as unknown as Timestamp,
         paymentHistory: [],
         createdAt: FieldValue.serverTimestamp() as Timestamp
       };
       await tenantRef.set(newTenant);
       
       // Mark unit as occupied
       const unitRef = db.collection('properties').doc(property.id).collection('units').doc(unit.id);
       await unitRef.update({ isOccupied: true, tenantId: tenantRef.id });
       
       unit.isOccupied = true;
       allTenants.push({ ...newTenant, id: tenantRef.id } as Tenant);
    }
  }
  console.log(`${allTenants.length} tenants created.`);

  // 5. Create Payments
  console.log("Creating payments...");
  const paymentBatch = db.batch();
  for (const tenant of allTenants) {
      const property = properties.find(p => p.id === tenant.propertyId);
      const unit = property?.units.find(u => u.id === tenant.currentUnitId);
      
      if (unit) {
          for(let k = 0; k < 6; k++) {
            const paymentRef = db.collection('payments').doc();
            const newPayment: Omit<Payment, 'id'> = {
                tenantId: tenant.id,
                landlordId,
                propertyId: tenant.propertyId,
                unitId: tenant.currentUnitId,
                amount: unit.rent + faker.number.int({ min: -1000, max: 1000 }),
                date: sub(new Date(), { months: k + 1 }).toISOString(),
                method: faker.helpers.arrayElement(['Mpesa', 'Stripe', 'Card']),
                status: 'confirmed',
                type: 'Rent',
            };
            paymentBatch.set(paymentRef, newPayment);
        }
      }
  }
  await paymentBatch.commit();
  console.log("Payments created.");
  

  // 6. Create Maintenance Requests
  console.log("Creating maintenance requests...");
  const maintBatch = db.batch();
  for (let i = 0; i < 5; i++) {
    const tenant = faker.helpers.arrayElement(allTenants);
    const property = properties.find(p => p.id === tenant.propertyId);
    
    if (tenant && property) {
        const maintRef = db.collection('maintenanceRequests').doc();
        const newRequest: Omit<MaintenanceRequest, 'id'> = {
            tenantId: tenant.id,
            tenantName: tenant.name,
            propertyId: tenant.propertyId,
            landlordId,
            propertyAddress: property.address,
            description: faker.lorem.sentence(),
            status: faker.helpers.arrayElement(['Pending', 'In Progress', 'Completed']),
            submittedDate: faker.date.recent({ days: 30 }).toISOString(),
            priority: faker.helpers.arrayElement(['High', 'Medium', 'Low']),
            reasoning: faker.lorem.sentence(),
        };
        maintBatch.set(maintRef, newRequest);
    }
  }
  await maintBatch.commit();
  console.log("Maintenance requests created.");

  console.log("Database seeding complete!");
}


seedDatabase().catch((e: unknown) => {
  const error = e as Error;
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
