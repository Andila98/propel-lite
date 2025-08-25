
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth, firestore } from '@/lib/firebase-admin';
import { TenantFormSchema, TenantUpdateSchema } from '@/lib/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import { getUserIdFromRequest } from '@/lib/auth-utils';

export interface FormState {
    error?: string;
    errors?: {
        [key: string]: string[];
    };
    success?: boolean;
}

export async function createTenantAction(prevState: FormState, formData: FormData): Promise<FormState> {
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
            // This should be replaced with the actual landlord's ID from session
            landlordId: 'default_landlord_id' 
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
        const updateData: any = {
            ...tenantData,
            propertyId,
            currentUnitId,
            leaseStart: new Date(leaseStart),
            leaseEnd: new Date(leaseEnd),
            updatedAt: FieldValue.serverTimestamp(),
        };

        await firestore.collection('tenants').doc(tenantId).update(updateData);
        
        await firestore.collection('properties').doc(propertyId).collection('units').doc(currentUnitId).update({
            isOccupied: true,
            tenantId: tenantId
        });
        
        await logActivity('Admin', `Updated tenant "${tenantData.name}"`, { type: 'Tenant', name: tenantData.name });

        revalidatePath('/tenants');
        revalidatePath(`/tenants/${tenantId}`);
        
        return { success: true };
    } catch (error: any) {
        console.error(`[UPDATE_TENANT_ACTION_ERROR]`, error);
        return { error: `Internal Server Error: ${error.message}` };
    }
}
