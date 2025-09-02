
import { z } from "zod";

// Enhanced validation helpers
const phoneRegex = /^(\+254|0)[17]\d{8}$/; // Kenyan phone numbers
const currencyAmountSchema = z.coerce
  .number()
  .positive("Amount must be positive")
  .max(10000000, "Amount is too large") // 10M KES max
  .refine((val) => Number.isFinite(val), "Invalid amount");

// UNIT Schema with enhanced validation
export const UnitSchema = z.object({
  id: z.string().optional(),
  unitNumber: z
    .string()
    .min(1, "Unit number is required")
    .max(20, "Unit number too long")
    .regex(/^[A-Za-z0-9-]+$/, "Unit number can only contain letters, numbers, and hyphens"),
  rent: currencyAmountSchema.refine(
    (val) => val >= 1000, // Minimum 1,000 KES
    "Rent must be at least 1,000 KES"
  ),
  size: z
    .string()
    .min(3, "Please specify unit size")
    .max(50, "Size description too long")
    .refine(
      (val) => /\d+\s*(bedroom|bed|br|studio)/i.test(val),
      "Size should include bedroom count or 'studio'"
    ),
  isOccupied: z.boolean().default(false),
  tenantId: z.string().optional(),
  landlordId: z.string().optional(),
  // Additional useful fields
  deposit: currencyAmountSchema.optional(),
  squareFootage: z.coerce.number().positive().optional(),
  amenities: z.array(z.string()).optional(),
  availableFrom: z.date().optional(),
  lastRenovated: z.date().optional(),
});

export type Unit = z.infer<typeof UnitSchema>;

// PROPERTY Schema with comprehensive validation
export const PropertyFormSchema = z.object({
  name: z
    .string()
    .min(3, "Property name must be at least 3 characters")
    .max(100, "Property name too long")
    .regex(/^[A-Za-z0-9\s\-'.,]+$/, "Property name contains invalid characters"),
  address: z
    .string()
    .min(10, "Please enter a complete address")
    .max(200, "Address too long")
    .refine(
      (val) => val.split(',').length >= 2,
      "Address should include area/city (use commas to separate)"
    ),
  type: z.enum(["Apartment", "House", "Bedsitter", "Commercial", "Office"], {
    required_error: "Please select a property type",
  }),
  description: z
    .string()
    .min(20, "Please provide a detailed description (min 20 characters)")
    .max(1000, "Description too long"),
  currency: z.enum(["KES", "USD", "EUR"]).default("KES"),
  units: z
    .array(UnitSchema)
    .min(1, "At least one unit is required")
    .max(500, "Too many units for a single property")
    .refine(
      (units) => {
        const unitNumbers = units.map(u => u.unitNumber.toLowerCase());
        return new Set(unitNumbers).size === unitNumbers.length;
      },
      "Unit numbers must be unique"
    ),
  numberOfUnits: z.coerce.number().optional(),
  imageUrl: z
    .string()
    .url("Invalid image URL")
    .optional()
    .nullable()
    .refine(
      (url) => !url || /\.(jpg|jpeg|png|webp)$/i.test(url),
      "Image must be JPG, PNG, or WebP format"
    ),
  // Additional property fields
  yearBuilt: z.coerce
    .number()
    .min(1800, "Invalid year")
    .max(new Date().getFullYear(), "Year cannot be in the future")
    .optional(),
  parking: z.boolean().default(false),
  furnished: z.boolean().default(false),
  petsAllowed: z.boolean().default(false),
  utilities: z.array(z.enum(["Water", "Electricity", "Gas", "Internet", "Garbage"])).optional(),
})
.refine(
  (data) => !data.numberOfUnits || data.numberOfUnits === data.units.length,
  {
    message: "Number of units must match the actual units provided",
    path: ["numberOfUnits"]
  }
);

export type PropertyFormValues = z.infer<typeof PropertyFormSchema>;

// TENANT Schema with enhanced validation
export const TenantFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .regex(/^[A-Za-z\s\-']+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email too long")
    .toLowerCase(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val),
      "Please enter a valid Kenyan phone number (e.g., +254712345678 or 0712345678)"
    ),
  propertyId: z
    .string({ required_error: "Please select a property" })
    .min(1, "Please select a property"),
  unitId: z
    .string({ required_error: "Please select a unit" })
    .min(1, "Please select a unit"),
  leaseStart: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid start date")
    .refine(
      (val) => new Date(val) >= new Date(new Date().toDateString()), // Compare date part only
      "Lease start date cannot be in the past"
    ),
  leaseEnd: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
  // Additional tenant fields
  emergencyContact: z.object({
    name: z.string().min(2, "Emergency contact name required").optional(),
    phone: z.string().optional(),
    relationship: z.string().optional(),
  }).optional(),
  monthlyRent: currencyAmountSchema.optional(),
  deposit: currencyAmountSchema.optional(),
  idNumber: z.string().optional(),
})
.refine(
  (data) => new Date(data.leaseEnd) > new Date(data.leaseStart),
  {
    message: "Lease end date must be after start date",
    path: ["leaseEnd"]
  }
)
.refine(
  (data) => {
    const start = new Date(data.leaseStart);
    const end = new Date(data.leaseEnd);
    const monthsDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsDiff >= 1; // Minimum 1 month lease
  },
  {
    message: "Lease must be at least 1 month long",
    path: ["leaseEnd"]
  }
);

export type TenantFormValues = z.infer<typeof TenantFormSchema>;

// Tenant Update Schema
export const TenantUpdateSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name too long")
    .regex(/^[A-Za-z\s\-']+$/, "Invalid characters in name"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(254, "Email too long")
    .toLowerCase(),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val),
      "Please enter a valid Kenyan phone number"
    ),
  propertyId: z
    .string({ required_error: "Please select a property" })
    .min(1, "Please select a property"),
  currentUnitId: z
    .string({ required_error: "Please select a unit" })
    .min(1, "Please select a unit"),
  leaseStart: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid start date"),
  leaseEnd: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Invalid end date"),
  monthlyRent: currencyAmountSchema.optional(),
  deposit: currencyAmountSchema.optional(),
})
.refine(
  (data) => new Date(data.leaseEnd) > new Date(data.leaseStart),
  {
    message: "Lease end date must be after start date",
    path: ["leaseEnd"]
  }
);

export type TenantUpdateValues = z.infer<typeof TenantUpdateSchema>;

// PRICE SUGGESTION Schema with market data validation
export const PriceSuggestionSchema = z.object({
  address: z
    .string()
    .min(10, "Please enter a complete address")
    .max(200, "Address too long"),
  squareFootage: z.coerce
    .number()
    .min(100, "Minimum 100 square feet")
    .max(50000, "Maximum 50,000 square feet"),
  bedrooms: z.coerce
    .number()
    .min(0, "Cannot be negative")
    .max(20, "Cannot be more than 20 bedrooms"),
  bathrooms: z.coerce
    .number()
    .min(0.5, "Must have at least 0.5 bathrooms")
    .max(20, "Cannot be more than 20 bathrooms"),
  marketData: z
    .string()
    .min(50, "Please provide detailed market information")
    .max(2000, "Market data too long"),
  propertyDescription: z
    .string()
    .max(1000, "Description too long")
    .optional(),
  // Additional market factors
  propertyAge: z.coerce.number().min(0).max(200).optional(),
  hasParking: z.boolean().optional(),
  furnished: z.boolean().optional(),
  nearbyAmenities: z.array(z.string()).optional(),
  transportAccess: z.enum(["Excellent", "Good", "Fair", "Poor"]).optional(),
});

export type PriceSuggestionValues = z.infer<typeof PriceSuggestionSchema>;

// REMINDER Schema with enhanced validation
export const ScheduleReminderFormSchema = z.object({
  tenantId: z.string().min(1, "Please select a tenant"),
  reminderType: z.enum(['rentDue', 'leaseRenewal', 'maintenance', 'inspection', 'custom'], {
    required_error: "Please select a reminder type"
  }),
  scheduledFor: z
    .date({ required_error: "Please select a date" })
    .refine(
      (date) => date > new Date(),
      "Reminder date must be in the future"
    ),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(500, "Message too long"),
  // Additional reminder fields
  isRecurring: z.boolean().default(false),
  recurringInterval: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  sendEmail: z.boolean().default(true),
  sendSMS: z.boolean().default(false),
})
.refine(
  (data) => !data.isRecurring || data.recurringInterval,
  {
    message: "Recurring interval is required for recurring reminders",
    path: ["recurringInterval"]
  }
);

export type ScheduleReminderFormValues = z.infer<typeof ScheduleReminderFormSchema>;

// PAYMENT Schema for tracking rent payments
export const PaymentSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().min(1, "Tenant ID required"),
  propertyId: z.string().min(1, "Property ID required"),
  unitId: z.string().min(1, "Unit ID required"),
  amount: currencyAmountSchema,
  paymentDate: z.date(),
  paymentMethod: z.enum(['Cash', 'Bank Transfer', 'Mobile Money', 'Cheque', 'Online']),
  reference: z.string().optional(),
  status: z.enum(['Paid', 'Pending', 'Overdue', 'Partial']).default('Paid'),
  notes: z.string().max(500).optional(),
});

export type Payment = z.infer<typeof PaymentSchema>;

// MAINTENANCE REQUEST Schema
export const MaintenanceRequestSchema = z.object({
  id: z.string().optional(),
  tenantId: z.string().min(1, "Tenant ID required"),
  propertyId: z.string().min(1, "Property ID required"),
  unitId: z.string().min(1, "Unit ID required"),
  title: z.string().min(5, "Please provide a clear title").max(100),
  description: z.string().min(20, "Please provide detailed description").max(1000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.enum([
    'Plumbing', 'Electrical', 'HVAC', 'Appliances', 
    'Doors/Windows', 'Flooring', 'Painting', 'Other'
  ]),
  status: z.enum(['Open', 'In Progress', 'Completed', 'Cancelled']).default('Open'),
  estimatedCost: currencyAmountSchema.optional(),
  actualCost: currencyAmountSchema.optional(),
  requestDate: z.date().default(() => new Date()),
  completedDate: z.date().optional(),
});

export type MaintenanceRequest = z.infer<typeof MaintenanceRequestSchema>;

// Validation helper functions
export const validateKenyanPhoneNumber = (phone: string): boolean => {
  return phoneRegex.test(phone);
};

export const validateRentAmount = (amount: number, currency: string = 'KES'): boolean => {
  if (currency === 'KES') {
    return amount >= 1000 && amount <= 10000000; // 1K to 10M KES
  }
  if (currency === 'USD') {
    return amount >= 10 && amount <= 100000; // $10 to $100K
  }
  return amount > 0;
};

export const validateLeaseDate = (startDate: string, endDate: string): boolean => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date(new Date().toDateString()); // Today at midnight
  
  return start >= now && end > start && 
         (end.getTime() - start.getTime()) >= (30 * 24 * 60 * 60 * 1000); // At least 30 days
};
