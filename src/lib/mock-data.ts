
import type { PropertyManager, Tenant, Property, Unit, Payment, User } from './types';
import { Timestamp } from 'firebase-admin/firestore';

// Mock Users
export const mockUsers: User[] = [
    { uid: 'landlord-1', name: 'Alex Landlord', email: 'landlord@example.com', role: 'landlord', createdAt: new Date(), profileComplete: true },
    { uid: 'tenant-1', name: 'Alice Johnson', email: 'alice.j@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'tenant-2', name: 'Bob Williams', email: 'bob.w@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'tenant-3', name: 'Charlie Brown', email: 'charlie.b@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'tenant-4', name: 'Diana Prince', email: 'diana.p@example.com', role: 'tenant', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'manager-1', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'manager', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
    { uid: 'manager-2', name: 'John Doe', email: 'john.doe@example.com', role: 'manager', landlordId: 'landlord-1', createdAt: new Date(), profileComplete: true },
];


// Mock Properties
export const mockProperties: Omit<Property, 'createdAt' | 'units'>[] = [
    {
        id: 'prop-1',
        name: 'Greenwood Heights',
        type: 'Apartment',
        address: '123 Oak Avenue, Nairobi',
        landlordId: 'landlord-1',
        managerId: 'manager-1',
        imageUrl: '/images/apartment1.png',
        description: 'A modern apartment block with great amenities and city views.',
        currency: 'KES',
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
    },
    {
        id: 'prop-3',
        name: 'Pinecrest Villa',
        type: 'House',
        address: '789 Pine Street, Runda',
        landlordId: 'landlord-1',
        managerId: 'manager-1',
        imageUrl: '/images/house2.png',
        description: 'A luxurious villa with a private swimming pool and expansive gardens.',
        currency: 'KES',
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
      { id: 'pay-1', tenantId: 'tenant-1', landlordId: 'landlord-1', unitId: 'unit-101', propertyId: 'prop-1', amount: 50000, status: 'confirmed', method: 'Mpesa', txRef: 'SGA7ABCDEF', paidAt: '2024-07-01T10:00:00Z', type: 'Rent' },
      { id: 'pay-2', tenantId: 'tenant-1', landlordId: 'landlord-1', unitId: 'unit-101', propertyId: 'prop-1', amount: 50000, status: 'confirmed', method: 'Mpesa', txRef: 'RGA6BCDEFG', paidAt: '2024-06-01T10:00:00Z', type: 'Rent' },
      { id: 'pay-3', tenantId: 'tenant-2', landlordId: 'landlord-1', unitId: 'unit-p2', propertyId: 'prop-2', amount: 150000, status: 'confirmed', method: 'Stripe', txRef: 'ch_123456789', paidAt: '2024-06-03T11:00:00Z', type: 'Rent' },
      { id: 'pay-4', tenantId: 'tenant-2', landlordId: 'landlord-1', unitId: 'unit-p2', propertyId: 'prop-2', amount: 150000, status: 'confirmed', method: 'Stripe', txRef: 'ch_987654321', paidAt: '2024-05-01T11:00:00Z', type: 'Rent' },
      { id: 'pay-5', tenantId: 'tenant-3', landlordId: 'landlord-1', unitId: 'unit-p3', propertyId: 'prop-3', amount: 250000, status: 'confirmed', method: 'Mpesa', txRef: 'SGC9CDEFGHI', paidAt: '2024-07-01T12:00:00Z', type: 'Rent' },
      { id: 'pay-6', tenantId: 'tenant-4', landlordId: 'landlord-1', unitId: 'unit-401', propertyId: 'prop-4', amount: 25000, status: 'confirmed', method: 'Mpesa', txRef: 'SGD1DEFGHIJ', paidAt: '2024-07-01T13:00:00Z', type: 'Rent' },
      { id: 'pay-7', tenantId: 'tenant-4', landlordId: 'landlord-1', unitId: 'unit-401', propertyId: 'prop-4', amount: 25000, status: 'confirmed', method: 'Mpesa', txRef: 'RGE2EFGHIJK', paidAt: '2024-06-01T13:00:00Z', type: 'Rent' },
];


// To maintain compatibility with existing components, we create a mock Tenant array
// that combines user and lease data.
export const mockTenants: any[] = mockUsers
    .filter(u => u.role === 'tenant')
    .map(user => {
        const unit = mockUnits.find(un => un.tenantId === user.uid);
        const payments = mockPayments.filter(p => p.tenantId === user.uid) || [];
        
        let rentStatus: 'Paid' | 'Overdue' | 'Partially Paid' | 'Advance' = 'Overdue';
        const rentAmount = unit?.rent || 0;
        
        const paymentsThisMonth = payments
            .filter(p => {
                const paymentDate = new Date(p.paidAt as string);
                return paymentDate.getMonth() === new Date().getMonth() && paymentDate.getFullYear() === new Date().getFullYear();
            })
            .reduce((acc, p) => acc + p.amount, 0);

        if (rentAmount > 0) {
            if (paymentsThisMonth >= rentAmount) {
                rentStatus = 'Paid';
            } else if (paymentsThisMonth > 0) {
                rentStatus = 'Partially Paid'
            }
        }

        return {
            id: user.uid,
            uid: user.uid,
            name: user.name,
            email: user.email,
            avatarUrl: 'https://placehold.co/100x100.png',
            propertyId: unit?.propertyId || '',
            currentUnitId: unit?.id,
            leaseStart: Timestamp.fromDate(new Date('2023-01-15')),
            leaseEnd: Timestamp.fromDate(new Date('2025-01-14')),
            rentStatus,
            paymentHistory: payments
        }
    })

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
