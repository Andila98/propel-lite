
"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateReceipt } from '@/ai/flows/generate-receipt';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import type { GenerateReceiptOutput, GenerateReceiptInput } from '@/lib/schema-types';
import { getLandlordAndActor } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';
import { logActivity } from '@/lib/audit-log-service';
import { PaymentFormSchema } from '@/lib/schemas';
import type { FormState } from '../tenants/actions';

export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
}

export async function getReceiptAction(input: GenerateReceiptInput): Promise<ReceiptState> {
    if (!isFirebaseAdminInitialized) {
        console.error('[ERROR: getReceiptAction] Backend services are not configured.');
        return { error: "Backend services are not configured. Please contact support." };
    }
    
    try {
        const receipt = await generateReceipt(input);
        return { receipt };
    } catch (error: any) {
        console.error('[ERROR: getReceiptAction]', error);
        return { error: error.message || "An unknown error occurred while generating the receipt." };
    }
}


export async function recordPaymentAction(prevState: FormState, formData: FormData): Promise<FormState> {
    if (!isFirebaseAdminInitialized) {
        return { error: "Backend services are not configured." };
    }

    const sessionCookie = cookies().get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { error: "Authentication required." };
    }

    const { landlordId, actor } = await getLandlordAndActor(sessionCookie);

    if (!landlordId || !actor) {
        return { error: "Unauthorized operation." };
    }
    
    const rawData = Object.fromEntries(formData.entries());
    const validationResult = PaymentFormSchema.safeParse(rawData);

    if (!validationResult.success) {
        return {
            error: "Invalid payment data provided.",
            errors: validationResult.error.flatten().fieldErrors,
        };
    }
    
    const paymentData = validationResult.data;

    try {
        const tenantDoc = await firestore.collection('tenants').doc(paymentData.tenantId).get();
        if (!tenantDoc.exists) {
            return { error: "Selected tenant not found." };
        }
        const tenant = tenantDoc.data()!;
        
        const newPayment = {
            ...paymentData,
            amount: Number(paymentData.amount),
            date: new Date(paymentData.date),
            landlordId: tenant.landlordId,
            propertyId: tenant.propertyId,
            unitId: tenant.currentUnitId,
            status: 'confirmed',
            type: 'Rent'
        };

        await firestore.collection('payments').add(newPayment);

        await logActivity(actor.displayName || 'System', `Recorded payment for tenant "${tenant.name}"`, { type: 'Tenant', name: tenant.name }, landlordId);

        revalidatePath('/payments');
        revalidatePath('/dashboard');
        revalidatePath(`/tenants/${paymentData.tenantId}`);

        return { success: true };

    } catch (error: any) {
        console.error('[ERROR: recordPaymentAction]', error);
        return { error: `Failed to record payment: ${error.message}` };
    }
}
