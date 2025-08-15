
/**
 * @fileOverview A service class for handling tenant-related database operations.
 * This centralizes the logic for creating, retrieving, and deleting tenants.
 */

import { db, admin, auth } from '@/lib/firebase-admin';
import type { Tenant, Unit } from '@/lib/types';
import { getAuth } from 'firebase-admin/auth';
import { randomBytes } from 'crypto';

export type TenantData = {
  name: string;
  email: string;
  phone?: string;
  propertyId: string;
  unitId: string;
  leaseStart: string;
  leaseEnd: string;
};

export class TenantService {
  private usersCollection = db().collection('users');
  private propertiesCollection = db().collection('properties');

  /**
   * Fetches all tenants for a given landlord.
   * @param landlordId The UID of the landlord.
   * @returns A promise that resolves to an array of tenants.
   */
  async getTenantsByLandlord(landlordId: string): Promise<Tenant[]> {
    const snapshot = await this.usersCollection
      .where('landlordId', '==', landlordId)
      .where('role', '==', 'tenant')
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Tenant));
  }

  /**
   * Fetches a single tenant by their ID, ensuring they belong to the specified landlord.
   * @param tenantId The ID of the tenant to fetch.
   * @param landlordId The UID of the landlord for authorization.
   * @returns A promise that resolves to the tenant object or null if not found/unauthorized.
   */
  async getTenantById(tenantId: string, landlordId: string): Promise<Tenant | null> {
    const doc = await this.usersCollection.doc(tenantId).get();

    if (!doc.exists || doc.data()?.landlordId !== landlordId) {
      return null;
    }
    
    return { id: doc.id, ...doc.data() } as Tenant;
  }
  
  /**
   * Deletes a tenant from Firebase Auth and Firestore, and frees up their unit.
   * @param tenantId The ID of the tenant to delete.
   * @param landlordId The UID of the landlord for authorization.
   */
  async deleteTenant(tenantId: string, landlordId: string): Promise<void> {
    console.log(`TenantService: Deleting tenant ${tenantId} for landlord ${landlordId}`);
    const tenantRef = this.usersCollection.doc(tenantId);
    const tenantDoc = await tenantRef.get();
    
    if (!tenantDoc.exists || tenantDoc.data()?.landlordId !== landlordId) {
        throw new Error("Tenant not found or unauthorized.");
    }

    const tenant = tenantDoc.data() as any;
    
    // Use a transaction to ensure all or nothing is deleted/updated
    await db().runTransaction(async (transaction) => {
        // Mark the unit as unoccupied if a unit is assigned
        if (tenant.propertyId && tenant.currentUnitId) {
            const unitRef = this.propertiesCollection.doc(tenant.propertyId).collection('units').doc(tenant.currentUnitId);
            transaction.update(unitRef, { isOccupied: false, tenantId: admin.firestore.FieldValue.delete() });
        }
        
        // Delete the user from Firestore
        transaction.delete(tenantRef);
    });

    // Delete the user from Firebase Auth
    await auth().deleteUser(tenantId);
    
    console.log(`TenantService: Successfully deleted tenant ${tenantId} and freed up unit.`);
  }
}
