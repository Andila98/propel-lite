
'use server';

import { suggestPrice } from "@/ai/flows/suggest-price-flow";
import { PriceSuggestionSchema, type PriceSuggestionValues } from '@/lib/schemas';
import type { PriceSuggestionOutput } from '@/lib/schema-types';

export type PriceSuggestionState = {
  error?: string;
  suggestion?: PriceSuggestionOutput;
};

export async function suggestPriceAction(
  input: PriceSuggestionValues,
): Promise<PriceSuggestionState> {
  const validationResult = PriceSuggestionSchema.safeParse(input);
  if (!validationResult.success) {
      return { 
          error: "Invalid input data. Please check the form for errors.",
       };
  }

  try {
    const suggestion = await suggestPrice(validationResult.data);
    return { suggestion };
  } catch (error: unknown) {
    const typedError = error as Error;
    console.error("[ERROR: suggestPriceAction]", typedError);
    return { error: typedError.message || 'An unexpected error occurred.' };
  }
}
