'use server';

import { firestore, isFirebaseAdminInitialized } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AuditLog } from '@/lib/types';

/**
 * Logs an important action to the audit log collection in Firestore.
 * @param actorName - The name of the user performing the action.
 * @param action - A description of the action being performed.
 * @param entity - The entity being acted upon.
 * @param landlordId - The ID of the landlord account this log belongs to.
 */
export async function logActivity(actorName: string, action: string, entity: { type: AuditLog['entityType']; name: string; id?: string; }, landlordId: string) {
  try {
    if (!isFirebaseAdminInitialized) {
        console.warn("[AUDIT_LOG_SERVICE] Firestore not initialized. Skipping log.");
        return;
    }

    const logEntry: Omit<AuditLog, 'id'> = {
      managerName: actorName,
      action: action,
      entityType: entity.type,
      entityName: entity.name,
      landlordId: landlordId, // Add landlordId for data scoping
      timestamp: FieldValue.serverTimestamp(),
    };

    await firestore.collection('auditLogs').add(logEntry);
  } catch (error: unknown) {
    console.error('[AUDIT_LOG_SERVICE_ERROR] Failed to log activity:', error);
    // We don't re-throw the error because logging should not block the primary operation.
  }
}
