
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
