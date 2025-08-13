
"use server";

export interface ReportState {
    error?: string;
    report?: any;
}

export async function generateReportAction(input: any): Promise<ReportState> {
  return { error: 'AI features are not configured.' };
}
