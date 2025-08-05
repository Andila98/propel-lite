
import type { PropertyManager, Tenant, Property } from './types';

export const mockPropertyManagers: PropertyManager[] = [
  {
    id: 'mgr-1',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+254 712 345 678',
    avatarUrl: 'https://placehold.co/100x100.png',
    accessLevel: 'Full Manager',
    propertiesManaged: ['prop-1', 'prop-2', 'prop-3'],
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

export const mockTenants: Tenant[] = [
  {
    id: 'tenant-1',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    propertyId: 'prop-1',
    leaseStartDate: '2023-01-15',
    leaseEndDate: '2025-01-14',
    rentStatus: 'Paid',
    paymentHistory: [
      { id: 'pay-1', date: '2024-07-01', amount: 1200, method: 'M-Pesa', type: 'Rent' },
      { id: 'pay-2', date: '2024-06-01', amount: 1200, method: 'M-Pesa', type: 'Rent' },
    ],
    avatarUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: 'tenant-2',
    name: 'Bob Williams',
    email: 'bob.w@example.com',
    propertyId: 'prop-2',
    leaseStartDate: '2023-08-01',
    leaseEndDate: '2024-07-31',
    rentStatus: 'Overdue',
     paymentHistory: [
      { id: 'pay-3', date: '2024-06-03', amount: 2500, method: 'Credit Card', type: 'Rent' },
      { id: 'pay-4', date: '2024-05-01', amount: 2500, method: 'Credit Card', type: 'Rent' },
    ],
    avatarUrl: 'https://placehold.co/100x100.png',
  },
   {
    id: 'tenant-3',
    name: 'Charlie Brown',
    email: 'charlie.b@example.com',
    propertyId: 'prop-3',
    leaseStartDate: '2024-02-01',
    leaseEndDate: '2025-01-31',
    rentStatus: 'Paid',
     paymentHistory: [
      { id: 'pay-5', date: '2024-07-01', amount: 3500, method: 'M-Pesa', type: 'Rent' },
    ],
    avatarUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: 'tenant-4',
    name: 'Diana Prince',
    email: 'diana.p@example.com',
    propertyId: 'prop-4',
    leaseStartDate: '2024-05-20',
    leaseEndDate: '2025-05-19',
    rentStatus: 'Paid',
     paymentHistory: [
      { id: 'pay-6', date: '2024-07-01', amount: 1500, method: 'M-Pesa', type: 'Rent' },
      { id: 'pay-7', date: '2024-06-01', amount: 1500, method: 'M-Pesa', type: 'Rent' },
    ],
    avatarUrl: 'https://placehold.co/100x100.png',
  },
];

export const mockProperties: Property[] = [
    {
        id: 'prop-1',
        address: '123 Oak Avenue',
        propertyType: 'house',
        squareFootage: 1500,
        bedrooms: 3,
        bathrooms: 2,
        rent: 1200,
        currency: 'USD',
        imageUrl: '/placeholders/house1.png',
        description: 'A beautiful family home with a spacious backyard.',
    },
    {
        id: 'prop-2',
        address: '456 Maple Drive',
        propertyType: 'apartment',
        squareFootage: 800,
        bedrooms: 2,
        bathrooms: 1,
        rent: 2500,
        currency: 'USD',
        imageUrl: '/placeholders/apartment1.png',
        description: 'A modern apartment in the heart of the city.',
         units: [
            { unitNumber: 'A101', unitType: 'one-bedroom', rent: 2500, squareFootage: 800, isAvailable: false },
        ]
    },
    {
        id: 'prop-3',
        address: '789 Pine Street',
        propertyType: 'house',
        squareFootage: 2200,
        bedrooms: 4,
        bathrooms: 3,
        rent: 3500,
        currency: 'USD',
        imageUrl: '/placeholders/house2.png',
        description: 'A luxurious villa with a swimming pool.',
    },
    {
        id: 'prop-4',
        address: '101 Sunshine Apartments, Unit A4',
        propertyType: 'apartment',
        squareFootage: 600,
        bedrooms: 1,
        bathrooms: 1,
        rent: 1500,
        currency: 'USD',
        imageUrl: '/placeholders/apartment2.png',
        description: 'A cozy studio apartment with great views.',
        units: [
            { unitNumber: 'A4', unitType: 'studio', rent: 1500, squareFootage: 600, isAvailable: false },
        ]
    }
];
