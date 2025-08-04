
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
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Tenant, Property, Payment, MaintenanceRequest } from '@/lib/types';


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
  return generateMonthlyReportFlow(input);
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

    // Fetch all properties and tenants once
    const propertiesSnapshot = await db.collection('properties').get();
    const properties = propertiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
    const tenantsSnapshot = await db.collection('tenants').get();
    const tenants = tenantsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant));

    // Calculate metrics
    const totalProperties = properties.length;
    const totalUnits = properties.reduce((acc, p) => acc + (p.units?.length || 1), 0);
    
    // For simplicity, we'll count a tenant as occupying a unit.
    const occupiedUnits = tenants.length;
    
    const allPayments: Payment[] = tenants.flatMap(t => t.paymentHistory || []);
    const paymentsThisMonth = allPayments.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate >= startDate && paymentDate <= endDate;
    });

    const totalRevenue = paymentsThisMonth.reduce((acc, p) => acc + p.amount, 0);
    const latePayments = paymentsThisMonth.filter(p => new Date(p.date).getDate() > 5).length;
    
    // This is a placeholder for fetching real maintenance requests
    const newMaintenanceRequests = Math.floor(Math.random() * 5); // Mock data

    const monthName = format(startDate, 'MMMM');
    
    const promptInput = {
      monthName,
      year,
      totalProperties,
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

// Helper to format date, as it's not available in this context by default
function format(date: Date, formatStr: string): string {
    if (formatStr === 'MMMM') {
        return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
    }
    return date.toISOString();
}
