
import type { Property, Tenant, Payment, ActivityItem } from '@/lib/types';
import { mockProperties, mockTenants, mockPayments, mockDashboardData } from '@/lib/mock-data';

export interface DashboardData {
    totalProperties: number;
    totalTenants: number;
    totalRevenue: number;
    revenueChange: number;
    occupancyRate: number;
    properties: Property[];
    anomalyAlerts: ActivityItem[];
    topPerformer: { address: string; revenue: number } | null;
}

class DashboardService {
    /**
     * Gathers all necessary data for the landlord's dashboard.
     * In this mock version, it returns predefined mock data.
     * @param userId The UID of the user (landlord or manager).
     * @param timeframe The time period for revenue calculation.
     * @returns A promise that resolves to the aggregated dashboard data.
     */
    async getDashboardData(userId: string, timeframe: string): Promise<DashboardData> {
        console.log(`DashboardService: Fetching mock data for user ${userId} with timeframe ${timeframe}`);
        
        // Simulate a network delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Return the complete mock dashboard object
        return mockDashboardData;
    }
}

export const dashboardService = new DashboardService();
