
// src/ai/flows/suggest-property-price.ts
'use server';

/**
 * @fileOverview AI flow to suggest a reasonable rental price for a property.
 *
 * - suggestPropertyPrice - A function that handles the property price suggestion process.
 * - SuggestPropertyPriceInput - The input type for the suggestPropertyPrice function.
 * - SuggestPropertyPriceOutput - The return type for the suggestPropertyPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestPropertyPriceInputSchema = z.object({
  address: z.string().describe('The address of the property.'),
  squareFootage: z.number().describe('The square footage of the property.'),
  bedrooms: z.number().describe('The number of bedrooms in the property.'),
  bathrooms: z.number().describe('The number of bathrooms in the property.'),
  marketData: z
    .string()
    .describe(
      'Basic market data for comparable properties in the area. Include average rental prices per square foot, number of listings, etc.'
    ),
  propertyDescription: z
    .string()
    .optional()
    .describe('A short description of the property, including any unique features.'),
});
export type SuggestPropertyPriceInput = z.infer<typeof SuggestPropertyPriceInputSchema>;

const SuggestPropertyPriceOutputSchema = z.object({
  suggestedPrice: z.number().describe('The suggested rental price for the property.'),
  reasoning: z.string().describe('The AI’s reasoning for the suggested price.'),
  overrideConsiderations: z
    .string()
    .describe(
      'Factors that might warrant overriding the suggested price (e.g., exceptional views, recent renovations).'
    ),
    currency: z.string().describe("The currency for the suggested price (e.g., 'USD', 'KES', 'EUR')."),
});
export type SuggestPropertyPriceOutput = z.infer<typeof SuggestPropertyPriceOutputSchema>;

export async function suggestPropertyPrice(
  input: SuggestPropertyPriceInput
): Promise<SuggestPropertyPriceOutput> {
  console.log("Backend: suggestPropertyPrice flow received input:", input);
  return suggestPropertyPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPropertyPricePrompt',
  input: {schema: SuggestPropertyPriceInputSchema},
  output: {schema: SuggestPropertyPriceOutputSchema},
  prompt: `You are an expert real estate analyst specializing in rental pricing.

  Based on the following property features and market data, suggest a reasonable rental price. Provide clear reasoning for your suggestion and highlight factors that might warrant overriding the AI's suggestion, offering conservative recommendations.

  Property Address: {{{address}}}
  Square Footage: {{{squareFootage}}} sq ft
  Bedrooms: {{{bedrooms}}}
  Bathrooms: {{{bathrooms}}}
  Property Description: {{{propertyDescription}}}
  Market Data: {{{marketData}}}

  The local currency is Kenyan Shillings (KES). All price suggestions should be in KES.
  
  Output the suggested price, reasoning, override considerations, and currency in a structured format.
  `,
});

const suggestPropertyPriceFlow = ai.defineFlow(
  {
    name: 'suggestPropertyPriceFlow',
    inputSchema: SuggestPropertyPriceInputSchema,
    outputSchema: SuggestPropertyPriceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
