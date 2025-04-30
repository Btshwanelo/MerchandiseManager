import express from "express";
import { storage } from "./storage";
import { insertStoreAssignmentSchema, insertWorkItemSchema, WorkItemType } from "@shared/schema";
import { z } from "zod";

export function registerAssignmentRoutes(app: express.Express) {
  // Middleware to check if user is admin or manager
  const isAdminOrManager = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: "Access denied. Admin or Manager role required." });
    }
    
    next();
  };
  
  // Middleware to ensure the user is authenticated
  const isAuthenticated = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };
  
  // ===== Store Assignment Routes =====
  
  // Get all store assignments (admin/manager only)
  app.get("/api/assignments", isAdminOrManager, async (req, res) => {
    try {
      const assignments = await storage.getAllStoreAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching store assignments:", error);
      res.status(500).json({ error: "Failed to fetch store assignments" });
    }
  });
  
  // Get active store assignments (admin/manager only)
  app.get("/api/assignments/active", isAdminOrManager, async (req, res) => {
    try {
      const assignments = await storage.getActiveStoreAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching active store assignments:", error);
      res.status(500).json({ error: "Failed to fetch active store assignments" });
    }
  });
  
  // Get assignments for a specific store (admin/manager only)
  app.get("/api/stores/:storeId/assignments", isAdminOrManager, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      if (isNaN(storeId)) {
        return res.status(400).json({ error: "Invalid store ID" });
      }
      
      const assignments = await storage.getStoreAssignmentsByStoreId(storeId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching store assignments:", error);
      res.status(500).json({ error: "Failed to fetch store assignments" });
    }
  });
  
  // Get assignments for the current user
  app.get("/api/my-assignments", isAuthenticated, async (req, res) => {
    try {
      const assignments = await storage.getStoreAssignmentsByUserId(req.user!.id);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ error: "Failed to fetch user assignments" });
    }
  });
  
  // Get assignments for a specific user (admin/manager only)
  app.get("/api/users/:userId/assignments", isAdminOrManager, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const assignments = await storage.getStoreAssignmentsByUserId(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ error: "Failed to fetch user assignments" });
    }
  });
  
  // Create a new store assignment (admin/manager only)
  app.post("/api/assignments", isAdminOrManager, async (req, res) => {
    try {
      console.log("Received assignment request:", JSON.stringify(req.body, null, 2));
      
      // Create a modified schema that converts date strings to Date objects
      const assignmentSchema = insertStoreAssignmentSchema.extend({
        startDate: z.coerce.date(),
        endDate: z.coerce.date().nullable().optional(),
      });
      
      // Add assignedBy to request body using current user
      const requestWithAssigner = {
        ...req.body,
        assignedBy: req.user!.id
      };
      
      console.log("Request with assigner:", JSON.stringify(requestWithAssigner, null, 2));
      
      const parseResult = assignmentSchema.safeParse(requestWithAssigner);
      
      if (!parseResult.success) {
        console.error("Validation error:", parseResult.error.errors);
        return res.status(400).json({ 
          error: "Invalid assignment data", 
          details: parseResult.error.errors 
        });
      }
      
      // Use the parsed data
      const assignmentData = parseResult.data;
      console.log("Parsed assignment data:", JSON.stringify(assignmentData, null, 2));
      
      const newAssignment = await storage.createStoreAssignment(assignmentData);
      
      // If work items are specified, create them automatically
      if (req.body.workItems && Array.isArray(req.body.workItems)) {
        console.log("Processing work items:", JSON.stringify(req.body.workItems, null, 2));
        const createdWorkItems = [];
        
        for (const workItemData of req.body.workItems) {
          console.log("Processing work item:", JSON.stringify(workItemData, null, 2));
          // Default due date: 1 week from now
          const defaultDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          
          // Handle different date formats
          let dueDate;
          try {
            if (workItemData.dueDate) {
              if (workItemData.dueDate instanceof Date) {
                dueDate = workItemData.dueDate;
              } else if (typeof workItemData.dueDate === 'string') {
                dueDate = new Date(workItemData.dueDate);
              } else {
                console.log("Invalid due date format, using default");
                dueDate = defaultDueDate;
              }
            } else {
              dueDate = defaultDueDate;
            }
            
            // Validate date is valid
            if (isNaN(dueDate.getTime())) {
              console.log("Invalid date detected, using default");
              dueDate = defaultDueDate;
            }
          } catch (error) {
            console.error("Error processing due date:", error);
            dueDate = defaultDueDate;
          }
          
          const workItem = await storage.createWorkItem({
            title: workItemData.title || `Work at ${newAssignment.storeId}`,
            description: workItemData.description || null,
            type: workItemData.type || WorkItemType.STOCK_TAKE,
            userId: newAssignment.userId,
            storeId: newAssignment.storeId,
            storeAssignmentId: newAssignment.id,
            priority: workItemData.priority || "medium",
            dueDate: dueDate,
            createdBy: req.user!.id,
            status: "pending",
            notes: workItemData.notes || null,
            attachments: workItemData.attachments || []
          });
          
          createdWorkItems.push(workItem);
        }
        
        // Return assignment with created work items
        return res.status(201).json({
          assignment: newAssignment,
          workItems: createdWorkItems
        });
      }
      
      res.status(201).json(newAssignment);
    } catch (error) {
      console.error("Error creating store assignment:", error);
      res.status(500).json({ error: "Failed to create store assignment" });
    }
  });
  
  // Update a store assignment (admin/manager only)
  app.patch("/api/assignments/:id", isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
      }
      
      const existing = await storage.getStoreAssignment(id);
      if (!existing) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Allow partial updates
      const updateSchema = insertStoreAssignmentSchema.partial();
      const parseResult = updateSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid assignment data", 
          details: parseResult.error.errors 
        });
      }
      
      const updated = await storage.updateStoreAssignment(id, parseResult.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating store assignment:", error);
      res.status(500).json({ error: "Failed to update store assignment" });
    }
  });
  
  // Delete a store assignment (admin/manager only)
  app.delete("/api/assignments/:id", isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
      }
      
      const existing = await storage.getStoreAssignment(id);
      if (!existing) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Delete all work items associated with this assignment first
      const workItems = await storage.getWorkItemsByAssignmentId(id);
      for (const item of workItems) {
        await storage.deleteWorkItem(item.id);
      }
      
      const result = await storage.deleteStoreAssignment(id);
      if (result) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete assignment" });
      }
    } catch (error) {
      console.error("Error deleting store assignment:", error);
      res.status(500).json({ error: "Failed to delete store assignment" });
    }
  });
  
  // ===== Work Item Routes =====
  
  // Get all work items (admin/manager only)
  app.get("/api/work-items", isAdminOrManager, async (req, res) => {
    try {
      const workItems = await storage.getActiveWorkItems();
      res.json(workItems);
    } catch (error) {
      console.error("Error fetching work items:", error);
      res.status(500).json({ error: "Failed to fetch work items" });
    }
  });
  
  // Get work items for a specific store (admin/manager only)
  app.get("/api/stores/:storeId/work-items", isAdminOrManager, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      if (isNaN(storeId)) {
        return res.status(400).json({ error: "Invalid store ID" });
      }
      
      const workItems = await storage.getWorkItemsByStoreId(storeId);
      res.json(workItems);
    } catch (error) {
      console.error("Error fetching store work items:", error);
      res.status(500).json({ error: "Failed to fetch store work items" });
    }
  });
  
  // Get work items for current user
  app.get("/api/my-work-items", isAuthenticated, async (req, res) => {
    try {
      const workItems = await storage.getWorkItemsByUserId(req.user!.id);
      res.json(workItems);
    } catch (error) {
      console.error("Error fetching user work items:", error);
      res.status(500).json({ error: "Failed to fetch user work items" });
    }
  });
  
  // Get work items for a specific user (admin/manager only)
  app.get("/api/users/:userId/work-items", isAdminOrManager, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      
      const workItems = await storage.getWorkItemsByUserId(userId);
      res.json(workItems);
    } catch (error) {
      console.error("Error fetching user work items:", error);
      res.status(500).json({ error: "Failed to fetch user work items" });
    }
  });
  
  // Create a new work item (admin/manager only)
  app.post("/api/work-items", isAdminOrManager, async (req, res) => {
    try {
      // Create a modified schema that converts date strings to Date objects
      const workItemSchema = insertWorkItemSchema.extend({
        dueDate: z.coerce.date(),
      });
      
      // Add createdBy to request body using current user
      const requestWithCreator = {
        ...req.body,
        createdBy: req.user!.id
      };
      
      const parseResult = workItemSchema.safeParse(requestWithCreator);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid work item data", 
          details: parseResult.error.errors 
        });
      }
      
      // Use the parsed data which now has proper Date objects
      const workItemData = parseResult.data;
      
      const newWorkItem = await storage.createWorkItem(workItemData);
      res.status(201).json(newWorkItem);
    } catch (error) {
      console.error("Error creating work item:", error);
      res.status(500).json({ error: "Failed to create work item" });
    }
  });
  
  // Update a work item
  app.patch("/api/work-items/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid work item ID" });
      }
      
      const existing = await storage.getWorkItem(id);
      if (!existing) {
        return res.status(404).json({ error: "Work item not found" });
      }
      
      // Check if user has permission to update this item
      // For completed items: only admins and managers can edit
      // For non-completed items: users can only update their own work items unless they are admin/manager
      if (existing.status === 'completed' && 
          req.user!.role !== 'admin' && 
          req.user!.role !== 'manager') {
        return res.status(403).json({ error: "Access denied. Only admins and managers can edit completed work items." });
      }
      
      // For non-completed items, check user ownership
      if (existing.status !== 'completed' && 
          existing.userId !== req.user!.id && 
          req.user!.role !== 'admin' && 
          req.user!.role !== 'manager') {
        return res.status(403).json({ error: "Access denied. You can only edit your own work items." });
      }
      
      // Allow partial updates
      const updateSchema = insertWorkItemSchema.partial();
      const parseResult = updateSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Invalid work item data", 
          details: parseResult.error.errors 
        });
      }
      
      const updated = await storage.updateWorkItem(id, parseResult.data);
      res.json(updated);
    } catch (error) {
      console.error("Error updating work item:", error);
      res.status(500).json({ error: "Failed to update work item" });
    }
  });
  
  // Update a work item's status
  app.put("/api/work-items/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid work item ID" });
      }
      
      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ error: "Status is required" });
      }
      
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      const existing = await storage.getWorkItem(id);
      if (!existing) {
        return res.status(404).json({ error: "Work item not found" });
      }
      
      // Check if user has permission to update this item's status
      if (existing.userId !== req.user!.id && 
          req.user!.role !== 'admin' && 
          req.user!.role !== 'manager') {
        return res.status(403).json({ error: "Access denied. You can only update the status of your own work items." });
      }
      
      const updateData: any = { status };
      
      // If status is completed, set completedAt
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
      
      // Update the work item
      const updatedItem = await storage.updateWorkItem(id, updateData);
      
      res.json(updatedItem);
    } catch (error) {
      console.error("Error updating work item status:", error);
      res.status(500).json({ error: "Failed to update work item status" });
    }
  });
  
  // Mark a work item as complete
  app.post("/api/work-items/:id/complete", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid work item ID" });
      }
      
      const existing = await storage.getWorkItem(id);
      if (!existing) {
        return res.status(404).json({ error: "Work item not found" });
      }
      
      // Check if user has permission to complete this item
      // If item is already completed, only admins and managers can modify it
      if (existing.status === 'completed') {
        if (req.user!.role !== 'admin' && req.user!.role !== 'manager') {
          return res.status(403).json({ error: "Access denied. Item is already completed." });
        }
      }
      
      // For non-completed items, only assigned users or admins/managers can complete
      if (existing.status !== 'completed' && 
          existing.userId !== req.user!.id && 
          req.user!.role !== 'admin' && 
          req.user!.role !== 'manager') {
        return res.status(403).json({ error: "Access denied. You can only complete your own work items." });
      }
      
      const completed = await storage.completeWorkItem(id);
      
      // Get a valid product ID for the activity record
      const products = await storage.getAllProducts();
      const productId = products.length > 0 ? products[0].id : null;
      
      // Create an activity record for this completion only if we have a valid product
      if (productId !== null) {
        await storage.createActivity({
          actionType: 'work-item-completed',
          storeId: existing.storeId,
          userId: req.user!.id,
          productId: productId,
          status: 'completed',
          notes: `Completed work item: ${existing.title}`,
        });
      }
      
      res.json(completed);
    } catch (error) {
      console.error("Error completing work item:", error);
      res.status(500).json({ error: "Failed to complete work item" });
    }
  });
  
  // Delete a work item (admin/manager only)
  app.delete("/api/work-items/:id", isAdminOrManager, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid work item ID" });
      }
      
      const existing = await storage.getWorkItem(id);
      if (!existing) {
        return res.status(404).json({ error: "Work item not found" });
      }
      
      const result = await storage.deleteWorkItem(id);
      if (result) {
        res.status(204).end();
      } else {
        res.status(500).json({ error: "Failed to delete work item" });
      }
    } catch (error) {
      console.error("Error deleting work item:", error);
      res.status(500).json({ error: "Failed to delete work item" });
    }
  });
}