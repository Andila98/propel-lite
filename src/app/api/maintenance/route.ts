
import { NextResponse } from 'next/server';
import type { MaintenanceRequest } from '@/lib/types';

// In a real app, this data would come from Firestore
const mockMaintenanceRequests: MaintenanceRequest[] = [
    {
        id: 'maint-1',
        tenantId: 'tenant-1',
        tenantName: 'Alice Johnson',
        propertyId: 'prop-1',
        propertyAddress: '123 Oak Avenue',
        description: 'The kitchen sink is completely clogged and overflowing.',
        status: 'Pending',
        submittedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
        id: 'maint-2',
        tenantId: 'tenant-2',
        tenantName: 'Bob Williams',
        propertyId: 'prop-2',
        propertyAddress: '456 Maple Drive',
        description: 'The front door lock is sticking. It is difficult to open.',
        status: 'Pending',
        submittedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
        id: 'maint-3',
        tenantId: 'tenant-3',
        tenantName: 'Charlie Brown',
        propertyId: 'prop-3',
        propertyAddress: '789 Pine Street',
        description: 'There is no hot water in the main bathroom.',
        status: 'Pending',
        submittedDate: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    },
     {
        id: 'maint-4',
        tenantId: 'tenant-4',
        tenantName: 'Diana Prince',
        propertyId: 'prop-4',
        propertyAddress: '101 Sunshine Apartments, Unit A4',
        description: 'One of the burners on the electric stove is not working.',
        status: 'Pending',
        submittedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    },
    {
        id: 'maint-5',
        tenantId: 'tenant-1',
        tenantName: 'Alice Johnson',
        propertyId: 'prop-1',
        propertyAddress: '123 Oak Avenue',
        description: 'The garbage disposal is making a loud grinding noise.',
        status: 'Pending',
        submittedDate: new Date().toISOString(), // Today
    }
];

export async function GET() {
    try {
        // AI prioritization is not implemented. Returning mock data.
        return NextResponse.json(mockMaintenanceRequests);
    } catch (error: any) {
        console.error('API Error: Failed to get maintenance requests:', error);
        return NextResponse.json(
            { error: `Failed to fetch requests: ${error.message}` },
            { status: 500 }
        );
    }
}
