
"use server";

import { generateReport } from '@/ai/flows/generate-report-flow';
import { ReportInputSchema, type ReportOutput } from '@/lib/schema-types';
import type { z } from 'zod';
import { getLandlordId } from '@/lib/auth-utils';
import { cookies } from 'next/headers';
import { authConfig } from '@/config/server-config';

export interface ReportState {
    error?: string;
    report?: ReportOutput;
}

export async function generateReportAction(input: Omit<z.infer<typeof ReportInputSchema>, 'landlordId'>): Promise<ReportState> {
  const landlordId = await getLandlordId(cookies().get(authConfig.cookieName)?.value);
  if (!landlordId) {
      return { error: 'Unauthorized: Could not identify user.' };
  }

  const completeInput = { ...input, landlordId };
  
  const validationResult = ReportInputSchema.safeParse(completeInput);
  if (!validationResult.success) {
      return { error: 'Invalid date provided.' };
  }

  try {
    const report = await generateReport(validationResult.data);
    return { report };
  } catch (error: unknown) {
    const typedError = error as Error;
    console.error('[REPORT_ACTION_ERROR]', typedError);
    return { error: 'Failed to generate report due to an internal error.' };
  }
}
