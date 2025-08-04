
"use server";

import { generateMonthlyReport, type GenerateMonthlyReportInput, type GenerateMonthlyReportOutput } from "@/ai/flows/generate-monthly-report";

export interface ReportState {
    error?: string;
    report?: GenerateMonthlyReportOutput;
}

export async function generateReportAction(input: GenerateMonthlyReportInput): Promise<ReportState> {
  console.log("Frontend: generateReportAction called with input:", input);
  try {
    const result = await generateMonthlyReport(input);
    console.log("Frontend: Report generated successfully:", result.reportTitle);
    return { report: result };
  } catch (error: any) {
    console.error("Frontend Action Error: Failed to generate report:", error);
    return {
      error: `Failed to generate report: ${error.message}`,
    };
  }
}
