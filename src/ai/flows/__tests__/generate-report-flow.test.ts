
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateReportFlow } from '../generate-report-flow';
import { firestore } from '@/lib/firebase-admin';
import { ai } from '@/ai/genkit';
import { ReportOutputSchema } from '@/lib/schema-types';
import { z } from 'zod';

// Mock dependencies
vi.mock('@/lib/firebase-admin', () => ({
  isFirebaseAdminInitialized: true,
  firestore: {
    collection: vi.fn(),
    collectionGroup: vi.fn(),
  },
}));

vi.mock('@/ai/genkit', () => ({
  ai: {
    defineFlow: vi.fn((config, fn) => fn),
    definePrompt: vi.fn(),
  },
}));

describe('generateReportFlow', () => {
  let mockPrompt: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup the mock for the prompt defined inside the flow
    mockPrompt = vi.fn();
    (ai.definePrompt as ReturnType<typeof vi.fn>).mockReturnValue(mockPrompt);


    // Mock Firestore responses
    vi.mocked(firestore.collection).mockReturnValue({
      where: () => ({
        where: () => ({
          where: () => ({
            get: vi.fn().mockResolvedValue({
              docs: [
                { data: () => ({ amount: 50000, date: { toDate: () => new Date('2024-07-10') } }) },
                { data: () => ({ amount: 50000, date: { toDate: () => new Date('2024-07-02') } }) },
              ],
            }),
          }),
           get: vi.fn().mockResolvedValue({ // for maintenance requests
            size: 2,
           }),
        }),
      }),
    } as any);

    vi.mocked(firestore.collectionGroup).mockReturnValue({
        where: () => ({
            get: vi.fn().mockResolvedValue({
                docs: [
                    { data: () => ({ isOccupied: true }) },
                    { data: () => ({ isOccupied: true }) },
                    { data: () => ({ isOccupied: false }) },
                ],
                size: 3
            })
        })
    } as any)

  });

  it('should process data correctly and call the AI prompt', async () => {
    const input = {
      landlordId: 'landlord1',
      month: 6, // July
      year: 2024,
    };

    const expectedReportOutput: z.infer<typeof ReportOutputSchema> = {
      reportTitle: "Performance Report for July 2024",
      summary: "A great month with high occupancy and revenue.",
      totalRevenue: 100000,
      occupancyRate: 66.67,
      latePayments: 1,
      newMaintenanceRequests: 2,
      highlights: ["Strong revenue collection.", "Occupancy remains stable."],
      areasForImprovement: ["One late payment to follow up on."],
    };

    mockPrompt.mockResolvedValue({ output: expectedReportOutput });

    await generateReportFlow(input);

    // Verify firestore calls
    expect(firestore.collection).toHaveBeenCalledWith('payments');
    expect(firestore.collection).toHaveBeenCalledWith('maintenanceRequests');
    expect(firestore.collectionGroup).toHaveBeenCalledWith('units');

    // Verify AI prompt call
    expect(mockPrompt).toHaveBeenCalledWith({
      month: 'July',
      year: 2024,
      totalRevenue: 100000,
      occupancyRate: expect.closeTo(66.66),
      latePayments: 1,
      newMaintenanceRequests: 2,
    });
  });

   it('should handle zero data gracefully', async () => {
    // Override mocks for zero data
    vi.mocked(firestore.collection).mockReturnValue({
      where: () => ({
        where: () => ({
          where: () => ({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
          get: vi.fn().mockResolvedValue({ size: 0 }),
        }),
      }),
    } as any);
    vi.mocked(firestore.collectionGroup).mockReturnValue({
       where: () => ({
            get: vi.fn().mockResolvedValue({ docs: [], size: 0 })
        })
    } as any)

    const input = {
      landlordId: 'landlord1',
      month: 6,
      year: 2024,
    };

    mockPrompt.mockResolvedValue({ output: {} });

    await generateReportFlow(input);

    expect(mockPrompt).toHaveBeenCalledWith({
      month: 'July',
      year: 2024,
      totalRevenue: 0,
      occupancyRate: 0,
      latePayments: 0,
      newMaintenanceRequests: 0,
    });
  });

});
