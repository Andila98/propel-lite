import type { FieldValue } from 'firebase-admin/firestore';

export interface Document {
  name: string;
  url: string;
}

export interface Unit {
  unitNumber: string;
  unitType: 'one-bedroom' | 'two-bedroom' | 'three-bedroom' | 'bedsitter' | 'studio';
  rent: number;
  squareFootage: number;
  isAvailable: boolean;
  gallery?: string[];
  documents?: Document[];
}

export interface Property {
  id: string;
  address: string;
  propertyType: 'apartment' | 'house' | 'bedsitter';
  squareFootage: number;
  bedrooms: number;
  bathrooms: number;
  rent: number;
  currency: string; // e.g., 'KES', 'USD'
  imageUrl: string;
  description: string;
  units?: Unit[];
  gallery?: string[];
  createdAt?: FieldValue;
  landlordId?: string;
}

export interface Payment {
  id: string;
  date: string;
  amount: number;
  method: string;
  type: 'Rent' | 'Deposit' | 'Fee' | 'Other';
  notes?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any; // Can be Date, Firestore Timestamp, or string
  isRead?: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  email: string;
  propertyId: string;
  leaseStartDate: string;
  leaseEndDate: string;
  rentStatus: 'Paid' | 'Overdue' | 'Partially Paid' | 'Advance';
  paymentHistory: Payment[];
  avatarUrl: string;
}

export const permissionLabels: Record<string, string> = {
  canEditProperties: "Edit Properties",
  canDeleteProperties: "Delete Properties",
  canAddTenants: "Add Tenants",
  canEditTenants: "Edit Tenants",
  canDeleteTenants: "Delete Tenants",
  canViewPayments: "View Payments",
  canManageManagers: "Manage Other Managers",
  canManageSettings: "Access App Settings",
};
export type Permission = keyof typeof permissionLabels;


export interface PropertyManager {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatarUrl: string;
    propertiesManaged: string[];
    permissions: Record<Permission, boolean>;
}

export interface ActivityItem {
    id:string;
    type: 'new-tenant' | 'rent-paid' | 'lease-ending' | 'income-drop' | 'vacancy-rate';
    description: string;
    date: string;
}

export interface AuditLog {
  id: string;
  managerName: string;
  action: string;
  entityType: 'Property' | 'Unit' | 'Tenant' | 'Manager';
  entityName: string;
  timestamp: string;
}

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyAddress: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority?: 'High' | 'Medium' | 'Low';
  reasoning?: string;
  submittedDate: string;
}
