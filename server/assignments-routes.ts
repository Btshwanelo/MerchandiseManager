import express from "express";
import { storage } from "./storage";
import { insertStoreAssignmentSchema, insertWorkItemSchema, WorkItemType } from "@shared/schema";
import { z } from "zod";

// Helper function to check for assignment conflicts
async function checkAssignmentConflicts(assignmentData: any) {
  const conflicts: any[] = [];
  
  // Get all active assignments for this user
  const existingAssignments = await storage.getAssignmentsByUserId(assignmentData.userId);
  
  // Filter to only active assignments
  const activeAssignments = existingAssignments.filter(assignment => 
    assignment.status === 'active'
  );

  // Check for day overlap conflicts
  for (const existingAssignment of activeAssignments) {
    // Skip if it's the same assignment (for updates)
    if (assignmentData.id && existingAssignment.id === assignmentData.id) {
      continue;
    }

    // Get days of week for both assignments
    const newDays = assignmentData.daysOfWeek || [];
    const existingDays = existingAssignment.daysOfWeek || [];

    // Check if any days overlap
    const hasOverlappingDays = newDays.some((day: number) => existingDays.includes(day));

    if (hasOverlappingDays) {
      conflicts.push({
        assignmentId: existingAssignment.id,
        storeId: existingAssignment.storeId,
        overlappingDays: newDays.filter((day: number) => existingDays.includes(day)),
        conflictingAssignment: existingAssignment
      });
    }
  }

  return conflicts;
}

// Helper function to generate assignment dates based on frequency
function generateAssignmentDates(startDate: Date, endDate: Date, frequency: string, daysOfWeek: number[]) {
  const dates = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    if (frequency === 'daily') {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    } else if (frequency === 'weekly') {
      if (daysOfWeek.length === 0 || daysOfWeek.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    } else if (frequency === 'monthly') {
      if (daysOfWeek.length === 0 || daysOfWeek.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}

// Helper function to create recurring assignments
async function createRecurringAssignments(assignmentData: any) {
  const createdAssignments = [];
  
  const startDate = new Date(assignmentData.startDate);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + assignmentData.durationLimit!);

  // Generate all dates for the recurring assignment
  const assignmentDates = generateAssignmentDates(
    startDate, 
    endDate, 
    assignmentData.frequency!, 
    assignmentData.daysOfWeek || []
  );

  // Create the parent assignment (first assignment in the series)
  const parentAssignment = await storage.createStoreAssignment({
    ...assignmentData,
    endDate: assignmentDates.length > 1 ? assignmentDates[1] : endDate,
    parentAssignmentId: null
  });

  createdAssignments.push(parentAssignment);
  
  // Create work items for the parent assignment
  await createWorkItemsForAssignment(parentAssignment);

  // Create child assignments for remaining dates
  for (let i = 1; i < assignmentDates.length; i++) {
    const assignmentDate = assignmentDates[i];
    const nextDate = i + 1 < assignmentDates.length ? assignmentDates[i + 1] : endDate;

    const childAssignment = await storage.createStoreAssignment({
      ...assignmentData,
      startDate: assignmentDate,
      endDate: nextDate,
      parentAssignmentId: parentAssignment.id
    });

    createdAssignments.push(childAssignment);
    
    // Create work items for each child assignment
    await createWorkItemsForAssignment(childAssignment);
  }

  return createdAssignments;
}

// Helper function to create work items for an assignment
async function createWorkItemsForAssignment(assignment: any) {
  const dueDate = new Date(assignment.startDate);
  dueDate.setHours(23, 59, 59, 999); // Set due date to end of the day

  // Create Shelf stock take work item
  const shelfWorkItem = {
    title: "Shelf Stock Take",
    description: `Complete stock take for shelf inventory at store ${assignment.storeId}`,
    type: "stock_take" as WorkItemType,
    userId: assignment.userId,
    storeId: assignment.storeId,
    storeAssignmentId: assignment.id,
    dueDate: dueDate,
    priority: "medium",
    status: "pending",
    createdBy: assignment.assignedBy
  };

  // Create Backstore stock take work item
  const backstoreWorkItem = {
    title: "Backstore Stock Take",
    description: `Complete stock take for backstore inventory at store ${assignment.storeId}`,
    type: "stock_take" as WorkItemType,
    userId: assignment.userId,
    storeId: assignment.storeId,
    storeAssignmentId: assignment.id,
    dueDate: dueDate,
    priority: "medium",
    status: "pending",
    createdBy: assignment.assignedBy
  };

  // Create both work items
  await storage.createWorkItem(shelfWorkItem);
  await storage.createWorkItem(backstoreWorkItem);
}

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
  
  // Get work items for a specific assignment
  app.get("/api/assignments/:assignmentId/work-items", isAuthenticated, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
      }
      
      // Check if assignment exists
      const assignment = await storage.getStoreAssignment(assignmentId);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      // Check permissions
      const isAdminOrManager = req.user!.role === 'admin' || req.user!.role === 'manager';
      const isAssignedUser = req.user!.id === assignment.userId;
      
      // Only admin, manager, or the assigned user can access work items
      if (!isAdminOrManager && !isAssignedUser) {
        return res.status(403).json({ error: "Access denied. You do not have permission to view these work items." });
      }
      
      // Get work items for this assignment
      const workItems = await storage.getWorkItemsByAssignmentId(assignmentId);
      res.json(workItems);
    } catch (error) {
      console.error("Error fetching assignment work items:", error);
      res.status(500).json({ error: "Failed to fetch work items for this assignment" });
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
        stockTakeType: z.enum(['shelf', 'store', 'both']).default('both'),
        isRecurring: z.boolean().default(false),
        frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
        daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
        durationLimit: z.number().min(1).max(3).optional(),
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
      
      // Check for conflicts first
      if (assignmentData.isRecurring) {
        const conflicts = await checkAssignmentConflicts(assignmentData);
        if (conflicts.length > 0) {
          return res.status(409).json({
            error: "Assignment conflicts detected",
            conflicts: conflicts
          });
        }
      }
      
      let createdAssignments = [];
      
      if (assignmentData.isRecurring) {
        // Create recurring assignments
        createdAssignments = await createRecurringAssignments(assignmentData);
      } else {
        // Create single assignment
        const newAssignment = await storage.createStoreAssignment(assignmentData);
        createdAssignments = [newAssignment];
        
        // Create work items for the single assignment
        await createWorkItemsForAssignment(newAssignment);
      }
      
      // If work items are specified, create them for each assignment
      if (req.body.workItems && Array.isArray(req.body.workItems)) {
        console.log("Processing work items:", JSON.stringify(req.body.workItems, null, 2));
        const allCreatedWorkItems = [];
        
        for (const assignment of createdAssignments) {
          for (const workItemData of req.body.workItems) {
            console.log("Processing work item:", JSON.stringify(workItemData, null, 2));
            // Default due date: 1 week from assignment start date
            const defaultDueDate = new Date(assignment.startDate);
            defaultDueDate.setDate(defaultDueDate.getDate() + 7);
            
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
              title: workItemData.title || `Work at ${assignment.storeId}`,
              description: workItemData.description || null,
              type: workItemData.type || WorkItemType.STOCK_TAKE,
              userId: assignment.userId,
              storeId: assignment.storeId,
              storeAssignmentId: assignment.id,
              priority: workItemData.priority || "medium",
              dueDate: dueDate,
              createdBy: req.user!.id,
              status: "pending",
              notes: workItemData.notes || null,
              attachments: workItemData.attachments || []
            });
            
            allCreatedWorkItems.push(workItem);
          }
        }
        
        // Return assignments with created work items
        return res.status(201).json({
          assignments: createdAssignments,
          workItems: allCreatedWorkItems,
          count: createdAssignments.length
        });
      }
      
      res.status(201).json({
        assignments: createdAssignments,
        count: createdAssignments.length
      });
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
      
      // Allow partial updates with type validation
      const updateSchema = insertStoreAssignmentSchema.extend({
        stockTakeType: z.enum(['shelf', 'store', 'both']).optional(),
      }).partial();
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
  
  // Get all work items (different behavior based on role)
  app.get("/api/work-items", isAuthenticated, async (req, res) => {
    try {
      // If user is admin or manager, return all work items
      if (req.user!.role === 'admin' || req.user!.role === 'manager') {
        const workItems = await storage.getActiveWorkItems();
        return res.json(workItems);
      } 
      
      // If user is merchandiser, return only their assigned work items
      if (req.user!.role === 'merchandiser') {
        const workItems = await storage.getWorkItemsByUserId(req.user!.id);
        return res.json(workItems);
      }
      
      // Default case: access denied
      return res.status(403).json({ error: "Access denied. Invalid role." });
    } catch (error) {
      console.error("Error fetching work items:", error);
      res.status(500).json({ error: "Failed to fetch work items" });
    }
  });
  
  // Get work items for a specific store (with role-specific access)
  app.get("/api/stores/:storeId/work-items", isAuthenticated, async (req, res) => {
    try {
      const storeId = parseInt(req.params.storeId);
      if (isNaN(storeId)) {
        return res.status(400).json({ error: "Invalid store ID" });
      }
      
      // Check if store exists
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ error: "Store not found" });
      }
      
      // Admin/Manager can access all work items for any store
      if (req.user!.role === 'admin' || req.user!.role === 'manager') {
        const workItems = await storage.getWorkItemsByStoreId(storeId);
        return res.json(workItems);
      }
      
      // For merchandisers, check if they're assigned to the store
      if (req.user!.role === 'merchandiser') {
        const userAssignments = await storage.getAssignmentsByUserId(req.user!.id);
        const isAssignedToStore = userAssignments.some(a => a.storeId === storeId);
        
        if (!isAssignedToStore) {
          return res.status(403).json({ 
            error: "Access denied. You are not assigned to this store." 
          });
        }
        
        // Get all work items for this store since the merchandiser is assigned to it
        // This allows merchandisers to see all work items for their assigned stores
        const allStoreItems = await storage.getWorkItemsByStoreId(storeId);
        return res.json(allStoreItems);
      }
      
      // Default case
      return res.status(403).json({ error: "Access denied. Invalid role." });
    } catch (error) {
      console.error("Error fetching store work items:", error);
      res.status(500).json({ error: "Failed to fetch store work items" });
    }
  });
  
  // Get a single work item by ID - with special role permissions
  // This endpoint is for merchandisers to view their assigned work items
  // Different from the admin-only endpoint in routes.ts
  app.get("/api/assigned-work-items/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid work item ID" });
      }
      
      console.log(`Merchandiser retrieving work item with ID ${id}`);
      const workItem = await storage.getWorkItem(id);
      if (!workItem) {
        console.log(`Work item with ID ${id} not found`);
        return res.status(404).json({ error: "Work item not found" });
      }
      
      // Always include the storeId for the Process Form
      if (!workItem.storeId) {
        // Try to find assignment to get storeId
        const assignment = await storage.getAssignmentByWorkItemId(id);
        if (assignment) {
          workItem.storeId = assignment.storeId;
        }
      }
      
      // Check if the user has access to this work item with improved error handling
      const isAdminOrManager = req.user!.role === 'admin' || req.user!.role === 'manager';
      
      // Admin/Manager always has access
      if (isAdminOrManager) {
        console.log(`Admin/Manager access granted: User ${req.user!.id} (${req.user!.username}) accessed work item ${id}`);
      }
      // Check if the work item is specifically assigned to this user
      else if (workItem.userId === req.user!.id) {
        console.log(`Direct assignment access granted: User ${req.user!.id} (${req.user!.username}) accessed their work item ${id}`);
      }
      // Merchandisers should be able to access work items for stores they're assigned to
      else if (req.user!.role === 'merchandiser') {
        // For merchandisers, check if they're assigned to the store
        const userAssignments = await storage.getAssignmentsByUserId(req.user!.id);
        
        // Check if the user is assigned to this store
        const isAssignedToStore = userAssignments.some(a => a.storeId === workItem.storeId);
        
        if (isAssignedToStore) {
          // IMPORTANT: Allow access even if work item is not assigned directly to them but they're assigned to the store
          console.log(`Store-level access granted: User ${req.user!.id} is assigned to store ${workItem.storeId} and can access work item ${id}`);
          
          // Update the workItem.userId to match the current user to ensure permissions throughout the application
          // This doesn't change the database, just the returned object
          workItem.userId = req.user!.id;
        } else {
          // This user has no assignments to this store - deny access
          console.log(`Access denied: User ${req.user!.id} (${req.user!.username}) tried to access work item ${id} for store ${workItem.storeId} but is not assigned to that store`);
          console.log(`User assignments: ${JSON.stringify(userAssignments.map(a => a.storeId))}`);
          
          return res.status(403).json({ 
            error: "You don't have permission to access this work item.",
            details: "You are not assigned to this store. Please check your assignments list or contact your manager."
          });
        }
      } else {
        // Default case - deny access
        return res.status(403).json({ 
          error: "Access denied",
          details: "You don't have the required permissions to access this work item."
        });
      }
      
      console.log(`Fetched work item ${id} successfully for user ${req.user!.id}`);
      res.json(workItem);
    } catch (error) {
      console.error("Error fetching work item:", error);
      res.status(500).json({ error: "Failed to fetch work item" });
    }
  });

  // Get work items for current user
  app.get("/api/my-work-items", isAuthenticated, async (req, res) => {
    try {
      if (req.user!.role === 'admin' || req.user!.role === 'manager') {
        // Admins and managers only see items specifically assigned to them
        const workItems = await storage.getWorkItemsByUserId(req.user!.id);
        res.json(workItems);
      } else if (req.user!.role === 'merchandiser') {
        // Merchandisers should ONLY see work items specifically assigned to them
        const workItems = await storage.getWorkItemsByUserId(req.user!.id);
        
        console.log(`Found ${workItems.length} work items directly assigned to merchandiser with ID ${req.user!.id}`);
        res.json(workItems);
      } else {
        res.json([]);
      }
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
      
      // For non-completed items, check permissions
      if (existing.status !== 'completed') {
        if (req.user!.role === 'admin' || req.user!.role === 'manager') {
          // Admins and managers can edit any work item
          console.log(`Admin/Manager editing work item ${id}`);
        } else if (existing.userId === req.user!.id) {
          // Users can always edit their directly assigned work items
          console.log(`User editing their own work item ${id}`);
        } else if (req.user!.role === 'merchandiser') {
          // Merchandisers can edit work items for stores they're assigned to
          const userAssignments = await storage.getAssignmentsByUserId(req.user!.id);
          const isAssignedToStore = userAssignments.some(a => a.storeId === existing.storeId);
          
          if (isAssignedToStore) {
            console.log(`Merchandiser assigned to store ${existing.storeId} is editing work item ${id}`);
          } else {
            return res.status(403).json({ 
              error: "Access denied. You can only edit work items for stores you're assigned to." 
            });
          }
        } else {
          return res.status(403).json({ 
            error: "Access denied. You don't have permission to edit this work item." 
          });
        }
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
      if (req.user!.role === 'admin' || req.user!.role === 'manager') {
        // Admins and managers can update any work item status
        console.log(`Admin/Manager updating status of work item ${id}`);
      } else if (existing.userId === req.user!.id) {
        // Users can always update their directly assigned work items
        console.log(`User updating status of their own work item ${id}`);
      } else if (req.user!.role === 'merchandiser') {
        // Merchandisers can update work items for stores they're assigned to
        const userAssignments = await storage.getAssignmentsByUserId(req.user!.id);
        const isAssignedToStore = userAssignments.some(a => a.storeId === existing.storeId);
        
        if (isAssignedToStore) {
          console.log(`Merchandiser assigned to store ${existing.storeId} is updating status of work item ${id}`);
        } else {
          return res.status(403).json({ 
            error: "Access denied. You can only update work items for stores you're assigned to." 
          });
        }
      } else {
        return res.status(403).json({ 
          error: "Access denied. You don't have permission to update this work item." 
        });
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
      
      // For non-completed items, check permissions
      if (existing.status !== 'completed') {
        if (req.user!.role === 'admin' || req.user!.role === 'manager') {
          // Admins and managers can complete any work item
          console.log(`Admin/Manager completing work item ${id}`);
        } else if (existing.userId === req.user!.id) {
          // Users can always complete their directly assigned work items
          console.log(`User completing their own work item ${id}`);
        } else if (req.user!.role === 'merchandiser') {
          // Merchandisers can complete work items for stores they're assigned to
          const userAssignments = await storage.getAssignmentsByUserId(req.user!.id);
          const isAssignedToStore = userAssignments.some(a => a.storeId === existing.storeId);
          
          if (isAssignedToStore) {
            console.log(`Merchandiser assigned to store ${existing.storeId} is completing work item ${id}`);
          } else {
            return res.status(403).json({ 
              error: "Access denied. You can only complete work items for stores you're assigned to." 
            });
          }
        } else {
          return res.status(403).json({ 
            error: "Access denied. You don't have permission to complete this work item." 
          });
        }
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
      
      // Create alerts for admins and managers when work items are completed
      try {
        // Get all admin and manager users
        const users = await storage.getAllUsers();
        const adminsAndManagers = users.filter(
          user => user.role === 'admin' || user.role === 'manager'
        );
        
        // Create alert for each admin and manager
        const userDisplayName = req.user?.name || req.user?.username || 'A user';
        const alertMessage = `${userDisplayName} completed work item "${existing.title}" for store ${existing.storeId}`;
        
        for (const user of adminsAndManagers) {
          await storage.createUserAlert({
            userId: user.id,
            type: 'work_item_completed',
            title: 'Work Item Completed',
            message: alertMessage,
            relatedItemId: existing.id,
            status: 'unread'
          });
          
          console.log(`Created work item completion alert for ${user.username}`);
        }
      } catch (alertError) {
        // Don't fail the request if alert creation fails, just log the error
        console.error("Error creating work item completion alerts:", alertError);
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