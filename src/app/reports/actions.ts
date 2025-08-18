
"use server";

import { z } from 'zod';

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
  try {
    // This is a simplified mock implementation. A real app would query a database for the given month/year.
    const mockData = {
        totalRevenue: 750000,
        occupancyRate: 92.5,
        latePayments: 3,
        newMaintenanceRequests: 5,
        highlights: [
            "Successfully onboarded new tenant for Unit A102.",
            "Revenue from Pinecrest Villa exceeded projections by 5%.",
            "Zero outstanding maintenance requests at the end of the month."
        ],
        areasForImprovement: [
            "Follow up on late payment from tenant in 456 Maple Drive.",
            "Average time to resolve maintenance requests increased by 1 day.",
            "Consider marketing push for vacant units at Cityview Bedsitters."
        ]
    };
    
    // Simulate AI generation delay
    await new Promise(res => setTimeout(res, 1500));

    // For this mock, we'll just format the data into the expected report structure
    const report: z.infer<typeof ReportOutputSchema> = {
        reportTitle: `Performance Report for ${new Date(input.year, input.month).toLocaleString('default', { month: 'long' })} ${input.year}`,
        summary: `This month saw strong performance with total revenue of KES ${mockData.totalRevenue.toLocaleString()}. Occupancy remains high at ${mockData.occupancyRate}%, though a slight increase in maintenance requests was noted.`,
        ...mockData,
    };

    return { report };
  } catch (error: any) {
    console.error('[REPORT_ACTION_ERROR]', error);
    return { error: 'Failed to generate report due to an internal error.' };
  }
}
