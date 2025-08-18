
'use server';
/**
 * @fileOverview An AI agent for generating dashboard insights.
 *
 * - generateDashboardInsights - A function that generates predictive analytics and summaries.
 * - GenerateDashboardInsightsInput - The input type for the function.
 * - GenerateDashboardInsightsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GenerateDashboardInsightsInputSchema = z.object({
  totalRevenue: z.number().describe('The total revenue for the current period.'),
  occupancyRate: z.number().describe('The current occupancy rate as a percentage (e.g., 80 for 80%).'),
  latePayments: z.number().describe('The number of late payments in the current period.'),
  newMaintenanceRequests: z.number().describe('The number of new maintenance requests.'),
  timeframe: z.string().describe('The current timeframe (e.g., month, quarter).'),
});
export type GenerateDashboardInsightsInput = z.infer<typeof GenerateDashboardInsightsInputSchema>;


export const GenerateDashboardInsightsOutputSchema = z.object({
  naturalLanguageSummary: z.string().describe("A 1-2 sentence summary of the dashboard's key metrics in plain, easy-to-understand language."),
  revenueForecast: z.string().describe("A brief (1 sentence) forecast of the revenue trend for the next period."),
  occupancyForecast: z.string().describe("A brief (1 sentence) forecast of the occupancy rate trend."),
  latePaymentPrediction: z.string().describe("A brief (1 sentence) prediction regarding late payments for the next period."),
  anomalyAlerts: z.array(z.string()).describe("A list of 2-3 potential anomalies or noteworthy patterns detected in the data."),
});
export type GenerateDashboardInsightsOutput = z.infer<typeof GenerateDashboardInsightsOutputSchema>;

export async function generateDashboardInsights(input: GenerateDashboardInsightsInput): Promise<GenerateDashboardInsightsOutput> {
  return generateDashboardInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDashboardInsightsPrompt',
  input: { schema: GenerateDashboardInsightsInputSchema },
  output: { schema: GenerateDashboardInsightsOutputSchema },
  prompt: `You are a helpful data analyst for a property management company. Your task is to analyze the following metrics for the current {{timeframe}} and generate insightful, predictive, and summary information for a landlord.

Current Data:
- Total Revenue: {{totalRevenue}}
- Occupancy Rate: {{occupancyRate}}%
- Late Payments: {{latePayments}}
- New Maintenance Requests: {{newMaintenanceRequests}}

Based on this data, please provide the following:
1.  A natural language summary of the current situation.
2.  A revenue forecast for the next period.
3.  An occupancy forecast.
4.  A prediction about late payments.
5.  A list of detected anomalies or patterns worth noting.

Keep your responses concise, professional, and directly useful for a property manager. Do not use markdown or formatting in your output strings.`,
});

const generateDashboardInsightsFlow = ai.defineFlow(
  {
    name: 'generateDashboardInsightsFlow',
    inputSchema: GenerateDashboardInsightsInputSchema,
    outputSchema: GenerateDashboardInsightsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
