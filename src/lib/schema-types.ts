/**
 * @fileoverview Centralized Zod schemas and TypeScript types for the application.
 * This helps avoid "use server" directive conflicts by separating data structures
 * from server-side logic.
 */
import { z } from 'zod';

// AI Flow Schemas

// src/ai/flows/analyze-damage-flow.ts
export const AnalyzeDamageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a property (interior or exterior), as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDamageInput = z.infer<typeof AnalyzeDamageInputSchema>;

export const AnalyzeDamageOutputSchema = z.object({
  hasDamage: z.boolean().describe('Whether or not any damage was detected in the image.'),
  damageSummary: z.string().describe("A 1-2 sentence summary of the findings."),
  detectedIssues: z.array(z.object({
      issueType: z.string().describe('The type of damage detected (e.g., Water Stain, Crack, Scuff Mark, Hole).'),
      description: z.string().describe("A brief description of the specific issue and its location in the image."),
      severity: z.enum(['Low', 'Medium', 'High']).describe('The estimated severity of the damage.'),
  })).describe('A list of specific issues detected in the image.'),
});
export type AnalyzeDamageDetections = z.infer<typeof AnalyzeDamageOutputSchema>;


// src/ai/flows/dashboard-insights.ts
export const DashboardInsightsInputSchema = z.object({
  totalRevenue: z.number(),
  occupancyRate: z.number(),
  totalProperties: z.number(),
  totalTenants: z.number(),
});
export type DashboardInsightsInput = z.infer<typeof DashboardInsightsInputSchema>;

export const DashboardInsightsOutputSchema = z.object({
  summary: z.string().describe("A 1-2 sentence executive summary of the portfolio's current state."),
  anomalies: z.array(z.string()).describe("A list of 1-3 potential issues or anomalies detected from the data, such as high vacancy rates or sudden income drops. If none, return an empty array."),
});
export type DashboardInsightsOutput = z.infer<typeof DashboardInsightsOutputSchema>;

// src/ai/flows/generate-invoice-flow.ts
export const GenerateInvoiceInputSchema = z.object({
  tenantId: z.string().describe("The ID of the tenant for whom to generate an invoice."),
});
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInputSchema>;

const InvoiceItemSchema = z.object({
    description: z.string().describe('Description of the invoice line item (e.g., "Monthly Rent").'),
    amount: z.number().describe('The cost of the line item.'),
});

export const GenerateInvoiceOutputSchema = z.object({
  invoiceNumber: z.string().describe("A unique invoice number, e.g., 'INV-2024-00123'."),
  invoiceDate: z.string().describe("The date the invoice was generated, in ISO 8601 format."),
  dueDate: z.string().describe("The date the payment is due, in ISO 8601 format."),
  tenantName: z.string().describe("The full name of the tenant."),
  propertyAddress: z.string().describe("The full address of the property."),
  items: z.array(InvoiceItemSchema).describe("An array of line items for the invoice."),
  totalAmount: z.number().describe("The total amount due."),
  currency: z.string().describe("The currency of the payment (e.g., KES, USD)."),
  notes: z.string().describe("A brief, courteous note for the tenant, e.g., 'Thank you for your timely payment.'"),
});
export type GenerateInvoiceOutput = z.infer<typeof GenerateInvoiceOutputSchema>;

// src/ai/flows/generate-message-flow.ts
export const GenerateMessageInputSchema = z.object({
  tenantName: z.string().describe("The name of the tenant to address."),
  reminderType: z.string().describe("The context for the message (e.g., 'rentDue', 'latePayment', 'maintenance', 'leaseRenewal')."),
});
export type GenerateMessageInput = z.infer<typeof GenerateMessageInputSchema>;

export const GenerateMessageOutputSchema = z.object({
  message: z.string().describe("The generated, friendly, and professional message content."),
});
export type GenerateMessageOutput = z.infer<typeof GenerateMessageOutputSchema>;

// src/ai/flows/generate-receipt.ts
export const GenerateReceiptInputSchema = z.object({
    tenantId: z.string(),
    paymentId: z.string(),
});
export type GenerateReceiptInput = z.infer<typeof GenerateReceiptInputSchema>;

export const GenerateReceiptOutputSchema = z.object({
  receiptNumber: z.string().describe("A unique receipt number, e.g., 'RCPT-00123'."),
  paymentDate: z.string().describe("The date the payment was made, in ISO 8601 format."),
  tenantName: z.string().describe("The full name of the tenant."),
  propertyAddress: z.string().describe("The full address of the property."),
  amountPaid: z.number().describe("The amount paid."),
  currency: z.string().describe("The currency of the payment (e.g., KES, USD)."),
  paymentMethod: z.string().describe("The method of payment (e.g., M-Pesa, Stripe)."),
  notes: z.string().describe("A brief, courteous note for the tenant, e.g., 'Thank you for your payment.'"),
});
export type GenerateReceiptOutput = z.infer<typeof GenerateReceiptOutputSchema>;

// src/ai/flows/generate-report-flow.ts & src/app/reports/actions.ts
export const ReportInputSchema = z.object({
    month: z.number().min(0).max(11),
    year: z.number().min(2020),
});
export type ReportInput = z.infer<typeof ReportInputSchema>;

export const ReportOutputSchema = z.object({
  reportTitle: z.string().describe("The title of the report, e.g., 'Performance Report for July 2024'."),
  summary: z.string().describe("A 2-3 sentence executive summary of the month's performance."),
  totalRevenue: z.number().describe("The total revenue collected during the month."),
  occupancyRate: z.number().describe("The overall occupancy rate as a percentage (e.g., 95.5)."),
  latePayments: z.number().describe("The number of late rent payments recorded."),
  newMaintenanceRequests: z.number().describe("The number of new maintenance requests submitted."),
  highlights: z.array(z.string()).describe("A list of 2-3 positive highlights for the month."),
  areasForImprovement: z.array(z.string()).describe("A list of 2-3 areas that need attention or could be improved."),
});
export type ReportOutput = z.infer<typeof ReportOutputSchema>;


// src/ai/flows/predict-payment-flow.ts
export const PredictPaymentInputSchema = z.object({
  tenantId: z.string().describe("The ID of the tenant to analyze."),
  currentStatus: z.string().describe("The tenant's current rent status for this month."),
});
export type PredictPaymentInput = z.infer<typeof PredictPaymentInputSchema>;

export const PredictPaymentOutputSchema = z.object({
  predictedStatus: z.nativeEnum(['Paid', 'Overdue', 'Partially Paid']).describe("The most likely payment status for the next month."),
  confidence: z.number().describe("The probability of the predicted status (0 to 1)."),
  reasoning: z.string().describe("A brief explanation of the prediction."),
});
export type PredictPaymentOutput = z.infer<typeof PredictPaymentOutputSchema>;

// src/ai/flows/prioritize-maintenance.ts
export const PrioritizeMaintenanceInputSchema = z.object({
  description: z.string().describe('A description of the maintenance issue reported by a tenant.'),
});
export type PrioritizeMaintenanceInput = z.infer<typeof PrioritizeMaintenanceInputSchema>;

export const PrioritizeMaintenanceOutputSchema = z.object({
  priority: z.enum(['High', 'Medium', 'Low']).describe('The calculated priority of the request.'),
  reasoning: z.string().describe('A brief (1-sentence) explanation for why this priority was assigned.'),
});
export type PrioritizeMaintenanceOutput = z.infer<typeof PrioritizeMaintenanceOutputSchema>;


// src/ai/flows/suggest-price-flow.ts
import { PriceSuggestionSchema } from '@/lib/schemas'; // This one is already externalized, but we can define the input type here
export type PriceSuggestionInput = z.infer<typeof PriceSuggestionSchema>;

export const PriceSuggestionOutputSchema = z.object({
  suggestedPrice: z.number().describe("The suggested monthly rental price as a number."),
  currency: z.string().describe("The currency for the suggested price (e.g., KES, USD). Default to KES if not obvious."),
  reasoning: z.string().describe("A detailed, 2-3 sentence explanation for how the price was determined, citing the provided market data and property features."),
  overrideConsiderations: z.string().describe("A 1-2 sentence suggestion of factors that could justify a price higher or lower than the suggestion (e.g., premium finishes, recent renovations, or lack thereof)."),
});
export type PriceSuggestionOutput = z.infer<typeof PriceSuggestionOutputSchema>;
