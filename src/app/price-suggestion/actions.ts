
"use server";

import { suggestPrice } from "@/ai/flows/suggest-price-flow";
import { z } from "zod";

export const SuggestionFormSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  bedrooms: z.coerce.number().min(0, "Cannot be negative.").max(10, "Cannot be more than 10."),
  bathrooms: z.coerce.number().min(1, "Must have at least 1 bathroom.").max(10, "Cannot be more than 10."),
  marketData: z.string().min(20, "Please provide some basic market data."),
  propertyDescription: z.string().optional(),
});
export type SuggestionFormValues = z.infer<typeof SuggestionFormSchema>;


export type PriceSuggestionState = {
  error?: string;
  suggestion?: any;
};

export async function suggestPriceAction(
  input: SuggestionFormValues,
): Promise<PriceSuggestionState> {
  console.log("Backend: suggestPriceAction server action received input:", input);
  try {
    const suggestion = await suggestPrice(input);
    return { suggestion };
  } catch (error: any) {
    console.error("Error calling suggestPrice flow:", error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
