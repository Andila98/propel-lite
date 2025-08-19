
import { firestore, auth } from '../src/lib/firebase-admin';
import { add, format } from 'date-fns';

async function seedPropertiesAndUnits() {
  console.log('Seeding properties and units...');
  const propertiesCollection = firestore.collection('properties');
  const propertiesData = [
    {
      id: 'prop1',
      name: 'Greenwood Apartments',
      address: '123 Main St, Nairobi',
      type: 'Apartment',
      description: 'Modern apartments in the heart of the city.',
      currency: 'KES',
      imageUrl: 'https://ohpverffrwflwksxoljv.supabase.co/storage/v1/object/public/properties/property1.jpg',
      createdAt: new Date(),
      units: [
        { id: 'unit1a', unitNumber: 'A1', size: '2 Bedroom', rent: 50000, isOccupied: true },
        { id: 'unit1b', unitNumber: 'A2', size: '3 Bedroom', rent: 75000, isOccupied: false },
        { id: 'unit1c', unitNumber: 'B1', size: '1 Bedroom', rent: 35000, isOccupied: true },
      ],
    },
    {
      id: 'prop2',
      name: 'Riverside Villa',
      address: '456 River Rd, Mombasa',
      type: 'House',
      description: 'A spacious villa with a beautiful garden.',
      currency: 'KES',
      imageUrl: 'https://ohpverffrwflwksxoljv.supabase.co/storage/v1/object/public/properties/property2.jpg',
      createdAt: new Date(),
      units: [
        { id: 'unit2a', unitNumber: 'Main House', size: '4 Bedroom', rent: 120000, isOccupied: true },
      ],
    },
  ];

  for (const propData of propertiesData) {
    const { units, ...mainData } = propData;
    const propRef = propertiesCollection.doc(propData.id);
    await propRef.set(mainData);
    const unitsCollection = propRef.collection('units');
    for (const unitData of units) {
      await unitsCollection.doc(unitData.id).set(unitData);
    }
  }
  console.log('Properties and units seeded.');
  return propertiesData;
}

async function seedTenants(properties: any[]) {
  console.log('Seeding tenants...');
  const tenantsCollection = firestore.collection('tenants');
  
  const tenantsData = [
    {
      uid: 'tenant1_user_id',
      name: 'Alice Johnson',
      email: 'tenant1@example.com',
      propertyId: 'prop1',
      currentUnitId: 'unit1a',
      rentStatus: 'Paid',
      leaseStart: new Date(),
      leaseEnd: add(new Date(), { years: 1 }),
    },
    {
      uid: 'tenant2_user_id',
      name: 'Bob Williams',
      email: 'tenant2@example.com',
      propertyId: 'prop2',
      currentUnitId: 'unit2a',
      rentStatus: 'Overdue',
      leaseStart: new Date(),
      leaseEnd: add(new Date(), { years: 1 }),
    },
     {
      uid: 'tenant3_user_id',
      name: 'Charlie Brown',
      email: 'tenant3@example.com',
      propertyId: 'prop1',
      currentUnitId: 'unit1c',
      rentStatus: 'Paid',
      leaseStart: new Date(),
      leaseEnd: add(new Date(), { years: 1 }),
    },
  ];

  for (const tenant of tenantsData) {
    try {
        await auth.createUser({
            uid: tenant.uid,
            email: tenant.email,
            password: 'password123',
            displayName: tenant.name,
        });
        await auth.setCustomUserClaims(tenant.uid, { role: 'tenant' });
    } catch(e: any) {
        if (e.code !== 'auth/uid-already-exists' && e.code !== 'auth/email-already-exists') throw e;
    }
    await tenantsCollection.doc(tenant.uid).set({ ...tenant });
  }
  
  // Update unit occupancy
  await firestore.collection('properties').doc('prop1').collection('units').doc('unit1a').update({ isOccupied: true, tenantId: 'tenant1_user_id' });
  await firestore.collection('properties').doc('prop2').collection('units').doc('unit2a').update({ isOccupied: true, tenantId: 'tenant2_user_id' });
   await firestore.collection('properties').doc('prop1').collection('units').doc('unit1c').update({ isOccupied: true, tenantId: 'tenant3_user_id' });

  console.log('Tenants seeded.');
  return tenantsData;
}

async function seedPayments(tenants: any[]) {
    console.log('Seeding payments...');
    const paymentsCollection = firestore.collection('payments');
    const paymentsData = [
        { tenantId: 'tenant1_user_id', propertyId: 'prop1', unitId: 'unit1a', amount: 50000, date: new Date(), method: 'Mpesa', type: 'Rent' },
        { tenantId: 'tenant2_user_id', propertyId: 'prop2', unitId: 'unit2a', amount: 50000, date: new Date(new Date().setMonth(new Date().getMonth() - 1)), method: 'Card', type: 'Rent' },
        { tenantId: 'tenant3_user_id', propertyId: 'prop1', unitId: 'unit1c', amount: 35000, date: new Date(), method: 'Stripe', type: 'Rent' },
    ];

    for (const payment of paymentsData) {
        await paymentsCollection.add({ ...payment });
    }
    console.log('Payments seeded.');
}

async function seedMaintenanceRequests(tenants: any[]) {
    console.log('Seeding maintenance requests...');
    const requestsCollection = firestore.collection('maintenanceRequests');
    const requestsData = [
        {
            tenantId: 'tenant1_user_id',
            tenantName: 'Alice Johnson',
            propertyId: 'prop1',
            propertyAddress: '123 Main St, Nairobi',
            description: 'The kitchen sink is leaking under the cabinet. It seems to be a slow drip.',
            status: 'Pending',
            submittedDate: new Date().toISOString(),
        },
        {
            tenantId: 'tenant2_user_id',
            tenantName: 'Bob Williams',
            propertyId: 'prop2',
            propertyAddress: '456 River Rd, Mombasa',
            description: 'No hot water in the main bathroom. The pilot light on the water heater might be out.',
            status: 'Pending',
            submittedDate: new Date().toISOString(),
            priority: 'High',
            reasoning: 'Lack of hot water is a significant inconvenience that requires immediate attention.'
        },
    ];

    for (const request of requestsData) {
        await requestsCollection.add(request);
    }
    console.log('Maintenance requests seeded.');
}

async function main() {
  try {
    const properties = await seedPropertiesAndUnits();
    const tenants = await seedTenants(properties);
    await seedPayments(tenants);
    await seedMaintenanceRequests(tenants);
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

main();
