
"use server";

import { generateReport } from '@/ai/flows/generate-report-flow';
import { ReportInputSchema, type ReportOutput } from '@/lib/schema-types';
import type { z } from 'zod';

export interface ReportState {
    error?: string;
    report?: ReportOutput;
}

export async function generateReportAction(input: z.infer<typeof ReportInputSchema>): Promise<ReportState> {
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
