import { db } from './db';
import { userAlerts, AlertStatus, AlertType, UserAlert, InsertUserAlert } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Helper functions for working with user alerts
 */

// Create a new user alert
export async function createUserAlert(alert: InsertUserAlert): Promise<UserAlert> {
  const [result] = await db
    .insert(userAlerts)
    .values({
      ...alert,
      createdAt: alert.createdAt || new Date(),
      status: alert.status || AlertStatus.UNREAD
    })
    .returning();
  return result;
}

// Get all alerts for a user
export async function getUserAlerts(userId: number): Promise<UserAlert[]> {
  return db
    .select()
    .from(userAlerts)
    .where(eq(userAlerts.userId, userId))
    .orderBy(desc(userAlerts.createdAt));
}

// Get only unread alerts for a user
export async function getUserUnreadAlerts(userId: number): Promise<UserAlert[]> {
  return db
    .select()
    .from(userAlerts)
    .where(and(
      eq(userAlerts.userId, userId),
      eq(userAlerts.status, AlertStatus.UNREAD)
    ))
    .orderBy(desc(userAlerts.createdAt));
}

// Mark an alert as read
export async function markAlertAsRead(alertId: number): Promise<UserAlert | undefined> {
  const [result] = await db
    .update(userAlerts)
    .set({ status: AlertStatus.READ })
    .where(eq(userAlerts.id, alertId))
    .returning();
  return result;
}

// Delete an alert
export async function deleteUserAlert(alertId: number): Promise<boolean> {
  const result = await db
    .delete(userAlerts)
    .where(eq(userAlerts.id, alertId));
  return true;
}

// Helper function to create alerts for various system events
export async function createSystemAlert(params: {
  userId: number;
  type: AlertType;
  message: string;
  relatedId?: number;
}): Promise<boolean> {
  try {
    const { userId, type, message, relatedId } = params;
    
    await createUserAlert({
      userId,
      type,
      message,
      relatedId,
      status: AlertStatus.UNREAD,
      createdAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('Error creating system alert:', error);
    return false;
  }
}

// Function to create alerts when a work item is completed (for admins)
export async function createWorkItemCompletedAlert(
  workItemId: number, 
  workItemTitle: string,
  completedByUserId: number,
  adminUserId: number
): Promise<boolean> {
  return createSystemAlert({
    userId: adminUserId,
    type: AlertType.WORK_ITEM_COMPLETED,
    message: `Work item "${workItemTitle}" was completed by user #${completedByUserId}`,
    relatedId: workItemId
  });
}

// Function to create alerts when a merchandiser is assigned to a store
export async function createStoreAssignmentAlert(
  storeId: number, 
  storeName: string,
  merchandiserId: number
): Promise<boolean> {
  return createSystemAlert({
    userId: merchandiserId,
    type: AlertType.STORE_ASSIGNED,
    message: `You have been assigned to store: ${storeName}`,
    relatedId: storeId
  });
}

// Function to create alerts when a merchandiser is assigned a work item
export async function createWorkItemAssignedAlert(
  workItemId: number, 
  workItemTitle: string,
  merchandiserId: number
): Promise<boolean> {
  return createSystemAlert({
    userId: merchandiserId,
    type: AlertType.WORK_ITEM_ASSIGNED,
    message: `New work item assigned: ${workItemTitle}`,
    relatedId: workItemId
  });
}

// Function to create alerts when a due date is approaching
export async function createDueDateApproachingAlert(
  workItemId: number, 
  workItemTitle: string,
  dueDate: Date,
  merchandiserId: number
): Promise<boolean> {
  return createSystemAlert({
    userId: merchandiserId,
    type: AlertType.DUE_DATE_APPROACHING,
    message: `Due date approaching (${dueDate.toLocaleDateString()}) for: ${workItemTitle}`,
    relatedId: workItemId
  });
}