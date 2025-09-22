
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
import { Receipt } from '@/components/receipt';
import pdf from 'html-pdf';
import { formatDate } from '@/lib/utils';


export interface ReceiptState {
    error?: string;
    receipt?: GenerateReceiptOutput;
    pdf?: string; // base64 encoded PDF
}

async function createPdf(receipt: GenerateReceiptOutput): Promise<Buffer> {
    const receiptHtml = ReactDOMServer.renderToStaticMarkup(<Receipt receipt={receipt} />);
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; }
                .container { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
                .header { text-align: center; margin-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 0; color: #666; }
                .details { margin-bottom: 20px; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px;}
                .details-grid span:nth-child(odd) { font-weight: bold; }
                .details-grid span:nth-child(even) { text-align: right; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items-table th, .items-table td { border-bottom: 1px solid #eee; padding: 8px; text-align: left; }
                .items-table th { background-color: #f9f9f9; }
                .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
                .notes { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Receipt ${receipt.receiptNumber}</h1>
                    <p>To: ${receipt.tenantName}</p>
                </div>
                <div class="details">
                    <div class="details-grid">
                        <span>Property:</span><span>${receipt.propertyAddress}</span>
                        <span>Payment Date:</span><span>${formatDate(receipt.paymentDate)}</span>
                        <span>Payment Method:</span><span>${receipt.paymentMethod}</span>
                    </div>
                </div>
                <div class="total">
                    Amount Paid: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: receipt.currency }).format(receipt.amountPaid)}
                </div>
                <div class="notes">
                    <p>${receipt.notes}</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return new Promise((resolve, reject) => {
        pdf.create(html, { format: 'A5', orientation: 'portrait' }).toBuffer((err, buffer) => {
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
        return { receipt, pdf: pdfBuffer.toString('base64') };
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
