
'use server';
/**
 * @fileOverview Centralized Genkit AI configuration.
 *
 * This file initializes and configures the Genkit AI object with necessary plugins.
 * It ensures that a single, consistent AI instance is used across the application.
 */

import { genkit, type GenkitError } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/googleai';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

// Initialize plugins.
const plugins = [];
if (process.env.GEMINI_API_KEY) {
  plugins.push(googleAI());
  console.log('[GENKIT_CONFIG] Google AI Plugin initialized.');
} else {
  console.warn('[GENKIT_CONFIG] GEMINI_API_KEY is not set. Google AI Plugin is disabled.');
}

// Configure Genkit.
export const ai = genkit({
  plugins,
  enableTracing: process.env.NODE_ENV === 'development',
  // In a production app, you would configure a tracer like Google Cloud Trace.
  // tracer: googleCloudTrace(),
});


/**
 * A centralized error handler for Genkit flows.
 * This function logs the error and returns a standardized error object.
 * @param error The error object caught from a Genkit flow.
 * @param flowName The name of the flow where the error occurred.
 * @returns A standardized error object for API responses.
 */
export function handleFlowError(error: unknown, flowName: string): { error: string } {
    const genkitError = error as GenkitError;
    console.error(`[GENKIT_FLOW_ERROR] in ${flowName}:`, {
      message: genkitError.message,
      status: genkitError.status,
      stack: genkitError.stack,
    });
    
    let errorMessage = `An unexpected error occurred in the ${flowName} flow.`;
    if (genkitError.status === 'UNAVAILABLE') {
      errorMessage = "The AI model is currently unavailable. Please try again later.";
    } else if (genkitError.message.includes('API key not valid')) {
      errorMessage = "The AI service API key is invalid. Please check the server configuration.";
    } else if (genkitError.message) {
      errorMessage = genkitError.message;
    }
    
    return { error: errorMessage };
}
