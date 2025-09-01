
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
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { Property, Unit, Tenant, Payment, MaintenanceRequest } from './types';

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
} catch(e) {
  console.error("Failed to parse or initialize Firebase Admin SDK:", e);
  process.exit(1);
}


const db = getFirestore();
const auth = getAuth();
const LANDLORD_EMAIL = 'landlord@example.com';
const LANDLORD_PW = 'password';

// --- Helper Functions ---

async function deleteCollection(collectionPath: string, batchSize = 50) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

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
    const collections = ['properties', 'tenants', 'payments', 'maintenanceRequests', 'landlords', 'managers'];
    for (const collection of collections) {
        console.log(`Deleting ${collection}...`);
        await deleteCollection(collection);
    }
    console.log("Data deleted.");
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
          displayName: "Demo Landlord"
      });
      await auth.setCustomUserClaims(landlord.uid, { role: 'landlord', profileComplete: true });
  } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
          console.log("Landlord already exists, fetching...");
          landlord = await auth.getUserByEmail(LANDLORD_EMAIL);
      } else {
          throw error;
      }
  }
  const landlordId = landlord.uid;
  
  await db.collection('landlords').doc(landlordId).set({
      uid: landlordId,
      name: landlord.displayName,
      email: landlord.email,
      role: 'landlord',
      createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`Landlord created with UID: ${landlordId}`);


  // 3. Create Properties and Units
  console.log("Creating properties and units...");
  const propertyTypes: Property['type'][] = ['Apartment', 'Apartment', 'House'];
  const propertyBatch = db.batch();
  const properties: Property[] = [];

  for (let i = 0; i < propertyTypes.length; i++) {
    const propertyRef = db.collection('properties').doc();
    const newProperty: Omit<Property, 'id' | 'units'> = {
      name: `${faker.location.street()
      .split(' ')
      .slice(1)
      .join(' ')} Heights`,
      address: faker.location.streetAddress(),
      type: propertyTypes[i],
      landlordId,
      imageUrl: faker.image.urlLoremFlickr({ category: 'building', width: 800, height: 500 }),
      description: faker.lorem.paragraph(),
      currency: "KES",
      createdAt: FieldValue.serverTimestamp() as any,
    };
    propertyBatch.set(propertyRef, newProperty);
    properties.push({ id: propertyRef.id, ...newProperty, units: [] } as Property);
  }
  await propertyBatch.commit();
  console.log(`${properties.length} properties created.`);


  // 4. Create Units for each property
  const unitBatch = db.batch();
  for (const property of properties) {
    const unitCount = property.type === 'Apartment' ? faker.number.int({ min: 4, max: 10 }) : 1;
    for (let j = 0; j < unitCount; j++) {
      const unitRef = db.collection('properties').doc(property.id).collection('units').doc();
      const newUnit: Omit<Unit, 'id'> = {
        unitNumber: property.type === 'Apartment' ? `A${j + 1}` : "Main House",
        rent: faker.number.int({ min: 25000, max: 150000 }),
        size: property.type === 'Apartment' ? `${faker.number.int({ min: 1, max: 3 })} Bedroom` : "4 Bedroom",
        isOccupied: false,
        landlordId,
      };
      unitBatch.set(unitRef, newUnit);
    }
  }
  await unitBatch.commit();
  console.log("Units created.");
  
  
  // Fetch back units to assign tenants
   for (const property of properties) {
     const unitsSnapshot = await db.collection('properties').doc(property.id).collection('units').get();
     property.units = unitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Unit));
   }
   

  // 5. Create Tenants
  console.log("Creating tenants...");
  const tenantBatch = db.batch();
  const allTenants: Tenant[] = [];

  for(const property of properties) {
    const unitsToFill = property.units.slice(0, faker.number.int({ min: 2, max: property.units.length }));
    for (const unit of unitsToFill) {
       const tenantRef = db.collection('tenants').doc(); // Auto-generate ID
       const newTenant: Omit<Tenant, 'id' | 'uid' | 'paymentHistory'> = {
         name: faker.person.fullName(),
         email: faker.internet.email(),
         phone: faker.phone.number(),
         role: 'tenant',
         propertyId: property.id,
         landlordId,
         currentUnitId: unit.id,
         rentStatus: 'Paid',
         leaseStart: faker.date.past({ years: 1 }) as any,
         leaseEnd: faker.date.future({ years: 1 }) as any,
       };
       tenantBatch.set(tenantRef, newTenant);
       
       // Mark unit as occupied
       const unitRef = db.collection('properties').doc(property.id).collection('units').doc(unit.id);
       tenantBatch.update(unitRef, { isOccupied: true, tenantId: tenantRef.id });
       
       allTenants.push({ ...newTenant, id: tenantRef.id } as Tenant);
    }
  }
  await tenantBatch.commit();
  console.log(`${allTenants.length} tenants created.`);

  // 6. Create Payments
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
                amount: unit.rent,
                date: faker.date.past({ months: k }) as any,
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
  

  // 7. Create Maintenance Requests
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
            submittedDate: faker.date.past({ months: 2 }) as any,
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


seedDatabase().catch(e => {
  console.error("Seeding failed:", e);
  process.exit(1);
});
