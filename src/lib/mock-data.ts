
import type { Property, Tenant, PropertyManager, ActivityItem, Unit } from './types';

const apartmentUnits: Unit[] = [
    { unitType: 'one-bedroom', rent: 2600, squareFootage: 750, isAvailable: false },
    { unitType: 'one-bedroom', rent: 2650, squareFootage: 760, isAvailable: true },
    { unitType: 'two-bedroom', rent: 3200, squareFootage: 1050, isAvailable: true },
    { unitType: 'studio', rent: 2100, squareFootage: 500, isAvailable: true },
]


export const mockProperties: Property[] = [
  {
    id: 'p1',
    address: '123 Ocean View, Apt 4B',
    propertyType: 'apartment',
    squareFootage: 1200,
    bedrooms: 2,
    bathrooms: 2,
    rent: 2800,
    imageUrl: 'https://placehold.co/800x500.png',
    description: 'A beautiful apartment with a stunning ocean view, recently renovated kitchen, and spacious living area. Located in a high-demand area with access to a community pool and gym.',
    units: apartmentUnits,
    gallery: [
        'https://placehold.co/600x400.png',
        'https://placehold.co/600x400.png',
        'https://placehold.co/600x400.png',
        'https://placehold.co/600x400.png'
    ]
  },
  {
    id: 'p2',
    address: '456 Maple Street',
    propertyType: 'house',
    squareFootage: 1800,
    bedrooms: 3,
    bathrooms: 2.5,
    rent: 3500,
    imageUrl: 'https://placehold.co/800x500.png',
    description: 'Charming single-family home with a large backyard, perfect for families. Located in a quiet, friendly neighborhood with excellent schools nearby. Features a two-car garage and a recently updated master bathroom.',
    gallery: [
        'https://placehold.co/600x400.png',
        'https://placehold.co/600x400.png',
        'https://placehold.co/600x400.png'
    ]
  },
  {
    id: 'p3',
    address: '789 Downtown Lofts, #1205',
    propertyType: 'bedsitter',
    squareFootage: 850,
    bedrooms: 1,
    bathrooms: 1,
    rent: 2100,
    imageUrl: 'https://placehold.co/800x500.png',
    description: 'Modern loft in the heart of the city. Features high ceilings, large windows, and access to a rooftop pool and lounge area. Walking distance to popular restaurants and entertainment venues.'
  },
];

export const mockTenants: Tenant[] = [
  {
    id: 't1',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    propertyId: 'p1',
    leaseStartDate: '2023-08-01',
    leaseEndDate: '2024-07-31',
    rentStatus: 'Paid',
    paymentHistory: [
      { date: '2024-05-01', amount: 2800, method: 'ACH' },
      { date: '2024-04-01', amount: 2800, method: 'ACH' },
    ],
    avatarUrl: 'https://placehold.co/100x100.png'
  },
  {
    id: 't2',
    name: 'Bob Williams',
    email: 'bob.w@example.com',
    propertyId: 'p2',
    leaseStartDate: '2023-06-15',
    leaseEndDate: '2024-06-14',
    rentStatus: 'Overdue',
    paymentHistory: [
        { date: '2024-04-15', amount: 3500, method: 'Check' },
        { date: '2024-03-15', amount: 3500, method: 'Check' },
    ],
    avatarUrl: 'https://placehold.co/100x100.png'
  },
];

export const mockPropertyManagers: PropertyManager[] = [
    {
        id: 'pm1',
        name: 'Charles Davis',
        email: 'charles.d@propertymgmt.com',
        phone: '(555) 123-4567',
        avatarUrl: 'https://placehold.co/100x100.png',
        propertiesManaged: ['p1', 'p3'],
        accessLevel: 'Full Manager',
    },
    {
        id: 'pm2',
        name: 'Diana Miller',
        email: 'diana.m@propertymgmt.com',
        phone: '(555) 987-6543',
        avatarUrl: 'https://placehold.co/100x100.png',
        propertiesManaged: ['p2'],
        accessLevel: 'Limited Staff',
    }
];

export const mockActivities: ActivityItem[] = [
    {
        id: 'a1',
        type: 'new-tenant',
        description: 'Charlie Brown moved into 123 Ocean View, Apt 4B.',
        date: '2 days ago'
    },
    {
        id: 'a2',
        type: 'rent-paid',
        description: 'Alice Johnson paid rent for 123 Ocean View.',
        date: '4 days ago'
    },
    {
        id: 'a3',
        type: 'lease-ending',
        description: 'Lease for Bob Williams at 456 Maple Street is ending soon.',
        date: '1 week ago'
    }
];
