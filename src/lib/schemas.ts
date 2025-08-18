
import { z } from "zod";

export const UnitSchema = z.object({
  id: z.string().optional(),
  unitNumber: z.string().min(1, "Unit number is required."),
  rent: z.coerce.number().positive("Rent must be a positive number."),
  size: z.string().min(3, "Please specify unit size (e.g., 2 Bedroom)."),
  isOccupied: z.boolean().default(false),
  tenantId: z.string().optional(),
  propertyId: z.string().optional(),
  landlordId: z.string().optional(),
});


export const PropertyFormSchema = z.object({
  name: z.string().min(3, "Please enter a property name (min 3 characters)."),
  address: z.string().min(5, "Please enter a valid address."),
  type: z.enum(["Apartment", "House", "Bedsitter"], {
    required_error: "Please select a property type.",
  }),
  description: z.string().min(10, "Please provide a brief description (min 10 characters)."),
  currency: z.string().optional().default("KES"),
  units: z.array(UnitSchema).min(1, "At least one unit is required."),
  numberOfUnits: z.coerce.number().optional(),
});

export type PropertyFormValues = z.infer<typeof PropertyFormSchema>;
