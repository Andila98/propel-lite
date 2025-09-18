
'use server';
/**
 * @fileOverview An AI flow to suggest a rental price for a property.
 *
 * - suggestPrice - A function that handles the price suggestion logic.
 * - PriceSuggestionInput - The input type for the function.
 * - PriceSuggestionOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { PriceSuggestionInputSchema, PriceSuggestionOutputSchema, type PriceSuggestionInput, type PriceSuggestionOutput } from '@/lib/schema-types';
import { PriceSuggestionSchema } from '@/lib/schemas';
import { withErrorHandling } from '@/lib/flow-errors';
import { withMonitoring } from '@/lib/flow-monitor';


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
  withMonitoring('suggestPriceFlow', withErrorHandling('suggestPriceFlow', async input => {
    const {output} = await prompt(input);
    // Add the currency to the output as the prompt doesn't explicitly return it.
    // A more advanced version could determine currency from the address.
    return { ...output!, currency: 'KES' };
  }))
);
