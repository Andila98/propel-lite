
'use server';
/**
 * @fileOverview An AI flow to analyze an image of a property for potential damage.
 *
 * - analyzeDamage - A function that handles the damage analysis process.
 * - AnalyzeDamageInput - The input type for the analyzeDamage function.
 * - AnalyzeDamageOutput - The return type for the analyzeDamage function.
 */

import {ai} from '@/ai/genkit';
import { AnalyzeDamageInputSchema, AnalyzeDamageOutputSchema, type AnalyzeDamageInput, type AnalyzeDamageDetections } from '@/lib/schema-types';


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
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);

export async function analyzeDamage(input: AnalyzeDamageInput): Promise<AnalyzeDamageDetections> {
  return analyzeDamageFlow(input);
}
