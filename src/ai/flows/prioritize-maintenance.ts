
'use server';
/**
 * @fileOverview An AI agent for prioritizing maintenance requests.
 *
 * - prioritizeMaintenanceRequest - A function that analyzes a request's description for urgency.
 * - PrioritizeMaintenanceInput - The input type for the function.
 * - PrioritizeMaintenanceOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const PrioritizeMaintenanceInputSchema = z.object({
  description: z.string().describe("The tenant's description of the maintenance issue."),
});
export type PrioritizeMaintenanceInput = z.infer<typeof PrioritizeMaintenanceInputSchema>;

export const PrioritizeMaintenanceOutputSchema = z.object({
    priority: z.enum(['High', 'Medium', 'Low']).describe("The calculated priority of the request."),
    reasoning: z.string().describe("A brief, one-sentence explanation for the assigned priority."),
});
export type PrioritizeMaintenanceOutput = z.infer<typeof PrioritizeMaintenanceOutputSchema>;

export async function prioritizeMaintenanceRequest(input: PrioritizeMaintenanceInput): Promise<PrioritizeMaintenanceOutput> {
  return prioritizeMaintenanceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'prioritizeMaintenancePrompt',
  input: { schema: PrioritizeMaintenanceInputSchema },
  output: { schema: PrioritizeMaintenanceOutputSchema },
  prompt: `You are an expert property manager responsible for assessing maintenance requests. Your task is to assign a priority level (High, Medium, Low) to a request based on its description.

Consider the following for prioritization:
- **High Priority**: Issues that pose immediate safety risks, security issues, or major property damage (e.g., major leaks, no water/power, fire hazards, broken locks).
- **Medium Priority**: Issues that cause significant inconvenience but are not emergencies (e.g., clogged drains, appliance malfunctions, minor leaks).
- **Low Priority**: Cosmetic issues or minor inconveniences (e.g., dripping faucet, loose cabinet handle, peeling paint).

Analyze the following request description and assign a priority. Provide a brief justification for your choice.

Request Description:
"{{description}}"`,
});

const prioritizeMaintenanceFlow = ai.defineFlow(
  {
    name: 'prioritizeMaintenanceFlow',
    inputSchema: PrioritizeMaintenanceInputSchema,
    outputSchema: PrioritizeMaintenanceOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
