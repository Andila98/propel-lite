
import { z } from "zod";

export const UnitSchema = z.object({
  unitType: z.enum(["one-bedroom", "two-bedroom", "three-bedroom", "bedsitter", "studio"], {
    required_error: "Please select a unit type.",
  }),
  rent: z.coerce.number().min(100, "Rent must be at least 100 Ksh."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  isAvailable: z.boolean().default(true),
});

export const PropertyFormSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
  propertyType: z.enum(["apartment", "house", "bedsitter"], {
    required_error: "Please select a property type.",
  }),
  description: z.string().min(10, "Please provide a brief description (min 10 characters)."),
  numberOfUnits: z.coerce.number().optional(),
  units: z.array(UnitSchema).min(1, "Please add at least one unit."),
  landlordId: z.string().optional(), // Should be set on the server
});
export type PropertyFormValues = z.infer<typeof PropertyFormSchema>;
