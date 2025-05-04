import { Router } from 'express';
import { storage } from '../storage';
import { AlertStatus, AlertType, UserRole } from '@shared/schema';
import { insertUserAlertSchema } from '@shared/schema';
import { checkAuth, checkRole } from '../auth';

export const userAlertsRouter = Router();

// Get all alerts for authenticated user
userAlertsRouter.get('/user-alerts', checkAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const alerts = await storage.getUserAlerts(userId);
    return res.json(alerts);
  } catch (error) {
    console.error('Error fetching user alerts:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch user alerts' 
    });
  }
});

// Get unread alerts for authenticated user
userAlertsRouter.get('/user-alerts/unread', checkAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const alerts = await storage.getUserUnreadAlerts(userId);
    return res.json(alerts);
  } catch (error) {
    console.error('Error fetching unread user alerts:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch unread user alerts' 
    });
  }
});

// Mark an alert as read
userAlertsRouter.patch('/user-alerts/:id/read', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const alertId = parseInt(id);
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }
    
    const updatedAlert = await storage.markAlertAsRead(alertId);
    
    if (!updatedAlert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    return res.json(updatedAlert);
  } catch (error) {
    console.error('Error marking alert as read:', error);
    return res.status(500).json({ 
      error: 'Failed to mark alert as read' 
    });
  }
});

// Delete an alert
userAlertsRouter.delete('/user-alerts/:id', checkAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const alertId = parseInt(id);
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }
    
    const success = await storage.deleteUserAlert(alertId);
    
    if (!success) {
      return res.status(404).json({ error: 'Alert not found or could not be deleted' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return res.status(500).json({ 
      error: 'Failed to delete alert' 
    });
  }
});

// Create a new alert (admin/managers only)
userAlertsRouter.post('/user-alerts', checkRole([UserRole.ADMIN, UserRole.MANAGER]), async (req, res) => {
  try {
    const alertSchema = insertUserAlertSchema.safeParse(req.body);
    
    if (!alertSchema.success) {
      return res.status(400).json({ 
        error: 'Invalid alert data', 
        details: alertSchema.error.format() 
      });
    }
    
    const newAlert = await storage.createUserAlert(alertSchema.data);
    return res.status(201).json(newAlert);
  } catch (error) {
    console.error('Error creating user alert:', error);
    return res.status(500).json({ 
      error: 'Failed to create user alert' 
    });
  }
});

// Helper function to create alerts for various events
export async function createSystemAlert(params: {
  userId: number;
  type: AlertType;
  message: string;
  relatedId?: number;
}) {
  try {
    const { userId, type, message, relatedId } = params;
    
    await storage.createUserAlert({
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