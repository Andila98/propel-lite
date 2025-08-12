
'use server';

/**
 * @fileOverview A service class for handling property-related database operations.
 * This demonstrates an Object-Oriented approach to organizing backend logic.
 */

import { db, admin } from '@/lib/firebase-admin';
import { v4 as uuid } from 'uuid';
import type { FieldValue } from 'firebase-admin/firestore';

// Types moved here for co-location with the service that uses them.

export interface Unit {
  id: string;
  propertyId: string;
  landlordId: string;
  unitNumber: string;
  rent: number;
  size?: string;
  isOccupied: boolean;
  tenantId?: string;
}

export interface Property {
  id: string;
  name: string;
  type: 'Apartment' | 'House' | 'Bedsitter';
  address: string;
  landlordId: string;
  managerId?: string;
  createdAt: FieldValue;
  imageUrl?: string;
  description: string;
  currency?: string;
}

export interface PropertyManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  accessLevel: 'Full Manager' | 'Limited Staff';
  propertiesManaged: string[];
}


class PropertyService {
  private propertiesCollection = db.collection('properties');

  /**
   * Fetches all properties for a given landlord.
   * @param landlordId The UID of the landlord.
   * @returns A promise that resolves to an array of properties.
   */
  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
    console.log(`PropertyService: Fetching properties for landlord ${landlordId}`);
    const snapshot = await this.propertiesCollection
      .where('landlordId', '==', landlordId)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      return [];
    }

    const properties = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Property));
    
    console.log(`PropertyService: Found ${properties.length} properties.`);
    return properties;
  }

  /**
   * Fetches a single property by its ID, ensuring it belongs to the specified landlord.
   * @param propertyId The ID of the property to fetch.
   * @param landlordId The UID of the landlord for authorization.
   * @returns A promise that resolves to the property object or null if not found/unauthorized.
   */
  async getPropertyById(propertyId: string, landlordId: string): Promise<Property | null> {
    console.log(`PropertyService: Fetching property ${propertyId} for landlord ${landlordId}`);
    const doc = await this.propertiesCollection.doc(propertyId).get();

    if (!doc.exists || doc.data()?.landlordId !== landlordId) {
       console.warn(`PropertyService: Property ${propertyId} not found or unauthorized for landlord ${landlordId}`);
      return null;
    }

    const propertyData = { id: doc.id, ...doc.data() } as Property;

    // Also fetch units subcollection
    const unitsSnapshot = await doc.ref.collection('units').get();
    const units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() }));
    
    (propertyData as any).units = units;

    console.log(`PropertyService: Successfully fetched property ${propertyId} with ${units.length} units.`);
    return propertyData;
  }

  /**
   * Creates a new property and its associated units in the database.
   * @param propertyData The data for the new property, including units.
   * @param landlordId The UID of the landlord creating the property.
   * @param imageUrl The URL of the uploaded property image.
   * @returns The newly created property object.
   */
  async createPropertyWithUnits(propertyData: any, landlordId: string, imageUrl: string): Promise<Property> {
    console.log(`PropertyService: Creating new property for landlord ${landlordId}`);
    const newPropertyData = {
      landlordId,
      name: propertyData.name,
      address: propertyData.address,
      type: propertyData.type,
      imageUrl,
      description: propertyData.description,
      currency: propertyData.currency,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = this.propertiesCollection.doc();
    
    const units = propertyData.units || [];

    // Use a transaction to ensure all or nothing is written
    await db.runTransaction(async (transaction) => {
        transaction.set(docRef, newPropertyData);

        units.forEach((unit: any) => {
            const unitId = uuid();
            const unitRef = docRef.collection('units').doc(unitId);
            transaction.set(unitRef, {
                ...unit,
                id: unitId,
                propertyId: docRef.id,
                landlordId: landlordId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
    });
    
    console.log(`PropertyService: Successfully created property ${docRef.id} with ${units.length} units.`);
    return {
      id: docRef.id,
      ...newPropertyData,
      createdAt: new Date(), // Return a serializable date
    } as Property;
  }
}

// Export a singleton instance of the service
export const propertyService = new PropertyService();
