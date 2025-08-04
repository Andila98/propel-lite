
import { z } from "zod";

export const UnitSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required."),
  unitType: z.enum(["one-bedroom", "two-bedroom", "three-bedroom", "bedsitter", "studio"], {
    required_error: "Please select a unit type.",
  }),
  rent: z.coerce.number().positive("Rent must be a positive number."),
  squareFootage: z.coerce.number().positive("Square footage must be a positive number."),
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
}).refine(data => {
    if (data.propertyType === 'apartment' && (!data.numberOfUnits || data.numberOfUnits < 1)) {
        return false;
    }
    return true;
}, {
    message: "Number of units is required for apartments.",
    path: ["numberOfUnits"],
});
export type PropertyFormValues = z.infer<typeof PropertyFormSchema>;
