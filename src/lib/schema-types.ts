
/**
 * @fileoverview Centralized Zod schemas and TypeScript types for the application.
 * This helps avoid "use server" directive conflicts by separating data structures
 * from server-side logic.
 */
import { z } from 'zod';

// AI Flow Schemas

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
