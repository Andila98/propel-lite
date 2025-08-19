
'use server';
/**
 * @fileOverview A flow to generate a monthly performance report for a property portfolio.
 *
 * - generateReport - A function that handles the report generation process.
 * - ReportInputSchema - The input type for the generateReport function.
 * - ReportOutputSchema - The return type for the generateReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { firestore } from '@/lib/firebase-admin';
import { endOfMonth, startOfMonth } from 'date-fns';

export const ReportInputSchema = z.object({
    month: z.number().min(0).max(11),
    year: z.number().min(2020),
});
export type ReportInput = z.infer<typeof ReportInputSchema>;

export const ReportOutputSchema = z.object({
  reportTitle: z.string().describe("The title of the report, e.g., 'Performance Report for July 2024'."),
  summary: z.string().describe("A 2-3 sentence executive summary of the month's performance."),
  totalRevenue: z.number().describe("The total revenue collected during the month."),
  occupancyRate: z.number().describe("The overall occupancy rate as a percentage (e.g., 95.5)."),
  latePayments: z.number().describe("The number of late rent payments recorded."),
  newMaintenanceRequests: z.number().describe("The number of new maintenance requests submitted."),
  highlights: z.array(z.string()).describe("A list of 2-3 positive highlights for the month."),
  areasForImprovement: z.array(z.string()).describe("A list of 2-3 areas that need attention or could be improved."),
});
export type ReportOutput = z.infer<typeof ReportOutputSchema>;

async function getReportData(input: ReportInput) {
    const startDate = startOfMonth(new Date(input.year, input.month));
    const endDate = endOfMonth(new Date(input.year, input.month));

    // Fetch all relevant data in parallel
    const [
        paymentsSnapshot,
        unitsSnapshot,
        maintenanceSnapshot
    ] = await Promise.all([
        firestore.collection('payments')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get(),
        firestore.collectionGroup('units').get(),
        firestore.collection('maintenanceRequests')
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
    const latePayments = paymentsSnapshot.docs.filter(doc => new Date(doc.data().date.toDate()).getDate() > 5).length;
    
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
});


export const generateReportFlow = ai.defineFlow(
  {
    name: 'generateReportFlow',
    inputSchema: ReportInputSchema,
    outputSchema: ReportOutputSchema,
  },
  async (input) => {
    const reportData = await getReportData(input);
    
    const llmInput = {
        ...reportData,
        month: new Date(input.year, input.month).toLocaleString('default', { month: 'long' }),
        year: input.year,
    };
    
    const { output } = await prompt(llmInput);
    return output!;
  }
);

export async function generateReport(input: ReportInput): Promise<ReportOutput> {
  return generateReportFlow(input);
}
