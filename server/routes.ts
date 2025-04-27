import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, checkRole } from "./auth";
import { UserRole } from "@shared/schema";
import { z } from "zod";
import { insertProductSchema, insertStoreSchema, insertShelfSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
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
      if (!req.isAuthenticated()) {
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
      if (!req.isAuthenticated()) {
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

  const httpServer = createServer(app);

  return httpServer;
}
