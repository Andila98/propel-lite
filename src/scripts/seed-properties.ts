#!/usr/bin/env node

/**
 * Property Seeding Script for PropelLite/RentEase
 * 
 * This script populates the Firestore database with sample property and unit data.
 * Usage: npm run seed:properties
 * 
 * Environment variables required:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_CLIENT_EMAIL  
 * - FIREBASE_PRIVATE_KEY
 */

import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { config } from 'dotenv';
import { v4 as uuid } from 'uuid';

// Load environment variables
config({ path: '.env' });

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      console.error('🔴 Firebase Admin credentials not found in environment variables. Exiting.');
      process.exit(1);
  }

  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();

// Sample Data
const landlordId = 'Fk3W4i3n6ARo2dStC6mHk7aG6O73'; // UID for landlord1@demo.com from seed-users.ts

const propertiesToSeed = [
    {
        id: 'prop-1',
        name: 'Greenwood Heights',
        type: 'Apartment' as const,
        address: '123 Oak Avenue, Nairobi',
        imageUrl: '/placeholders/apartment1.png',
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
        imageUrl: '/placeholders/house1.png',
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
        imageUrl: '/placeholders/house2.png',
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
        imageUrl: '/placeholders/apartment2.png',
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
    const propertiesCollection = db.collection('properties');

    for (const prop of propertiesToSeed) {
        const propRef = propertiesCollection.doc(prop.id);
        const propDoc = await propRef.get();

        if (propDoc.exists) {
            console.log(`⚠️  Property "${prop.name}" already exists. Skipping.`);
            continue;
        }

        const { units, ...propertyData } = prop;
        
        const newPropertyData = {
            ...propertyData,
            landlordId: landlordId,
            createdAt: FieldValue.serverTimestamp(),
        };

        await propRef.set(newPropertyData);
        console.log(`✅ Created property: ${prop.name}`);

        const unitsCollection = propRef.collection('units');
        for (const unit of units) {
            const newUnitData = {
                ...unit,
                propertyId: prop.id,
                landlordId: landlordId,
                createdAt: FieldValue.serverTimestamp(),
            };
            await unitsCollection.doc(unit.id).set(newUnitData);
            console.log(`   - Added unit: ${unit.unitNumber}`);
        }
    }
    console.log('\n🎉 Property seeding complete!');
}

seedProperties().catch(error => {
    console.error('❌ Error during property seeding:', error);
    process.exit(1);
});
