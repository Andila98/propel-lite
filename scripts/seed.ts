
/**
 * To run this script:
 * 1. Make sure you have a service account file linked in your environment.
 *    For local development, you can run `gcloud auth application-default login`
 *    which creates a credentials file that the Admin SDK can automatically detect.
 * 2. From the root of the project, run: `npm run db:seed`
 */
import { faker } from '@faker-js/faker';
import { auth, firestore, isFirebaseAdminInitialized } from '../src/lib/firebase-admin';
import type { Property, Unit, Tenant, Payment, MaintenanceRequest, Message, AuditLog } from '../src/lib/types';
import { add, sub } from 'date-fns';

if (!isFirebaseAdminInitialized) {
  console.error("Firebase Admin SDK is not initialized. Make sure your environment is configured correctly.");
  process.exit(1);
}

const BATCH_SIZE = 250;


async function clearCollection(collectionPath: string, subcollections: string[] = []) {
  const collectionRef = firestore.collection(collectionPath);
  const query = collectionRef.limit(BATCH_SIZE);

  return new Promise<void>((resolve, reject) => {
    deleteQueryBatch(query, subcollections, resolve, reject);
  });
}

async function deleteQueryBatch(query: FirebaseFirestore.Query, subcollections: string[], resolve: () => void, reject: (reason?: any) => void) {
  const snapshot = await query.get();

  if (snapshot.size === 0) {
    resolve();
    return;
  }

  const batch = firestore.batch();
  for (const doc of snapshot.docs) {
    for (const sub of subcollections) {
      await clearCollection(`${doc.ref.path}/${sub}`);
    }
    batch.delete(doc.ref);
  }

  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, subcollections, resolve, reject);
  });
}

async function clearAllData() {
    console.log('Clearing existing data from Firestore...');

    const collections = [
        { path: 'landlords', subcollections: [] },
        { path: 'managers', subcollections: [] },
        { path: 'tenants', subcollections: [] },
        { path: 'properties', subcollections: ['units'] },
        { path: 'payments', subcollections: [] },
        { path: 'maintenanceRequests', subcollections: [] },
        { path: 'messages', subcollections: [] },
        { path: 'auditLogs', subcollections: [] },
        { path: 'reminders', subcollections: [] },
    ];

    for (const collection of collections) {
        console.log(`  - Clearing ${collection.path}...`);
        await clearCollection(collection.path, collection.subcollections);
    }
    
    console.log('Clearing existing users from Firebase Auth...');
    const users = await auth.listUsers();
    if (users.users.length > 0) {
        const uidsToDelete = users.users.map(u => u.uid);
        await auth.deleteUsers(uidsToDelete);
    }

    console.log('All data cleared.');
}

async function seedData() {
    console.log('Starting to seed data...');
    
    // --- 1. Create Landlord ---
    console.log('Creating landlord...');
    const landlordEmail = "landlord@example.com";
    const landlordPassword = "password123";
    let landlordRecord;
    try {
        landlordRecord = await auth.createUser({
            email: landlordEmail,
            password: landlordPassword,
            displayName: "Alice Landlord",
        });
    } catch(e:any) {
        if(e.code === 'auth/email-already-exists') {
            landlordRecord = await auth.getUserByEmail(landlordEmail);
        } else {
            throw e;
        }
    }
    
    await auth.setCustomUserClaims(landlordRecord.uid, { role: 'landlord', profileComplete: true });

    const landlordRef = firestore.collection('landlords').doc(landlordRecord.uid);
    await landlordRef.set({
        uid: landlordRecord.uid,
        email: landlordEmail,
        name: "Alice Landlord",
        createdAt: new Date(),
    });
    const landlordId = landlordRecord.uid;
    console.log(`Landlord created. Email: ${landlordEmail}, Password: ${landlordPassword}`);


    // --- 2. Create Properties & Units ---
    console.log('Creating properties and units...');
    const properties: (Property & { units: Unit[] })[] = [];
    const propertyTypes: Property['type'][] = ['Apartment', 'Apartment', 'House'];

    for (const type of propertyTypes) {
        const propertyRef = firestore.collection('properties').doc();
        const address = faker.location.streetAddress();
        
        const propertyData: Omit<Property, 'id'> = {
            landlordId,
            name: `${faker.location.street().split(' ')[0]} Heights`,
            address: address,
            type,
            imageUrl: `https://picsum.photos/seed/${propertyRef.id}/800/500`,
            description: faker.lorem.paragraph(),
            currency: 'KES',
            createdAt: new Date(),
            units: []
        };
        await propertyRef.set(propertyData);

        const createdProperty: Property & { units: Unit[] } = { id: propertyRef.id, ...propertyData, units: [] };

        const unitsBatch = firestore.batch();
        const numUnits = type === 'Apartment' ? faker.number.int({ min: 4, max: 10 }) : 1;

        for (let i = 0; i < numUnits; i++) {
            const unitRef = propertyRef.collection('units').doc();
            const unitData: Omit<Unit, 'id'> = {
                unitNumber: type === 'Apartment' ? `A${i + 1}` : 'Main',
                rent: faker.number.int({ min: 15000, max: 80000 }),
                size: type === 'House' ? '4 Bedroom' : `${faker.number.int({ min: 1, max: 3 })} Bedroom`,
                isOccupied: false,
                landlordId: landlordId,
            };
            unitsBatch.set(unitRef, unitData);
            createdProperty.units.push({ id: unitRef.id, ...unitData });
        }
        await unitsBatch.commit();
        properties.push(createdProperty);
    }
    console.log(`${properties.length} properties created.`);

    // --- 3. Create Tenants ---
    console.log('Creating tenants...');
    const tenants: Tenant[] = [];
    const vacantUnits = properties.flatMap(p => p.units.map(u => ({ ...u, propertyId: p.id, propertyAddress: p.address, currency: p.currency }))).filter(u => !u.isOccupied);

    for (const unit of vacantUnits.slice(0, 5)) { // Create 5 tenants
        const tenantName = faker.person.fullName();
        const tenantEmail = faker.internet.email({ firstName: tenantName.split(' ')[0] });
        
        let tenantRecord;
         try {
            tenantRecord = await auth.createUser({
                email: tenantEmail,
                displayName: tenantName,
                password: 'password123'
            });
        } catch(e:any) {
            if(e.code === 'auth/email-already-exists') {
                tenantRecord = await auth.getUserByEmail(tenantEmail);
            } else {
                throw e;
            }
        }
        
        await auth.setCustomUserClaims(tenantRecord.uid, { role: 'tenant', profileComplete: true, landlordId: landlordId });
        
        const tenantData: Omit<Tenant, 'id'> = {
            uid: tenantRecord.uid,
            name: tenantName,
            email: tenantEmail,
            phone: faker.phone.number(),
            propertyId: unit.propertyId,
            currentUnitId: unit.id,
            landlordId,
            rentStatus: 'Paid',
            leaseStart: sub(new Date(), { months: faker.number.int({ min: 2, max: 10 }) }),
            leaseEnd: add(new Date(), { months: faker.number.int({ min: 2, max: 12 }) }),
            paymentHistory: [],
        };
        await firestore.collection('tenants').doc(tenantRecord.uid).set(tenantData);
        await firestore.collection('properties').doc(unit.propertyId).collection('units').doc(unit.id).update({ isOccupied: true, tenantId: tenantRecord.uid });
        tenants.push({ id: tenantRecord.uid, ...tenantData });
    }
    console.log(`${tenants.length} tenants created and assigned to units.`);

    // --- 4. Create Payments ---
    console.log('Generating payment history...');
    const paymentsBatch = firestore.batch();
    tenants.forEach(tenant => {
        const unit = vacantUnits.find(u => u.id === tenant.currentUnitId);
        for(let i=0; i<3; i++) { // 3 months of payments
            const paymentRef = firestore.collection('payments').doc();
            const payment: Omit<Payment, 'id'> = {
                tenantId: tenant.id,
                landlordId,
                propertyId: tenant.propertyId,
                unitId: tenant.currentUnitId,
                amount: unit?.rent || 0,
                date: sub(new Date(), { months: i }).toISOString(),
                method: faker.helpers.arrayElement(['Mpesa', 'Stripe', 'Card']),
                status: 'confirmed',
                type: 'Rent',
            };
            paymentsBatch.set(paymentRef, payment);
        }
    });
    await paymentsBatch.commit();
    console.log('Payment history generated.');
    
    // --- 5. Generate Maintenance Requests, Messages, and Logs ---
    console.log('Generating maintenance requests, messages, and audit logs...');
    const otherDataBatch = firestore.batch();

    // Maintenance Request
    const maintTenant = faker.helpers.arrayElement(tenants);
    const maintProp = properties.find(p => p.id === maintTenant.propertyId);
    const maintRef = firestore.collection('maintenanceRequests').doc();
    const maintReqData = {
        landlordId,
        tenantId: maintTenant.id,
        tenantName: maintTenant.name,
        propertyId: maintTenant.propertyId,
        propertyAddress: maintProp?.address,
        description: "The kitchen faucet is dripping continuously.",
        status: "Pending",
        submittedDate: new Date().toISOString(),
        priority: "Low",
        reasoning: "A dripping faucet is a minor inconvenience with low impact on tenant safety or property integrity."
    };
    otherDataBatch.set(maintRef, maintReqData);

    // Message
    const msgTenant = faker.helpers.arrayElement(tenants);
    const msgRef = firestore.collection('messages').doc();
    otherDataBatch.set(msgRef, {
        tenantId: msgTenant.id,
        senderId: landlordId,
        senderName: "Alice Landlord",
        content: "Hi there, just a friendly reminder that rent is due on the 1st. Thanks!",
        timestamp: new Date(),
        isRead: false,
    } as Omit<Message, 'id'>);

    // Audit Log
    const auditRef = firestore.collection('auditLogs').doc();
    otherDataBatch.set(auditRef, {
        managerName: "Alice Landlord",
        action: `Created tenant "${maintTenant.name}"`,
        entityType: 'Tenant',
        entityName: maintTenant.name,
        timestamp: new Date()
    } as Omit<AuditLog, 'id'>);

    await otherDataBatch.commit();
    console.log('Sample requests, messages, and logs created.');
}

async function seed() {
    await clearAllData();
    await seedData();
}

seed().then(() => {
    console.log('\n✅ Database seeding complete!');
    console.log(`\nLogin with:\nEmail: ${landlordEmail}\nPassword: ${landlordPassword}`);
    process.exit(0);
}).catch((e) => {
    console.error('Seeding failed:');
    console.error(e);
    process.exit(1);
});

    