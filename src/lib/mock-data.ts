import type { Property, Tenant } from './types';

export const mockProperties: Property[] = [
  {
    id: 'p1',
    address: '123 Ocean View, Apt 4B',
    squareFootage: 1200,
    bedrooms: 2,
    bathrooms: 2,
    rent: 2800,
    imageUrl: 'https://placehold.co/400x400.png',
    description: 'A beautiful apartment with a stunning ocean view, recently renovated kitchen, and spacious living area.'
  },
  {
    id: 'p2',
    address: '456 Maple Street',
    squareFootage: 1800,
    bedrooms: 3,
    bathrooms: 2.5,
    rent: 3500,
    imageUrl: 'https://placehold.co/400x400.png',
    description: 'Charming single-family home with a large backyard, perfect for families. Located in a quiet, friendly neighborhood.'
  },
  {
    id: 'p3',
    address: '789 Downtown Lofts, #1205',
    squareFootage: 850,
    bedrooms: 1,
    bathrooms: 1,
    rent: 2100,
    imageUrl: 'https://placehold.co/400x400.png',
    description: 'Modern loft in the heart of the city. Features high ceilings, large windows, and access to a rooftop pool.'
  },
];

export const mockTenants: Tenant[] = [
  {
    id: 't1',
    name: 'Alice Johnson',
    propertyId: 'p1',
    leaseStartDate: '2023-08-01',
    leaseEndDate: '2024-07-31',
    rentStatus: 'Paid',
    paymentHistory: [
      { date: '2024-05-01', amount: 2800, method: 'ACH' },
      { date: '2024-04-01', amount: 2800, method: 'ACH' },
    ]
  },
  {
    id: 't2',
    name: 'Bob Williams',
    propertyId: 'p2',
    leaseStartDate: '2023-06-15',
    leaseEndDate: '2024-06-14',
    rentStatus: 'Overdue',
    paymentHistory: [
        { date: '2024-04-15', amount: 3500, method: 'Check' },
        { date: '2024-03-15', amount: 3500, method: 'Check' },
    ]
  },
];
