
'use server';
/**
 * @fileOverview An AI agent for detecting suspicious activity in audit logs.
 *
 * - detectAnomalies - A function that analyzes a list of activities for security risks.
 * - DetectAnomaliesInput - The input type for the function.
 * - DetectAnomaliesOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { ActivityItem } from '@/lib/types';

export const DetectAnomaliesInputSchema = z.object({
  activities: z.array(z.object({
    id: z.string(),
    description: z.string().describe("A description of the action that occurred."),
    timestamp: z.string().describe("The ISO 8601 timestamp of when the action occurred."),
  })).describe("A list of recent activities from the audit log."),
});
export type DetectAnomaliesInput = z.infer<typeof DetectAnomaliesInputSchema>;

export const DetectAnomaliesOutputSchema = z.object({
    anomalies: z.array(z.object({
        id: z.string().describe("The ID of the original activity that is flagged as an anomaly."),
        isAnomaly: z.boolean().describe("Whether this activity is considered a security anomaly."),
        reason: z.string().optional().describe("A brief, one-sentence explanation of why it's considered an anomaly."),
    })).describe("A list of analysis results for each activity."),
});
export type DetectAnomaliesOutput = z.infer<typeof DetectAnomaliesOutputSchema>;


const prompt = ai.definePrompt({
  name: 'detectAnomaliesPrompt',
  input: { schema: DetectAnomaliesInputSchema },
  output: { schema: DetectAnomaliesOutputSchema },
  prompt: `You are a security expert for a property management platform. Your task is to analyze a list of recent activities from the audit log and identify any that are suspicious or might indicate a security risk.

Consider the following as potentially anomalous:
- Deleting multiple high-value items (properties, tenants) in a short period.
- Major, unusual changes to financial settings.
- Escalating one's own permissions.
- Activity at unusual times (e.g., 3 AM).

For each activity provided, determine if it is an anomaly. If it is, provide a brief reason.

Activities to analyze:
{{#each activities}}
- ID: {{id}}, Action: "{{description}}", Time: {{timestamp}}
{{/each}}`,
});

const detectAnomaliesFlow = ai.defineFlow(
  {
    name: 'detectAnomaliesFlow',
    inputSchema: DetectAnomaliesInputSchema,
    outputSchema: DetectAnomaliesOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function detectAnomalies(input: DetectAnomaliesInput): Promise<DetectAnomaliesOutput> {
    return detectAnomaliesFlow(input);
}
