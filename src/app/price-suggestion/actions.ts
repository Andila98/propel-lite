
"use server";

import { suggestPrice } from "@/ai/flows/suggest-price-flow";
import { PriceSuggestionSchema, type PriceSuggestionValues } from '@/lib/schemas';

export type PriceSuggestionState = {
  error?: string;
  suggestion?: any;
};

export async function suggestPriceAction(
  input: PriceSuggestionValues,
): Promise<PriceSuggestionState> {
  console.log("Backend: suggestPriceAction server action received input:", input);

  const validationResult = PriceSuggestionSchema.safeParse(input);
  if (!validationResult.success) {
      return { 
          error: "Invalid input data. Please check the form for errors.",
       };
  }

  try {
    const suggestion = await suggestPrice(validationResult.data);
    return { suggestion };
  } catch (error: any) {
    console.error("Error calling suggestPrice flow:", error);
    return { error: error.message || 'An unexpected error occurred.' };
  }
}
