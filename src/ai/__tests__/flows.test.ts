/**
 * @fileoverview Vitest test suite for AI flows.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReport } from '@/ai/flows/generate-report-flow';
import { predictPayment } from '@/ai/flows/predict-payment-flow';
import type { ReportOutput } from '@/lib/schema-types';
import * as admin from '@/lib/firebase-admin';

// Mock Firebase Admin
vi.mock('@/lib/firebase-admin', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/firebase-admin')>();
    return {
        ...original,
        firestore: {
            collection: vi.fn(),
            collectionGroup: vi.fn(),
        },
        isFirebaseAdminInitialized: true,
    };
});

// Mock AI - Genkit
let mockAIResponse: unknown;
vi.mock('@/ai/genkit', () => ({
    ai: {
        defineFlow: vi.fn((_config: unknown, handler: (...args: unknown[]) => unknown) => handler), // The handler is the actual function we want to test
        definePrompt: vi.fn(() => async () => ({ output: mockAIResponse })),
    },
}));

// Mock Flow Utilities
vi.mock('@/lib/flow-monitor', () => ({
    withMonitoring: vi.fn((_, fn) => fn),
}));
vi.mock('@/lib/flow-errors', () => ({
    withErrorHandling: vi.fn((_, fn) => fn),
}));


describe('Property Management AI Flows', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateReport', () => {
        const mockFirestore = admin.firestore;
        
        beforeEach(() => {
            mockAIResponse = {
                reportTitle: 'Monthly Performance Report - January 2024',
                summary: 'Strong performance this month with high occupancy.',
                totalRevenue: 80000,
                occupancyRate: 66.7,
                latePayments: 0,
                newMaintenanceRequests: 1,
                highlights: ['High occupancy rate', 'Zero late payments'],
                areasForImprovement: ['Address one new maintenance request']
            } as ReportOutput;

             // Mock successful Firestore calls by default
            (mockFirestore.collection as vi.Mock).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({
                    docs: [
                        { data: () => ({ amount: 50000, date: { toDate: () => new Date('2024-01-15') } }) },
                        { data: () => ({ amount: 30000, date: { toDate: () => new Date('2024-01-20') } }) }
                    ]
                })
            });
            (mockFirestore.collectionGroup as vi.Mock).mockReturnValue({
                 where: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({
                    size: 3,
                    docs: [
                        { data: () => ({ isOccupied: true }) },
                        { data: () => ({ isOccupied: true }) },
                        { data: () => ({ isOccupied: false }) }
                    ]
                })
            });
        });

        it('should generate a report with valid input', async () => {
            const input = { landlordId: 'test-landlord', month: 0, year: 2024 }; // January 2024
            const result = await generateReport(input);

            expect(result).toHaveProperty('reportTitle');
            expect(result).toHaveProperty('summary');
            expect(result).toHaveProperty('highlights');
            expect(result).toHaveProperty('areasForImprovement');
            expect(result.reportTitle).toContain('January 2024');
        });

        it('should throw an error on Firebase failure', async () => {
            (mockFirestore.collection as vi.Mock).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                get: vi.fn().mockRejectedValue(new Error('Firebase unavailable'))
            });

            const input = { landlordId: 'test-landlord', month: 0, year: 2024 };
            
            await expect(generateReport(input)).rejects.toThrow('Failed to generate report');
        });

         it('should complete report generation within acceptable time', async () => {
            const startTime = Date.now();
            
            // Mock quick responses
            (mockFirestore.collection as vi.Mock).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({ docs: [] }) // Empty array is faster
            });
            (mockFirestore.collectionGroup as vi.Mock).mockReturnValue({
                where: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({ size: 0, docs: [] })
            });

            const input = { landlordId: 'test-landlord', month: 0, year: 2024 };
            await generateReport(input);
            
            const duration = Date.now() - startTime;
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });
    });

    describe('predictPayment', () => {
        const mockFirestore = admin.firestore;

        beforeEach(() => {
            // Note: The predictPayment flow doesn't use Genkit prompts, so no mockAIResponse is needed.
        });

        it('should predict payment status with sufficient data', async () => {
            // Mock a rich payment history
            const paymentHistory = Array.from({ length: 12 }, (_, i) => ({
                data: () => ({
                    amount: 25000,
                    date: { toDate: () => new Date(2024, 11 - i, 5) },
                    tenantId: 'tenant1'
                })
            }));

            (mockFirestore.collection as vi.Mock).mockImplementation((collection: string) => {
                if (collection === 'tenants') return { doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ propertyId: 'prop1', currentUnitId: 'unit1', name: 'John Doe' }) }) }) };
                if (collection === 'properties') return { doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ currency: 'KES' }), ref: { collection: () => ({ doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ rent: 25000 }) }) }) }) } }) }) };
                if (collection === 'payments') return { where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ docs: paymentHistory }) };
                return { where: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ docs: [] }) };
            });

            const input = { tenantId: 'tenant1', currentStatus: 'Paid' };
            const result = await predictPayment(input);

            expect(result).toHaveProperty('predictedStatus');
            expect(result).toHaveProperty('confidence');
            expect(result).toHaveProperty('reasoning');
            expect(typeof result.confidence).toBe('number');
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(result.reasoning).toContain('excellent quality data');
        });

        it('should handle tenant not found gracefully', async () => {
            (mockFirestore.collection as vi.Mock).mockReturnValue({
                doc: () => ({
                    get: vi.fn().mockResolvedValue({ exists: false })
                })
            });

            const input = { tenantId: 'nonexistent', currentStatus: 'Paid' };
            await expect(predictPayment(input)).rejects.toThrow('tenant or property data not found');
        });

        it('should provide conservative prediction with insufficient data', async () => {
             (mockFirestore.collection as vi.Mock).mockImplementation((collection: string) => {
                if (collection === 'tenants') return { doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ propertyId: 'prop1', currentUnitId: 'unit1', name: 'Jane Doe' }) }) }) };
                if (collection === 'properties') return { doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ currency: 'KES' }), ref: { collection: () => ({ doc: () => ({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ rent: 30000 }) }) }) }) } }) }) };
                if (collection === 'payments') return { where: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ docs: [] }) }; // No payment history
                return { where: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue({ docs: [] }) };
            });

            const input = { tenantId: 'new-tenant', currentStatus: 'New' };
            const result = await predictPayment(input);

            expect(result.confidence).toBeLessThan(0.8);
            expect(result.reasoning).toContain('Insufficient transition data');
            expect(result.reasoning).toContain('No historical data available');
        });
    });
});
