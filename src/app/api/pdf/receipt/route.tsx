
import { NextResponse, type NextRequest } from 'next/server';
import ReactDOMServer from 'react-dom/server';
import pdf from 'html-pdf';
import { GenerateReceiptOutputSchema, type GenerateReceiptOutput } from '@/lib/schema-types';
import ReceiptComponent from '@/components/receipt';
import { formatDate } from '@/lib/utils';
import { Suspense } from 'react';

export const runtime = 'nodejs';

async function createPdf(receipt: GenerateReceiptOutput): Promise<Buffer> {
    
    const receiptHtml = ReactDOMServer.renderToStaticMarkup(
        <Suspense fallback={null}>
            <ReceiptComponent receipt={receipt} />
        </Suspense>
    );
    
    // Using a simple HTML template for the PDF
     const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #333; }
                .container { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, .15); }
                /* Add Tailwind-like utility classes used in the Receipt component if needed */
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


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const validation = GenerateReceiptOutputSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid receipt data provided.', details: validation.error.flatten() }, { status: 400 });
    }

    const receiptData = validation.data;
    const pdfBuffer = await createPdf(receiptData);
    
    return NextResponse.json({ pdf: pdfBuffer.toString('base64') });

  } catch (error: any) {
    console.error('[ERROR: /api/pdf/receipt]', error);
    return NextResponse.json({ error: 'Failed to generate PDF.', details: error.message }, { status: 500 });
  }
}
