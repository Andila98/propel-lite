
import type { Timestamp } from "firebase-admin/firestore";

export interface User {
    uid: string;
    email: string;
    name: string;
    role: 'landlord' | 'tenant' | 'admin' | 'manager';
    landlordId?: string; // For tenants and managers
    createdAt: Date | Timestamp;
    avatarUrl?: string;
    profileComplete: boolean;
}

export interface Property {
    id: string;
    name: string;
    address: string;
    type: 'Apartment' | 'House' | 'Bedsitter';
    landlordId: string;
    managerId?: string;
    imageUrl: string;
    description: string;
    rent?: number; // Rent can be per-unit
    currency?: string;
    createdAt: Timestamp;
    units: Unit[];
}

export interface Unit {
    id: string;
    propertyId: string;
    landlordId: string;
    unitNumber: string;
    rent: number;
    size: string;
    isOccupied: boolean;
    tenantId?: string;
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
    paymentHistory: Payment[];
    landlordId: string;
    currentUnitId?: string;
    leaseStart: Timestamp;
    leaseEnd: Timestamp;
}

export interface Payment {
    id: string;
    tenantId: string;
    landlordId: string; // Keep for easier querying
    propertyId: string;
    unitId: string;
    amount: number;
    date?: string; // Legacy
    paidAt: string | Timestamp;
    method: 'Mpesa' | 'Stripe' | 'Bank Transfer';
    status: 'pending' | 'confirmed' | 'failed';
    txRef?: string; // Transaction reference
    type?: 'Rent' | 'Deposit' | 'Other';
}

export interface Message {
  id: string;
  senderId: string; // 'landlord-1' or tenant's UID
  senderName: string; // 'You' or tenant's name
  content: string;
  timestamp: any; // Firestore timestamp
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
  | 'canEditProperties'
  | 'canDeleteProperties'
  | 'canAddTenants'
  | 'canEditTenants'
  | 'canDeleteTenants'
  | 'canViewPayments'
  | 'canManageManagers'
  | 'canManageSettings';

export const permissionLabels: Record<Permission, string> = {
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
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  accessLevel: 'Full Manager' | 'Limited Staff';
  propertiesManaged: string[]; // Array of property IDs
  permissions: Record<Permission, boolean>;
}

export interface AuditLog {
    id: string;
    managerName: string;
    action: string;
    entityType: 'Property' | 'Unit' | 'Tenant' | 'Manager';
    entityName: string;
    timestamp: string;
}
