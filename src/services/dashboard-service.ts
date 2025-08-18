
/**
 * @fileOverview A service class for aggregating dashboard data.
 * This centralizes the complex queries required for the main dashboard view.
 */

import { admin } from '@/lib/firebase-admin';
import type { Property, Tenant, Payment, ActivityItem } from '@/lib/types';

export interface DashboardData {
    totalProperties: number;
    totalTenants: number;
    totalRevenue: number;
    revenueChange: number; // as a decimal, e.g., 0.05 for +5%
    occupancyRate: number; // as a decimal, e.g., 0.95 for 95%
    properties: Property[];
    anomalyAlerts: ActivityItem[];
    topPerformer: { address: string; revenue: number } | null;
}

class DashboardService {
    private propertiesCollection = admin.firestore().collection('properties');
    private usersCollection = admin.firestore().collection('users');
    private paymentsCollection = admin.firestore().collection('payments');

    /**
     * Gathers all necessary data for the landlord's dashboard.
     * @param landlordId The UID of the landlord.
     * @param timeframe The time period for revenue calculation ('week', 'month', 'quarter').
     * @returns A promise that resolves to the aggregated dashboard data.
     */
    async getDashboardData(landlordId: string, timeframe: string): Promise<DashboardData> {
        console.log(`DashboardService: Fetching data for landlord ${landlordId} with timeframe ${timeframe}`);

        const [properties, tenants, payments] = await Promise.all([
            this.getProperties(landlordId),
            this.getTenants(landlordId),
            this.getPayments(landlordId, timeframe)
        ]);

        const totalProperties = properties.length;
        const totalTenants = tenants.length;
        
        const { totalRevenue, revenueChange, topPerformer } = this.calculateRevenueMetrics(payments, properties, timeframe);
        const occupancyRate = this.calculateOccupancy(properties);
        const anomalyAlerts = this.generateAnomalyAlerts(tenants, payments, properties);

        return {
            totalProperties,
            totalTenants,
            totalRevenue,
            revenueChange,
            occupancyRate,
            properties: properties.slice(0, 5), // Showcase up to 5 properties
            anomalyAlerts,
            topPerformer,
        };
    }

    private async getProperties(landlordId: string): Promise<Property[]> {
        const snapshot = await this.propertiesCollection.where('landlordId', '==', landlordId).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
    }

    private async getTenants(landlordId: string): Promise<Tenant[]> {
        const snapshot = await this.usersCollection.where('landlordId', '==', landlordId).where('role', '==', 'tenant').get();
        return snapshot.docs.map(doc => doc.data() as Tenant);
    }
    
    private async getPayments(landlordId: string, timeframe: string) {
        // This is a simplified fetch. In a real app, you might want to index payments by landlordId.
        // For now, we fetch all and filter. This is not scalable.
        const snapshot = await this.paymentsCollection.get();
        const allPayments = snapshot.docs.map(doc => doc.data() as Payment);
        return allPayments.filter(p => p.landlordId === landlordId);
    }

    private calculateRevenueMetrics(payments: Payment[], properties: Property[], timeframe: string) {
        // In a real app, this would involve more complex date-based queries.
        // This is a simplified version for demonstration.
        const totalRevenue = payments.reduce((acc, p) => acc + p.amount, 0);
        
        const revenueByProperty = payments.reduce((acc, payment) => {
            if (!acc[payment.propertyId]) {
                acc[payment.propertyId] = 0;
            }
            acc[payment.propertyId] += payment.amount;
            return acc;
        }, {} as Record<string, number>);

        let topPerformer: { address: string; revenue: number } | null = null;
        if (Object.keys(revenueByProperty).length > 0) {
            const topPropertyId = Object.keys(revenueByProperty).reduce((a, b) => revenueByProperty[a] > revenueByProperty[b] ? a : b);
            const topProperty = properties.find(p => p.id === topPropertyId);
            if(topProperty) {
                topPerformer = {
                    address: topProperty.address,
                    revenue: revenueByProperty[topPropertyId]
                };
            }
        }

        return {
            totalRevenue,
            revenueChange: 0.15, // Mock data
            topPerformer
        };
    }

    private calculateOccupancy(properties: Property[]): number {
        if (properties.length === 0) return 0;
        const occupiedCount = properties.filter(p => (p as any).units?.some((u: any) => u.isOccupied)).length;
        return occupiedCount / properties.length;
    }

    private generateAnomalyAlerts(tenants: Tenant[], payments: Payment[], properties: Property[]): ActivityItem[] {
        // This is a mock implementation of AI-powered anomaly detection.
        return [
            { id: '1', type: 'income-drop', description: 'AI Alert: Total income for Greenwood Heights dropped by 15% this month compared to last month.', date: '2 days ago' },
            { id: '2', type: 'vacancy-rate', description: 'AI Alert: Vacancy rate has increased to 25%. Consider running a promotion for new tenants.', date: '5 days ago' }
        ];
    }
}

export const dashboardService = new DashboardService();
