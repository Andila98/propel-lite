

export interface Unit {
  unitType: 'one-bedroom' | 'two-bedroom' | 'three-bedroom' | 'bedsitter' | 'studio';
  rent: number;
  squareFootage: number;
  isAvailable: boolean;
}

export interface Property {
  id: string;
  address: string;
  propertyType: 'apartment' | 'house' | 'bedsitter';
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  rent: number;
  imageUrl: string;
  description: string;
  units?: Unit[];
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  propertyId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentStatus: 'Paid' | 'Overdue';
  paymentHistory: { date: string; amount: number; method: string }[];
  avatarUrl: string;
}

export interface PropertyManager {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
}

export interface ActivityItem {
    id: string;
    type: 'new-tenant' | 'rent-paid' | 'lease-ending';
    description: string;
    date: string;
}
