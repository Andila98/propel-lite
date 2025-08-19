
"use server";

import { z } from 'zod';
import { generateReport } from '@/ai/flows/generate-report-flow';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

export const ReportInputSchema = z.object({
    month: z.number().min(0).max(11),
    year: z.number().min(2020),
});

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

export interface ReportState {
    error?: string;
    report?: z.infer<typeof ReportOutputSchema>;
}

export async function generateReportAction(input: z.infer<typeof ReportInputSchema>): Promise<ReportState> {
  if (!isFirebaseAdminInitialized) {
    return { error: "AI features are not configured. Please check server credentials." };
  }
  
  const validationResult = ReportInputSchema.safeParse(input);
  if (!validationResult.success) {
      return { error: 'Invalid date provided.' };
  }

  try {
    const report = await generateReport(validationResult.data);
    return { report };
  } catch (error: any) {
    console.error('[REPORT_ACTION_ERROR]', error);
    return { error: 'Failed to generate report due to an internal error.' };
  }
}
