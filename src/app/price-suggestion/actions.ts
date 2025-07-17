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

export type PriceSuggestionState = SuggestPropertyPriceOutput & {
  error?: string;
};

export async function suggestPriceAction(
  input: SuggestPropertyPriceInput,
): Promise<PriceSuggestionState> {
  const validatedFields = SuggestionFormSchema.safeParse(input);

  if (!validatedFields.success) {
    return {
      error: "Invalid form data.",
      suggestedPrice: 0,
      reasoning: "",
      overrideConsiderations: "",
    };
  }

  try {
    const result = await suggestPropertyPrice(validatedFields.data);
    return result;
  } catch (error) {
    console.error(error);
    return {
      error: "Failed to generate price suggestion.",
      suggestedPrice: 0,
      reasoning: "",
      overrideConsiderations: "",
    };
  }
}
