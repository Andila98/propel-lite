
'use server';

/**
 * @fileOverview A service class for handling property-related database operations.
 * This demonstrates an Object-Oriented approach to organizing backend logic.
 */

import { db, admin } from '@/lib/firebase-admin';
import type { Property, Unit } from '@/lib/types';

class PropertyService {
  private propertiesCollection = db.collection('properties');

  /**
   * Fetches all properties for a given landlord.
   * @param landlordId The UID of the landlord.
   * @returns A promise that resolves to an array of properties.
   */
  async getPropertiesByLandlord(landlordId: string): Promise<Property[]> {
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

    return properties;
  }

  /**
   * Fetches a single property by its ID, ensuring it belongs to the specified landlord.
   * @param propertyId The ID of the property to fetch.
   * @param landlordId The UID of the landlord for authorization.
   * @returns A promise that resolves to the property object or null if not found/unauthorized.
   */
  async getPropertyById(propertyId: string, landlordId: string): Promise<Property | null> {
    const doc = await this.propertiesCollection.doc(propertyId).get();

    if (!doc.exists || doc.data()?.landlordId !== landlordId) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as Property;
  }

  /**
   * Creates a new property in the database.
   * @param propertyData The data for the new property.
   * @param landlordId The UID of the landlord creating the property.
   * @returns The newly created property object.
   */
  async createProperty(propertyData: Partial<Property>, landlordId: string): Promise<Property> {
    const newProperty = {
      ...propertyData,
      landlordId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await this.propertiesCollection.add(newProperty);

    return {
      id: docRef.id,
      ...newProperty,
      createdAt: new Date(), // Return a serializable date
    } as Property;
  }
}

// Export a singleton instance of the service
export const propertyService = new PropertyService();
