
'use server';
/**
 * @fileOverview A flow to generate a monthly performance report for a property portfolio.
 *
 * - generateReport - A function that handles the report generation process.
 * - ReportInput - The input type for the generateReport function.
 * - ReportOutput - The return type for the generateReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { endOfMonth, startOfMonth } from 'date-fns';
import { ReportInputSchema, ReportOutputSchema, type ReportInput, type ReportOutput } from '@/lib/schema-types';
import { withErrorHandling } from '@/lib/flow-errors';
import { withMonitoring } from '@/lib/flow-monitor';
import type { Timestamp } from 'firebase-admin/firestore';

interface PaymentData {
    amount: number;
    date: Timestamp;
}

async function getReportData(input: ReportInput) {
    if (!isFirebaseAdminInitialized) throw new Error("Firebase not initialized.");
    const startDate = startOfMonth(new Date(input.year, input.month));
    const endDate = endOfMonth(new Date(input.year, input.month));

    // Fetch all relevant data in parallel, scoped to the landlord
    const [
        paymentsSnapshot,
        unitsSnapshot,
        maintenanceSnapshot
    ] = await Promise.all([
        firestore.collection('payments')
            .where('landlordId', '==', input.landlordId)
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get(),
        firestore.collectionGroup('units').where('landlordId', '==', input.landlordId).get(),
        firestore.collection('maintenanceRequests')
            .where('landlordId', '==', input.landlordId)
            .where('submittedDate', '>=', startDate.toISOString())
            .where('submittedDate', '<=', endDate.toISOString())
            .get(),
    ]);

    // Process data
    const totalRevenue = paymentsSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
    
    const totalUnits = unitsSnapshot.size;
    const occupiedUnits = unitsSnapshot.docs.filter(doc => doc.data().isOccupied).length;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
    
    // This is a simplified calculation for late payments
    const latePayments = paymentsSnapshot.docs.filter(doc => (doc.data() as PaymentData).date.toDate().getDate() > 5).length;
    
    const newMaintenanceRequests = maintenanceSnapshot.size;

    return {
        totalRevenue,
        occupancyRate,
        latePayments,
        newMaintenanceRequests
    };
}


const prompt = ai.definePrompt({
  name: 'generateReportPrompt',
  input: {
    schema: z.object({
        month: z.string(),
        year: z.number(),
        totalRevenue: z.number(),
        occupancyRate: z.number(),
        latePayments: z.number(),
        newMaintenanceRequests: z.number(),
    })
  },
  output: {schema: ReportOutputSchema},
  prompt: `You are a professional property management analyst. Your task is to generate a concise monthly performance report.
  
Given the following data for {{month}} {{year}}, create a report with a title, a 2-3 sentence summary, and a list of 2-3 highlights and 2-3 areas for improvement.

Data:
- Total Revenue: {{totalRevenue}} KES
- Occupancy Rate: {{occupancyRate}}%
- Late Payments: {{latePayments}}
- New Maintenance Requests: {{newMaintenanceRequests}}

Analyze the data to identify positive trends (highlights) and potential issues (areas for improvement). Be specific and provide actionable insights.`,
    config: {
        temperature: 0.6,
        timeout: 20000, // 20-second timeout
    },
});


export const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: ReportInputSchema,
    outputSchema: ReportOutputSchema,
  },
  withMonitoring('generateReportFlow', withErrorHandling('generateReportFlow', async (input: ReportInput) => {
    try {
        const reportData = await getReportData(input);
        
        const llmInput = {
            ...reportData,
            month: new Date(input.year, input.month).toLocaleString('default', { month: 'long' }),
            year: input.year,
        };
        
        const { output } = await prompt(llmInput);
        return output!;
    } catch (error: unknown) {
        // Re-throw the original error so the wrapper can handle it
        throw error;
    }
  }))
);

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  return generateReportFlow(input);
}
