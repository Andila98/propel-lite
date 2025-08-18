
import type { PropertyManager, Tenant, Property, Unit, Payment, User, AuditLog, ActivityItem, MaintenanceRequest } from './types';
import type { DashboardData } from '@/services/dashboard-service';

// Mock Users
export const mockUsers: User[] = [
    { uid: 'landlord-1', name: 'Alex Landlord', email: 'landlord@example.com', role: 'landlord', createdAt: new Date(), profileComplete: true, avatarUrl: 'https://placehold.co/100x100.png' },
    { uid: 'tenant-1', name: 'Alice Johnson', email: 'alice.j@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'tenant-2', name: 'Bob Williams', email: 'bob.w@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'tenant-3', name: 'Charlie Brown', email: 'charlie.b@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'tenant-4', name: 'Diana Prince', email: 'diana.p@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'manager-1', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'manager', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'manager-2', name: 'John Doe', email: 'john.doe@example.com', role: 'manager', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
];

// Mock Properties
export const mockProperties: Property[] = [
    {
        id: 'prop-1',
        name: 'Greenwood Heights',
        type: 'Apartment',
        address: '123 Oak Avenue, Nairobi',
        landlordId: 'landlord-1',
        managerId: 'mgr-1',
        imageUrl: '/images/apartment1.png',
        description: 'A modern apartment block with great amenities and city views.',
        currency: 'KES',
        rent: 50000,
        bedrooms: 2,
        bathrooms: 2,
        createdAt: new Date(),
    },
    {
        id: 'prop-2',
        name: 'The Willows',
        type: 'House',
        address: '456 Maple Drive, Karen',
        landlordId: 'landlord-1',
        imageUrl: '/images/house1.png',
        description: 'A beautiful family home with a spacious backyard and serene environment.',
        currency: 'KES',
        rent: 150000,
        bedrooms: 4,
        bathrooms: 3,
        createdAt: new Date(),
    },
    {
        id: 'prop-3',
        name: 'Pinecrest Villa',
        type: 'House',
        address: '789 Pine Street, Runda',
        landlordId: 'landlord-1',
        managerId: 'mgr-1',
        imageUrl: '/images/house2.png',
        description: 'A luxurious villa with a private swimming pool and expansive gardens.',
        currency: 'KES',
        rent: 250000,
        bedrooms: 5,
        bathrooms: 5,
        createdAt: new Date(),
    },
    {
        id: 'prop-4',
        name: 'Cityview Bedsitters',
        type: 'Bedsitter',
        address: '101 Urban Plaza, Westlands',
        landlordId: 'landlord-1',
        imageUrl: '/images/apartment2.png',
        description: 'Compact and affordable bedsitters perfect for young professionals.',
        currency: 'KES',
        rent: 25000,
        bedrooms: 1,
        bathrooms: 1,
        createdAt: new Date(),
    }
];

// Mock Units
export const mockUnits: Unit[] = [
    { id: 'unit-101', propertyId: 'prop-1', landlordId: 'landlord-1', unitNumber: 'A101', rent: 50000, size: '2 Bedroom', isOccupied: true, tenantId: 'tenant-1' },
    { id: 'unit-102', propertyId: 'prop-1', landlordId: 'landlord-1', unitNumber: 'A102', rent: 52000, size: '2 Bedroom', isOccupied: false },
    { id: 'unit-p2', propertyId: 'prop-2', landlordId: 'landlord-1', unitNumber: 'Main House', rent: 150000, size: '4 Bedroom', isOccupied: true, tenantId: 'tenant-2' },
    { id: 'unit-p3', propertyId: 'prop-3', landlordId: 'landlord-1', unitNumber: 'Main Villa', rent: 250000, size: '5 Bedroom', isOccupied: true, tenantId: 'tenant-3' },
    { id: 'unit-401', propertyId: 'prop-4', landlordId: 'landlord-1', unitNumber: 'Unit 4A', rent: 25000, size: 'Bedsitter', isOccupied: true, tenantId: 'tenant-4' },
    { id: 'unit-402', propertyId: 'prop-4', landlordId: 'landlord-1', unitNumber: 'Unit 4B', rent: 25000, size: 'Bedsitter', isOccupied: false },
];

// Mock Payments
export const mockPayments: Payment[] = [
      { id: 'pay-1', tenantId: 'tenant-1', landlordId: 'landlord-1', unitId: 'unit-101', propertyId: 'prop-1', amount: 50000, status: 'confirmed', method: 'Mpesa', txRef: 'SGA7ABCDEF', date: '2024-07-01T10:00:00Z', type: 'Rent' },
      { id: 'pay-2', tenantId: 'tenant-1', landlordId: 'landlord-1', unitId: 'unit-101', propertyId: 'prop-1', amount: 50000, status: 'confirmed', method: 'Mpesa', txRef: 'RGA6BCDEFG', date: '2024-06-01T10:00:00Z', type: 'Rent' },
      { id: 'pay-3', tenantId: 'tenant-2', landlordId: 'landlord-1', unitId: 'unit-p2', propertyId: 'prop-2', amount: 150000, status: 'confirmed', method: 'Stripe', txRef: 'ch_123456789', date: '2024-06-03T11:00:00Z', type: 'Rent' },
      { id: 'pay-4', tenantId: 'tenant-2', landlordId: 'landlord-1', unitId: 'unit-p2', propertyId: 'prop-2', amount: 150000, status: 'confirmed', method: 'Stripe', txRef: 'ch_987654321', date: '2024-05-01T11:00:00Z', type: 'Rent' },
      { id: 'pay-5', tenantId: 'tenant-3', landlordId: 'landlord-1', unitId: 'unit-p3', propertyId: 'prop-3', amount: 250000, status: 'confirmed', method: 'Mpesa', txRef: 'SGC9CDEFGHI', date: '2024-07-01T12:00:00Z', type: 'Rent' },
      { id: 'pay-6', tenantId: 'tenant-4', landlordId: 'landlord-1', unitId: 'unit-401', propertyId: 'prop-4', amount: 25000, status: 'confirmed', method: 'Mpesa', txRef: 'SGD1DEFGHIJ', date: '2024-07-01T13:00:00Z', type: 'Rent' },
      { id: 'pay-7', tenantId: 'tenant-4', landlordId: 'landlord-1', unitId: 'unit-401', propertyId: 'prop-4', amount: 25000, status: 'confirmed', method: 'Mpesa', txRef: 'RGE2EFGHIJK', date: '2024-06-01T13:00:00Z', type: 'Rent' },
];

export const mockTenants: Tenant[] = [
    { id: 'tenant-1', uid: 'tenant-1', name: 'Alice Johnson', email: 'alice.j@example.com', phone: '+254712345671', avatarUrl: 'https://placehold.co/100x100.png', propertyId: 'prop-1', rentStatus: 'Paid', paymentHistory: mockPayments.filter(p=>p.tenantId === 'tenant-1'), landlordId: 'landlord-1', currentUnitId: 'unit-101', leaseStartDate: new Date('2023-08-01'), leaseEndDate: new Date('2024-07-31') },
    { id: 'tenant-2', uid: 'tenant-2', name: 'Bob Williams', email: 'bob.w@example.com', phone: '+254712345672', avatarUrl: 'https://placehold.co/100x100.png', propertyId: 'prop-2', rentStatus: 'Overdue', paymentHistory: mockPayments.filter(p=>p.tenantId === 'tenant-2'), landlordId: 'landlord-1', currentUnitId: 'unit-p2', leaseStartDate: new Date('2023-09-01'), leaseEndDate: new Date('2024-08-31') },
    { id: 'tenant-3', uid: 'tenant-3', name: 'Charlie Brown', email: 'charlie.b@example.com', phone: '+254712345673', avatarUrl: 'https://placehold.co/100x100.png', propertyId: 'prop-3', rentStatus: 'Paid', paymentHistory: mockPayments.filter(p=>p.tenantId === 'tenant-3'), landlordId: 'landlord-1', currentUnitId: 'unit-p3', leaseStartDate: new Date('2023-10-01'), leaseEndDate: new Date('2024-09-30') },
    { id: 'tenant-4', uid: 'tenant-4', name: 'Diana Prince', email: 'diana.p@example.com', phone: '+254712345674', avatarUrl: 'https://placehold.co/100x100.png', propertyId: 'prop-4', rentStatus: 'Paid', paymentHistory: mockPayments.filter(p=>p.tenantId === 'tenant-4'), landlordId: 'landlord-1', currentUnitId: 'unit-401', leaseStartDate: new Date('2023-11-01'), leaseEndDate: new Date('2024-10-31') },
];

export const mockPropertyManagers: PropertyManager[] = [
  {
    id: 'mgr-1',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+254 712 345 678',
    avatarUrl: 'https://placehold.co/100x100.png',
    accessLevel: 'Full Manager',
    propertiesManaged: ['prop-1', 'prop-3'],
    permissions: {
      canEditProperties: true,
      canDeleteProperties: true,
      canAddTenants: true,
      canEditTenants: true,
      canDeleteTenants: true,
      canViewPayments: true,
      canManageManagers: true,
      canManageSettings: true,
    },
  },
  {
    id: 'mgr-2',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+254 709 876 543',
    avatarUrl: 'https://placehold.co/100x100.png',
    accessLevel: 'Limited Staff',
    propertiesManaged: ['prop-4'],
    permissions: {
      canEditProperties: false,
      canDeleteProperties: false,
      canAddTenants: true,
      canEditTenants: true,
      canDeleteTenants: false,
      canViewPayments: true,
      canManageManagers: false,
      canManageSettings: false,
    },
  },
];

export const mockMessages: Message[] = [
  { id: 'msg1', tenantId: 'tenant-1', senderId: 'tenant-1', senderName: 'Alice Johnson', content: 'Hi, I noticed a leak under my kitchen sink.', timestamp: { seconds: Math.floor(Date.now() / 1000) - 86400, nanoseconds: 0 }, isRead: true },
  { id: 'msg2', tenantId: 'tenant-1', senderId: 'landlord-1', senderName: 'Landlord', content: 'Thanks for letting me know, Alice. I will send a plumber tomorrow morning.', timestamp: { seconds: Math.floor(Date.now() / 1000) - 80000, nanoseconds: 0 }, isRead: true },
];

export const mockDashboardData: DashboardData = {
    totalProperties: mockProperties.length,
    totalTenants: mockTenants.length,
    totalRevenue: mockPayments.filter(p => new Date(p.date as string).getMonth() === new Date().getMonth()).reduce((sum, p) => sum + p.amount, 0),
    revenueChange: 0.15, // Mock data
    occupancyRate: 0.8, // Mock data
    properties: mockProperties,
    anomalyAlerts: [
        { id: '1', type: 'income-drop', description: 'AI Alert: Total income for Greenwood Heights dropped by 15% this month compared to last month.', date: '2 days ago' },
        { id: '2', type: 'vacancy-rate', description: 'AI Alert: Vacancy rate has increased to 25%. Consider running a promotion for new tenants.', date: '5 days ago' }
    ],
    topPerformer: {
        address: 'Pinecrest Villa',
        revenue: 250000
    },
};

export const mockAuditLogs: AuditLog[] = [
    {
        id: '1',
        managerName: 'John Doe',
        action: 'Updated rent for Unit A4 from Ksh1200 to Ksh1250.',
        entityType: 'Unit',
        entityName: 'Sunshine Apartments, Unit A4',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    },
    {
        id: '2',
        managerName: 'Jane Smith',
        action: 'Deleted property "123 Oak Avenue".',
        entityType: 'Property',
        entityName: '123 Oak Avenue',
        timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    },
];

export const mockMaintenanceRequests: MaintenanceRequest[] = [
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
];
