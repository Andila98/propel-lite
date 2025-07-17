export interface Property {
  id: string;
  address: string;
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  rent: number;
  imageUrl: string;
  description: string;
}

export interface Tenant {
  id: string;
  name: string;
  propertyId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentStatus: 'Paid' | 'Overdue';
  paymentHistory: { date: string; amount: number; method: string }[];
}
