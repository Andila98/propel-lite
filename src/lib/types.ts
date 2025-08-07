import type { FieldValue } from 'firebase-admin/firestore';

export interface Document {
  name: string;
  url: string;
}

export interface Unit {
  id: string; // Document ID
  propertyId: string;
  landlordId: string;
  unitNumber: string;
  rent: number;
  size?: string; // e.g. "500 sqft"
  isOccupied: boolean;
  tenantId?: string;
  gallery?: string[];
  documents?: Document[];
}

export interface Property {
  id: string; // Document ID
  name: string;
  type: 'Apartment' | 'House' | 'Bedsitter';
  address: string;
  landlordId: string;
  managerId?: string;
  createdAt: FieldValue;
  imageUrl?: string;
  description: string;
  currency?: string; // e.g., 'KES', 'USD', 'EUR'
  // Units are now in their own collection
}

export interface Payment {
  id: string; // Document ID
  tenantId: string;
  landlordId: string;
  propertyId: string;
  unitId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  method: 'Mpesa' | 'Stripe' | 'Manual';
  txRef: string; // transaction code
  paidAt: any; // Timestamp
  receiptUrl?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: any; // Can be Date, Firestore Timestamp, or string
  isRead?: boolean;
}

export interface User {
    uid: string,
    email: string,
    name: string,
    role: 'landlord' | 'tenant' | 'manager' | 'superadmin',
    phone?: string,
    landlordId?: string,  // for managers & tenants
    createdAt: any, // Timestamp
    status?: 'active' | 'invited' | 'suspended'
}

export interface Tenant extends User {
  role: 'tenant',
  currentUnitId?: string,
  leaseStart: any, // Timestamp
  leaseEnd?: any, // Timestamp
  status: 'active' | 'moved-out',
  paymentHistory: Payment[];
  avatarUrl: string;
}


export const permissionLabels: Record<string, string> = {
  canEditProperties: "Edit property details",
  canDeleteProperties: "Delete properties",
  canAddTenants: "Add and assign tenants",
  canEditTenants: "Edit tenant information",
  canDeleteTenants: "Remove tenants",
  canViewPayments: "View financial records and payments",
  canManageManagers: "Add, edit, and remove other managers",
  canManageSettings: "Access and modify application settings",
};
export type Permission = keyof typeof permissionLabels;

export interface PropertyManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  accessLevel: 'Full Manager' | 'Limited Staff';
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
