
"use server";

import { ai, handleFlowError } from "@/ai/genkit";
import { firestore } from "@/lib/firebase-admin";
import { z } from "zod";

const ReportInputSchema = z.object({
    month: z.number().min(0).max(11),
    year: z.number().min(2020),
});

const ReportOutputSchema = z.object({
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
    // This is a simplified mock implementation. A real app would query Firestore for the given month/year.
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

    const flow = ai.defineFlow(
        {
            name: "generateReportFlow",
            inputSchema: z.any(),
            outputSchema: ReportOutputSchema,
        },
        async (data) => {
            const prompt = `You are a property management analyst. Based on the following data for ${input.month + 1}/${input.year}, generate a concise performance report.
            
            Data: ${JSON.stringify(data, null, 2)}
            
            Provide a title, a brief summary, and fill in all the data points in the output schema. Make the highlights and improvement areas sound professional and insightful.`;

            const { output } = await ai.generate({
                prompt,
                model: 'googleai/gemini-1.5-flash',
                output: { schema: ReportOutputSchema },
            });
            return output!;
        }
    );

    const report = await flow(mockData);

    return { report };
  } catch (error) {
    return handleFlowError(error, 'generateReportAction');
  }
}
