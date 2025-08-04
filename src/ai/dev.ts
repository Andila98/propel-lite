import { config } from 'dotenv';
config();

import '@/ai/flows/suggest-property-price.ts';
import '@/ai/flows/generate-message-content.ts';
import '@/ai/flows/generate-reminder-schedule.ts';
import '@/ai/flows/generate-invoice.ts';
import '@/ai/flows/generate-receipt.ts';
import '@/ai/flows/prioritize-maintenance.ts';
import '@/ai/flows/generate-monthly-report.ts';
