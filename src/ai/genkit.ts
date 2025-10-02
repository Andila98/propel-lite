/**
 * @fileoverview This file initializes the Genkit AI instance and sets up the necessary plugins and configurations.
 * It serves as the central point for defining and managing AI-related functionalities within the application.
 *
 * By centralizing the Genkit initialization, we ensure that the AI capabilities are consistently configured
 * across the app. This file should be imported wherever AI flows or tools are defined.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Initialize the Genkit AI instance with the Google AI plugin.
// This allows the application to use Google's generative AI models like Gemini.
export const ai = genkit({
  plugins: [googleAI()],
});
