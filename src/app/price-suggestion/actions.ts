
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
  console.log("Backend: suggestPriceAction server action received input:", input);

  const validatedFields = SuggestionFormSchema.safeParse(input);

  if (!validatedFields.success) {
    console.error("Backend: Invalid form data.", validatedFields.error.flatten().fieldErrors);
    return {
      error: "Invalid form data.",
      suggestedPrice: 0,
      reasoning: "",
      overrideConsiderations: "",
    };
  }

  try {
    const result = await suggestPropertyPrice(validatedFields.data);
    console.log("Backend: AI suggestion result:", result);
    return result;
  } catch (error) {
    console.error("Backend: Failed to generate price suggestion.", error);
    return {
      error: "Failed to generate price suggestion.",
      suggestedPrice: 0,
      reasoning: "",
      overrideConsiderations: "",
    };
  }
}

    