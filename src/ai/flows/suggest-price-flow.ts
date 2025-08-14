
'use server';
/**
 * @fileOverview A price suggestion AI agent.
 *
 * - suggestPrice - A function that handles the price suggestion process.
 * - SuggestPriceInput - The input type for the suggestPrice function.
 * - SuggestPriceOutput - The return type for the suggestPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { propertyService } from '@/services/property-service';


export const SuggestionFormSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  bedrooms: z.coerce.number().min(0, "Cannot be negative.").max(10, "Cannot be more than 10."),
  bathrooms: z.coerce.number().min(1, "Must have at least 1 bathroom.").max(10, "Cannot be more than 10."),
  marketData: z.string().min(20, "Please provide some basic market data."),
  propertyDescription: z.string().optional(),
});
export type SuggestPriceInput = z.infer<typeof SuggestionFormSchema>;


export const SuggestPriceOutputSchema = z.object({
  suggestedPrice: z.number().describe('The suggested monthly rent price.'),
  reasoning: z.string().describe('The reasoning behind the suggested price.'),
  overrideConsiderations: z.string().describe('Factors that might justify overriding the suggestion.'),
  currency: z.string().describe('The currency code for the suggested price (e.g., KES, USD).'),
});

export type SuggestPriceOutput = z.infer<typeof SuggestPriceOutputSchema>;

export async function suggestPrice(input: SuggestPriceInput): Promise<SuggestPriceOutput> {
  return suggestPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestPricePrompt',
  input: {schema: SuggestionFormSchema},
  output: {schema: SuggestPriceOutputSchema},
  prompt: `You are a rental property pricing expert in Kenya. Your goal is to suggest a fair market rent price based on the provided data.

Analyze the following property details and market data to generate a price suggestion. The currency should be in KES (Kenyan Shillings).

Property Details:
- Address: {{{address}}}
- Square Footage: {{{squareFootage}}} sqft
- Bedrooms: {{{bedrooms}}}
- Bathrooms: {{{bathrooms}}}
{{#if propertyDescription}}
- Description: {{{propertyDescription}}}
{{/if}}

Market Data:
{{{marketData}}}

Provide a suggested monthly rent, your reasoning for the price, and considerations for overriding the suggestion (e.g., "If the unit has luxury finishes, you could increase the price by 10%").`,
});

const suggestPriceFlow = ai.defineFlow(
  {
    name: 'suggestPriceFlow',
    inputSchema: SuggestionFormSchema,
    outputSchema: SuggestPriceOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
