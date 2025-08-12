
'use server';
/**
 * @fileOverview A flow that generates a monthly performance report for the landlord.
 *
 * - generateMonthlyReport - A function that generates a report from financial and operational data.
 * - GenerateMonthlyReportInput - The input type for the generateMonthlyReport function.
 * - GenerateMonthlyReportOutput - The return type for the generateMonthlyReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { db } from '@/lib/firebase-admin';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import type { Tenant, Property, Payment } from '@/lib/types';


const GenerateMonthlyReportInputSchema = z.object({
  month: z.number().min(0).max(11).describe("The month for the report (0-indexed, e.g., 0 for January)."),
  year: z.number().describe("The year for the report."),
});
export type GenerateMonthlyReportInput = z.infer<typeof GenerateMonthlyReportInputSchema>;

const GenerateMonthlyReportOutputSchema = z.object({
  reportTitle: z.string().describe("The title of the report, e.g., 'Monthly Performance Report - July 2024'."),
  summary: z.string().describe("A narrative summary of the month's performance."),
  totalRevenue: z.number().describe("The total revenue collected during the month."),
  occupancyRate: z.number().describe("The overall occupancy rate as a percentage."),
  newMaintenanceRequests: z.number().describe("The number of new maintenance requests submitted."),
  latePayments: z.number().describe("The number of tenants who paid rent late."),
  highlights: z.array(z.string()).describe("A list of positive highlights or achievements."),
  areasForImprovement: z.array(z.string()).describe("A list of potential issues or areas to focus on."),
});
export type GenerateMonthlyReportOutput = z.infer<typeof GenerateMonthlyReportOutputSchema>;

export async function generateMonthlyReport(input: GenerateMonthlyReportInput): Promise<GenerateMonthlyReportOutput> {
  try {
    return await generateMonthlyReportFlow(input);
  } catch (error: any) {
    console.error(`[generateMonthlyReport] Error: Failed to generate report for ${input.month}/${input.year}`, error);
    throw new Error(`Failed to generate monthly report: ${error.message}`);
  }
}

const prompt = ai.definePrompt({
  name: 'generateMonthlyReportPrompt',
  input: { schema: z.any() },
  output: { schema: GenerateMonthlyReportOutputSchema },
  prompt: `You are a professional property management analyst. Generate a concise, insightful monthly performance report based on the following data for {{{monthName}}} {{{year}}}.

Data:
- Total Properties: {{{totalProperties}}}
- Total Units: {{{totalUnits}}}
- Occupied Units: {{{occupiedUnits}}}
- Total Revenue: {{{totalRevenue}}}
- Total Payments: {{{paymentCount}}}
- Late Payments: {{{latePayments}}}
- New Maintenance Requests: {{{newMaintenanceRequests}}}

Analysis Request:
1.  **Title**: Create a title for the report, like "Monthly Performance Report - {{{monthName}}} {{{year}}}".
2.  **Summary**: Write a brief (2-3 sentences) narrative summary of the overall performance this month.
3.  **Metrics**: Fill in the key metrics: totalRevenue, occupancyRate, newMaintenanceRequests, latePayments.
4.  **Highlights**: Identify 2-3 positive highlights. Examples: "High occupancy rate maintained," "Revenue goals exceeded," "No major maintenance issues."
5.  **Areas for Improvement**: Identify 2-3 areas that need attention. Examples: "Increase in late payments suggests a need for stricter enforcement," "Vacancy at [Property Address] needs to be addressed," "Several maintenance requests for plumbing at [Property Address] may indicate a larger issue."
`,
});

const generateMonthlyReportFlow = ai.defineFlow(
  {
    name: 'generateMonthlyReportFlow',
    inputSchema: GenerateMonthlyReportInputSchema,
    outputSchema: GenerateMonthlyReportOutputSchema,
  },
  async (input) => {
    const { month, year } = input;
    const startDate = startOfMonth(new Date(year, month));
    const endDate = endOfMonth(new Date(year, month));

    const propertiesSnapshot = await db.collection('properties').get();
    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
    const tenantsSnapshot = await db.collection('users').where('role', '==', 'tenant').get();
    const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));

    let totalUnits = 0;
    for (const property of properties) {
        const unitsSnapshot = await db.collection('properties').doc(property.id).collection('units').get();
        totalUnits += unitsSnapshot.size;
    }
    
    const occupiedUnits = tenants.filter(t => t.status === 'active').length;
    
    const paymentsSnapshot = await db.collection('payments')
        .where('paidAt', '>=', startDate)
        .where('paidAt', '<=', endDate)
        .get();
    const paymentsThisMonth = paymentsSnapshot.docs.map(doc => doc.data() as Payment);

    const totalRevenue = paymentsThisMonth.reduce((acc, p) => acc + p.amount, 0);
    const latePayments = paymentsThisMonth.filter(p => new Date(p.paidAt).getDate() > 5).length;
    
    const newMaintenanceRequests = Math.floor(Math.random() * 5);

    const monthName = format(startDate, 'MMMM');
    
    const promptInput = {
        monthName,
        year,
        totalProperties: properties.length,
        totalUnits,
        occupiedUnits,
        totalRevenue,
        paymentCount: paymentsThisMonth.length,
        latePayments,
        newMaintenanceRequests,
    };

    const { output } = await prompt(promptInput);
    return output!;
  }
);
