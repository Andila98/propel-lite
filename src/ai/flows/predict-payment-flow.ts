
'use server';
/**
 * @fileOverview Enhanced flow to predict future tenant payment behavior using a Markov chain.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { subMonths, getMonth, getYear, isAfter, isBefore } from 'date-fns';
import { 
    PredictPaymentInputSchema, 
    PredictPaymentOutputSchema, 
    type PredictPaymentInput, 
    type PredictPaymentOutput 
} from '@/lib/schema-types';
import { withErrorHandling } from '@/lib/flow-errors';
import { withMonitoring } from '@/lib/flow-monitor';

type PaymentStatus = 'Paid' | 'Overdue' | 'Partially Paid' | 'New';

interface TenantPaymentHistory {
    transitions: Record<string, Record<string, number>>;
    historicalStatuses: PaymentStatus[];
    dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
    totalMonths: number;
}

/**
 * Validates tenant data and ensures all required fields are present
 */
async function validateTenantData(tenantId: string) {
    const tenantDoc = await firestore.collection('tenants').doc(tenantId).get();
    if (!tenantDoc.exists) {
        throw new Error("Tenant not found");
    }
    
    const tenantData = tenantDoc.data();
    if (!tenantData) {
        throw new Error("Tenant data is missing");
    }
    
    const requiredFields = ['propertyId', 'currentUnitId', 'name'];
    const missingFields = requiredFields.filter(field => !tenantData[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Tenant data is incomplete. Missing: ${missingFields.join(', ')}`);
    }
    
    return { tenantData, tenantDoc };
}

/**
 * Gets property and unit data with validation
 */
async function getPropertyAndUnitData(tenantData: any) {
    const [propertyDoc, unitDoc] = await Promise.all([
        firestore.collection('properties').doc(tenantData.propertyId).get(),
        firestore.collection('properties').doc(tenantData.propertyId)
            .collection('units').doc(tenantData.currentUnitId).get()
    ]);
    
    if (!propertyDoc.exists) {
        throw new Error("Property not found for tenant");
    }
    
    if (!unitDoc.exists) {
        throw new Error("Unit not found for tenant");
    }
    
    const unitData = unitDoc.data();
    if (!unitData?.rent || typeof unitData.rent !== 'number' || unitData.rent <= 0) {
        throw new Error("Invalid rent amount in unit data");
    }
    
    return { propertyData: propertyDoc.data()!, unitData };
}

/**
 * Enhanced Markov chain builder with better data quality assessment
 */
async function buildTransitionMatrix(tenantId: string): Promise<TenantPaymentHistory> {
    if (!isFirebaseAdminInitialized) {
        throw new Error("Firebase not initialized");
    }
    
    const { tenantData } = await validateTenantData(tenantId);
    const { unitData } = await getPropertyAndUnitData(tenantData);
    
    const rentAmount = unitData.rent;
    
    // Get payment history with better date range handling
    const paymentsSnapshot = await firestore.collection('payments')
        .where('tenantId', '==', tenantId)
        .orderBy('date', 'asc')
        .get();
    
    // Aggregate payments by month
    const paymentsByMonth: Record<string, number> = {};
    let earliestPayment: Date | null = null;
    
    paymentsSnapshot.forEach(doc => {
        const payment = doc.data();
        const date = (payment.date as any).toDate();
        const key = `${getYear(date)}-${String(getMonth(date)).padStart(2, '0')}`;
        
        paymentsByMonth[key] = (paymentsByMonth[key] || 0) + payment.amount;
        
        if (!earliestPayment || isBefore(date, earliestPayment)) {
            earliestPayment = date;
        }
    });
    
    // Determine analysis period (last 12 months or available data)
    const analysisMonths = Math.min(12, 
        earliestPayment ? 
            Math.ceil((new Date().getTime() - earliestPayment.getTime()) / (30 * 24 * 60 * 60 * 1000)) : 
            12
    );
    
    const statuses: PaymentStatus[] = [];
    
    // Analyze payment status for each month
    for (let i = analysisMonths - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const key = `${getYear(date)}-${String(getMonth(date)).padStart(2, '0')}`;
        const paidAmount = paymentsByMonth[key] || 0;
        
        // More nuanced status determination
        if (paidAmount >= rentAmount * 0.95) { // Allow 5% tolerance for rounding
            statuses.push('Paid');
        } else if (paidAmount > rentAmount * 0.1) { // More than 10% paid
            statuses.push('Partially Paid');
        } else {
            statuses.push('Overdue');
        }
    }
    
    // Build transition matrix
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
            if (counts[from] > 0) {
                transitions[from][to] /= counts[from];
            }
        }
    }
    
    // Assess data quality
    let dataQuality: TenantPaymentHistory['dataQuality'];
    if (statuses.length >= 12) {
        dataQuality = 'excellent';
    } else if (statuses.length >= 8) {
        dataQuality = 'good';
    } else if (statuses.length >= 4) {
        dataQuality = 'fair';
    } else {
        dataQuality = 'poor';
    }
    
    return {
        transitions,
        historicalStatuses: statuses,
        dataQuality,
        totalMonths: statuses.length
    };
}


/**
 * Analyzes global payment patterns when specific transitions are unavailable
 */
function getGlobalPaymentPattern(statuses: PaymentStatus[]) {
    if (statuses.length === 0) {
        return {
            mostLikelyNext: 'Overdue' as PaymentStatus,
            confidence: 0.5,
            reasoning: 'No historical data available.'
        };
    }
    
    const statusCounts = statuses.reduce((acc, status) => {
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    
    const mostCommon = Object.keys(statusCounts)
        .reduce((a, b) => statusCounts[a] > statusCounts[b] ? a : b);
    
    const confidence = statusCounts[mostCommon] / statuses.length;
    
    return {
        mostLikelyNext: mostCommon as PaymentStatus,
        confidence,
        reasoning: `Most common historical status is "${mostCommon}" (${Math.round(confidence * 100)}% of time).`
    };
}

/**
 * Analyzes recent payment trends
 */
function analyzeRecentTrend(statuses: PaymentStatus[]): string | null {
    if (statuses.length < 3) return null;
    
    const recent = statuses.slice(-3);
    const paidCount = recent.filter(s => s === 'Paid').length;
    const overdueCount = recent.filter(s => s === 'Overdue').length;
    
    if (paidCount === 3) {
        return 'Recent trend shows consistent on-time payments.';
    } else if (overdueCount >= 2) {
        return 'Recent trend indicates payment difficulties.';
    } else if (recent[recent.length - 1] === 'Paid' && recent[recent.length - 2] !== 'Paid') {
        return 'Payment behavior appears to be improving.';
    }
    
    return null;
}


/**
 * Builds detailed reasoning text for the prediction
 */
function buildReasoningText(
    currentStatus: string,
    predictedStatus: string,
    confidence: number,
    history: TenantPaymentHistory
): string {
    const confidencePercent = Math.round(confidence * 100);
    
    let reasoning = `Based on ${history.totalMonths} months of ${history.dataQuality} quality data, `;
    reasoning += `when in "${currentStatus}" state, this tenant transitions to "${predictedStatus}" `;
    reasoning += `${confidencePercent}% of the time.`;
    
    // Add data quality context
    if (history.dataQuality === 'poor') {
        reasoning += ' (Note: Prediction reliability is limited due to insufficient historical data.)';
    } else if (history.dataQuality === 'fair') {
        reasoning += ' (Note: Prediction based on limited historical data.)';
    }
    
    // Add trend analysis
    const recentTrend = analyzeRecentTrend(history.historicalStatuses);
    if (recentTrend) {
        reasoning += ` ${recentTrend}`;
    }
    
    return reasoning;
}

/**
 * Enhanced prediction with confidence scoring
 */
async function predictNextPayment(input: PredictPaymentInput): Promise<PredictPaymentOutput> {
    const { tenantId, currentStatus } = input;
    const history = await buildTransitionMatrix(tenantId);
    
    const lastKnownStatus = (currentStatus as PaymentStatus) || 
        history.historicalStatuses[history.historicalStatuses.length - 1] || 
        'New';
    
    // Handle insufficient data
    if (!history.transitions[lastKnownStatus] || 
        Object.keys(history.transitions[lastKnownStatus]).length === 0) {
        
        // Use global patterns if available
        const globalPattern = getGlobalPaymentPattern(history.historicalStatuses);
        
        return {
            predictedStatus: globalPattern.mostLikelyNext,
            confidence: Math.max(0.3, globalPattern.confidence * 0.7), // Reduced confidence
            reasoning: `Insufficient transition data for "${lastKnownStatus}" state. ` +
                      `Using historical patterns (${history.totalMonths} months of data, ` +
                      `${history.dataQuality} quality). ${globalPattern.reasoning}`
        };
    }
    
    const nextStates = history.transitions[lastKnownStatus];
    const predictedStatus = Object.keys(nextStates)
        .reduce((a, b) => nextStates[a] > nextStates[b] ? a : b);
    
    let confidence = nextStates[predictedStatus];
    
    // Adjust confidence based on data quality
    const qualityMultipliers = {
        'excellent': 1.0,
        'good': 0.9,
        'fair': 0.75,
        'poor': 0.6
    };
    confidence *= qualityMultipliers[history.dataQuality];
    
    // Build detailed reasoning
    const reasoning = buildReasoningText(
        lastKnownStatus,
        predictedStatus,
        confidence,
        history
    );
    
    return {
        predictedStatus: predictedStatus as PredictPaymentOutput['predictedStatus'],
        confidence: Math.round(confidence * 100) / 100, // Round to 2 decimal places
        reasoning,
    };
}

const predictPaymentFlow = ai.defineFlow(
    {
        name: 'predictPaymentFlow',
        inputSchema: PredictPaymentInputSchema,
        outputSchema: PredictPaymentOutputSchema,
    },
    withMonitoring('predictPaymentFlow', withErrorHandling('predictPaymentFlow', 
        async (input) => {
            try {
                return await predictNextPayment(input);
            } catch (error: any) {
                // Provide more specific error handling
                if (error.message.includes('not found')) {
                    throw new Error('Unable to predict payment: tenant or property data not found.');
                } else if (error.message.includes('Firebase')) {
                    throw new Error('Unable to predict payment: database connection error.');
                }
                
                throw new Error('Failed to predict payment due to an internal error.');
            }
        }
    ))
);

export async function predictPayment(input: PredictPaymentInput): Promise<PredictPaymentOutput> {
    return predictPaymentFlow(input);
}
