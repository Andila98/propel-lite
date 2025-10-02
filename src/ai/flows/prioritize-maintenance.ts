
'use server';
/**
 * @fileOverview An AI flow to prioritize a maintenance request based on its description.
 *
 * - prioritizeMaintenanceRequest - A function that handles the prioritization logic.
 * - PrioritizeMaintenanceInput - The input type for the function.
 * - PrioritizeMaintenanceOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import { 
    PrioritizeMaintenanceInputSchema,
    PrioritizeMaintenanceOutputSchema,
    type PrioritizeMaintenanceInput,
    type PrioritizeMaintenanceOutput
} from '@/lib/schema-types';

const prioritizeMaintenanceFlow = ai.defineFlow(
  {
    name: 'prioritizeMaintenanceFlow',
    inputSchema: PrioritizeMaintenanceInputSchema,
    outputSchema: PrioritizeMaintenanceOutputSchema,
  },
  async (input: PrioritizeMaintenanceInput) => {
    const prompt = ai.definePrompt({
        name: 'prioritizeMaintenancePrompt',
        input: {schema: PrioritizeMaintenanceInputSchema},
        output: {schema: PrioritizeMaintenanceOutputSchema},
        prompt: `You are an expert property manager responsible for prioritizing maintenance tasks. Analyze the following maintenance request and assign a priority level (High, Medium, or Low).

      Consider the following criteria:
      - High Priority: Issues that pose a safety risk (e.g., electrical problems, major leaks, no heat in winter, security issues like broken locks).
      - Medium Priority: Issues that cause significant inconvenience but are not immediate safety risks (e.g., broken appliance, minor leak, running toilet).
      - Low Priority: Cosmetic issues or minor inconveniences (e.g., dripping faucet, loose cabinet handle, scuff marks on a wall).

      Request Description:
      "{{description}}"

      Provide a priority level and a concise, one-sentence reasoning for your decision.`,
    });
    const {output} = await prompt(input);
    return output!;
  }
);

export async function prioritizeMaintenanceRequest(input: PrioritizeMaintenanceInput): Promise<PrioritizeMaintenanceOutput> {
    return prioritizeMaintenanceFlow(input);
}
