
/**
 * @fileOverview A service class for handling tenant-related database operations.
 * This centralizes the logic for creating, retrieving, and deleting tenants.
 */

import { auth, firestore } from '@/lib/firebase-admin';
import type { Tenant, Unit } from '@/lib/types';
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
  private usersCollection = firestore.collection('users');
  private propertiesCollection = firestore.collection('properties');

  /**
   * Creates a new tenant in Auth and Firestore, and assigns them to a unit.
   * @param tenantData The data for the new tenant.
   * @param creatorId The UID of the user creating the tenant (can be a landlord or manager).
   * @param creatorRole The role of the user creating the tenant.
   * @returns The created tenant object.
   */
  async createTenant(tenantData: TenantData, creatorId: string, creatorRole: 'landlord' | 'manager'): Promise<Tenant> {
    console.log(`TenantService: User ${creatorId} (${creatorRole}) is creating a new tenant.`);
    
    // Determine the landlord ID. If the creator is a manager, we need to fetch their profile to find their landlord.
    let landlordId: string;
    if (creatorRole === 'landlord') {
        landlordId = creatorId;
    } else {
        const managerDoc = await this.usersCollection.doc(creatorId).get();
        if (!managerDoc.exists || !managerDoc.data()?.landlordId) {
            throw new Error("Manager's landlord association not found.");
        }
        landlordId = managerDoc.data()?.landlordId;
    }
    
    // Check if unit is already occupied
    const unitRef = this.propertiesCollection.doc(tenantData.propertyId).collection('units').doc(tenantData.unitId);
    const unitDoc = await unitRef.get();
    const unitData = unitDoc.data();

    if (!unitDoc.exists) {
        throw new Error('Unit not found.');
    }
    // Also check that the unit belongs to the correct landlord
    if (unitData?.landlordId !== landlordId) {
        throw new Error('Unit does not belong to the specified landlord.');
    }
    if (unitData?.isOccupied) {
        throw new Error('This unit is already occupied.');
    }

    // Create Firebase Auth user
    const tempPassword = randomBytes(16).toString('hex');
    const userRecord = await auth.createUser({
      email: tenantData.email,
      password: tempPassword,
      displayName: tenantData.name,
      phoneNumber: tenantData.phone,
    });
    
    console.log(`TenantService: Created auth user ${userRecord.uid}.`);

    await auth.setCustomUserClaims(userRecord.uid, {
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
      leaseStart: firestore.Timestamp.fromDate(new Date(tenantData.leaseStart)),
      leaseEnd: firestore.Timestamp.fromDate(new Date(tenantData.leaseEnd)),
      status: 'active',
      createdAt: firestore.FieldValue.serverTimestamp(),
    };

    // Use a transaction to ensure atomicity
    await firestore.runTransaction(async (transaction) => {
        transaction.set(this.usersCollection.doc(userRecord.uid), newTenant);
        transaction.update(unitRef, { isOccupied: true, tenantId: userRecord.uid });
    });

    console.log(`TenantService: Successfully created tenant record and updated unit ${tenantData.unitId}`);
    
    // TODO: Send welcome email with temp password
    
    return { ...newTenant, id: userRecord.uid } as unknown as Tenant;
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
   * Fetches a single tenant by their ID. Authorization must be handled by the caller.
   * @param tenantId The ID of the tenant to fetch.
   * @returns A promise that resolves to the tenant object or null if not found.
   */
  async getTenantById(tenantId: string): Promise<Tenant | null> {
    const doc = await this.usersCollection.doc(tenantId).get();

    if (!doc.exists) {
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
    
    const tenant = tenantDoc.data() as Tenant | undefined;
    
    if (!tenantDoc.exists || tenant?.landlordId !== landlordId) {
        throw new Error("Unauthorized or tenant not found.");
    }

    // Use a transaction to ensure all or nothing is deleted/updated
    await firestore.runTransaction(async (transaction) => {
        // Mark the unit as unoccupied if a unit is assigned
        if (tenant.propertyId && tenant.currentUnitId) {
            const unitRef = this.propertiesCollection.doc(tenant.propertyId).collection('units').doc(tenant.currentUnitId);
            transaction.update(unitRef, { isOccupied: false, tenantId: firestore.FieldValue.delete() });
        }
        
        // Delete the user from Firestore
        transaction.delete(tenantRef);
    });

    // Delete the user from Firebase Auth
    await auth.deleteUser(tenantId);
    
    console.log(`TenantService: Successfully deleted tenant ${tenantId} and freed up unit.`);
  }
}

export const tenantService = new TenantService();
