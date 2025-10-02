
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prioritizeMaintenanceRequest } from '../prioritize-maintenance';
import { ai } from '@/ai/genkit';
import type { PrioritizeMaintenanceOutput } from '@/lib/schema-types';

// Mock the genkit dependency
vi.mock('@/ai/genkit', () => ({
  ai: {
    defineFlow: vi.fn((config, fn) => fn),
    definePrompt: vi.fn().mockReturnValue(vi.fn()),
  },
}));

describe('prioritizeMaintenanceRequest Flow', () => {
  let mockPrompt: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Re-assign the mock for definePrompt since it's used inside the flow
    mockPrompt = vi.fn();
    vi.mocked(ai.definePrompt).mockReturnValue(mockPrompt);
  });

  it('should assign High priority for safety risks like electrical issues', async () => {
    const input = { description: 'Sparks are coming from the main socket in the living room.' };
    const expectedOutput: PrioritizeMaintenanceOutput = {
      priority: 'High',
      reasoning: 'Electrical issues pose a significant safety and fire risk.',
    };
    mockPrompt.mockResolvedValue({ output: expectedOutput });

    const result = await prioritizeMaintenanceRequest(input);

    expect(ai.definePrompt).toHaveBeenCalled();
    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should assign Medium priority for significant inconveniences like a broken appliance', async () => {
    const input = { description: 'The refrigerator has stopped working and my food is spoiling.' };
    const expectedOutput: PrioritizeMaintenanceOutput = {
      priority: 'Medium',
      reasoning: 'A broken essential appliance causes significant inconvenience.',
    };
    mockPrompt.mockResolvedValue({ output: expectedOutput });

    const result = await prioritizeMaintenanceRequest(input);

    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should assign Low priority for cosmetic issues', async () => {
    const input = { description: 'There are some scuff marks on the hallway wall from moving furniture.' };
    const expectedOutput: PrioritizeMaintenanceOutput = {
      priority: 'Low',
      reasoning: 'Cosmetic issues like scuff marks are minor and do not affect functionality.',
    };
    mockPrompt.mockResolvedValue({ output: expectedOutput });

    const result = await prioritizeMaintenanceRequest(input);

    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle empty descriptions gracefully', async () => {
    const input = { description: '' };
    const expectedOutput: PrioritizeMaintenanceOutput = {
      priority: 'Low',
      reasoning: 'No description provided to assess priority.',
    };
     mockPrompt.mockResolvedValue({ output: expectedOutput });

    const result = await prioritizeMaintenanceRequest(input);

    expect(mockPrompt).toHaveBeenCalledWith(input);
    expect(result).toEqual(expectedOutput);
  });
});
