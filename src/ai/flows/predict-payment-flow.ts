
'use server';
/**
 * @fileOverview A flow to predict future tenant payment behavior using a Markov chain.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { subMonths, getMonth, getYear } from 'date-fns';
import { 
    PredictPaymentInputSchema, 
    PredictPaymentOutputSchema, 
    type PredictPaymentInput, 
    type PredictPaymentOutput 
} from '@/lib/schema-types';


type PaymentStatus = 'Paid' | 'Overdue' | 'Partially Paid' | 'New';

/**
 * Builds a Markov chain transition matrix from a tenant's payment history.
 * @param tenantId The ID of the tenant.
 * @returns A transition matrix and a list of historical statuses.
 */
async function buildTransitionMatrix(tenantId: string) {
    if (!isFirebaseAdminInitialized) throw new Error("Firebase not initialized.");
    const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) throw new Error("Tenant not found");
    const tenantData = tenantDoc.data()!;

    const propertyDoc = await firestore.collection('properties').doc(tenantData.propertyId).get();
    if (!propertyDoc.exists) throw new Error("Property not found");
    const propertyData = propertyDoc.data()!;

    const unitDoc = await propertyDoc.ref.collection('units').doc(tenantData.currentUnitId).get();
    if (!unitDoc.exists) throw new Error("Unit not found");
    const unitData = unitDoc.data()!;
    const rentAmount = unitData.rent;

    const paymentsSnapshot = await firestore.collection('payments')
        .where('tenantId', '==', tenantId)
        .where('type', '==', 'Rent')
        .orderBy('date', 'asc')
        .get();
        
    const paymentsByMonth: Record<string, number> = {};
    paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        const date = payment.date.toDate();
        const key = `${getYear(date)}-${getMonth(date)}`;
        paymentsByMonth[key] = (paymentsByMonth[key] || 0) + payment.amount;
    });

    const statuses: PaymentStatus[] = [];
    // Analyze the last 12 months
    for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const key = `${getYear(date)}-${getMonth(date)}`;
        const paidAmount = paymentsByMonth[key] || 0;

        if (paidAmount >= rentAmount) {
            statuses.push('Paid');
        } else if (paidAmount > 0) {
            statuses.push('Partially Paid');
        } else {
            statuses.push('Overdue');
        }
    }

    const transitions: Record<string, Record<string, number>> = {};
    const counts: Record<string, number> = {};

    for (let i = 0; i < statuses.length - 1; i++) {
        const from = statuses[i];
        const to = statuses[i + 1];

        if (!transitions[from]) transitions[from] = {};
        if (!transitions[from][to]) transitions[from][to] = 0;
        
        transitions[from][to]++;
        counts[from] = (counts[from] || 0) + 1;
    }

    // Convert counts to probabilities
    for (const from in transitions) {
        for (const to in transitions[from]) {
            transitions[from][to] /= counts[from];
        }
    }
    
    return { transitions, historicalStatuses: statuses };
}

/**
 * Predicts the next payment status for a tenant using a simple Markov chain.
 * @param input The input data containing tenantId and currentStatus.
 * @returns The predicted status and confidence score.
 */
export async function predictNextPayment(input: PredictPaymentInput): Promise<PredictPaymentOutput> {
  const { tenantId, currentStatus } = input;
  const { transitions, historicalStatuses } = await buildTransitionMatrix(tenantId);
  
  const lastKnownStatus = currentStatus as PaymentStatus || historicalStatuses[historicalStatuses.length - 1] || 'New';

  if (!transitions[lastKnownStatus] || Object.keys(transitions[lastKnownStatus]).length === 0) {
    // No historical data for this state, make a conservative guess
    return {
      predictedStatus: 'Overdue',
      confidence: 0.5,
      reasoning: 'Not enough historical data from the current state. Assuming a conservative outlook.'
    };
  }

  const nextStates = transitions[lastKnownStatus];
  const predictedStatus = Object.keys(nextStates).reduce((a, b) => nextStates[a] > nextStates[b] ? a : b);
  const confidence = nextStates[predictedStatus];

  let reasoning = `Based on historical data, when the tenant is in a '${lastKnownStatus}' state, they have a ${(confidence * 100).toFixed(0)}% probability of being '${predictedStatus}' next month.`;
  if (historicalStatuses.length < 6) {
      reasoning += " (Note: Prediction is based on limited historical data.)";
  }

  return {
    predictedStatus: predictedStatus as PredictPaymentOutput['predictedStatus'],
    confidence,
    reasoning,
  };
}


// This defines the Genkit flow, which is essentially the serverless function.
const predictPaymentFlow = ai.defineFlow(
  {
    name: 'predictPaymentFlow',
    inputSchema: PredictPaymentInputSchema,
    outputSchema: PredictPaymentOutputSchema,
  },
  async (input) => {
    return await predictNextPayment(input);
  }
);

export async function predictPayment(input: PredictPaymentInput): Promise<PredictPaymentOutput> {
    return predictPaymentFlow(input);
}
