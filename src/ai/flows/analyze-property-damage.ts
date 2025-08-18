
'use server';
/**
 * @fileOverview An AI agent for analyzing property damage from images.
 *
 * - analyzePropertyDamage - A function that analyzes a photo for property damage.
 * - AnalyzeDamageInput - The input type for the function.
 * - AnalyzeDamageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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
  damageSummary: z.string().describe("A one-sentence summary of the findings."),
  detectedIssues: z.array(z.object({
    issueType: z.string().describe("The type of damage (e.g., 'Crack', 'Water Stain', 'Scuff Mark')."),
    description: z.string().describe("A brief description of the specific issue found."),
    severity: z.enum(['Low', 'Medium', 'High']).describe("The estimated severity of the damage."),
  })).describe("A list of specific issues detected in the image."),
});
export type AnalyzeDamageOutput = z.infer<typeof AnalyzeDamageOutputSchema>;


const prompt = ai.definePrompt({
  name: 'analyzePropertyDamagePrompt',
  input: { schema: AnalyzeDamageInputSchema },
  output: { schema: AnalyzeDamageOutputSchema },
  prompt: `You are an expert property inspector. Your task is to analyze the provided image for any signs of damage or significant wear and tear.

Look for issues such as:
- Cracks in walls or ceilings
- Water stains or signs of leaks
- Mold or mildew
- Scuff marks or holes in walls
- Damaged flooring (e.g., broken tiles, stained carpet)
- Broken fixtures (e.g., light fixtures, faucets)
- Peeling paint

Analyze the following image and provide your assessment. If no damage is found, state that clearly.

Photo: {{media url=photoDataUri}}`,
});

const analyzePropertyDamageFlow = ai.defineFlow(
  {
    name: 'analyzePropertyDamageFlow',
    inputSchema: AnalyzeDamageInputSchema,
    outputSchema: AnalyzeDamageOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);


export async function analyzePropertyDamage(input: AnalyzeDamageInput): Promise<AnalyzeDamageOutput> {
    return analyzePropertyDamageFlow(input);
}
