
'use server';

import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { AuditLog } from '@/lib/types';

type LogInput = Omit<AuditLog, 'id' | 'timestamp'>;

/**
 * Logs an important action to the audit log collection in Firestore.
 * @param actorName - The name of the user performing the action.
 * @param action - A description of the action being performed.
 * @param entity - The entity being acted upon.
 */
export async function logActivity(actorName: string, action: string, entity: { type: AuditLog['entityType']; name: string; id?: string; }) {
  try {
    if (!firestore) {
        return;
    }

    const logEntry: Omit<AuditLog, 'id'> = {
      managerName: actorName,
      action: action,
      entityType: entity.type,
      entityName: entity.name,
      timestamp: FieldValue.serverTimestamp() as any, // Cast for type compatibility
    };
    
    await firestore.collection('auditLogs').add(logEntry);
  } catch (error) {
    // We don't re-throw the error because logging should not block the primary operation.
  }
}
