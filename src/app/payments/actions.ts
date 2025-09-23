
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
import { sendEmail } from '@/lib/email-service';
import ReactDOMServer from 'react-dom/server';
import pdf from 'html-pdf';
import ReceiptComponent from '@/components/receipt';
import { Suspense } from 'react';


export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
    pdf?: string; // base64 encoded PDF
}

async function createPdf(receipt: GenerateReceiptOutput): Promise<Buffer> {
    const receiptHtml = ReactDOMServer.renderToStaticMarkup(
        <Suspense fallback={null}>
            <ReceiptComponent receipt={receipt} />
        </Suspense>
    );

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; }
                .container { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
            </style>
            <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body>
            ${receiptHtml}
        </body>
        </html>
    `;

    return new Promise((resolve, reject) => {
        pdf.create(html, {
            format: 'A5',
            orientation: 'portrait',
            border: "0.5in"
        }).toBuffer((err, buffer) => {
            if (err) return reject(err);
            resolve(buffer);
        });
    });
}

export async function getReceiptAction(input: GenerateReceiptInput): Promise<ReceiptState> {
    if (!isFirebaseAdminInitialized) {
        console.error('[ERROR: getReceiptAction] Backend services are not configured.');
        return { error: "Backend services are not configured. Please contact support." };
    }
    
    try {
        const receipt = await generateReceipt(input);
        const pdfBuffer = await createPdf(receipt);
        const pdfBase64 = pdfBuffer.toString('base64');

        return { receipt, pdf: pdfBase64 };
    } catch (error: any) {
        console.error('[ERROR: getReceiptAction]', error);
        return { error: error.message || "An unknown error occurred while generating the receipt." };
    }
}


export async function emailReceiptAction(input: GenerateReceiptInput): Promise<{ error?: string, success?: boolean }> {
    if (!isFirebaseAdminInitialized) return { error: "Backend services not configured." };

    try {
        const { receipt, pdf } = await getReceiptAction(input);
        if (!receipt || !pdf) throw new Error("Failed to generate receipt data.");

        const tenantDoc = await firestore.collection('tenants').doc(input.tenantId).get();
        if (!tenantDoc.exists) throw new Error("Tenant not found.");
        const tenantEmail = tenantDoc.data()?.email;
        if (!tenantEmail) throw new Error("Tenant does not have an email address on file.");

        await sendEmail({
            to: tenantEmail,
            subject: `Your Receipt ${receipt.receiptNumber}`,
            html: `<p>Dear ${receipt.tenantName},</p><p>Please find your receipt attached to this email. Thank you for your payment.</p><p>Best regards,<br/>Your Property Management</p>`,
            attachments: [{
                filename: `Receipt-${receipt.receiptNumber}.pdf`,
                content: pdf,
                encoding: 'base64',
                contentType: 'application/pdf'
            }]
        });
        
        return { success: true };

    } catch (error: any) {
        console.error('[ERROR: emailReceiptAction]', error);
        return { error: error.message || "Failed to email receipt." };
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


const CsvPaymentSchema = z.object({
  tenant_email: z.string().email("Invalid email format."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), "Invalid date format."),
  method: z.enum(['Mpesa', 'Stripe', 'Card', 'Bank Transfer', 'Cash', 'Other'], {
    errorMap: () => ({ message: "Invalid payment method." })
  }),
  notes: z.string().optional(),
});


export async function createPaymentsFromCsvAction(
    paymentsData: any[]
): Promise<{ success: boolean; error?: string; details?: string; createdCount?: number }> {
    console.log('[CSV_ACTION] Starting CSV payment creation process.');
    if (!isFirebaseAdminInitialized) {
        console.error('[CSV_ACTION] Error: Backend services are not configured.');
        return { success: false, error: 'Backend services are not configured.' };
    }
    const sessionCookie = cookies().get(authConfig.cookieName)?.value;
    if (!sessionCookie) {
        return { success: false, error: 'Unauthorized.' };
    }
    const { landlordId, actor } = await getLandlordAndActor(sessionCookie);
    if (!landlordId || !actor) {
        return { success: false, error: 'Unauthorized user.' };
    }

    // --- Phase 1: Validation ---
    console.log('[CSV_ACTION] Starting Phase 1: Payment Validation...');
    const validatedPayments = [];
    const tenantCache = new Map<string, any>();

    const tenantsSnapshot = await firestore.collection('tenants').where('landlordId', '==', landlordId).get();
    tenantsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        tenantCache.set(data.email, { id: doc.id, ...data });
    });

    for (let i = 0; i < paymentsData.length; i++) {
        const row = paymentsData[i];
        const rowIndex = i + 2;

        const validation = CsvPaymentSchema.safeParse(row);
        if (!validation.success) {
            const firstError = validation.error.errors[0];
            const errorMessage = `Row ${rowIndex}: Invalid data for '${firstError.path.join('.')}'. Error: ${firstError.message}.`;
            return { success: false, error: `Row ${rowIndex} has invalid data.`, details: errorMessage };
        }

        const tenant = tenantCache.get(validation.data.tenant_email);
        if (!tenant) {
            const errorMessage = `Row ${rowIndex}: Tenant with email "${validation.data.tenant_email}" not found.`;
            return { success: false, error: errorMessage };
        }

        validatedPayments.push({
            ...validation.data,
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
            unitId: tenant.currentUnitId,
            landlordId: landlordId,
        });
    }
    console.log(`[CSV_ACTION] Phase 1: Validation successful for ${validatedPayments.length} payments.`);

    // --- Phase 2: Creation ---
    console.log('[CSV_ACTION] Starting Phase 2: Database Creation...');
    const batch = firestore.batch();

    for (const payment of validatedPayments) {
        const paymentRef = firestore.collection('payments').doc();
        const { tenant_email, ...dbPayment } = payment; // Exclude csv-specific field

        batch.set(paymentRef, {
            ...dbPayment,
            date: new Date(payment.date),
            status: 'confirmed',
            type: 'Rent',
            createdAt: new Date(),
        });
    }

    try {
        await batch.commit();
        await logActivity(actor.displayName || 'Admin', `Bulk recorded ${validatedPayments.length} payments from CSV`, { type: 'Tenant', name: 'Multiple Tenants' }, landlordId);

        revalidatePath('/payments');
        revalidatePath('/dashboard');
        
        console.log('[CSV_ACTION] Batch commit successful. Process finished.');
        return { success: true, createdCount: validatedPayments.length };
        
    } catch (error: any) {
        console.error('[CSV_ACTION] Final batch commit failed:', error);
        return { success: false, error: `Failed to commit changes to database.`, details: error.message };
    }
}

    