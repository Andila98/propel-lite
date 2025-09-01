
import { z } from "zod";

// UNIT
export const UnitSchema = z.object({
  id: z.string().optional(),
  unitNumber: z.string().min(1, "Unit number is required."),
  rent: z.coerce.number().positive("Rent must be a positive number."),
  size: z.string().min(3, "Please specify unit size (e.g., 2 Bedroom)."),
  isOccupied: z.boolean().default(false),
  tenantId: z.string().optional(),
  landlordId: z.string().optional(),
});

// PROPERTY
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
  imageUrl: z.string().url().optional().nullable(),
});
export type PropertyFormValues = z.infer<typeof PropertyFormSchema>;


// TENANT
export const TenantFormSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  propertyId: z.string({ required_error: "Please select a property."}).min(1, "Please select a property."),
  unitId: z.string({ required_error: "Please select a unit." }).min(1, "Please select a unit."),
  leaseStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  leaseEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
});
export type TenantFormValues = z.infer<typeof TenantFormSchema>;

export const TenantUpdateSchema = z.object({
  name: z.string().min(2, "Please enter a valid name."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().optional(),
  propertyId: z.string({ required_error: "Please select a property."}).min(1, "Please select a property."),
  currentUnitId: z.string({ required_error: "Please select a unit."}).min(1, "Please select a unit."),
  leaseStart: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  leaseEnd: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
});


// PRICE SUGGESTION
export const PriceSuggestionSchema = z.object({
  address: z.string().min(5, "Please enter a valid address."),
  squareFootage: z.coerce.number().min(100, "Must be at least 100 sqft."),
  bedrooms: z.coerce.number().min(0, "Cannot be negative.").max(10, "Cannot be more than 10."),
  bathrooms: z.coerce.number().min(1, "Must have at least 1 bathroom.").max(10, "Cannot be more than 10."),
  marketData: z.string().min(20, "Please provide some basic market data."),
  propertyDescription: z.string().optional(),
});
export type PriceSuggestionValues = z.infer<typeof PriceSuggestionSchema>;


// REMINDER
export const ScheduleReminderFormSchema = z.object({
  tenantId: z.string().min(1, "Tenant is required."),
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance']),
  scheduledFor: z.date({ required_error: "A date is required."}),
  message: z.string().min(10, "Message is required."),
});
export type ScheduleReminderFormValues = z.infer<typeof ScheduleReminderFormSchema>;
