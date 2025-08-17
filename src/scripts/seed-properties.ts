
#!/usr/bin/env node

/**
 * Property Seeding Script for PropelLite/RentEase
 * 
 * This script populates the Firestore database with sample property and unit data.
 * It first finds the UID of 'landlord1@demo.com' to ensure properties are assigned correctly.
 * 
 * Usage: npm run seed:properties
 * 
 * Prerequisite: You should run `npm run seed:users` first to ensure the landlord exists.
 * 
 * Environment variables required:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL  
 * - FIREBASE_PRIVATE_KEY
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
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

const db = getFirestore();
const auth = getAuth();

const propertiesToSeed = [
    {
        id: 'prop-1',
        name: 'Greenwood Heights',
        type: 'Apartment' as const,
        address: '123 Oak Avenue, Nairobi',
        imageUrl: '/images/apartment1.png',
        description: 'A modern apartment block with great amenities and city views.',
        currency: 'KES',
        units: [
            { id: 'unit-101', unitNumber: 'A101', rent: 50000, size: '2 Bedroom', isOccupied: false },
            { id: 'unit-102', unitNumber: 'A102', rent: 52000, size: '2 Bedroom', isOccupied: false },
            { id: 'unit-103', unitNumber: 'B201', rent: 60000, size: '3 Bedroom', isOccupied: false },
        ]
    },
    {
        id: 'prop-2',
        name: 'The Willows',
        type: 'House' as const,
        address: '456 Maple Drive, Karen',
        imageUrl: '/images/house1.png',
        description: 'A beautiful family home with a spacious backyard and serene environment.',
        currency: 'KES',
        units: [
             { id: 'unit-201', unitNumber: 'Main House', rent: 150000, size: '4 Bedroom House', isOccupied: false },
        ]
    },
    {
        id: 'prop-3',
        name: 'Pinecrest Villa',
        type: 'House' as const,
        address: '789 Pine Street, Runda',
        imageUrl: '/images/house2.png',
        description: 'A luxurious villa with a private swimming pool and expansive gardens.',
        currency: 'USD',
        units: [
            { id: 'unit-301', unitNumber: 'Main Villa', rent: 2500, size: '5 Bedroom Villa', isOccupied: false },
        ]
    },
    {
        id: 'prop-4',
        name: 'Cityview Bedsitters',
        type: 'Bedsitter' as const,
        address: '101 Urban Plaza, Westlands',
        imageUrl: '/images/apartment2.png',
        description: 'Compact and affordable bedsitters perfect for young professionals.',
        currency: 'KES',
        units: [
            { id: 'unit-401', unitNumber: 'Unit 4A', rent: 25000, size: 'Standard Bedsitter', isOccupied: false },
            { id: 'unit-402', unitNumber: 'Unit 4B', rent: 25000, size: 'Standard Bedsitter', isOccupied: false },
            { id: 'unit-403', unitNumber: 'Unit 5A', rent: 28000, size: 'Large Bedsitter', isOccupied: false },
        ]
    }
];

async function seedProperties() {
    console.log('🌱 Starting property seeding...');

    // 1. Get the landlord UID
    let landlordId: string;
    try {
        const landlordUser = await auth.getUserByEmail('landlord1@demo.com');
        landlordId = landlordUser.uid;
        console.log(`🔍 Found landlord 'landlord1@demo.com' with UID: ${landlordId}`);
    } catch (error) {
        console.error("🔴 ERROR: Could not find user 'landlord1@demo.com'. Please run `npm run seed:users` first.");
        process.exit(1);
    }
    
    const propertiesCollection = db.collection('properties');
    const batch = db.batch();

    for (const prop of propertiesToSeed) {
        const propRef = propertiesCollection.doc(prop.id);
        const { units, ...propertyData } = prop;
        
        const newPropertyData = {
            ...propertyData,
            landlordId: landlordId,
            createdAt: FieldValue.serverTimestamp(),
        };

        batch.set(propRef, newPropertyData);
        console.log(`✅ Queued property for creation: ${prop.name}`);

        const unitsCollection = propRef.collection('units');
        for (const unit of units) {
            const unitRef = unitsCollection.doc(unit.id);
            const newUnitData = {
                ...unit,
                propertyId: prop.id,
                landlordId: landlordId,
                createdAt: FieldValue.serverTimestamp(),
            };
            batch.set(unitRef, newUnitData);
            console.log(`   - Queued unit for creation: ${unit.unitNumber}`);
        }
    }

    await batch.commit();
    console.log('\n🎉 Property seeding complete!');
}

seedProperties().catch(error => {
    console.error('❌ Error during property seeding:', error);
    process.exit(1);
});
