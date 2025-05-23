import express, { Express } from "express";
import { createServer, type Server } from "http";
import fs from "fs";
import { storage } from "./storage";
import { db, pool } from "./db"; // Add import for database operations
import { setupAuth, checkRole, isAuthenticated } from "./auth";
import { 
  UserRole, 
  StockLocation,
  StockTake,
  InsertStockTakeItem,
  WorkItemStatus
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
import { userAlertsRouter } from "./routes/alerts";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes first
  setupAuth(app);
  
  // Admin-only work items routes - add these BEFORE other work item routes
  // to prevent conflicts with parameterized routes
  app.get("/api/work-items/all", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      console.log("Starting to fetch ALL work items (including completed)...");
      
      // Use direct SQL query with LEFT JOINs to include all work items
      const query = `
        SELECT 
          w.*, 
          u.id as user_id, u.username, u.name as user_name, u.email, u.role, 
          s.id as store_id, s.name as store_name, s.location
        FROM work_items w
        LEFT JOIN users u ON w.user_id = u.id
        LEFT JOIN stores s ON w.store_id = s.id
        ORDER BY w.created_at DESC
      `;
      
      console.log("Executing SQL query for ALL work items");
      const directItemsQuery = await pool.query(query);
      console.log(`Query executed successfully, found ${directItemsQuery.rows.length} work items`);
      
      if (directItemsQuery.rows.length === 0) {
        console.log("No work items found in database");
        return res.json([]);
      }
      
      // Format the results to match the expected structure
      const allWorkItems = directItemsQuery.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        type: row.type,
        userId: row.user_id,
        storeId: row.store_id,
        storeAssignmentId: row.store_assignment_id,
        status: row.status || 'pending',
        priority: row.priority || 'medium',
        dueDate: row.due_date,
        completedAt: row.completed_at,
        notes: row.notes,
        attachments: row.attachments || [],
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: row.username ? {
          id: row.user_id,
          username: row.username,
          name: row.user_name,
          email: row.email,
          role: row.role
        } : null,
        store: row.store_name ? {
          id: row.store_id,
          name: row.store_name,
          location: row.location
        } : null
      }));
      
      console.log(`Processed ${allWorkItems.length} total work items`);
      
      return res.json(allWorkItems);
    } catch (error) {
      console.error("Error in /api/work-items/all endpoint:", error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to retrieve work items" });
    }
  });
  
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
  
  // Register user alerts routes
  app.use('/api', userAlertsRouter);
  
  // Add endpoint to serve uploaded images
  app.get('/api/images/:filename', (req, res) => {
    try {
      const filename = req.params.filename;
      // Sanitize the filename to prevent directory traversal attacks
      const sanitizedFilename = path.basename(filename);
      
      // Try different potential file locations
      const uploadsDir = path.join(process.cwd(), 'uploads');
      
      // Check if the file exists using just the filename in the uploads directory
      let imagePath = path.join(uploadsDir, sanitizedFilename);
      
      // If the file doesn't exist with the given filename
      if (!fs.existsSync(imagePath)) {
        console.log(`Image not found at path: ${imagePath}`);
        
        // Check if the uploads directory exists and is accessible
        if (!fs.existsSync(uploadsDir)) {
          console.error(`Uploads directory does not exist: ${uploadsDir}`);
          return res.status(500).json({ 
            error: 'Directory not found',
            message: 'The uploads directory does not exist.'
          });
        }
        
        // Try to find files with similar names
        try {
          const files = fs.readdirSync(uploadsDir);
          console.log('Available files in uploads directory:', files);
          
          // Extract the timestamp part if it's a timestamped filename
          const timestampMatch = sanitizedFilename.match(/^(\d+)/);
          if (timestampMatch) {
            const timestamp = timestampMatch[1];
            console.log('Looking for files with timestamp:', timestamp);
            
            // Find files with the same timestamp prefix
            const matchingFile = files.find(file => file.startsWith(timestamp));
            if (matchingFile) {
              imagePath = path.join(uploadsDir, matchingFile);
              console.log('Found matching file by timestamp:', imagePath);
            }
          }
        } catch (err) {
          console.error('Error searching for matching files:', err);
        }
      }
      
      // If we still can't find the file
      if (!fs.existsSync(imagePath)) {
        console.log(`No matching image found for: ${sanitizedFilename}`);
        return res.status(404).json({ 
          error: 'Image not found',
          message: 'The requested image could not be found on the server.'
        });
      }
      
      // Send the file
      res.sendFile(imagePath, (err) => {
        if (err) {
          console.error(`Error serving image ${sanitizedFilename}:`, err);
          res.status(404).json({ 
            error: 'Error serving image',
            message: 'An error occurred while trying to serve the image.'
          });
        }
      });
    } catch (error) {
      console.error('Error serving image:', error);
      res.status(500).json({ 
        error: 'Server error',
        message: 'An internal server error occurred.'
      });
    }
  });
  
  // Work Items Endpoints for Admin
  
  // Get active work items (admin only, PENDING and IN_PROGRESS only)
  app.get("/api/work-items", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      console.log("Starting to fetch active work items...");
      
      // This returns only PENDING and IN_PROGRESS items by default (active items)
      console.log("Calling storage.getActiveWorkItems() method...");
      const workItems = await storage.getActiveWorkItems();
      console.log(`Fetched ${workItems.length} active work items`);
      
      res.json(workItems);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to retrieve work items" });
    }
  });
  
  // Note: "/api/work-items/all" route is defined at the top of the file
  // This comment is kept here to maintain code readability
  
  // Get single work item by ID (accessible to authorized users)
  app.get("/api/work-items/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const workItem = await storage.getWorkItemById(id);
      
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Check permissions: Allow access if user is admin, manager, or the assigned user
      const user = req.user!;
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER && workItem.userId !== user.id) {
        return res.status(403).json({ 
          message: "Forbidden: Insufficient permissions to access this work item" 
        });
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
      
      console.log("Received merchandising data:", req.body);
      const validatedData = merchandisingSchema.parse(req.body);
      console.log("Validated merchandising data:", validatedData);
      
      try {
        // Save merchandising data directly to database
        const query = `
          INSERT INTO merchandising_data 
          (store_id, user_id, date, work_item_id)
          VALUES ($1, $2, $3, $4)
          RETURNING id, store_id as "storeId", user_id as "userId", date, work_item_id as "workItemId"
        `;
        
        const dbResult = await pool.query(query, [
          validatedData.storeId,
          req.user!.id,
          new Date(),
          validatedData.workItemId
        ]);
        
        if (!dbResult || dbResult.rows.length === 0) {
          throw new Error("Failed to save merchandising data to database");
        }
        
        const merchandisingData = dbResult.rows[0];
        const merchandisingId = merchandisingData.id;
        
        console.log("Saved merchandising data record:", merchandisingData);
        
        // Save each merchandising item in a separate table
        const items = [];
        for (const item of validatedData.merchandisingItems) {
          const itemQuery = `
            INSERT INTO merchandising_items 
            (merchandising_id, product_id, price, notes, work_item_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, merchandising_id as "merchandisingId", product_id as "productId", price, notes
          `;
          
          const itemResult = await pool.query(itemQuery, [
            merchandisingId,
            item.productId,
            item.price,
            item.notes || null,
            validatedData.workItemId
          ]);
          
          if (itemResult && itemResult.rows.length > 0) {
            items.push(itemResult.rows[0]);
          }
        }
        
        // Add items to the result
        merchandisingData.items = items;
        
        // Update work item status
        if (validatedData.workItemId) {
          await storage.updateWorkItemStatus(validatedData.workItemId, "completed");
        }
        
        console.log("Successfully created merchandising data with items:", merchandisingData);
        res.status(201).json(merchandisingData);
      } catch (dbError) {
        console.error("Database error creating merchandising data:", dbError);
        
        // Fall back to storage method if direct database insert fails
        console.log("Falling back to storage method");
        const result = await storage.createMerchandisingData({
          ...validatedData,
          userId: req.user!.id,
          date: new Date()
        });
        
        res.status(201).json(result);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid merchandising data", errors: error.errors });
      }
      console.error("Error creating merchandising data:", error);
      res.status(500).json({ message: "Failed to create merchandising data" });
    }
  });
  
  // Competitor Merchandising Information
  // Set up multer for file uploads
  const competitorStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const dir = './uploads';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'competitor-' + uniqueSuffix + ext);
    }
  });

  const competitorUpload = multer({
    storage: competitorStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function(req, file, cb) {
      const filetypes = /jpeg|jpg|png|gif/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error("Only image files are allowed"));
    }
  });
  
  app.post("/api/competitor-merchandising", isAuthenticated, competitorUpload.array('promotionPictures', 10), async (req, res) => {
    try {
      console.log("Received competitor data:", req.body);
      console.log("Received files:", req.files ? (req.files as Express.Multer.File[]).map(f => f.path) : 'No files');
      
      // Parse numeric values from form data
      const storeId = parseInt(req.body.storeId);
      let workItemId = req.body.workItemId ? parseInt(req.body.workItemId) : null;
      
      // Parse promotional price properly - handle currency formatting
      let promotionalPrice = null;
      if (req.body.promotionalPrice && req.body.promotionalPrice.trim() !== '') {
        try {
          // Remove any currency symbols and commas
          const priceCleaned = req.body.promotionalPrice.replace(/[^0-9.]/g, '');
          const priceFloat = parseFloat(priceCleaned);
          
          if (!isNaN(priceFloat)) {
            // Convert to cents for storage (database stores in cents)
            promotionalPrice = Math.round(priceFloat * 100);
            console.log(`Converted price ${req.body.promotionalPrice} to ${promotionalPrice} cents`);
          }
        } catch (e) {
          console.error("Error parsing promotional price:", e);
        }
      }
      
      // Basic validation
      if (isNaN(storeId)) {
        return res.status(400).json({ message: "Invalid store ID" });
      }
      
      if (workItemId !== null && isNaN(workItemId)) {
        return res.status(400).json({ message: "Invalid work item ID" });
      }
      
      if (!req.body.brand || !req.body.brand.trim()) {
        return res.status(400).json({ message: "Brand name is required" });
      }
      
      if (!req.body.productDescription || !req.body.productDescription.trim()) {
        return res.status(400).json({ message: "Product description is required" });
      }
      
      // Get all uploaded file paths
      const files = (req.files as Express.Multer.File[]) || [];
      const filePaths = files.map(file => file.path);
      
      // Create the data object for storage
      const data = {
        storeId,
        userId: req.user!.id,
        brand: req.body.brand.trim(),
        productDescription: req.body.productDescription.trim(),
        promotionalPrice,
        promotionPictures: filePaths,
        workItemId
      };
      
      console.log("Processed competitor data:", JSON.stringify(data, null, 2));
      
      try {
        // Ensure promotion pictures is properly formatted as an array for PostgreSQL
        const formattedPictures = data.promotionPictures && data.promotionPictures.length > 0
          ? data.promotionPictures
          : [];
          
        console.log("Formatted picture paths for database:", formattedPictures);
          
        // Use direct SQL to ensure we're saving to the database
        const query = `
          INSERT INTO competitor_merchandising 
          (store_id, user_id, date, brand, product_description, promotional_price, promotion_pictures, work_item_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, store_id as "storeId", user_id as "userId", date, brand, 
                   product_description as "productDescription", 
                   promotional_price as "promotionalPrice", 
                   promotion_pictures as "promotionPictures",
                   work_item_id as "workItemId"
        `;
        
        const dbResult = await pool.query(query, [
          data.storeId,
          data.userId,
          new Date(),
          data.brand,
          data.productDescription,
          data.promotionalPrice,
          formattedPictures,
          data.workItemId
        ]);
        
        if (!dbResult || dbResult.rows.length === 0) {
          throw new Error("Failed to save competitor data to database");
        }
        
        const result = dbResult.rows[0];
        console.log("Successfully saved competitor data to database:", result);
        
        // If we have a work item ID, mark it as completed
        if (workItemId) {
          try {
            await storage.updateWorkItemStatus(workItemId, "completed");
            console.log(`Work item ${workItemId} marked as completed`);
            
            // Record an activity for the completed work item
            await storage.createActivity({
              userId: req.user!.id,
              storeId,
              productId: 1, // Use a default product ID since it's required
              actionType: "competitor-merchandising-complete",
              notes: `Completed competitor merchandising data for brand: ${req.body.brand}`,
              status: "completed"
            });
          } catch (workItemError) {
            // Log but don't fail the whole request
            console.error("Error updating work item status or creating activity:", workItemError);
          }
        }
        
        res.status(201).json(result);
      } catch (dbError) {
        console.error("Database error creating competitor merchandising:", dbError);
        return res.status(500).json({ 
          message: "Database error while saving competitor data", 
          details: dbError.message 
        });
      }
    } catch (error: any) {
      console.error("Unexpected error creating competitor data:", error);
      res.status(500).json({ 
        message: "Failed to create competitor merchandising data",
        details: error.message || "Unknown error"
      });
    }
  });
  
  // Orders Information
  app.post("/api/orders", isAuthenticated, async (req, res) => {
    try {
      console.log("Received order data:", req.body);
      
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
      console.log("Validated order data:", validatedData);
      
      // Use direct SQL to ensure we're saving to the database
      let orderResult;
      try {
        const orderQuery = `
          INSERT INTO orders 
          (store_id, user_id, status, notes, pictures, order_date, work_item_id) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, store_id as "storeId", user_id as "userId", status, notes, pictures, order_date as "orderDate", work_item_id as "workItemId"
        `;
        
        orderResult = await pool.query(orderQuery, [
          validatedData.storeId,
          req.user!.id,
          "pending",
          validatedData.notes || null,
          [], // Empty array for pictures
          new Date(),
          validatedData.workItemId
        ]);
        
        if (!orderResult || orderResult.rows.length === 0) {
          throw new Error("Failed to create order record");
        }
        
        const order = orderResult.rows[0];
        console.log("Created order in database:", order);
        
        // Save the order items if present
        if (validatedData.products && validatedData.products.length > 0) {
          for (const product of validatedData.products) {
            const itemQuery = `
              INSERT INTO order_items 
              (order_id, product_id, quantity, notes)
              VALUES ($1, $2, $3, $4)
              RETURNING id, order_id as "orderId", product_id as "productId", quantity, notes
            `;
            
            const itemResult = await pool.query(itemQuery, [
              order.id,
              product.productId,
              product.quantity,
              null // No notes by default
            ]);
            
            console.log(`Added product ${product.productId} to order ${order.id}`);
          }
        }
        
        // Update the work item status
        if (validatedData.workItemId) {
          await storage.updateWorkItemStatus(validatedData.workItemId, "completed");
        }
        
        // Add the items to the response
        const items = validatedData.products?.map(p => ({
          productId: p.productId,
          quantity: p.quantity
        })) || [];
        
        const result = {
          ...order,
          items
        };
        
        res.status(201).json(result);
      } catch (dbError) {
        console.error("Database error creating order:", dbError);
        
        // Fall back to the storage method if direct SQL fails
        console.log("Falling back to storage method");
        const result = await storage.createOrder({
          ...validatedData,
          userId: req.user!.id,
          status: "pending",
          date: new Date()
        });
        
        res.status(201).json(result);
      }
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
      
      // Query the database directly to find orders with this work_item_id
      try {
        const orderQuery = `
          SELECT 
            o.id, 
            o.store_id as "storeId", 
            o.user_id as "userId", 
            o.order_date as "orderDate",
            o.notes,
            o.pictures,
            o.status,
            o.work_item_id as "workItemId"
          FROM orders o
          WHERE o.work_item_id = $1
          ORDER BY o.order_date DESC
          LIMIT 1
        `;
        
        const orderResult = await pool.query(orderQuery, [workItemId]);
        
        if (orderResult.rows && orderResult.rows.length > 0) {
          const order = orderResult.rows[0];
          
          // Get the order items
          const itemsQuery = `
            SELECT 
              oi.id, 
              oi.order_id as "orderId", 
              oi.product_id as "productId",
              oi.quantity,
              oi.notes,
              p.name as "productName",
              p.sku as "productSku",
              p.price as "productPrice"
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
          `;
          
          const itemsResult = await pool.query(itemsQuery, [order.id]);
          
          // Add the items to the order
          order.items = itemsResult.rows || [];
          
          console.log(`Found real order data in database for work item ${workItemId}:`, order);
          return res.json(order);
        }
        
        // If no order found with work_item_id, check if we have any orders for this store and user
        // This is a fallback for older data
        const fallbackQuery = `
          SELECT 
            o.id, 
            o.store_id as "storeId", 
            o.user_id as "userId", 
            o.order_date as "orderDate",
            o.notes,
            o.pictures,
            o.status
          FROM orders o
          WHERE o.store_id = $1 AND o.user_id = $2
          ORDER BY o.order_date DESC
          LIMIT 1
        `;
        
        const fallbackResult = await pool.query(fallbackQuery, [workItem.storeId, workItem.userId]);
        
        if (fallbackResult.rows && fallbackResult.rows.length > 0) {
          const order = fallbackResult.rows[0];
          
          // Add workItemId to match client expectations
          order.workItemId = workItemId;
          
          // Get the order items
          const itemsQuery = `
            SELECT 
              oi.id, 
              oi.order_id as "orderId", 
              oi.product_id as "productId",
              oi.quantity,
              oi.notes,
              p.name as "productName",
              p.sku as "productSku",
              p.price as "productPrice"
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = $1
          `;
          
          const itemsResult = await pool.query(itemsQuery, [order.id]);
          
          // Add the items to the order
          order.items = itemsResult.rows || [];
          
          console.log(`Found fallback order data in database for store ${workItem.storeId} and user ${workItem.userId}:`, order);
          return res.json(order);
        }
        
        // As a last resort, generate from stock take data
        console.log(`No order data found in database for work item ${workItemId}. Checking stock take data.`);
        const generatedOrder = await storage.getOrderByWorkItemId(workItemId);
        
        if (generatedOrder) {
          console.log(`Generated order data from stock take for work item ${workItemId}:`, generatedOrder);
          return res.json(generatedOrder);
        }
        
        console.log(`No order data found for work item ${workItemId}.`);
        return res.json(null);
      } catch (err) {
        console.error("Error querying orders from database:", err);
        
        // Fall back to the storage method if database queries fail
        const order = await storage.getOrderByWorkItemId(workItemId);
        console.log(`Fallback order data for work item ${workItemId}:`, order);
        return res.json(order);
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
        
        if (merchandisingData) {
          res.json(merchandisingData);
        } else {
          // Provide a basic structure even when no data exists
          console.log(`No merchandising data found for work item ${workItemId}. Returning basic structure.`);
          res.json({
            id: `default-${workItemId}`,
            workItemId: workItemId,
            storeId: workItem.storeId,
            userId: workItem.userId,
            date: workItem.createdAt,
            items: [],
            promotionPictures: []
          });
        }
      } catch (err) {
        console.log("Error fetching merchandising data (expected if not found):", err);
        // Return a structured response even in case of error
        res.json({
          id: `default-${workItemId}`,
          workItemId: workItemId,
          storeId: workItem.storeId,
          userId: workItem.userId,
          date: workItem.createdAt,
          items: [],
          promotionPictures: []
        });
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
      
      // Query the database directly using SQL to ensure we get real data
      try {
        // Make sure uploads directory exists
        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const competitorQuery = `
          SELECT 
            cm.id, 
            cm.store_id as "storeId", 
            cm.user_id as "userId", 
            cm.date,
            cm.brand,
            cm.product_description as "productDescription",
            cm.promotional_price as "promotionalPrice",
            cm.promotion_pictures as "promotionPictures",
            cm.work_item_id as "workItemId"
          FROM competitor_merchandising cm
          WHERE cm.work_item_id = $1
          ORDER BY cm.date DESC
          LIMIT 1
        `;
        
        const competitorResult = await pool.query(competitorQuery, [workItemId]);
        
        if (competitorResult.rows && competitorResult.rows.length > 0) {
          const competitorData = competitorResult.rows[0];
          
          // Check if the promotion pictures is valid
          if (competitorData.promotionPictures && Array.isArray(competitorData.promotionPictures)) {
            // Make sure each path exists or filter it out
            competitorData.promotionPictures = competitorData.promotionPictures.filter(picPath => {
              if (!picPath || typeof picPath !== 'string') return false;
              
              // Check if file exists
              try {
                const fullPath = path.resolve(picPath);
                return fs.existsSync(fullPath);
              } catch (err) {
                console.error(`Error checking if image exists (${picPath}):`, err);
                return false;
              }
            });
            
            console.log(`Filtered promotion pictures to only include existing files: ${competitorData.promotionPictures.length} remain`);
          } else {
            // Ensure it's always an array
            competitorData.promotionPictures = [];
            console.log(`No promotion pictures found or invalid format, using empty array`);
          }
          
          console.log(`Found competitor data in database for work item ${workItemId}:`, competitorData);
          return res.json(competitorData);
        }
        
        // If no direct match by work_item_id, try to find by store and user
        const fallbackQuery = `
          SELECT 
            cm.id, 
            cm.store_id as "storeId", 
            cm.user_id as "userId", 
            cm.date,
            cm.brand,
            cm.product_description as "productDescription",
            cm.promotional_price as "promotionalPrice",
            cm.promotion_pictures as "promotionPictures"
          FROM competitor_merchandising cm
          WHERE cm.store_id = $1 AND cm.user_id = $2
          ORDER BY cm.date DESC
          LIMIT 1
        `;
        
        const fallbackResult = await pool.query(fallbackQuery, [workItem.storeId, workItem.userId]);
        
        if (fallbackResult.rows && fallbackResult.rows.length > 0) {
          const competitorData = fallbackResult.rows[0];
          
          // Add the work item ID for consistency
          competitorData.workItemId = workItemId;
          
          console.log(`Found fallback competitor data for store ${workItem.storeId} and user ${workItem.userId}:`, competitorData);
          return res.json(competitorData);
        }
        
        // Fall back to storage method if needed
        const memoryData = await storage.getCompetitorMerchandisingByWorkItemId(workItemId);
        if (memoryData) {
          console.log(`Found competitor data in memory for work item ${workItemId}:`, memoryData);
          return res.json(memoryData);
        }
        
        console.log(`No competitor data found for work item ${workItemId}. Returning basic structure.`);
        // Provide a basic structure even when no data exists
        return res.json({
          id: null,
          workItemId: workItemId,
          storeId: workItem.storeId,
          userId: workItem.userId,
          date: workItem.createdAt,
          brand: "No Data Available",
          productDescription: "No competitor data has been submitted for this work item yet.",
          promotionPictures: []
        });
      } catch (dbError) {
        console.error("Database error fetching competitor data:", dbError);
        
        // Try the storage method as fallback
        try {
          const competitorData = await storage.getCompetitorMerchandisingByWorkItemId(workItemId);
          if (competitorData) {
            console.log(`Found competitor data in storage for work item ${workItemId}:`, competitorData);
            return res.json(competitorData);
          }
        } catch (storageError) {
          console.error("Storage error fetching competitor data:", storageError);
        }
        
        // Return a structured response as last resort
        return res.json({
          id: null,
          workItemId: workItemId,
          storeId: workItem.storeId,
          userId: workItem.userId,
          date: workItem.createdAt,
          brand: "No Data Available",
          productDescription: "No competitor data has been submitted for this work item yet.",
          promotionPictures: []
        });
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
  
  // Reports routes for activity-based reports
  
  // Stock Take Reports - completion rate, counts
  app.get("/api/reports/stock-takes", isAuthenticated, async (req, res) => {
    try {
      const timeframe = req.query.timeframe as string || 'month'; // week, month, quarter, year
      const stockTakeStats = await storage.getStockTakeReportsData(timeframe);
      res.json(stockTakeStats);
    } catch (error) {
      console.error("Error getting stock take reports:", error);
      res.status(500).json({ message: "Failed to load stock take reports" });
    }
  });
  
  // Order Reports - orders placed, status, etc.
  app.get("/api/reports/orders", isAuthenticated, async (req, res) => {
    try {
      const timeframe = req.query.timeframe as string || 'month'; // week, month, quarter, year
      const orderStats = await storage.getOrderReportsData(timeframe);
      res.json(orderStats);
    } catch (error) {
      console.error("Error getting order reports:", error);
      res.status(500).json({ message: "Failed to load order reports" });
    }
  });
  
  // Competitor Analysis Reports - number of competitors, price points, etc.
  app.get("/api/reports/competitors", isAuthenticated, async (req, res) => {
    try {
      const timeframe = req.query.timeframe as string || 'month'; // week, month, quarter, year
      const competitorStats = await storage.getCompetitorReportsData(timeframe);
      res.json(competitorStats);
    } catch (error) {
      console.error("Error getting competitor reports:", error);
      res.status(500).json({ message: "Failed to load competitor reports" });
    }
  });
  
  // Activity Summary Reports - all types of activities summarized
  app.get("/api/reports/activities", isAuthenticated, async (req, res) => {
    try {
      const timeframe = req.query.timeframe as string || 'month'; // week, month, quarter, year
      const activityStats = await storage.getActivityReportsData(timeframe);
      res.json(activityStats);
    } catch (error) {
      console.error("Error getting activity reports:", error);
      res.status(500).json({ message: "Failed to load activity reports" });
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
  
  // Get all activities - paginated for efficient loading
  app.get("/api/activities/all", isAuthenticated, checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const offset = (page - 1) * limit;
      
      // Get total count for pagination
      const totalActivities = await storage.getActivitiesCount();
      
      // Get activities with related data
      const activities = await storage.getAllActivitiesWithRelations(limit, offset);
      
      res.json({
        data: activities,
        pagination: {
          total: totalActivities,
          page,
          limit,
          totalPages: Math.ceil(totalActivities / limit)
        }
      });
    } catch (error) {
      console.error("Error fetching all activities:", error);
      res.status(500).json({ message: "Failed to get activities" });
    }
  });

  // Get activities by user ID
  app.get("/api/users/:userId/activities", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Check if current user has permission to view this user's activities
      const currentUser = req.user as User;
      const isAdmin = currentUser.role === UserRole.ADMIN;
      const isManager = currentUser.role === UserRole.MANAGER;
      const isSelf = currentUser.id === userId;
      
      if (!isAdmin && !isManager && !isSelf) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      
      // Get user activities
      const activities = await storage.getActivitiesByUserId(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch user activities" });
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
  
  // Get assigned stores for a user
  app.get("/api/users/:userId/stores", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID format" });
      }
      
      // Check if current user has permission to view this user's assigned stores
      const currentUser = req.user as User;
      const isAdmin = currentUser.role === UserRole.ADMIN;
      const isManager = currentUser.role === UserRole.MANAGER;
      const isSelf = currentUser.id === userId;
      
      if (!isAdmin && !isManager && !isSelf) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      // Get user's assigned stores
      const assignedStores = await storage.getStoreAssignmentsByUserId(userId);
      res.json(assignedStores);
    } catch (error) {
      console.error("Error fetching user assigned stores:", error);
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch user assigned stores" });
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
  
  // Generic file upload endpoint
  app.post("/api/upload", isAuthenticated, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      // Return the file path relative to the uploads directory
      const filePath = req.file.filename;
      console.log("File uploaded successfully:", filePath);
      
      // Return the file path for the client to use
      return res.status(200).json({ 
        filePath,
        success: true,
        message: "File uploaded successfully" 
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({ 
        error: "File upload failed",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Serve static files from the uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
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
  
  // Set up multer for stock take image uploads
  const stockTakeStorage = multer.diskStorage({
    destination: function(req, file, cb) {
      const dir = './uploads';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: function(req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'stocktake-' + uniqueSuffix + ext);
    }
  });
  
  const stockTakeUpload = multer({
    storage: stockTakeStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function(req, file, cb) {
      const filetypes = /jpeg|jpg|png|gif/;
      const mimetype = filetypes.test(file.mimetype);
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error("Only image files are allowed"));
    }
  });
  
  // Create a new stock take
  app.post("/api/stock-takes", stockTakeUpload.array('pictures', 10), async (req, res) => {
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
      const workItemId = req.body.workItemId ? parseInt(req.body.workItemId) : null;
      
      // Detailed validation logging
      console.log("Validating required fields:", { 
        storeId, 
        validStoreId: !isNaN(storeId),
        hasItemsJson: !!itemsJson,
        itemsJsonType: typeof itemsJson,
        workItemId
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
      
      // Process pictures from multer file uploads
      let allPictures = [];
      
      // Process files uploaded via multer
      if (req.files && Array.isArray(req.files)) {
        console.log("Processing multer uploaded files:", (req.files as Express.Multer.File[]).map(f => f.path));
        
        // Add paths of all uploaded files
        (req.files as Express.Multer.File[]).forEach(file => {
          if (file && file.path) {
            allPictures.push(file.path);
          }
        });
      }
      
      // Also handle any existing picture paths from the request body (for backward compatibility)
      if (req.body.pictures) {
        let existingPictures = [];
        try {
          // Try to parse as JSON if it's a string array
          existingPictures = JSON.parse(req.body.pictures);
        } catch (e) {
          // If not JSON, treat as a single string
          existingPictures = [req.body.pictures];
        }
        
        // Only add non-empty strings
        if (Array.isArray(existingPictures)) {
          existingPictures.forEach(pic => {
            if (pic && typeof pic === 'string' && pic.trim() !== '') {
              // Store the paths as they are - they'll be served from /uploads
              allPictures.push(pic);
            }
          });
        }
      }
      
      console.log("Pictures to save:", {
        filesUploaded: req.files ? (req.files as Express.Multer.File[]).length : 0,
        existingPictures: req.body.pictures ? 'yes' : 'none',
        final: allPictures
      });
      
      // Create the stock take record in the database
      const stockTake = await storage.createStockTake({
        storeId,
        userId: req.user!.id,
        comment,
        pictures: allPictures,
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
      
      // Find and update ONLY the current work item
      try {
        // Get the current work item's ID from the request
        const workItemId = parseInt(req.body.workItemId);
        if (!isNaN(workItemId)) {
          const workItem = await storage.getWorkItemById(workItemId);
          
          // Only update if the work item exists, belongs to this user, and isn't already completed
          if (workItem && 
              workItem.userId === req.user!.id && 
              workItem.storeId === storeId && 
              workItem.type === 'stock_take' && 
              workItem.status !== 'completed') {
            
            console.log(`Completing work item ${workItemId} as part of stock take submission`);
            await storage.completeWorkItem(workItemId);
            console.log(`Updated work item ${workItemId} to completed status`);
          } else {
            console.log(`Work item ${workItemId} not updated: either not found, not owned by this user, or already completed`);
          }
        } else {
          console.log("No valid work item ID provided in the request");
        }
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
        picturesUploaded: allPictures.length
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

  // Update work item status endpoint
  app.put("/api/work-items/:id/status", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid work item ID" });
      }
      
      // Get the work item to check if it exists and verify permissions
      const workItem = await storage.getWorkItemById(id);
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Check permissions based on role
      if (req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.MANAGER) {
        // Admins and managers can update any work item
        console.log(`Admin/Manager ${req.user!.id} updating work item ${id}`);
      } else if (workItem.userId === req.user!.id) {
        // Users can always update their directly assigned work items
        console.log(`User ${req.user!.id} updating their own work item ${id}`);
      } else if (req.user!.role === UserRole.MERCHANDISER) {
        // Merchandisers can also update work items for stores they're assigned to
        try {
          const userAssignments = await storage.getAssignmentsByUserId(req.user!.id);
          const isAssignedToStore = userAssignments.some(a => a.storeId === workItem.storeId);
          
          if (isAssignedToStore) {
            console.log(`Merchandiser ${req.user!.id} assigned to store ${workItem.storeId} is updating work item ${id}`);
          } else {
            console.log(`Access denied: Merchandiser ${req.user!.id} not assigned to store ${workItem.storeId}`);
            return res.status(403).json({ 
              message: "You can only update work items for stores you're assigned to." 
            });
          }
        } catch (err) {
          console.error("Error checking store assignments:", err);
          return res.status(500).json({ message: "Error checking store assignments" });
        }
      } else {
        console.log(`Access denied: User ${req.user!.id} with role ${req.user!.role} not authorized for work item ${id}`);
        return res.status(403).json({ message: "Not authorized to update this work item" });
      }
      
      // Get the new status from request body
      const { status } = req.body;
      if (!status || !Object.values(WorkItemStatus).includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
      
      console.log(`Updating work item ${id} status to ${status} by user ${req.user!.id}`);
      
      // Update the work item status
      let updatedWorkItem;
      
      if (status === WorkItemStatus.COMPLETED) {
        updatedWorkItem = await storage.completeWorkItem(id);
        if (!updatedWorkItem) {
          console.error(`Failed to complete work item ${id}`);
          return res.status(500).json({ message: "Failed to mark work item as complete" });
        }
      } else {
        updatedWorkItem = await storage.updateWorkItemStatus(id, status);
        if (!updatedWorkItem) {
          console.error(`Failed to update work item ${id} status to ${status}`);
          return res.status(500).json({ message: "Failed to update work item status" });
        }
      }
      
      console.log(`Successfully updated work item ${id} status to ${status}`);
      res.json(updatedWorkItem);
    } catch (error) {
      console.error("Error updating work item status:", error);
      res.status(500).json({ message: "Failed to update work item status. Please try again." });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
