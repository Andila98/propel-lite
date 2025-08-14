
/**
 * @fileOverview A service class for handling tenant-related database operations.
 * This centralizes the logic for creating, retrieving, and deleting tenants.
 */

import { db, admin } from '@/lib/firebase-admin';
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
  private usersCollection = db.collection('users');
  private propertiesCollection = db.collection('properties');

  /**
   * Creates a new tenant, including the Firebase Auth user and Firestore record.
   * @param tenantData The data for the new tenant.
   * @param landlordId The UID of the landlord creating the tenant.
   * @returns The newly created tenant object.
   */
  async createTenant(tenantData: TenantData, landlordId: string): Promise<any> {
    console.log(`TenantService: Creating new tenant for landlord ${landlordId}`);
    
    // Check if unit is already occupied
    const unitRef = this.propertiesCollection.doc(tenantData.propertyId).collection('units').doc(tenantData.unitId);
    const unitDoc = await unitRef.get();

    if (!unitDoc.exists) {
        throw new Error('Unit not found.');
    }
    if (unitDoc.data()?.isOccupied) {
        throw new Error('This unit is already occupied.');
    }

    // Create Firebase Auth user
    const tempPassword = randomBytes(16).toString('hex'); // Generate a secure temporary password
    const userRecord = await getAuth().createUser({
      email: tenantData.email,
      password: tempPassword,
      displayName: tenantData.name,
      phoneNumber: tenantData.phone,
    });
    
    // In a real app, you would email the user their login details.
    console.log(`TenantService: Created auth user ${userRecord.uid} with temporary password.`);

    await getAuth().setCustomUserClaims(userRecord.uid, {
      role: 'tenant',
      landlordId: landlordId,
    });

    const newTenant = {
      uid: userRecord.uid,
      name: tenantData.name,
      email: tenantData.email,
      phone: tenantData.phone || null,
      role: 'tenant',
      landlordId,
      propertyId: tenantData.propertyId,
      currentUnitId: tenantData.unitId,
      leaseStart: admin.firestore.Timestamp.fromDate(new Date(tenantData.leaseStart)),
      leaseEnd: admin.firestore.Timestamp.fromDate(new Date(tenantData.leaseEnd)),
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Use a transaction to ensure atomicity
    await db.runTransaction(async (transaction) => {
        transaction.set(this.usersCollection.doc(userRecord.uid), newTenant);
        transaction.update(unitRef, { isOccupied: true, tenantId: userRecord.uid });
    });

    console.log(`TenantService: Successfully created tenant record and updated unit ${tenantData.unitId}`);
    return { ...newTenant, id: userRecord.uid };
  }

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
    await db.runTransaction(async (transaction) => {
        // Mark the unit as unoccupied if a unit is assigned
        if (tenant.propertyId && tenant.currentUnitId) {
            const unitRef = this.propertiesCollection.doc(tenant.propertyId).collection('units').doc(tenant.currentUnitId);
            transaction.update(unitRef, { isOccupied: false, tenantId: admin.firestore.FieldValue.delete() });
        }
        
        // Delete the user from Firestore
        transaction.delete(tenantRef);
    });

    // Delete the user from Firebase Auth
    await getAuth().deleteUser(tenantId);
    
    console.log(`TenantService: Successfully deleted tenant ${tenantId} and freed up unit.`);
  }
}
