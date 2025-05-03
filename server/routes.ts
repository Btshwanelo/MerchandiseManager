import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db, pool } from "./db"; // Add import for database operations
import { setupAuth, checkRole, isAuthenticated } from "./auth";
import { 
  UserRole, 
  StockLocation,
  StockTake,
  InsertStockTakeItem
} from "@shared/schema";
import { z } from "zod";
import { 
  insertProductSchema, 
  insertStoreSchema, 
  insertShelfSchema 
} from "@shared/schema";
import multer from "multer";
import path from "path";
import { registerUserRoutes } from "./user-routes";
import { registerAssignmentRoutes } from "./assignments-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes first
  setupAuth(app);
  
  // Get all merchandisers (for admins/managers)
  app.get("/api/users/merchandisers", checkRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const merchandisers = allUsers.filter(u => u.role === UserRole.MERCHANDISER);
      
      // Remove password fields before sending
      const safeUsers = merchandisers.map(({ password, ...rest }) => rest);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching merchandisers:", error);
      res.status(500).json({ message: "Failed to fetch merchandisers" });
    }
  });
  
  // Endpoint for bulk deleting items
  app.delete("/api/bulk-delete/:resource", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { resource } = req.params;
      const { ids } = req.body as { ids: number[] };
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty ids array" });
      }
      
      let deleteCount = 0;
      let success = false;
      
      // Perform deletion based on resource type
      switch (resource) {
        case "products":
          for (const id of ids) {
            success = await storage.deleteProduct(id);
            if (success) deleteCount++;
          }
          break;
        case "stores":
          for (const id of ids) {
            success = await storage.deleteStore(id);
            if (success) deleteCount++;
          }
          break;
        case "users":
          for (const id of ids) {
            // Prevent deleting own account
            if (id === req.user!.id) {
              continue;
            }
            success = await storage.deleteUser(id);
            if (success) deleteCount++;
          }
          break;
        // Add other resources as needed
        default:
          return res.status(404).json({ message: "Resource type not supported for bulk deletion" });
      }
      
      res.json({ 
        success: true, 
        deletedCount: deleteCount,
        message: `Successfully deleted ${deleteCount} ${resource}`
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to perform bulk deletion" });
    }
  });
  
  // Set up user management routes
  registerUserRoutes(app);
  
  // Set up store assignment and work item routes
  registerAssignmentRoutes(app);
  
  // Work Items Endpoints for Admin
  
  // Get all work items (admin only)
  app.get("/api/work-items", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      console.log("Starting to fetch work items...");
      
      // First, do a direct query to check how many work items exist
      const checkQuery = await pool.query('SELECT COUNT(*) FROM work_items');
      console.log(`Direct database check: ${checkQuery.rows[0].count} work items exist in database`);
      
      // Also check completed ones specifically
      const completedQuery = await pool.query("SELECT COUNT(*) FROM work_items WHERE status = 'completed'");
      console.log(`Direct database check: ${completedQuery.rows[0].count} COMPLETED work items exist`);
      
      // Get all work items with user and store data already included
      console.log("Calling storage.getAllWorkItems() method...");
      const workItems = await storage.getAllWorkItems();
      console.log(`Fetched ${workItems.length} work items from getAllWorkItems method`);
      
      if (workItems.length > 0) {
        console.log("Work items sample:", 
          workItems.slice(0, 3).map(item => ({ id: item.id, title: item.title, status: item.status }))
        );
      } else {
        console.log("No work items were returned from getAllWorkItems method");
      }
      
      res.json(workItems);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to retrieve work items" });
    }
  });
  
  // Get single work item by ID (admin only)
  app.get("/api/work-items/:id", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const workItem = await storage.getWorkItemById(id);
      
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      res.json(workItem);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to retrieve work item" });
    }
  });
  
  // Update work item with audit trail (admin only)
  app.patch("/api/work-items/:id", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, auditComment } = req.body;
      
      if (!auditComment) {
        return res.status(400).json({ message: "Audit comment is required for admin edits" });
      }
      
      const workItem = await storage.getWorkItemById(id);
      
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Create audit trail entry
      await storage.createAuditEntry({
        workItemId: id,
        userId: req.user!.id,
        action: "updated",
        timestamp: new Date(),
        previousStatus: workItem.status,
        newStatus: status || workItem.status,
        comment: auditComment
      });
      
      // Update the work item if status has changed
      let updatedWorkItem = workItem;
      if (status && status !== workItem.status) {
        updatedWorkItem = await storage.updateWorkItem(id, { status });
      }
      
      res.json(updatedWorkItem);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update work item" });
    }
  });
  
  // Get audit trail for a work item (admin only)
  app.get("/api/work-items/:id/audit", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const auditTrail = await storage.getWorkItemAuditTrail(id);
      res.json(auditTrail);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to retrieve audit trail" });
    }
  });
  
  // Process Form Routes for Merchandising, Competitors, and Orders
  
  // Merchandising Information
  app.post("/api/merchandising", isAuthenticated, async (req, res) => {
    try {
      const merchandisingSchema = z.object({
        storeId: z.number(),
        workItemId: z.number(),
        merchandisingItems: z.array(z.object({
          productId: z.number(),
          price: z.number(),
          notes: z.string().optional(),
        }))
      });
      
      const validatedData = merchandisingSchema.parse(req.body);
      const result = await storage.createMerchandisingData({
        ...validatedData,
        userId: req.user!.id,
        date: new Date()
      });
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid merchandising data", errors: error.errors });
      }
      console.error("Error creating merchandising data:", error);
      res.status(500).json({ message: "Failed to create merchandising data" });
    }
  });
  
  // Competitor Merchandising Information
  app.post("/api/competitor-merchandising", isAuthenticated, async (req, res) => {
    try {
      const competitorSchema = z.object({
        storeId: z.number(),
        workItemId: z.number(),
        brand: z.string(),
        productDescription: z.string(),
        promoType: z.string().optional(),
        promoDetails: z.string().optional(),
        price: z.number().optional(),
        pictureUrl: z.string().optional(),
      });
      
      const validatedData = competitorSchema.parse(req.body);
      const result = await storage.createCompetitorMerchandising({
        ...validatedData,
        userId: req.user!.id,
        date: new Date()
      });
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid competitor data", errors: error.errors });
      }
      console.error("Error creating competitor data:", error);
      res.status(500).json({ message: "Failed to create competitor merchandising data" });
    }
  });
  
  // Orders Information
  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      const orderSchema = z.object({
        storeId: z.number(),
        workItemId: z.number(),
        products: z.array(z.object({
          productId: z.number(),
          quantity: z.number(),
        })).optional(),
        notes: z.string(),
        priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
      });
      
      const validatedData = orderSchema.parse(req.body);
      const result = await storage.createOrder({
        ...validatedData,
        userId: req.user!.id,
        status: "pending",
        date: new Date()
      });
      
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });
  
  // Get orders by work item ID
  app.get("/api/orders/by-work-item/:workItemId", isAuthenticated, async (req, res) => {
    try {
      const workItemId = parseInt(req.params.workItemId);
      if (isNaN(workItemId)) {
        return res.status(400).json({ message: "Invalid work item ID" });
      }
      
      // Get the work item first to check if it exists and verify permissions
      const workItem = await storage.getWorkItemById(workItemId);
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Only allow access if the user is an admin, manager, or the assignee of the work item
      const user = req.user!;
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER && workItem.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to access this work item's orders" });
      }
      
      console.log(`Fetching order data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      // For the first version, we'll use the createOrder data that's stored with the work item completion
      try {
        // Get the orders by workItemId from storage
        const order = await storage.getOrderByWorkItemId(workItemId);
        console.log(`Found order data for work item ${workItemId}:`, order);
        res.json(order);
      } catch (err) {
        console.log("Error fetching orders (expected if not found):", err);
        res.json(null);
      }
    } catch (error) {
      console.error("Error getting order by work item:", error);
      res.status(500).json({ message: "Failed to get order information" });
    }
  });
  
  // Get merchandising data by work item ID
  app.get("/api/merchandising/by-work-item/:workItemId", isAuthenticated, async (req, res) => {
    try {
      const workItemId = parseInt(req.params.workItemId);
      if (isNaN(workItemId)) {
        return res.status(400).json({ message: "Invalid work item ID" });
      }
      
      // Get the work item first to check if it exists and verify permissions
      const workItem = await storage.getWorkItemById(workItemId);
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Only allow access if the user is an admin, manager, or the assignee of the work item
      const user = req.user!;
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER && workItem.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to access this work item's merchandising data" });
      }
      
      console.log(`Fetching merchandising data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      // For the first version, we'll use the createMerchandisingData call that's stored with the work item completion
      try {
        // Get the merchandising data by workItemId from storage
        const merchandisingData = await storage.getMerchandisingDataByWorkItemId(workItemId);
        console.log(`Found merchandising data for work item ${workItemId}:`, merchandisingData);
        res.json(merchandisingData);
      } catch (err) {
        console.log("Error fetching merchandising data (expected if not found):", err);
        res.json(null);
      }
    } catch (error) {
      console.error("Error getting merchandising data by work item:", error);
      res.status(500).json({ message: "Failed to get merchandising information" });
    }
  });
  
  // Get competitor merchandising data by work item ID
  app.get("/api/competitor-merchandising/by-work-item/:workItemId", isAuthenticated, async (req, res) => {
    try {
      const workItemId = parseInt(req.params.workItemId);
      if (isNaN(workItemId)) {
        return res.status(400).json({ message: "Invalid work item ID" });
      }
      
      // Get the work item first to check if it exists and verify permissions
      const workItem = await storage.getWorkItemById(workItemId);
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Only allow access if the user is an admin, manager, or the assignee of the work item
      const user = req.user!;
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER && workItem.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to access this work item's competitor data" });
      }
      
      console.log(`Fetching competitor data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      // For the first version, we'll use the createCompetitorMerchandising call that's stored with the work item completion
      try {
        // Get the competitor data by workItemId from storage
        const competitorData = await storage.getCompetitorMerchandisingByWorkItemId(workItemId);
        console.log(`Found competitor data for work item ${workItemId}:`, competitorData);
        res.json(competitorData);
      } catch (err) {
        console.log("Error fetching competitor data (expected if not found):", err);
        res.json(null);
      }
    } catch (error) {
      console.error("Error getting competitor data by work item:", error);
      res.status(500).json({ message: "Failed to get competitor information" });
    }
  });
  
  // Dashboard routes
  app.get("/api/dashboard", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard stats" });
    }
  });
  
  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to get products" });
    }
  });
  
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to get product" });
    }
  });
  
  app.post("/api/products", checkRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      const validatedData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(validatedData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });
  
  app.put("/api/products/:id", checkRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      const validatedData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(parseInt(req.params.id), validatedData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });
  
  app.delete("/api/products/:id", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const success = await storage.deleteProduct(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });
  
  // Bulk upload products via CSV
  app.post("/api/products/bulk-upload", checkRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      // Validate the request body as an array of product items
      const bulkProductSchema = z.array(
        z.object({
          name: z.string().min(1, "Product name is required"),
          sku: z.string().min(1, "SKU is required"),
          description: z.string().optional(),
          category: z.string().min(1, "Category is required"),
          price: z.coerce.number().min(1, "Price must be at least 1 cent"),
          minStockLevel: z.coerce.number().min(1, "Minimum stock level must be at least 1"),
          image: z.string().optional(),
        })
      );
      
      const items = bulkProductSchema.parse(req.body);
      const results = [];
      const errors = [];
      
      // Process each product
      for (const item of items) {
        try {
          const product = await storage.createProduct(item);
          results.push(product);
        } catch (error) {
          errors.push({
            sku: item.sku,
            name: item.name,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      
      res.status(200).json({
        success: true,
        count: results.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Bulk product upload error:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid product data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ 
        message: "Failed to process bulk product upload",
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Store routes
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stores" });
    }
  });
  
  app.get("/api/stores/:id", isAuthenticated, async (req, res) => {
    try {
      const storeId = parseInt(req.params.id);
      if (isNaN(storeId)) {
        return res.status(400).json({ error: "Invalid store ID" });
      }
      
      const store = await storage.getStore(storeId);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      
      // If user is admin or manager, allow access to any store
      if (req.user!.role === 'admin' || req.user!.role === 'manager') {
        return res.json(store);
      }
      
      // For merchandisers, check if they're assigned to this store
      const userAssignments = await storage.getAssignmentsByUserId(req.user!.id);
      const isAssignedToStore = userAssignments.some(a => a.storeId === storeId);
      
      if (!isAssignedToStore) {
        return res.status(403).json({ error: "You don't have permission to view this store" });
      }
      
      console.log(`Fetched store ${storeId} successfully for user ${req.user!.id}`);
      res.json(store);
    } catch (error) {
      console.error("Error fetching store:", error);
      res.status(500).json({ message: "Failed to get store" });
    }
  });
  
  app.post("/api/stores", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const validatedData = insertStoreSchema.parse(req.body);
      const store = await storage.createStore(validatedData);
      res.status(201).json(store);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid store data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create store" });
    }
  });
  
  app.put("/api/stores/:id", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const validatedData = insertStoreSchema.partial().parse(req.body);
      const store = await storage.updateStore(parseInt(req.params.id), validatedData);
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      res.json(store);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid store data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update store" });
    }
  });
  
  app.delete("/api/stores/:id", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const success = await storage.deleteStore(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Store not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete store" });
    }
  });
  
  // Shelf routes
  app.get("/api/shelves", async (req, res) => {
    try {
      const shelves = await storage.getAllShelves();
      res.json(shelves);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shelves" });
    }
  });
  
  app.get("/api/stores/:storeId/shelves", async (req, res) => {
    try {
      const shelves = await storage.getShelfByStoreId(parseInt(req.params.storeId));
      res.json(shelves);
    } catch (error) {
      res.status(500).json({ message: "Failed to get shelves" });
    }
  });
  
  app.post("/api/shelves", checkRole(UserRole.ADMIN, UserRole.MANAGER), async (req, res) => {
    try {
      const validatedData = insertShelfSchema.parse(req.body);
      const shelf = await storage.createShelf(validatedData);
      res.status(201).json(shelf);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid shelf data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create shelf" });
    }
  });
  
  // Inventory routes
  app.get("/api/inventory/:storeId", async (req, res) => {
    try {
      const inventory = await storage.getInventoryByStoreId(parseInt(req.params.storeId));
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "Failed to get inventory" });
    }
  });
  
  app.post("/api/inventory/adjust", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const schema = z.object({
        productId: z.number(),
        shelfId: z.number(),
        quantity: z.number(),
      });
      
      const { productId, shelfId, quantity } = schema.parse(req.body);
      
      const updatedInventory = await storage.adjustInventory(
        productId,
        shelfId,
        quantity,
        req.user!.id
      );
      
      res.json(updatedInventory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to adjust inventory" });
    }
  });
  
  // Quick add inventory route - allows adding inventory and creates a shelf if needed
  app.post("/api/inventory/quick-add", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const schema = z.object({
        productId: z.number(),
        storeId: z.number(),
        section: z.string().optional(),
        shelfName: z.string().optional(),
        quantity: z.number().positive(),
        notes: z.string().optional(),
      });
      
      const { productId, storeId, section, shelfName, quantity, notes } = schema.parse(req.body);
      
      // Find an existing shelf or create a new one
      let shelf = null;
      
      if (shelfName) {
        // Try to find a shelf with the given name in the store
        const shelves = await storage.getShelfByStoreId(storeId);
        shelf = shelves.find(s => s.name === shelfName);
      }
      
      // If no shelf was found or specified, try to find a shelf in the specified section
      if (!shelf && section) {
        const shelves = await storage.getShelfByStoreId(storeId);
        shelf = shelves.find(s => s.section === section);
      }
      
      // If we still don't have a shelf, create one
      if (!shelf) {
        shelf = await storage.createShelf({
          name: shelfName || `Shelf ${Date.now().toString().slice(-4)}`,
          section: section || "General",
          storeId: storeId
        });
      }
      
      // Now add the inventory
      const updatedInventory = await storage.adjustInventory(
        productId,
        shelf.id,
        quantity,
        req.user!.id
      );
      
      // Create an activity record with notes if provided
      if (notes) {
        await storage.createActivity({
          actionType: 'add',
          productId,
          shelfId: shelf.id,
          storeId,
          userId: req.user!.id,
          quantity,
          status: 'completed',
          notes
        });
      }
      
      res.json({
        inventory: updatedInventory,
        shelf,
        message: "Inventory successfully added"
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to add inventory" });
    }
  });
  
  // Activity routes
  app.get("/api/activities/recent", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to get activities" });
    }
  });
  
  // Alert routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getActiveAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get alerts" });
    }
  });
  
  app.post("/api/alerts/:id/resolve", checkRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER), async (req, res) => {
    try {
      const alert = await storage.resolveAlert(parseInt(req.params.id), req.user!.id);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });
  
  // User routes - Admin only
  app.get("/api/users", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to get users" });
    }
  });
  
  // Low stock items
  app.get("/api/lowstock", async (req, res) => {
    try {
      const lowStockItems = await storage.getLowStockItems();
      res.json(lowStockItems);
    } catch (error) {
      res.status(500).json({ message: "Failed to get low stock items" });
    }
  });
  
  // Stock Takes API
  // Set up multer storage
  const storage_config = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(process.cwd(), 'uploads'));
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  });
  
  const upload = multer({ 
    storage: storage_config,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Accept images only
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(null, false);
      }
      cb(null, true);
    }
  });
  
  // Get stock takes
  app.get("/api/stock-takes", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Get user's role to determine what stock takes they can see
      const user = req.user!;
      let stockTakes;
      
      if (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) {
        // Admins and managers can see all stock takes
        stockTakes = await storage.getAllStockTakes();
      } else {
        // Merchandisers can only see their own stock takes
        stockTakes = await storage.getStockTakesByUserId(user.id);
      }
      
      res.json(stockTakes);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to get stock takes" });
    }
  });
  
  // Get a single stock take with its items
  app.get("/api/stock-takes/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const stockTakeId = parseInt(req.params.id);
      const stockTake = await storage.getStockTakeWithItems(stockTakeId);
      
      if (!stockTake) {
        return res.status(404).json({ message: "Stock take not found" });
      }
      
      // Check if user has permission to view this stock take
      const user = req.user!;
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER && stockTake.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to view this stock take" });
      }
      
      res.json(stockTake);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to get stock take" });
    }
  });
  
  // Get stock takes by work item ID
  app.get("/api/stock-takes/by-work-item/:workItemId", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const workItemId = parseInt(req.params.workItemId);
      
      // Get the work item first to check permissions
      const workItem = await storage.getWorkItemById(workItemId);
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Check if user has permission to view this work item
      const user = req.user!;
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER && workItem.userId !== user.id) {
        console.log(`Access denied: User ${user.id} (${user.role}) attempted to access work item ${workItemId} assigned to user ${workItem.userId}`);
        return res.status(403).json({ message: "Not authorized to view this work item" });
      }
      
      console.log(`Fetching stock take data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      try {
        // Get all stock takes for this store
        const stockTakes = await storage.getStockTakeByStoreId(workItem.storeId);
        
        // Filter to the most recent stock take for this work item (if any)
        // In a real implementation, we would have a direct relation between stock takes and work items
        const filteredStockTakes = stockTakes
          .filter(st => st.userId === workItem.userId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        if (filteredStockTakes.length === 0) {
          // No stock takes found for this work item
          console.log(`No stock takes found for work item ${workItemId}`);
          return res.json(null);
        }
        
        // Return the most recent stock take with its items
        const stockTake = await storage.getStockTakeWithItems(filteredStockTakes[0].id);
        console.log(`Found stock take ${stockTake?.id} for work item ${workItemId}`);
        res.json(stockTake);
      } catch (innerError) {
        // Handle missing tables or other database errors by returning null
        console.error(`Inner error fetching stock take data: ${innerError}`);
        return res.json(null);
      }
    } catch (error) {
      console.error("Error getting stock take by work item:", error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to get stock take for work item" });
    }
  });
  
  // Update a stock take (with required audit comment for admins/managers)
  app.put("/api/stock-takes/:id", upload.array('pictures', 5), async (req, res) => {
    try {
      // Authentication check
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized - Please log in" });
      }
      
      const stockTakeId = parseInt(req.params.id);
      const user = req.user!;
      
      // Get the existing stock take
      const existingStockTake = await storage.getStockTake(stockTakeId);
      if (!existingStockTake) {
        return res.status(404).json({ message: "Stock take not found" });
      }
      
      // Check if user has permission to edit this stock take
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER && existingStockTake.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to edit this stock take" });
      }
      
      // If an admin or manager is editing a stock take that isn't theirs, require an audit comment
      const isAdminManagerEditingOthersWork = 
        (user.role === UserRole.ADMIN || user.role === UserRole.MANAGER) && 
        existingStockTake.userId !== user.id;
      
      // Get the audit comment from the request
      const auditComment = req.body.auditComment || '';
      
      // If admin/manager is editing someone else's stock take, enforce audit comment requirement
      if (isAdminManagerEditingOthersWork && !auditComment.trim()) {
        return res.status(400).json({ 
          message: "Audit comment is required when editing a stock take created by another user" 
        });
      }
      
      // Parse the updated data
      const comment = req.body.comment || '';
      const status = req.body.status || existingStockTake.status;
      
      // Parse items from the form data if provided
      let items: InsertStockTakeItem[] = [];
      if (req.body.items) {
        try {
          const parsedItems = JSON.parse(req.body.items);
          if (Array.isArray(parsedItems)) {
            items = parsedItems.map(item => ({
              stockTakeId,
              productId: item.productId,
              quantity: item.quantity,
              location: item.location
            }));
          }
        } catch (e) {
          return res.status(400).json({ message: "Invalid items data format" });
        }
      }
      
      // Prepare the update data
      const updateData: Partial<StockTake> = {
        comment,
        status
      };
      
      // Get file paths if any were uploaded
      const files = (req.files as Express.Multer.File[]) || [];
      if (files.length > 0) {
        // Handle the new pictures
        const pictureUrls = files.map(file => file.path);
        
        // Combine with any existing pictures if we want to keep them
        if (existingStockTake.pictures) {
          updateData.pictures = [...existingStockTake.pictures, ...pictureUrls];
        } else {
          updateData.pictures = pictureUrls;
        }
      }
      
      // Update the stock take record
      const updatedStockTake = await storage.updateStockTake(
        stockTakeId, 
        updateData, 
        user.id, 
        auditComment
      );
      
      // Update items if provided
      if (items.length > 0) {
        await storage.updateStockTakeItems(stockTakeId, items);
      }
      
      // Return the updated stock take with its items
      const result = await storage.getStockTakeWithItems(stockTakeId);
      
      res.json({
        success: true,
        message: "Stock take updated successfully",
        stockTake: result
      });
    } catch (error) {
      console.error("Error updating stock take:", error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update stock take" });
    }
  });
  
  // Create a new stock take
  app.post("/api/stock-takes", upload.array('pictures', 5), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized - Please log in" });
      }
      
      // More detailed logging for debugging
      console.log("Stock take submission received:", {
        body: req.body,
        files: req.files ? (req.files as Express.Multer.File[]).map(f => f.originalname) : [],
        user: req.user ? req.user.username : 'none',
        auth: !!req.user,
        contentType: req.headers['content-type']
      });
      
      // Parse items from the form data
      const storeId = parseInt(req.body.storeId);
      const comment = req.body.comment || '';
      const itemsJson = req.body.items;
      
      // Detailed validation logging
      console.log("Validating required fields:", { 
        storeId, 
        validStoreId: !isNaN(storeId),
        hasItemsJson: !!itemsJson,
        itemsJsonType: typeof itemsJson
      });
      
      if (!storeId || isNaN(storeId)) {
        return res.status(400).json({ message: "Missing or invalid store ID" });
      }
      
      if (!itemsJson) {
        return res.status(400).json({ message: "Missing items data" });
      }
      
      // Parse the items array
      let items;
      try {
        console.log("Parsing items JSON:", { itemsJson: itemsJson.substring(0, 100) + (itemsJson.length > 100 ? '...' : '') });
        items = JSON.parse(itemsJson);
        console.log("Successfully parsed items:", { itemsCount: items.length, firstItem: items[0] });
      } catch (e) {
        console.error("Error parsing items JSON:", e);
        return res.status(400).json({ message: "Invalid items data format: " + (e instanceof Error ? e.message : String(e)) });
      }
      
      // Validate the items array
      if (!Array.isArray(items)) {
        return res.status(400).json({ message: "Items must be an array" });
      }
      
      // Get file paths if any were uploaded
      const files = (req.files as Express.Multer.File[]) || [];
      const filePaths = files.map(file => file.path);
      
      // Create the stock take record in the database
      const stockTake = await storage.createStockTake({
        storeId,
        userId: req.user!.id,
        comment,
        pictures: filePaths,
        status: 'completed'
      });
      
      // Create stock take items
      const stockTakeItems = [];
      for (const item of items) {
        const productId = item.productId;
        const quantity = item.quantity;
        const location = item.location;
        
        // Get the product to check stock level
        const product = await storage.getProduct(productId);
        if (!product) {
          continue; // Skip if product not found
        }
        
        // Create the stock take item
        const stockTakeItem = await storage.createStockTakeItem({
          stockTakeId: stockTake.id,
          productId,
          quantity,
          location
        });
        
        stockTakeItems.push(stockTakeItem);
        
        // Determine if this is for shelf or back store and update inventory
        if (location === StockLocation.SHELF) {
          // Find an existing shelf for this product in this store
          const shelves = await storage.getShelfByStoreId(storeId);
          const shelf = shelves.find(s => s.section === 'Main');
          
          if (shelf) {
            // Update the inventory
            await storage.adjustInventory(productId, shelf.id, quantity, req.user!.id);
            
            // Create activity record
            await storage.createActivity({
              actionType: 'stock-take',
              productId,
              storeId,
              shelfId: shelf.id,
              userId: req.user!.id,
              quantity,
              status: 'completed',
              notes: comment
            });
            
            // Create alert if stock is low
            if (quantity < product.minStockLevel) {
              await storage.createAlert({
                productId,
                storeId,
                shelfId: shelf.id,
                type: 'low-stock',
                status: 'active',
                message: `Low stock for ${product.name} (${quantity}/${product.minStockLevel})`
              });
            }
          }
        } else if (location === StockLocation.BACK_STORE) {
          // For back store, find or create a "Back Store" shelf
          let backStoreShelf = null;
          const shelves = await storage.getShelfByStoreId(storeId);
          backStoreShelf = shelves.find(s => s.section === 'Back Store');
          
          if (!backStoreShelf) {
            backStoreShelf = await storage.createShelf({
              name: 'Storage',
              section: 'Back Store',
              storeId
            });
          }
          
          // Update the inventory for back store
          await storage.adjustInventory(productId, backStoreShelf.id, quantity, req.user!.id);
          
          // Create activity record
          await storage.createActivity({
            actionType: 'stock-take',
            productId,
            storeId,
            shelfId: backStoreShelf.id,
            userId: req.user!.id,
            quantity,
            status: 'completed',
            notes: `Back store stock take: ${comment}`
          });
        }
      }
      
      // Find and update any related work items for this store and user
      try {
        // Find work items of type 'stock_take' for this store assigned to this user with status not completed
        const userWorkItems = await storage.getWorkItemsByUserId(req.user!.id);
        const relatedWorkItems = userWorkItems.filter(wi => 
          wi.storeId === storeId && 
          wi.type === 'stock_take' && 
          wi.status !== 'completed'
        );
        
        // Update the status of any related work items to completed
        for (const workItem of relatedWorkItems) {
          console.log(`Completing work item ${workItem.id} as part of stock take submission`);
          await storage.completeWorkItem(workItem.id);
        }
        
        console.log(`Updated ${relatedWorkItems.length} work items to completed status`);
      } catch (workItemError) {
        console.error("Error updating related work items:", workItemError);
        // Don't fail the whole request if this part fails, just log the error
      }
      
      // Return success response with the created stock take
      res.status(200).json({ 
        success: true, 
        message: "Stock take completed successfully",
        stockTake,
        stockTakeItems,
        picturesUploaded: filePaths.length
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to process stock take" });
    }
  });
  
  // Update a specific stock take item
  app.put("/api/stock-take-items/:id", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const itemId = parseInt(req.params.id);
      
      // Get the existing stock take item
      const existingItem = await storage.getStockTakeItem(itemId);
      if (!existingItem) {
        return res.status(404).json({ message: "Stock take item not found" });
      }
      
      // Get the parent stock take to update its audit information
      const parentStockTake = await storage.getStockTake(existingItem.stockTakeId);
      if (!parentStockTake) {
        return res.status(404).json({ message: "Parent stock take not found" });
      }
      
      // Validate the incoming data
      const { quantity, location, auditComment } = req.body;
      
      // Audit comment is required
      if (!auditComment || auditComment.trim().length < 5) {
        return res.status(400).json({ 
          message: "An audit comment of at least 5 characters is required" 
        });
      }
      
      // Update the item
      const updatedItem = await storage.updateStockTakeItem(itemId, {
        quantity: parseInt(quantity),
        location
      });
      
      // Update the parent stock take with audit information
      await storage.updateStockTake(
        parentStockTake.id,
        {}, // No direct changes to the stock take itself
        req.user!.id, // Record who made the edit
        auditComment // Record why the edit was made
      );
      
      // Create an audit log activity
      await storage.createActivity({
        userId: req.user!.id,
        storeId: parentStockTake.storeId,
        productId: existingItem.productId,
        actionType: 'edit-stock-take-item',
        status: 'completed',
        notes: auditComment,
        shelfId: null,
        quantity: parseInt(quantity),
        fromShelfId: null,
        toShelfId: null
      });
      
      res.json({
        success: true,
        message: "Stock take item updated successfully",
        item: updatedItem
      });
    } catch (error) {
      console.error("Error updating stock take item:", error);
      res.status(500).json({ 
        message: "Failed to update stock take item",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Bulk upload inventory via CSV
  app.post("/api/inventory/bulk-upload", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      // Validate the request body as an array of inventory items
      const bulkInventorySchema = z.array(
        z.object({
          productSku: z.string(),
          storeName: z.string(),
          shelfName: z.string().optional(),
          section: z.string().optional(),
          quantity: z.coerce.number().positive(),
          category: z.string().default("Other"), // Added category field
          notes: z.string().optional(),
        })
      );
      
      const items = bulkInventorySchema.parse(req.body);
      const results = [];
      const errors = [];

      // Process each item
      for (const item of items) {
        try {
          // Find or create the product
          let product = await storage.getProductBySku(item.productSku);
          if (!product) {
            // Create a new product with the SKU
            try {
              product = await storage.createProduct({
                name: `Product ${item.productSku}`,
                sku: item.productSku,
                description: `Auto-created from inventory upload`,
                category: item.category || 'Other', // Use provided category or default to 'Other'
                price: 0, // Default price, can be updated later
                minStockLevel: 5
              });
              console.log(`Created new product with SKU ${item.productSku}`);
            } catch (error) {
              errors.push({ item, error: `Failed to create product with SKU ${item.productSku}: ${error instanceof Error ? error.message : 'Unknown error'}` });
              continue;
            }
          }
          
          // Find the store with more flexible matching (case-insensitive)
          const stores = await storage.getAllStores();
          const store = stores.find(s => 
            s.name.toLowerCase().trim() === item.storeName.toLowerCase().trim() ||
            s.name.toLowerCase().includes(item.storeName.toLowerCase().trim()) ||
            item.storeName.toLowerCase().includes(s.name.toLowerCase().trim())
          );
          
          if (!store) {
            errors.push({ item, error: `Store with name "${item.storeName}" not found. Available stores: ${stores.map(s => s.name).join(', ')}` });
            continue;
          }

          // Find an existing shelf or create a new one
          let shelf = null;
          
          if (item.shelfName) {
            // Try to find a shelf with the given name in the store (case-insensitive)
            const shelves = await storage.getShelfByStoreId(store.id);
            shelf = shelves.find(s => 
              s.name.toLowerCase().trim() === item.shelfName.toLowerCase().trim() ||
              s.name.toLowerCase().includes(item.shelfName.toLowerCase().trim()) ||
              item.shelfName.toLowerCase().includes(s.name.toLowerCase().trim())
            );
          }
          
          // If no shelf was found or specified, try to find a shelf in the specified section
          if (!shelf && item.section) {
            const shelves = await storage.getShelfByStoreId(store.id);
            shelf = shelves.find(s => 
              s.section.toLowerCase().trim() === item.section.toLowerCase().trim() ||
              s.section.toLowerCase().includes(item.section.toLowerCase().trim()) ||
              item.section.toLowerCase().includes(s.section.toLowerCase().trim())
            );
          }
          
          // If we still don't have a shelf, create one
          if (!shelf) {
            shelf = await storage.createShelf({
              name: item.shelfName || `Shelf ${Date.now().toString().slice(-4)}`,
              section: item.section || "General",
              storeId: store.id
            });
          }
          
          // Add the inventory
          const updatedInventory = await storage.adjustInventory(
            product.id,
            shelf.id,
            item.quantity,
            req.user!.id
          );
          
          // Create an activity record
          await storage.createActivity({
            actionType: 'bulk-add',
            productId: product.id,
            shelfId: shelf.id,
            storeId: store.id,
            userId: req.user!.id,
            quantity: item.quantity,
            status: 'completed',
            notes: item.notes || 'Added via CSV upload'
          });
          
          results.push({
            productSku: item.productSku,
            productName: product.name,
            storeName: item.storeName,
            shelfName: shelf.name,
            quantity: item.quantity,
            success: true
          });
        } catch (error) {
          errors.push({ item, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      res.json({
        results,
        errors,
        totalSuccessful: results.length,
        totalFailed: errors.length,
        message: `Processed ${results.length + errors.length} items, ${results.length} successful, ${errors.length} failed`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid inventory data format", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to process bulk inventory upload" });
    }
  });
  
  // Bulk upload stores via CSV
  app.post("/api/stores/bulk-upload", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      // Validate the request body as an array of store items
      const bulkStoreSchema = z.array(
        z.object({
          name: z.string(),
          location: z.string(),
          managerUsername: z.string().optional()
        })
      );
      
      const items = bulkStoreSchema.parse(req.body);
      const results = [];
      const errors = [];

      // Process each store
      for (const item of items) {
        try {
          // Check if store with the same name already exists
          const stores = await storage.getAllStores();
          const existingStore = stores.find(s => s.name === item.name);
          
          if (existingStore) {
            errors.push({ item, error: `Store with name ${item.name} already exists` });
            continue;
          }
          
          // Find manager if specified but don't block creation if not found
          let managerId = null;
          if (item.managerUsername) {
            const manager = await storage.getUserByUsername(item.managerUsername);
            if (manager && manager.role === UserRole.MANAGER) {
              managerId = manager.id;
            } else {
              // Log a warning but continue with the store creation
              console.warn(`Manager with username ${item.managerUsername} not found or not a manager. Creating store without a manager.`);
            }
          }
          
          // Create the store
          const store = await storage.createStore({
            name: item.name,
            location: item.location,
            managerId
          });
          
          results.push({
            name: store.name,
            location: store.location,
            managerId: store.managerId,
            success: true
          });
        } catch (error) {
          errors.push({ item, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      res.json({
        results,
        errors,
        totalSuccessful: results.length,
        totalFailed: errors.length,
        message: `Processed ${results.length + errors.length} stores, ${results.length} successful, ${errors.length} failed`
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid store data format", errors: error.errors });
      }
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to process bulk store upload" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
