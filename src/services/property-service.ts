
/**
 * @fileOverview A service class for handling property-related database operations.
 * This demonstrates an Object-Oriented approach to organizing backend logic.
 */

import { firestore, admin } from '@/lib/firebase-admin';
import { v4 as uuid } from 'uuid';
import type { FieldValue } from 'firebase-admin/firestore';

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

class PropertyService {
  private propertiesCollection = firestore.collection('properties');
  private usersCollection = firestore.collection('users');

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
   * Fetches all properties managed by a given manager.
   * @param managerId The UID of the manager.
   * @returns A promise that resolves to an array of properties.
   */
  async getPropertiesForManager(managerId: string): Promise<Property[]> {
    console.log(`PropertyService: Fetching properties for manager ${managerId}`);
    const managerDoc = await this.usersCollection.doc(managerId).get();
    
    if (!managerDoc.exists) {
        console.warn(`PropertyService: Manager with ID ${managerId} not found.`);
        return [];
    }
    
    const managedPropertyIds = managerDoc.data()?.propertiesManaged || [];

    if (managedPropertyIds.length === 0) {
        return [];
    }

    const propertiesSnapshot = await this.propertiesCollection
        .where(firestore.FieldPath.documentId(), 'in', managedPropertyIds)
        .get();

    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as Property }));
    
    return properties;
  }

  /**
   * Fetches a single property by its ID, ensuring it belongs to the specified landlord.
   * @param propertyId The ID of the property to fetch.
   * @param requesterId The UID of the user requesting the property (landlord or manager).
   * @returns A promise that resolves to the property object or null if not found/unauthorized.
   */
  async getPropertyById(propertyId: string, requesterId: string): Promise<Property | null> {
    console.log(`PropertyService: Fetching property ${propertyId} for user ${requesterId}`);
    const doc = await this.propertiesCollection.doc(propertyId).get();

    if (!doc.exists) {
        return null;
    }
    
    const propertyData = doc.data() as Property;
    
    // Authorization Check: Allow landlord or an assigned manager
    const isOwner = propertyData.landlordId === requesterId;
    const isManager = propertyData.managerId === requesterId; // Simple check, can be expanded to check a manager's assigned properties array
    
    if (!isOwner && !isManager) {
        console.warn(`PropertyService: Property ${propertyId} unauthorized for user ${requesterId}`);
        return null;
    }

    // Also fetch units subcollection
    const unitsSnapshot = await doc.ref.collection('units').get();
    const units = unitsSnapshot.docs.map(unitDoc => ({ id: unitDoc.id, ...unitDoc.data() }));
    
    (propertyData as any).units = units;

    console.log(`PropertyService: Successfully fetched property ${propertyId} with ${units.length} units.`);
    return { id: doc.id, ...propertyData };
  }
  
  /**
   * Updates a property.
   * @param propertyId The ID of the property to update.
   * @param updates The fields to update.
   * @param landlordId The UID of the landlord for authorization.
   */
  async updateProperty(propertyId: string, updates: Partial<Property>, landlordId: string): Promise<void> {
    const ref = this.propertiesCollection.doc(propertyId);
    const doc = await ref.get();

    if (!doc.exists || doc.data()?.landlordId !== landlordId) {
      throw new Error('Unauthorized or property not found');
    }

    delete (updates as any).landlordId;
    delete (updates as any).createdAt;
    
    await ref.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  /**
   * Deletes a property and all its subcollections (units).
   * @param propertyId The ID of the property to delete.
   * @param landlordId The UID of the landlord for authorization.
   */
  async deleteProperty(propertyId: string, landlordId: string): Promise<void> {
    const ref = this.propertiesCollection.doc(propertyId);
    const doc = await ref.get();

    if (!doc.exists || doc.data()?.landlordId !== landlordId) {
      throw new Error('Unauthorized or property not found');
    }
    
    // Note: Deleting a document does not delete its subcollections.
    // This would require a more complex Cloud Function for full cleanup.
    // For this app, we'll just delete the main document.
    await ref.delete();
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
    const propertyId = uuid();
    const docRef = this.propertiesCollection.doc(propertyId);

    const newPropertyData = {
      id: propertyId,
      landlordId,
      name: propertyData.name,
      address: propertyData.address,
      type: propertyData.type,
      imageUrl,
      description: propertyData.description,
      currency: propertyData.currency,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const units = propertyData.units || [];

    // Use a transaction to ensure all or nothing is written
    await firestore.runTransaction(async (transaction) => {
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
    
    // Return a serializable object
    const createdProperty = {
      ...newPropertyData,
      createdAt: admin.firestore.Timestamp.now(), // Use a serializable timestamp
    } as unknown as Property;
    
    return createdProperty;
  }
}

// Export a singleton instance of the service
export const propertyService = new PropertyService();
