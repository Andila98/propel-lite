
import { NextRequest } from 'next/server';
import ReactDOMServer from 'react-dom/server';
import ReceiptComponent from '@/components/receipt';
import { GenerateReceiptOutputSchema } from '@/lib/schema-types';

export async function POST(req: NextRequest) {
    try {
        const { receipt } = await req.json();

        // Validate the receipt data
        const validation = GenerateReceiptOutputSchema.safeParse(receipt);
        if (!validation.success) {
            return new Response('Invalid receipt data provided.', { status: 400 });
        }
        
        const receiptHtml = ReactDOMServer.renderToStaticMarkup(
            <ReceiptComponent receipt={validation.data} />
        );
        
        const fullHtml = `
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

        return new Response(fullHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        });

    } catch (error) {
        console.error('[ERROR: /api/pdf/receipt]', error);
        return new Response('Failed to render receipt HTML.', { status: 500 });
    }
}
