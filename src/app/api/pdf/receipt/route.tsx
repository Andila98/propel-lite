import { NextRequest } from 'next/server';
import { GenerateInvoiceOutputSchema } from '@/lib/schema-types'; // Changed from Receipt to Invoice

// We are constructing the HTML string manually to avoid server-side rendering issues in API routes.
function renderReceiptToHtml(receipt: import('@/lib/schema-types').GenerateInvoiceOutput): string {
    const itemsHtml = receipt.items.map(item => `
        <tr>
            <td style="padding: 8px; border-top: 1px solid #eee;">${item.description}</td>
            <td style="padding: 8px; border-top: 1px solid #eee; text-align: right;">${receipt.currency} ${item.amount.toLocaleString()}</td>
        </tr>
    `).join('');

    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); padding: 24px;">
            <h1 style="font-size: 1.5rem; margin-bottom: 8px;">Invoice ${receipt.invoiceNumber}</h1>
            <p style="color: #666; margin-top: 0;">To: ${receipt.tenantName}</p>
            <div style="margin: 24px 0;">
                <p><strong>Property:</strong> ${receipt.propertyAddress}</p>
                <p><strong>Invoice Date:</strong> ${new Date(receipt.invoiceDate).toLocaleDateString()}</p>
                <p><strong>Due Date:</strong> ${new Date(receipt.dueDate).toLocaleDateString()}</p>
            </div>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr>
                        <th style="text-align: left; padding: 8px; border-bottom: 2px solid #eee;">Description</th>
                        <th style="text-align: right; padding: 8px; border-bottom: 2px solid #eee;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
            <div style="text-align: right; margin-top: 24px;">
                <p style="font-size: 1.25rem; font-weight: bold;">Total: ${receipt.currency} ${receipt.totalAmount.toLocaleString()}</p>
            </div>
            <div style="margin-top: 24px; font-size: 0.875rem; color: #666; text-align: center;">
                <p>${receipt.notes}</p>
            </div>
        </div>
    `;
}


export async function POST(req: NextRequest) {
    try {
        // The body now contains an invoice, not a receipt
        const { receipt: invoice } = await req.json();

        // Validate the invoice data using the correct schema
        const validation = GenerateInvoiceOutputSchema.safeParse(invoice);
        if (!validation.success) {
            console.error('Invalid invoice data provided for PDF generation:', validation.error.flatten());
            return new Response('Invalid invoice data provided.', { status: 400 });
        }
        
        const receiptHtml = renderReceiptToHtml(validation.data);
        
        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9; }
                </style>
            </head>
            <body>
                ${receiptHtml}
            </body>
            </html>
        `;

        return new Response(fullHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        });

    } catch (error) {
        console.error('[ERROR: /api/pdf/receipt]', error);
        return new Response('Failed to render receipt HTML.', { status: 500 });
    }
}
