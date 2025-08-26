
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth, firestore } from '@/lib/firebase-admin';
import { TenantFormSchema, TenantUpdateSchema } from '@/lib/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import { getUserIdFromRequest } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';


export interface FormState {
    error?: string;
    errors?: {
        [key: string]: string[];
    };
    success?: boolean;
}

export async function createTenantAction(prevState: FormState, formData: FormData): Promise<FormState> {
    const sessionCookie = cookies().get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { error: 'Unauthorized. Please log in.' };
    }

    let actor;
    try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
        actor = await auth.getUser(decodedClaims.uid);
        if (actor.customClaims?.role !== 'landlord' && !actor.customClaims?.permissions?.canAddTenants) {
            return { error: "You don't have permission to add tenants." };
        }
    } catch (error) {
        return { error: 'Unauthorized. Please log in.' };
    }

    const rawData = Object.fromEntries(formData.entries());
    const validationResult = TenantFormSchema.safeParse(rawData);

    if (!validationResult.success) {
        return { 
            error: "Invalid data", 
            errors: validationResult.error.flatten().fieldErrors 
        };
    }
    
    const { unitId, ...tenantData } = validationResult.data;

    try {
        // In a real app, password should be sent securely (e.g., invite link)
        const randomPassword = Math.random().toString(36).slice(-8);

        const userRecord = await auth.createUser({
            email: tenantData.email,
            password: randomPassword,
            displayName: tenantData.name,
        });
        
        await auth.setCustomUserClaims(userRecord.uid, { role: 'tenant', profileComplete: true });

        const newTenant = {
            ...tenantData,
            uid: userRecord.uid,
            currentUnitId: unitId,
            rentStatus: 'Paid', // Default status for new tenant
            createdAt: FieldValue.serverTimestamp(),
            leaseStart: new Date(tenantData.leaseStart),
            leaseEnd: new Date(tenantData.leaseEnd),
            landlordId: actor.uid
        };
        
        const tenantRef = firestore.collection('tenants').doc(userRecord.uid);
        await tenantRef.set(newTenant);
        
        // Update the unit to be occupied
        await firestore.collection('properties').doc(tenantData.propertyId).collection('units').doc(unitId).update({
            isOccupied: true,
            tenantId: tenantRef.id
        });

        await logActivity('Admin', `Created tenant "${tenantData.name}"`, { type: 'Tenant', name: tenantData.name });
        
        revalidatePath('/tenants');
        revalidatePath('/dashboard');

        return { success: true };

    } catch (error: any) {
        console.error('[CREATE_TENANT_ACTION_ERROR]', error);
        if (error.code === 'auth/email-already-exists') {
            return { error: 'An account with this email already exists.' };
        }
        return { error: `Internal Server Error: ${error.message}` };
    }
}


export async function updateTenantAction(tenantId: string, prevState: FormState, formData: FormData): Promise<FormState> {
    const rawData = Object.fromEntries(formData.entries());
    const validationResult = TenantUpdateSchema.safeParse(rawData);

    if (!validationResult.success) {
        return { 
            error: "Invalid data", 
            errors: validationResult.error.flatten().fieldErrors 
        };
    }
    
    const { propertyId, currentUnitId, leaseStart, leaseEnd, ...tenantData } = validationResult.data;

    try {
        const tenantRef = firestore.collection('tenants').doc(tenantId);
        
        // Get the current tenant state to see if the unit has changed
        const tenantDoc = await tenantRef.get();
        if (!tenantDoc.exists) {
            return { error: "Tenant not found." };
        }
        const oldTenantData = tenantDoc.data();
        const oldUnitId = oldTenantData?.currentUnitId;
        const oldPropertyId = oldTenantData?.propertyId;

        const updateData: any = {
            ...tenantData,
            propertyId,
            currentUnitId,
            leaseStart: new Date(leaseStart),
            leaseEnd: new Date(leaseEnd),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const batch = firestore.batch();

        // Update the tenant document
        batch.update(tenantRef, updateData);

        // If the unit has changed, update both old and new units
        if (oldUnitId !== currentUnitId && oldPropertyId) {
            // Mark old unit as vacant
            const oldUnitRef = firestore.collection('properties').doc(oldPropertyId).collection('units').doc(oldUnitId);
            batch.update(oldUnitRef, { isOccupied: false, tenantId: FieldValue.delete() });
        }
        
        // Mark new unit as occupied
        const newUnitRef = firestore.collection('properties').doc(propertyId).collection('units').doc(currentUnitId);
        batch.update(newUnitRef, { isOccuped: true, tenantId: tenantId });
        
        await batch.commit();

        await logActivity('Admin', `Updated tenant "${tenantData.name}"`, { type: 'Tenant', name: tenantData.name });

        revalidatePath('/tenants');
        revalidatePath(`/tenants/${tenantId}`);
        
        return { success: true };
    } catch (error: any) {
        console.error(`[UPDATE_TENANT_ACTION_ERROR]`, error);
        return { error: `Internal Server Error: ${error.message}` };
    }
}
