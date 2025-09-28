

'use server';

import { revalidatePath } from 'next/cache';
import { auth, firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { TenantFormSchema, TenantUpdateSchema } from '@/lib/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { logActivity } from '@/lib/audit-log-service';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';
import { getLandlordAndActor } from '@/lib/auth-utils';
import type { Property, Tenant } from '@/lib/types';


export interface FormState {
    error?: string;
    errors?: {
        [key: string]: string[];
    };
    success?: boolean;
}

export async function createTenantAction(prevState: FormState, formData: FormData): Promise<FormState> {
    if (!isFirebaseAdminInitialized) {
        return { error: 'Backend services are not configured. Please contact support.' };
    }
    const sessionCookie = (await cookies()).get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { error: 'Unauthorized. Please log in.' };
    }

    const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
    if (authError || !landlordId || !actor) {
        const errorMessage = authError ? authError.message : 'Unauthorized. Could not identify user.';
        return { error: errorMessage };
    }
    
    if (actor.customClaims?.role === 'manager' && !actor.customClaims?.permissions?.canAddTenants) {
        return { error: "You don't have permission to add tenants." };
    }
    if (actor.customClaims?.role !== 'landlord' && actor.customClaims?.role !== 'manager') {
        return { error: "You are not authorized to perform this action." };
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
        const userRecord = await auth.createUser({
            email: tenantData.email,
            displayName: tenantData.name,
        });
        
        await auth.setCustomUserClaims(userRecord.uid, { 
            role: 'tenant', 
            profileComplete: true, 
            landlordId: landlordId
        });

        const newTenant = {
            ...tenantData,
            uid: userRecord.uid,
            currentUnitId: unitId,
            rentStatus: 'Paid',
            createdAt: FieldValue.serverTimestamp(),
            leaseStart: new Date(tenantData.leaseStart),
            leaseEnd: new Date(tenantData.leaseEnd),
            landlordId: landlordId
        };
        
        const tenantRef = firestore.collection('tenants').doc(userRecord.uid);
        await tenantRef.set(newTenant);
        
        await firestore.collection('properties').doc(tenantData.propertyId).collection('units').doc(unitId).update({
            isOccupied: true,
            tenantId: tenantRef.id
        });

        await logActivity(actor.displayName || 'Admin', `Created tenant "${tenantData.name}"`, { type: 'Tenant', name: tenantData.name }, landlordId);
        
        revalidatePath('/tenants');
        revalidatePath('/dashboard');

        return { success: true };

    } catch (error: unknown) {
        const typedError = error as Error & { code?: string };
        console.error('[ERROR: createTenantAction]', typedError);
        if (typedError.code === 'auth/email-already-exists') {
            return { error: 'An account with this email already exists.' };
        }
        return { error: `Internal ServerError: ${typedError.message}` };
    }
}


export async function updateTenantAction(tenantId: string, prevState: FormState, formData: FormData): Promise<FormState> {
    if (!isFirebaseAdminInitialized) {
        return { error: 'Backend services are not configured. Please contact support.' };
    }
    const sessionCookie = (await cookies()).get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { error: 'Unauthorized. Please log in.' };
    }

    const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
    if (authError || !landlordId || !actor) {
        const errorMessage = authError ? authError.message : 'Unauthorized. Could not identify user.';
        return { error: errorMessage };
    }

    if (actor.customClaims?.role === 'manager' && !actor.customClaims?.permissions?.canEditTenants) {
        return { error: "You don't have permission to edit tenants." };
    }
    if (actor.customClaims?.role !== 'landlord' && actor.customClaims?.role !== 'manager') {
        return { error: "You are not authorized to perform this action." };
    }


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
        
        const tenantDoc = await tenantRef.get();
        if (!tenantDoc.exists) {
            return { error: "Tenant not found." };
        }
        const oldTenantData = tenantDoc.data();
        
        if (oldTenantData?.landlordId !== landlordId) {
            return { error: "Forbidden: You do not have permission to update this tenant." };
        }
        
        const oldUnitId = oldTenantData?.currentUnitId;
        const oldPropertyId = oldTenantData?.propertyId;

        const updateData: Record<string, unknown> = {
            ...tenantData,
            propertyId,
            currentUnitId,
            leaseStart: new Date(leaseStart),
            leaseEnd: new Date(leaseEnd),
            updatedAt: FieldValue.serverTimestamp(),
        };

        const batch = firestore.batch();

        batch.update(tenantRef, updateData);

        if (oldUnitId !== currentUnitId && oldPropertyId) {
            const oldUnitRef = firestore.collection('properties').doc(oldPropertyId).collection('units').doc(oldUnitId);
            batch.update(oldUnitRef, { isOccupied: false, tenantId: FieldValue.delete() });
        }
        
        const newUnitRef = firestore.collection('properties').doc(propertyId).collection('units').doc(currentUnitId);
        batch.update(newUnitRef, { isOccupied: true, tenantId: tenantId });
        
        await batch.commit();

        await logActivity(actor.displayName || 'Admin', `Updated tenant "${tenantData.name}"`, { type: 'Tenant', name: tenantData.name }, landlordId);

        revalidatePath('/tenants');
        revalidatePath(`/tenants/${tenantId}`);
        
        return { success: true };
    } catch (error: unknown) {
        const typedError = error as Error;
        console.error(`[ERROR: updateTenantAction]`, typedError);
        return { error: `Internal Server Error: ${typedError.message}` };
    }
}


export async function createTenantsFromCsvAction(
    tenantsData: Record<string, unknown>[]
): Promise<{ success: boolean; error?: string; details?: string; createdCount?: number }> {
    console.log('[CSV_ACTION] Starting CSV tenant creation process.');
    if (!isFirebaseAdminInitialized) {
        console.error('[CSV_ACTION] Error: Backend services are not configured.');
        return { success: false, error: 'Backend services are not configured. Please contact support.' };
    }
    const sessionCookie = (await cookies()).get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        console.warn('[CSV_ACTION] Unauthorized: No session cookie.');
        return { success: false, error: 'Unauthorized. Please log in.' };
    }
    const { landlordId, actor, error: authError } = await getLandlordAndActor(sessionCookie);
    if (!landlordId || !actor || authError) {
        const errorMessage = authError ? authError.message : 'Unauthorized. Could not identify user.';
        console.warn('[CSV_ACTION] Unauthorized:', errorMessage);
        return { success: false, error: errorMessage };
    }

    console.log(`[CSV_ACTION] Fetching properties and units for landlord: ${landlordId}`);
    const propertiesSnapshot = await firestore.collection('properties').where('landlordId', '==', landlordId).get();
    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));

    const unitsSnapshots = await Promise.all(properties.map(p => firestore.collection('properties').doc(p.id).collection('units').get()));
    const unitsByProperty = properties.reduce((acc, prop, index) => {
        acc[prop.id] = unitsSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return acc;
    }, {} as Record<string, unknown[]>);
    console.log(`[CSV_ACTION] Found ${properties.length} properties and their units.`);
    
    // --- Phase 1: Validation ---
    console.log('[CSV_ACTION] Starting Phase 1: Validation...');
    const validatedTenants = [];
    const assignedUnits = new Set<string>(); // Tracks units assigned in this batch
    
    for (let i = 0; i < tenantsData.length; i++) {
        const row = tenantsData[i];
        const rowIndex = i + 2; // CSV is 1-based, plus header row
        
        const validation = TenantFormSchema.safeParse({
            name: row.name,
            email: row.email,
            phone: row.phone,
            leaseStart: row.lease_start,
            leaseEnd: row.lease_end,
            propertyId: 'temp', 
            unitId: 'temp',
        });
        
        if (!validation.success) {
            const firstError = validation.error.errors[0];
            const errorMessage = `Row ${rowIndex}: Invalid data for '${firstError.path.join('.')}'. Error: ${firstError.message}.`;
            return { success: false, error: `Row ${rowIndex} has invalid data.`, details: errorMessage };
        }
        
        const property = properties.find(p => p.address === row.property_address);
        if (!property) {
            const errorMessage = `Row ${rowIndex}: Property not found for address "${row.property_address}".`;
            return { success: false, error: errorMessage };
        }

        const unit = (unitsByProperty[property.id] as {unitNumber: string, isOccupied: boolean, id: string}[])?.find(u => u.unitNumber === row.unit_number);
        if (!unit) {
            const errorMessage = `Row ${rowIndex}: Unit "${row.unit_number}" not found in property "${property.address}".`;
            return { success: false, error: errorMessage };
        }
        
        if (unit.isOccupied) {
            const errorMessage = `Row ${rowIndex}: Unit "${unit.unitNumber}" is already occupied.`;
            return { success: false, error: errorMessage };
        }
        
        const unitAssignmentKey = `${property.id}-${unit.id}`;
        if (assignedUnits.has(unitAssignmentKey)) {
            const errorMessage = `Row ${rowIndex}: Unit "${unit.unitNumber}" is assigned multiple times in this CSV.`;
            return { success: false, error: errorMessage };
        }
        assignedUnits.add(unitAssignmentKey);

        validatedTenants.push({
            data: validation.data,
            propertyId: property.id,
            unitId: unit.id,
        });
    }
    console.log(`[CSV_ACTION] Phase 1: Validation successful for ${validatedTenants.length} tenants.`);

    // --- Phase 2: Creation ---
    console.log('[CSV_ACTION] Starting Phase 2: User and Data Creation...');
    const batch = firestore.batch();
    
    for (const { data, propertyId, unitId } of validatedTenants) {
        try {
            const userRecord = await auth.createUser({ email: data.email, displayName: data.name });
            await auth.setCustomUserClaims(userRecord.uid, { role: 'tenant', profileComplete: true, landlordId });

            const tenantRef = firestore.collection('tenants').doc(userRecord.uid);
            batch.set(tenantRef, {
                ...data,
                uid: userRecord.uid,
                propertyId: propertyId,
                currentUnitId: unitId,
                landlordId: landlordId,
                rentStatus: 'Paid',
                createdAt: FieldValue.serverTimestamp(),
                leaseStart: new Date(data.leaseStart),
                leaseEnd: new Date(data.leaseEnd),
            });

            const unitRef = firestore.collection('properties').doc(propertyId).collection('units').doc(unitId);
            batch.update(unitRef, { isOccupied: true, tenantId: userRecord.uid });

        } catch (error: unknown) {
            const typedError = error as Error & { code?: string };
            const errorMessage = `Failed to create auth user for ${data.email}. Error: ${typedError.message}. Halting process.`;
            console.error('[CSV_ACTION] Firebase Auth user creation failed:', errorMessage, typedError);
            // Don't proceed with batch commit if any user creation fails
            return { success: false, error: `Failed during user creation.`, details: errorMessage };
        }
    }

    try {
        console.log(`[CSV_ACTION] Committing batch of ${validatedTenants.length} tenants to database.`);
        await batch.commit();
        await logActivity(actor.displayName || 'Admin', `Bulk created ${validatedTenants.length} tenants from CSV`, { type: 'Tenant', name: 'Multiple Tenants' }, landlordId);
        
        revalidatePath('/tenants');
        revalidatePath('/dashboard');
        
        console.log('[CSV_ACTION] Batch commit successful. Process finished.');
        return { success: true, createdCount: validatedTenants.length };
        
    } catch (error: unknown) {
        const typedError = error as Error;
        console.error('[CSV_ACTION] Final batch commit failed:', typedError);
        return { success: false, error: `Failed to commit changes to database.`, details: typedError.message };
    }
}
