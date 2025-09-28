/**
 * @fileoverview Vitest test suite for performance-critical paths.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getDashboardData } from '@/app/api/dashboard/route';
import { generateReport } from '@/ai/flows/generate-report-flow';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/auth-utils', () => ({
  getLandlordAndActor: vi.fn().mockResolvedValue({ landlordId: 'test-landlord', error: null }),
}));

let mockAIResponse: unknown;
vi.mock('@/ai/genkit', () => ({
    ai: {
        defineFlow: vi.fn((_config, handler) => handler),
        definePrompt: vi.fn(() => async () => ({ output: mockAIResponse })),
    },
}));

vi.mock('@/ai/flows/dashboard-insights', () => ({
    generateDashboardInsights: vi.fn().mockResolvedValue({ summary: 'AI summary', anomalies: [] }),
}));


describe('Application Performance Tests', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockAIResponse = { summary: 'AI summary', anomalies: [] }; // Reset mock
  });

  describe('Dashboard API Endpoint', () => {
    it('should return dashboard data within an acceptable time frame (<500ms)', async () => {
      const request = new NextRequest('http://localhost/api/dashboard', {
        headers: {
          cookie: 'RentEaseAuth=test-cookie',
        },
      });

      const startTime = performance.now();
      const response = await getDashboardData(request);
      const duration = performance.now() - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
      console.log(`Dashboard API response time: ${duration.toFixed(2)}ms`);
    });
  });

  describe('AI Flow Execution', () => {
    it('should generate a report quickly with mocked data (<1s)', async () => {
       mockAIResponse = {
            reportTitle: 'Mock Report',
            summary: 'Mock summary',
            totalRevenue: 1000,
            occupancyRate: 90,
            latePayments: 1,
            newMaintenanceRequests: 2,
            highlights: ['Good occupancy'],
            areasForImprovement: ['One late payment'],
       };
      
      const input = { landlordId: 'test-landlord', month: 5, year: 2024 };
      
      const startTime = performance.now();
      await generateReport(input);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000); // Expect flow logic itself to be very fast
      console.log(`generateReport flow execution time: ${duration.toFixed(2)}ms`);
    });
  });
});
