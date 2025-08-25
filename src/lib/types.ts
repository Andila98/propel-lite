
import type { Timestamp } from "firebase-admin/firestore";
import type { GenerateReceiptOutput as GenReceiptOutput } from '@/ai/flows/generate-receipt';
import type { GenerateInvoiceOutput as GenInvoiceOutput } from '@/ai/flows/generate-invoice-flow';


export interface User {
    uid: string;
    email: string;
    name: string;
    role: 'landlord' | 'tenant' | 'admin' | 'manager';
    landlordId?: string; // For tenants and managers
    createdAt: Timestamp;
    avatarUrl?: string;
    profileComplete: boolean;
    permissions?: Record<Permission, boolean>;
}

export interface Property {
    id: string;
    name: string;
    address: string;
    type: 'Apartment' | 'House' | 'Bedsitter';
    landlordId: string;
    managerId?: string;
    imageUrl?: string;
    description: string;
    currency: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    // These are not stored directly in the property document in Firestore
    // but are added on when fetching the data.
    units: Unit[]; 
    // The fields below are deprecated from the main doc and live in the units subcollection
    rent?: number; 
    bedrooms?: number;
    bathrooms?: number;
}

export interface Unit {
    id: string;
    unitNumber: string;
    rent: number;
    size: string;
    isOccupied: boolean;
    tenantId?: string;
    // propertyId and landlordId are inherited from the parent property
}

export interface Tenant {
    id: string;
    uid: string;
    name: string;
    email: string;
    phone?: string;
    avatarUrl?: string;
    propertyId: string;
    rentStatus: 'Paid' | 'Overdue' | 'Partially Paid' | 'Advance';
    landlordId: string;
    currentUnitId: string;
    leaseStart: Timestamp;
    leaseEnd: Timestamp;
    paymentHistory: Payment[];
}

export interface Payment {
    id: string;
    tenantId: string;
    landlordId: string; 
    propertyId: string;
    unitId: string;
    amount: number;
    date: string; // Keep as string for client-side compatibility
    method: 'Mpesa' | 'Stripe' | 'Bank Transfer' | 'Card' | 'Other';
    status: 'pending' | 'confirmed' | 'failed';
    txRef?: string;
    type?: 'Rent' | 'Deposit' | 'Other';
}

export interface Message {
  id: string;
  tenantId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Timestamp;
  isRead: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'new-tenant' | 'rent-paid' | 'lease-ending' | 'income-drop' | 'vacancy-rate';
  description: string;
  date: string;
}

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyId: string;
  propertyAddress: string;
  description: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  submittedDate: string;
  priority?: 'High' | 'Medium' | 'Low';
  reasoning?: string;
}

export type Permission = 
  | 'canAddProperties'
  | 'canEditProperties'
  | 'canDeleteProperties'
  | 'canAddTenants'
  | 'canEditTenants'
  | 'canDeleteTenants'
  | 'canViewPayments'
  | 'canManageManagers'
  | 'canManageSettings';

export const permissionLabels: Record<Permission, string> = {
  canAddProperties: 'Add Properties',
  canEditProperties: 'Edit Properties',
  canDeleteProperties: 'Delete Properties',
  canAddTenants: 'Add Tenants',
  canEditTenants: 'Edit Tenants',
  canDeleteTenants: 'Delete Tenants',
  canViewPayments: 'View Payments',
  canManageManagers: 'Manage Managers',
  canManageSettings: 'Manage Settings',
};

export interface PropertyManager {
  id: string;
  uid: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  propertiesManaged: string[]; // Array of property IDs
  permissions: Record<Permission, boolean>;
  landlordId: string;
}

export interface AuditLog {
    id: string;
    managerName: string;
    action: string;
    entityType: 'Property' | 'Unit' | 'Tenant' | 'Manager' | 'User';
    entityName: string;
    timestamp: string | Timestamp;
}

export interface DashboardData {
    totalProperties: number;
    totalTenants: number;
    totalRevenue: number;
    revenueChange: number;
    occupancyRate: number;
    properties: Property[];
    anomalyAlerts: ActivityItem[];
    aiSummary?: string;
    latePaymentData: { month: string; latePayments: number }[];
    paymentMethodData: { name: string; value: number; fill: string }[];
}

export type GenerateReceiptOutput = GenReceiptOutput;
export type GenerateInvoiceOutput = GenInvoiceOutput;
