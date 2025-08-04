
"use server";
import { suggestPropertyPrice, type SuggestPropertyPriceInput, type SuggestPropertyPriceOutput } from "@/ai/flows/suggest-property-price";
import { z } from "zod";

const SuggestionFormSchema = z.object({
  address: z.string(),
  squareFootage: z.number(),
  bedrooms: z.number(),
  bathrooms: z.number(),
  marketData: z.string(),
  propertyDescription: z.string().optional(),
});

export type PriceSuggestionState = {
  error?: string;
  suggestion?: SuggestPropertyPriceOutput;
};

export async function suggestPriceAction(
  input: SuggestPropertyPriceInput,
): Promise<PriceSuggestionState> {
  console.log("Backend: suggestPriceAction server action received input:", input);

  const validatedFields = SuggestionFormSchema.safeParse(input);

  if (!validatedFields.success) {
    const errorMessage = "Invalid form data.";
    console.error(`Backend Error: ${errorMessage}`, validatedFields.error.flatten().fieldErrors);
    return {
      error: errorMessage,
    };
  }

  try {
    const result = await suggestPropertyPrice(validatedFields.data);
    console.log("Backend: AI suggestion result:", result);
    return { suggestion: result };
  } catch (error: any) {
    const errorMessage = "Failed to generate price suggestion.";
    console.error(`Backend Error: ${errorMessage}`, error);
    return {
      error: `${errorMessage}: ${error.message}`,
    };
  }
}
