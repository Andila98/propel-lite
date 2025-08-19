'use server';
/**
 * @fileOverview An AI flow to analyze an image of a property for potential damage.
 *
 * - analyzeDamage - A function that handles the damage analysis process.
 * - AnalyzeDamageInput - The input type for the analyzeDamage function.
 * - AnalyzeDamageOutput - The return type for the analyzeDamage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const AnalyzeDamageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a property (interior or exterior), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDamageInput = z.infer<typeof AnalyzeDamageInputSchema>;

export const AnalyzeDamageOutputSchema = z.object({
  hasDamage: z.boolean().describe('Whether or not any damage was detected in the image.'),
  damageSummary: z.string().describe("A 1-2 sentence summary of the findings."),
  detectedIssues: z.array(z.object({
      issueType: z.string().describe('The type of damage detected (e.g., Water Stain, Crack, Scuff Mark, Hole).'),
      description: z.string().describe("A brief description of the specific issue and its location in the image."),
      severity: z.enum(['Low', 'Medium', 'High']).describe('The estimated severity of the damage.'),
  })).describe('A list of specific issues detected in the image.'),
});
export type AnalyzeDamageOutput = z.infer<typeof AnalyzeDamageOutputSchema>;


export async function analyzeDamage(input: AnalyzeDamageInput): Promise<AnalyzeDamageOutput> {
  return analyzeDamageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDamagePrompt',
  input: {schema: AnalyzeDamageInputSchema},
  output: {schema: AnalyzeDamageOutputSchema},
  prompt: `You are an expert property inspector. Your task is to analyze the provided image for any signs of damage, such as cracks, stains, holes, mold, or significant wear and tear. 

Based on your analysis, identify each issue, describe it, and assign a severity level. If no damage is found, state that clearly.

Image to analyze: {{media url=photoDataUri}}`,
});

const analyzeDamageFlow = ai.defineFlow(
  {
    name: 'analyzeDamageFlow',
    inputSchema: AnalyzeDamageInputSchema,
    outputSchema: AnalyzeDamageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
