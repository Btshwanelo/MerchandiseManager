import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, checkRole } from "./auth";
import { UserRole, StockLocation } from "@shared/schema";
import { z } from "zod";
import { insertProductSchema, insertStoreSchema, insertShelfSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { registerUserRoutes } from "./user-routes";
import { registerAssignmentRoutes } from "./assignments-routes";

export async function registerRoutes(app: Express): Promise<Server> {
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
  // Set up authentication routes
  setupAuth(app);
  
  // Set up user management routes
  registerUserRoutes(app);
  
  // Set up store assignment and work item routes
  registerAssignmentRoutes(app);
  
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
  
  // Store routes
  app.get("/api/stores", async (req, res) => {
    try {
      const stores = await storage.getAllStores();
      res.json(stores);
    } catch (error) {
      res.status(500).json({ message: "Failed to get stores" });
    }
  });
  
  app.get("/api/stores/:id", async (req, res) => {
    try {
      const store = await storage.getStore(parseInt(req.params.id));
      if (!store) {
        return res.status(404).json({ message: "Store not found" });
      }
      res.json(store);
    } catch (error) {
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
                category: 'Other',
                price: 0, // Default price, can be updated later
                minStockLevel: 5
              });
              console.log(`Created new product with SKU ${item.productSku}`);
            } catch (error) {
              errors.push({ item, error: `Failed to create product with SKU ${item.productSku}: ${error instanceof Error ? error.message : 'Unknown error'}` });
              continue;
            }
          }
          
          // Find the store
          const stores = await storage.getAllStores();
          const store = stores.find(s => s.name === item.storeName);
          if (!store) {
            errors.push({ item, error: `Store with name ${item.storeName} not found` });
            continue;
          }

          // Find an existing shelf or create a new one
          let shelf = null;
          
          if (item.shelfName) {
            // Try to find a shelf with the given name in the store
            const shelves = await storage.getShelfByStoreId(store.id);
            shelf = shelves.find(s => s.name === item.shelfName);
          }
          
          // If no shelf was found or specified, try to find a shelf in the specified section
          if (!shelf && item.section) {
            const shelves = await storage.getShelfByStoreId(store.id);
            shelf = shelves.find(s => s.section === item.section);
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
