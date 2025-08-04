
'use server';
/**
 * @fileOverview A flow that prioritizes maintenance requests based on urgency and frequency.
 *
 * - prioritizeMaintenance - A function that takes a list of maintenance requests and returns a prioritized list.
 * - MaintenanceRequestList - The input type for the prioritizeMaintenance function.
 * - PrioritizedMaintenanceRequestList - The return type for the prioritizeMaintenance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { MaintenanceRequest } from '@/lib/types';

const MaintenanceRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  tenantName: z.string(),
  propertyId: z.string(),
  propertyAddress: z.string(),
  description: z.string(),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
  submittedDate: z.string(),
});

const MaintenanceRequestListSchema = z.object({
  requests: z.array(MaintenanceRequestSchema),
});
export type MaintenanceRequestList = z.infer<typeof MaintenanceRequestListSchema>;

const PrioritizedMaintenanceRequestSchema = MaintenanceRequestSchema.extend({
  priority: z.enum(['High', 'Medium', 'Low']).describe('The calculated priority level.'),
  reasoning: z.string().describe('The reasoning for assigning the priority.'),
});

const PrioritizedMaintenanceRequestListSchema = z.object({
  prioritizedRequests: z.array(PrioritizedMaintenanceRequestSchema),
});
export type PrioritizedMaintenanceRequestList = z.infer<typeof PrioritizedMaintenanceRequestListSchema>;


export async function prioritizeMaintenance(input: MaintenanceRequestList): Promise<PrioritizedMaintenanceRequestList> {
  console.log("Backend: prioritizeMaintenance flow received input:", input.requests.length, "requests");
  try {
    return await prioritizeMaintenanceFlow(input);
  } catch (error) {
      console.error("Backend Error: Failed to prioritize maintenance requests:", error);
      throw new Error("An error occurred during AI prioritization.");
  }
}

const prompt = ai.definePrompt({
  name: 'prioritizeMaintenancePrompt',
  input: {schema: MaintenanceRequestListSchema},
  output: {schema: PrioritizedMaintenanceRequestListSchema},
  prompt: `You are an expert maintenance coordinator for a property management company.
  Your task is to prioritize a list of maintenance requests from tenants.

  Analyze the descriptions of the requests to determine their urgency.
  Look for keywords indicating severity (e.g., "leak", "flood", "broken", "no hot water", "sparking", "smell of gas").
  Also consider the potential for property damage or tenant safety issues.
  
  Assign a priority of 'High', 'Medium', or 'Low' to each request.
  Provide a brief, clear reasoning for each assigned priority.

  Here is the list of maintenance requests:
  {{#each requests}}
  - ID: {{{id}}}, Description: "{{{description}}}" (Submitted by {{{tenantName}}} for {{{propertyAddress}}} on {{{submittedDate}}})
  {{/each}}
  `,
});

const prioritizeMaintenanceFlow = ai.defineFlow(
  {
    name: 'prioritizeMaintenanceFlow',
    inputSchema: MaintenanceRequestListSchema,
    outputSchema: PrioritizedMaintenanceRequestListSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
