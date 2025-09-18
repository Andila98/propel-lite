
'use server';
/**
 * @fileOverview An AI flow to generate insights and detect anomalies for the dashboard.
 *
 * - generateDashboardInsights - A function that handles the insight generation process.
 * - DashboardInsightsInput - The input type for the function.
 * - DashboardInsightsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { 
    DashboardInsightsInputSchema, 
    DashboardInsightsOutputSchema,
    type DashboardInsightsInput,
    type DashboardInsightsOutput
} from '@/lib/schema-types';
import { withErrorHandling } from '@/lib/flow-errors';
import { withMonitoring } from '@/lib/flow-monitor';


export async function generateDashboardInsights(input: DashboardInsightsInput): Promise<DashboardInsightsOutput> {
  return dashboardInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'dashboardInsightsPrompt',
  input: {schema: DashboardInsightsInputSchema},
  output: {schema: DashboardInsightsOutputSchema},
  prompt: `You are a property management expert analyzing a portfolio dashboard.
  
Given the following key metrics, provide a concise summary (1-2 sentences) and identify any potential anomalies or areas of concern.
- An occupancy rate below 85% is concerning.
- A significant drop in revenue compared to the number of properties/tenants is an anomaly.

Metrics:
- Total Properties: {{totalProperties}}
- Total Tenants: {{totalTenants}}
- Total Revenue (this month): {{totalRevenue}} KES
- Occupancy Rate: {{occupancyRate}}%

Generate a summary and a list of anomalies. Be specific and actionable in your anomaly descriptions. If there are no anomalies, return an empty array for the 'anomalies' field.`,
});

const dashboardInsightsFlow = ai.defineFlow(
  {
    name: 'dashboardInsightsFlow',
    inputSchema: DashboardInsightsInputSchema,
    outputSchema: DashboardInsightsOutputSchema,
  },
  withMonitoring('dashboardInsightsFlow', withErrorHandling('dashboardInsightsFlow', async input => {
    const {output} = await prompt(input);
    return output!;
  }))
);
