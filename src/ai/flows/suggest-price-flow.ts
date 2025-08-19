
'use server';
/**
 * @fileOverview An AI flow to suggest a rental price for a property.
 *
 * - suggestPrice - A function that handles the price suggestion logic.
 * - PriceSuggestionInput - The input type for the function.
 * - PriceSuggestionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { PriceSuggestionSchema } from '@/lib/schemas';

export type PriceSuggestionInput = z.infer<typeof PriceSuggestionSchema>;

export const PriceSuggestionOutputSchema = z.object({
  suggestedPrice: z.number().describe("The suggested monthly rental price as a number."),
  currency: z.string().describe("The currency for the suggested price (e.g., KES, USD). Default to KES if not obvious."),
  reasoning: z.string().describe("A detailed, 2-3 sentence explanation for how the price was determined, citing the provided market data and property features."),
  overrideConsiderations: z.string().describe("A 1-2 sentence suggestion of factors that could justify a price higher or lower than the suggestion (e.g., premium finishes, recent renovations, or lack thereof)."),
});
export type PriceSuggestionOutput = z.infer<typeof PriceSuggestionOutputSchema>;


export async function suggestPrice(input: PriceSuggestionInput): Promise<PriceSuggestionOutput> {
  return suggestPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPricePrompt',
  input: {schema: PriceSuggestionSchema},
  output: {schema: PriceSuggestionOutputSchema},
  prompt: `You are a real estate market analyst specializing in rental properties in Kenya. Your task is to suggest a monthly rental price for a property based on the details provided.

Analyze the following information:
- Property Address: {{address}}
- Square Footage: {{squareFootage}} sqft
- Bedrooms: {{bedrooms}}
- Bathrooms: {{bathrooms}}
- Property Description: {{propertyDescription}}
- Provided Market Data / Comps: "{{marketData}}"

Based on this, provide a suggested monthly rent in KES. Your reasoning should directly reference the provided market data and the property's features (size, number of rooms) to justify your price. Also, provide a brief suggestion on what factors could lead a landlord to price the property slightly higher or lower.`,
});

const suggestPriceFlow = ai.defineFlow(
  {
    name: 'suggestPriceFlow',
    inputSchema: PriceSuggestionSchema,
    outputSchema: PriceSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    // Add the currency to the output as the prompt doesn't explicitly return it.
    // A more advanced version could determine currency from the address.
    return { ...output!, currency: 'KES' };
  }
);
