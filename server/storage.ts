import {
  users, stores, products, shelves, inventory, activities, alerts, stockTakes, stockTakeItems, storeAssignments, workItems,
  type User, type InsertUser, type Store, type InsertStore,
  type Product, type InsertProduct, type Shelf, type InsertShelf,
  type Inventory, type InsertInventory, type Activity, type InsertActivity,
  type Alert, type InsertAlert, type StockTake, type InsertStockTake, 
  type StockTakeItem, type InsertStockTakeItem, type StoreAssignment, type InsertStoreAssignment,
  type WorkItem, type InsertWorkItem, WorkItemStatus
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { db } from "./db";
import { eq, and, or, desc, lte, count, sum, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Interface defining all storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Password reset methods
  createPasswordResetToken(token: { userId: number, token: string, expiresAt: Date }): Promise<any>;
  getPasswordResetToken(token: string): Promise<{ id: number, userId: number, token: string, expiresAt: Date } | undefined>;
  deletePasswordResetToken(id: number): Promise<boolean>;
  
  // Store Assignment methods
  getStoreAssignment(id: number): Promise<StoreAssignment | undefined>;
  getAllStoreAssignments(): Promise<StoreAssignment[]>;
  getStoreAssignmentsByUserId(userId: number): Promise<(StoreAssignment & { store: Store })[]>;
  getStoreAssignmentsByStoreId(storeId: number): Promise<(StoreAssignment & { user: User })[]>;
  getActiveStoreAssignments(): Promise<(StoreAssignment & { user: User, store: Store })[]>;
  createStoreAssignment(assignment: InsertStoreAssignment): Promise<StoreAssignment>;
  updateStoreAssignment(id: number, assignment: Partial<InsertStoreAssignment>): Promise<StoreAssignment | undefined>;
  deleteStoreAssignment(id: number): Promise<boolean>;
  
  // Work Item methods
  getWorkItem(id: number): Promise<WorkItem | undefined>;
  getWorkItemById(id: number): Promise<(WorkItem & { user?: User, store?: Store, creator?: User }) | undefined>;
  getAllWorkItems(): Promise<(WorkItem & { user?: User, store?: Store })[]>;
  getWorkItemsByUserId(userId: number): Promise<(WorkItem & { store: Store })[]>;
  getWorkItemsByStoreId(storeId: number): Promise<(WorkItem & { user: User })[]>;
  getWorkItemsByAssignmentId(assignmentId: number): Promise<WorkItem[]>;
  getActiveWorkItems(): Promise<(WorkItem & { user: User, store: Store })[]>;
  createWorkItem(workItem: InsertWorkItem): Promise<WorkItem>;
  updateWorkItem(id: number, workItem: Partial<InsertWorkItem>): Promise<WorkItem | undefined>;
  completeWorkItem(id: number): Promise<WorkItem | undefined>;
  deleteWorkItem(id: number): Promise<boolean>;
  
  // Audit Trail methods
  createAuditEntry(auditEntry: { 
    workItemId: number;
    userId: number;
    action: string;
    timestamp: Date;
    previousStatus?: string;
    newStatus?: string;
    comment?: string;
  }): Promise<any>;
  getWorkItemAuditTrail(workItemId: number): Promise<any[]>;
  
  // Store methods
  getStore(id: number): Promise<Store | undefined>;
  getAllStores(): Promise<Store[]>;
  createStore(store: InsertStore): Promise<Store>;
  updateStore(id: number, store: Partial<InsertStore>): Promise<Store | undefined>;
  deleteStore(id: number): Promise<boolean>;
  
  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProductBySku(sku: string): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  
  // Shelf methods
  getShelf(id: number): Promise<Shelf | undefined>;
  getAllShelves(): Promise<Shelf[]>;
  getShelfByStoreId(storeId: number): Promise<Shelf[]>;
  createShelf(shelf: InsertShelf): Promise<Shelf>;
  updateShelf(id: number, shelf: Partial<InsertShelf>): Promise<Shelf | undefined>;
  deleteShelf(id: number): Promise<boolean>;
  
  // Inventory methods
  getInventory(id: number): Promise<Inventory | undefined>;
  getInventoryByProductId(productId: number): Promise<Inventory[]>;
  getInventoryByShelfId(shelfId: number): Promise<Inventory[]>;
  getInventoryByStoreId(storeId: number): Promise<(Inventory & { product: Product, shelf: Shelf })[]>;
  getLowStockItems(): Promise<(Inventory & { product: Product, shelf: Shelf, store: Store })[]>;
  createInventory(inventory: InsertInventory): Promise<Inventory>;
  updateInventory(id: number, inventory: Partial<InsertInventory>): Promise<Inventory | undefined>;
  adjustInventory(productId: number, shelfId: number, quantity: number, userId: number): Promise<Inventory | undefined>;
  
  // Activity methods
  getActivity(id: number): Promise<Activity | undefined>;
  getAllActivities(): Promise<Activity[]>;
  getRecentActivities(limit: number): Promise<(Activity & { product: Product, user: User, store: Store })[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  
  // Alert methods
  getAlert(id: number): Promise<Alert | undefined>;
  getAllAlerts(): Promise<Alert[]>;
  getActiveAlerts(): Promise<(Alert & { product: Product, store: Store })[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  resolveAlert(id: number, userId: number): Promise<Alert | undefined>;
  
  // StockTake methods
  getStockTake(id: number): Promise<StockTake | undefined>;
  getAllStockTakes(): Promise<StockTake[]>;
  getStockTakeByStoreId(storeId: number): Promise<StockTake[]>;
  getStockTakesByUserId(userId: number): Promise<StockTake[]>;
  getStockTakeWithItems(id: number): Promise<(StockTake & { items: (StockTakeItem & { product: Product })[] }) | undefined>;
  createStockTake(stockTake: InsertStockTake): Promise<StockTake>;
  updateStockTake(id: number, data: Partial<StockTake>, editorId: number, auditComment: string): Promise<StockTake>;
  updateStockTakeItems(stockTakeId: number, items: InsertStockTakeItem[]): Promise<StockTakeItem[]>;
  
  // StockTakeItem methods
  getStockTakeItem(id: number): Promise<StockTakeItem | undefined>;
  getStockTakeItemsByStockTakeId(stockTakeId: number): Promise<StockTakeItem[]>;
  createStockTakeItem(item: InsertStockTakeItem): Promise<StockTakeItem>;
  updateStockTakeItem(id: number, data: Partial<StockTakeItem>): Promise<StockTakeItem>;
  
  // Dashboard methods
  getDashboardStats(): Promise<{
    totalProducts: number,
    lowStockItems: number,
    activeStores: number,
    inventoryValue: number
  }>;
  
  // Process Form methods
  createMerchandisingData(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    date: Date;
    merchandisingItems: Array<{
      productId: number;
      price: number;
      notes?: string;
    }>;
  }): Promise<any>;
  
  createCompetitorMerchandising(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    brand: string;
    productDescription: string;
    promoType?: string;
    promoDetails?: string;
    price?: number;
    pictureUrl?: string;
    date: Date;
  }): Promise<any>;
  
  createOrder(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    products?: Array<{
      productId: number;
      quantity: number;
    }>;
    notes: string;
    priority?: string;
    status: string;
    date: Date;
  }): Promise<any>;
  
  // Session store for authentication
  sessionStore: any; // Express session store
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stores: Map<number, Store>;
  private products: Map<number, Product>;
  private shelves: Map<number, Shelf>;
  private inventoryItems: Map<number, Inventory>;
  private activities: Map<number, Activity>;
  private alerts: Map<number, Alert>;
  private passwordResetTokens: Map<number, { id: number, userId: number, token: string, expiresAt: Date }>;
  private storeAssignments: Map<number, StoreAssignment>;
  private workItems: Map<number, WorkItem>;
  private stockTakes: Map<number, StockTake>;
  private stockTakeItems: Map<number, StockTakeItem>;
  private merchandisingData: Map<number, any>;
  private competitorData: Map<number, any>;
  private orders: Map<number, any>;
  private auditEntries: Map<number, {
    id: number;
    workItemId: number;
    userId: number;
    action: string;
    timestamp: Date;
    previousStatus?: string;
    newStatus?: string;
    comment?: string;
  }>;
  
  sessionStore: any; // Express session store
  currentUserId: number;
  currentStoreId: number;
  currentProductId: number;
  currentShelfId: number;
  currentInventoryId: number;
  currentActivityId: number;
  currentAlertId: number;
  currentStoreAssignmentId: number;
  currentWorkItemId: number;
  currentMerchandisingId: number;
  currentCompetitorId: number;
  currentOrderId: number;
  currentAuditEntryId: number;

  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.products = new Map();
    this.shelves = new Map();
    this.inventoryItems = new Map();
    this.activities = new Map();
    this.alerts = new Map();
    this.passwordResetTokens = new Map();
    this.storeAssignments = new Map();
    this.workItems = new Map();
    this.stockTakes = new Map();
    this.stockTakeItems = new Map();
    this.merchandisingData = new Map();
    this.competitorData = new Map();
    this.orders = new Map();
    this.auditEntries = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    this.currentUserId = 1;
    this.currentStoreId = 1;
    this.currentProductId = 1;
    this.currentShelfId = 1;
    this.currentInventoryId = 1;
    this.currentActivityId = 1;
    this.currentAlertId = 1;
    this.resetTokenIdCounter = 1;
    this.currentStoreAssignmentId = 1;
    this.currentWorkItemId = 1;
    this.currentMerchandisingId = 1;
    this.currentCompetitorId = 1;
    this.currentOrderId = 1;
    this.currentAuditEntryId = 1;
    
    // Initialize with sample admin user
    this.createUser({
      username: "admin",
      password: "admin123", // Plain text for demo - will be hashed on first actual login
      name: "Admin User",
      email: "admin@inventrack.com",
      role: "admin"
    });
    
    // Add a merchandiser test user
    this.createUser({
      username: "test",
      password: "test123", // Plain text for demo - will be hashed on first actual login
      name: "Test Merchandiser",
      email: "test@inventrack.com",
      role: "merchandiser"
    });
    
    // Add a manager user
    this.createUser({
      username: "manager",
      password: "manager123", // Plain text for demo - will be hashed on first actual login
      name: "Store Manager",
      email: "manager@inventrack.com",
      role: "manager"
    });
    
    // Add sample store
    this.createStore({
      name: "Downtown Supermarket",
      location: "123 Main Street, Downtown",
      managerId: 1
    });
    
    // Add sample products
    this.createProduct({
      name: "Premium Cereal",
      sku: "CEREAL001",
      description: "Premium breakfast cereal with added vitamins",
      category: "Breakfast",
      price: 499,
      minStockLevel: 10
    });
    
    this.createProduct({
      name: "Organic Pasta",
      sku: "PASTA002",
      description: "Organic whole wheat pasta",
      category: "Pasta & Rice",
      price: 349,
      minStockLevel: 15
    });
    
    this.createProduct({
      name: "Energy Drink",
      sku: "DRINK003",
      description: "High-energy sports drink",
      category: "Beverages",
      price: 259,
      minStockLevel: 20
    });
    
    // Add shelves
    this.createShelf({
      name: "Shelf A1",
      section: "Breakfast Foods",
      storeId: 1
    });
    
    this.createShelf({
      name: "Shelf B2",
      section: "Pasta & Rice",
      storeId: 1
    });
    
    this.createShelf({
      name: "Shelf C3",
      section: "Beverages",
      storeId: 1
    });
    
    // Add inventory
    this.createInventory({
      productId: 1,
      shelfId: 1,
      quantity: 12
    });
    
    this.createInventory({
      productId: 2,
      shelfId: 2,
      quantity: 18
    });
    
    this.createInventory({
      productId: 3,
      shelfId: 3,
      quantity: 8
    });
  }

  // In-memory counter for reset tokens
  private resetTokenIdCounter: number;

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    // Add default fields for new users
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Password reset methods
  async createPasswordResetToken(tokenData: { userId: number, token: string, expiresAt: Date }): Promise<any> {
    const id = this.resetTokenIdCounter++;
    const token = { id, ...tokenData };
    this.passwordResetTokens.set(id, token);
    return token;
  }
  
  async getPasswordResetToken(tokenString: string): Promise<{ id: number, userId: number, token: string, expiresAt: Date } | undefined> {
    return Array.from(this.passwordResetTokens.values()).find(
      (token) => token.token === tokenString,
    );
  }
  
  async deletePasswordResetToken(id: number): Promise<boolean> {
    return this.passwordResetTokens.delete(id);
  }
  
  // Store methods
  async getStore(id: number): Promise<Store | undefined> {
    return this.stores.get(id);
  }
  
  async getAllStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }
  
  async createStore(insertStore: InsertStore): Promise<Store> {
    const id = this.currentStoreId++;
    const store: Store = { ...insertStore, id, createdAt: new Date() };
    this.stores.set(id, store);
    return store;
  }
  
  async updateStore(id: number, storeData: Partial<InsertStore>): Promise<Store | undefined> {
    const store = await this.getStore(id);
    if (!store) return undefined;
    
    const updatedStore = { ...store, ...storeData };
    this.stores.set(id, updatedStore);
    return updatedStore;
  }
  
  async deleteStore(id: number): Promise<boolean> {
    return this.stores.delete(id);
  }
  
  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }
  
  async getProductBySku(sku: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(
      (product) => product.sku === sku,
    );
  }
  
  async getAllProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }
  
  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.category === category,
    );
  }
  
  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = { ...insertProduct, id, createdAt: new Date() };
    this.products.set(id, product);
    return product;
  }
  
  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = await this.getProduct(id);
    if (!product) return undefined;
    
    const updatedProduct = { ...product, ...productData };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }
  
  // Shelf methods
  async getShelf(id: number): Promise<Shelf | undefined> {
    return this.shelves.get(id);
  }
  
  async getAllShelves(): Promise<Shelf[]> {
    return Array.from(this.shelves.values());
  }
  
  async getShelfByStoreId(storeId: number): Promise<Shelf[]> {
    return Array.from(this.shelves.values()).filter(
      (shelf) => shelf.storeId === storeId,
    );
  }
  
  async createShelf(insertShelf: InsertShelf): Promise<Shelf> {
    const id = this.currentShelfId++;
    const shelf: Shelf = { ...insertShelf, id, createdAt: new Date() };
    this.shelves.set(id, shelf);
    return shelf;
  }
  
  async updateShelf(id: number, shelfData: Partial<InsertShelf>): Promise<Shelf | undefined> {
    const shelf = await this.getShelf(id);
    if (!shelf) return undefined;
    
    const updatedShelf = { ...shelf, ...shelfData };
    this.shelves.set(id, updatedShelf);
    return updatedShelf;
  }
  
  async deleteShelf(id: number): Promise<boolean> {
    return this.shelves.delete(id);
  }
  
  // Inventory methods
  async getInventory(id: number): Promise<Inventory | undefined> {
    return this.inventoryItems.get(id);
  }
  
  async getInventoryByProductId(productId: number): Promise<Inventory[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (inv) => inv.productId === productId,
    );
  }
  
  async getInventoryByShelfId(shelfId: number): Promise<Inventory[]> {
    return Array.from(this.inventoryItems.values()).filter(
      (inv) => inv.shelfId === shelfId,
    );
  }
  
  async getInventoryByStoreId(storeId: number): Promise<(Inventory & { product: Product, shelf: Shelf })[]> {
    const shelves = await this.getShelfByStoreId(storeId);
    const shelfIds = shelves.map(shelf => shelf.id);
    
    const inventoryItems = Array.from(this.inventoryItems.values()).filter(
      (inv) => shelfIds.includes(inv.shelfId)
    );
    
    return Promise.all(inventoryItems.map(async (inv) => {
      const product = await this.getProduct(inv.productId);
      const shelf = await this.getShelf(inv.shelfId);
      
      if (!product || !shelf) {
        throw new Error('Referenced product or shelf not found');
      }
      
      return { ...inv, product, shelf };
    }));
  }
  
  async getLowStockItems(): Promise<(Inventory & { product: Product, shelf: Shelf, store: Store })[]> {
    const inventoryItems = Array.from(this.inventoryItems.values());
    const lowStockItems: (Inventory & { product: Product, shelf: Shelf, store: Store })[] = [];
    
    for (const inv of inventoryItems) {
      const product = await this.getProduct(inv.productId);
      const shelf = await this.getShelf(inv.shelfId);
      
      if (!product || !shelf) continue;
      
      const store = await this.getStore(shelf.storeId);
      if (!store) continue;
      
      if (inv.quantity <= product.minStockLevel) {
        lowStockItems.push({ ...inv, product, shelf, store });
      }
    }
    
    return lowStockItems;
  }
  
  async createInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const id = this.currentInventoryId++;
    const inventoryItem: Inventory = { ...insertInventory, id, updatedAt: new Date() };
    this.inventoryItems.set(id, inventoryItem);
    return inventoryItem;
  }
  
  async updateInventory(id: number, inventoryData: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const inventoryItem = await this.getInventory(id);
    if (!inventoryItem) return undefined;
    
    const updatedInventory = { ...inventoryItem, ...inventoryData, updatedAt: new Date() };
    this.inventoryItems.set(id, updatedInventory);
    return updatedInventory;
  }
  
  async adjustInventory(productId: number, shelfId: number, quantity: number, userId: number): Promise<Inventory | undefined> {
    // Find existing inventory for this product and shelf
    const existingInventory = Array.from(this.inventoryItems.values()).find(
      (inv) => inv.productId === productId && inv.shelfId === shelfId
    );
    
    if (existingInventory) {
      const newQuantity = existingInventory.quantity + quantity;
      if (newQuantity < 0) {
        throw new Error('Cannot reduce inventory below zero');
      }
      
      // Update inventory
      const updatedInventory = await this.updateInventory(existingInventory.id, {
        quantity: newQuantity
      });
      
      // Get shelf to find store ID
      const shelf = await this.getShelf(shelfId);
      if (!shelf) {
        throw new Error('Shelf not found');
      }
      
      // Create activity record
      await this.createActivity({
        actionType: quantity > 0 ? 'add' : 'remove',
        productId,
        shelfId,
        storeId: shelf.storeId,
        userId,
        quantity: Math.abs(quantity),
        status: 'completed'
      });
      
      // Check if this adjustment results in low stock and create alert if needed
      const product = await this.getProduct(productId);
      if (product && newQuantity <= product.minStockLevel) {
        await this.createAlert({
          type: 'low_stock',
          productId,
          shelfId,
          storeId: shelf.storeId,
          message: `Low stock for ${product.name}: ${newQuantity} units remaining`,
          status: 'active'
        });
      }
      
      return updatedInventory;
    } else {
      if (quantity < 0) {
        throw new Error('Cannot create inventory with negative quantity');
      }
      
      // Create new inventory entry
      const newInventory = await this.createInventory({
        productId,
        shelfId,
        quantity
      });
      
      // Get shelf to find store ID
      const shelf = await this.getShelf(shelfId);
      if (!shelf) {
        throw new Error('Shelf not found');
      }
      
      // Create activity record
      await this.createActivity({
        actionType: 'add',
        productId,
        shelfId,
        storeId: shelf.storeId,
        userId,
        quantity,
        status: 'completed'
      });
      
      // Check if this new inventory is low stock
      const product = await this.getProduct(productId);
      if (product && quantity <= product.minStockLevel) {
        await this.createAlert({
          type: 'low_stock',
          productId,
          shelfId,
          storeId: shelf.storeId,
          message: `Low stock for ${product.name}: ${quantity} units remaining`,
          status: 'active'
        });
      }
      
      return newInventory;
    }
  }
  
  // Activity methods
  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }
  
  async getAllActivities(): Promise<Activity[]> {
    return Array.from(this.activities.values());
  }
  
  async getRecentActivities(limit: number): Promise<(Activity & { product: Product, user: User, store: Store })[]> {
    const activities = Array.from(this.activities.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    
    return Promise.all(activities.map(async (activity) => {
      const product = await this.getProduct(activity.productId);
      const user = await this.getUser(activity.userId);
      const store = await this.getStore(activity.storeId);
      
      if (!product || !user || !store) {
        throw new Error('Referenced product, user, or store not found');
      }
      
      return { ...activity, product, user, store };
    }));
  }
  
  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const id = this.currentActivityId++;
    const activity: Activity = { ...insertActivity, id, timestamp: new Date() };
    this.activities.set(id, activity);
    return activity;
  }
  
  // Alert methods
  async getAlert(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }
  
  async getAllAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values());
  }
  
  async getActiveAlerts(): Promise<(Alert & { product: Product, store: Store })[]> {
    const alerts = Array.from(this.alerts.values()).filter(
      (alert) => alert.status === 'active'
    );
    
    return Promise.all(alerts.map(async (alert) => {
      const product = await this.getProduct(alert.productId);
      const store = await this.getStore(alert.storeId);
      
      if (!product || !store) {
        throw new Error('Referenced product or store not found');
      }
      
      return { ...alert, product, store };
    }));
  }
  
  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentAlertId++;
    const alert: Alert = { ...insertAlert, id, createdAt: new Date() };
    this.alerts.set(id, alert);
    return alert;
  }
  
  async resolveAlert(id: number, userId: number): Promise<Alert | undefined> {
    const alert = await this.getAlert(id);
    if (!alert) return undefined;
    
    const updatedAlert = { 
      ...alert, 
      status: 'resolved', 
      resolvedAt: new Date(),
      resolvedBy: userId
    };
    
    this.alerts.set(id, updatedAlert);
    return updatedAlert;
  }
  
  // Store Assignment methods
  async getStoreAssignment(id: number): Promise<StoreAssignment | undefined> {
    return this.storeAssignments.get(id);
  }
  
  async getAllStoreAssignments(): Promise<StoreAssignment[]> {
    return Array.from(this.storeAssignments.values());
  }
  
  async getStoreAssignmentsByUserId(userId: number): Promise<(StoreAssignment & { store: Store })[]> {
    const assignments = Array.from(this.storeAssignments.values()).filter(
      (assignment) => assignment.userId === userId
    );
    
    return Promise.all(assignments.map(async (assignment) => {
      const store = await this.getStore(assignment.storeId);
      if (!store) {
        throw new Error('Referenced store not found');
      }
      return { ...assignment, store };
    }));
  }
  
  async getStoreAssignmentsByStoreId(storeId: number): Promise<(StoreAssignment & { user: User })[]> {
    const assignments = Array.from(this.storeAssignments.values()).filter(
      (assignment) => assignment.storeId === storeId
    );
    
    return Promise.all(assignments.map(async (assignment) => {
      const user = await this.getUser(assignment.userId);
      if (!user) {
        throw new Error('Referenced user not found');
      }
      return { ...assignment, user };
    }));
  }
  
  async getActiveStoreAssignments(): Promise<(StoreAssignment & { user: User, store: Store })[]> {
    const now = new Date();
    const assignments = Array.from(this.storeAssignments.values()).filter(
      (assignment) => {
        // Assignment is active if status is 'active' and either
        // endDate is null (ongoing) or endDate is in the future
        return assignment.status === 'active' && 
               (assignment.endDate === null || assignment.endDate > now);
      }
    );
    
    return Promise.all(assignments.map(async (assignment) => {
      const user = await this.getUser(assignment.userId);
      const store = await this.getStore(assignment.storeId);
      
      if (!user || !store) {
        throw new Error('Referenced user or store not found');
      }
      
      return { ...assignment, user, store };
    }));
  }
  
  async createStoreAssignment(assignment: InsertStoreAssignment): Promise<StoreAssignment> {
    const id = this.currentStoreAssignmentId++;
    const storeAssignment: StoreAssignment = {
      ...assignment,
      id,
      createdAt: new Date(),
    };
    this.storeAssignments.set(id, storeAssignment);
    return storeAssignment;
  }
  
  async updateStoreAssignment(id: number, assignment: Partial<InsertStoreAssignment>): Promise<StoreAssignment | undefined> {
    const storeAssignment = await this.getStoreAssignment(id);
    if (!storeAssignment) return undefined;
    
    const updatedAssignment = { ...storeAssignment, ...assignment };
    this.storeAssignments.set(id, updatedAssignment);
    return updatedAssignment;
  }
  
  async deleteStoreAssignment(id: number): Promise<boolean> {
    return this.storeAssignments.delete(id);
  }
  
  // Work Item methods
  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    return this.workItems.get(id);
  }
  
  async getWorkItemById(id: number): Promise<WorkItem | undefined> {
    return this.workItems.get(id);
  }
  
  async getAllWorkItems(): Promise<WorkItem[]> {
    return Array.from(this.workItems.values());
  }
  
  async getWorkItemsByUserId(userId: number): Promise<(WorkItem & { store: Store })[]> {
    const items = Array.from(this.workItems.values()).filter(
      (item) => item.userId === userId
    );
    
    return Promise.all(items.map(async (item) => {
      const store = await this.getStore(item.storeId);
      if (!store) {
        throw new Error('Referenced store not found');
      }
      return { ...item, store };
    }));
  }
  
  // Audit Trail methods
  async createAuditEntry(auditEntry: { 
    workItemId: number;
    userId: number;
    action: string;
    timestamp: Date;
    previousStatus?: string;
    newStatus?: string;
    comment?: string;
  }): Promise<{ 
    id: number;
    workItemId: number;
    userId: number;
    action: string;
    timestamp: Date;
    previousStatus?: string;
    newStatus?: string;
    comment?: string;
  }> {
    const id = this.currentAuditEntryId++;
    const createdEntry = {
      id,
      workItemId: auditEntry.workItemId,
      userId: auditEntry.userId,
      action: auditEntry.action,
      timestamp: auditEntry.timestamp || new Date(),
      previousStatus: auditEntry.previousStatus,
      newStatus: auditEntry.newStatus,
      comment: auditEntry.comment
    };
    this.auditEntries.set(id, createdEntry);
    return createdEntry;
  }
  
  async getWorkItemAuditTrail(workItemId: number): Promise<{
    id: number;
    workItemId: number;
    userId: number;
    action: string;
    timestamp: Date;
    previousStatus?: string;
    newStatus?: string;
    comment?: string;
  }[]> {
    return Array.from(this.auditEntries.values())
      .filter((entry) => entry.workItemId === workItemId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
  
  // Stock Take methods
  async getStockTake(id: number): Promise<any> {
    return {};
  }
  
  async getStockTakeByWorkItemId(workItemId: number): Promise<any> {
    return {};
  }
  
  async updateStockTake(id: number, data: any): Promise<any> {
    return {};
  }
  
  async createStockTake(data: any): Promise<any> {
    return {};
  }
  
  // Merchandising data methods
  async createMerchandising(data: any): Promise<any> {
    return {};
  }
  
  async getMerchandising(id: number): Promise<any> {
    return {};
  }
  
  async getMerchandisingByWorkItemId(workItemId: number): Promise<any> {
    return {};
  }
  
  // Competitor data methods
  async createCompetitorMerchandising(data: any): Promise<any> {
    return {};
  }
  
  async getCompetitorMerchandising(id: number): Promise<any> {
    return {};
  }
  
  async getCompetitorMerchandisingByWorkItemId(workItemId: number): Promise<any> {
    return {};
  }
  
  // Order methods
  async createOrder(data: any): Promise<any> {
    return {};
  }
  
  async getOrder(id: number): Promise<any> {
    return {};
  }
  
  async getOrderByWorkItemId(workItemId: number): Promise<any> {
    return {};
  }
  
  async updateOrder(id: number, data: any): Promise<any> {
    return {};
  }
  
  async getWorkItemsByStoreId(storeId: number): Promise<(WorkItem & { user: User })[]> {
    const items = Array.from(this.workItems.values()).filter(
      (item) => item.storeId === storeId
    );
    
    return Promise.all(items.map(async (item) => {
      const user = await this.getUser(item.userId);
      if (!user) {
        throw new Error('Referenced user not found');
      }
      return { ...item, user };
    }));
  }
  
  async getWorkItemsByAssignmentId(assignmentId: number): Promise<WorkItem[]> {
    return Array.from(this.workItems.values()).filter(
      (item) => item.storeAssignmentId === assignmentId
    );
  }
  
  async getActiveWorkItems(): Promise<(WorkItem & { user: User, store: Store })[]> {
    const items = Array.from(this.workItems.values()).filter(
      (item) => item.status === 'pending' || item.status === 'in_progress'
    );
    
    return Promise.all(items.map(async (item) => {
      const user = await this.getUser(item.userId);
      const store = await this.getStore(item.storeId);
      
      if (!user || !store) {
        throw new Error('Referenced user or store not found');
      }
      
      return { ...item, user, store };
    }));
  }
  
  async createWorkItem(workItem: InsertWorkItem): Promise<WorkItem> {
    const id = this.currentWorkItemId++;
    const newWorkItem: WorkItem = {
      ...workItem,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.workItems.set(id, newWorkItem);
    return newWorkItem;
  }
  
  async updateWorkItem(id: number, workItem: Partial<InsertWorkItem>): Promise<WorkItem | undefined> {
    const item = await this.getWorkItem(id);
    if (!item) return undefined;
    
    const updatedItem = { 
      ...item, 
      ...workItem, 
      updatedAt: new Date() 
    };
    this.workItems.set(id, updatedItem);
    return updatedItem;
  }
  
  async completeWorkItem(id: number): Promise<WorkItem | undefined> {
    const item = await this.getWorkItem(id);
    if (!item) return undefined;
    
    const completedItem = { 
      ...item, 
      status: 'completed', 
      completedAt: new Date(),
      updatedAt: new Date()
    };
    this.workItems.set(id, completedItem);
    return completedItem;
  }
  
  async deleteWorkItem(id: number): Promise<boolean> {
    return this.workItems.delete(id);
  }
  
  // Dashboard methods
  async getDashboardStats(): Promise<{
    totalProducts: number,
    lowStockItems: number,
    activeStores: number,
    inventoryValue: number
  }> {
    const products = await this.getAllProducts();
    const lowStockItems = await this.getLowStockItems();
    const stores = await this.getAllStores();
    
    // Calculate total inventory value
    let inventoryValue = 0;
    for (const inv of this.inventoryItems.values()) {
      const product = await this.getProduct(inv.productId);
      if (product) {
        inventoryValue += product.price * inv.quantity;
      }
    }
    
    return {
      totalProducts: products.length,
      lowStockItems: lowStockItems.length,
      activeStores: stores.length,
      inventoryValue
    };
  }
  
  // Process Form methods
  
  // Merchandising Data
  async createMerchandisingData(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    date: Date;
    merchandisingItems: Array<{
      productId: number;
      price: number;
      notes?: string;
    }>;
  }): Promise<any> {
    const id = this.currentMerchandisingId++;
    
    const merchandisingData = {
      id,
      ...data,
      createdAt: new Date()
    };
    
    this.merchandisingData.set(id, merchandisingData);
    
    // Update the work item status to indicate progress
    const workItem = await this.getWorkItem(data.workItemId);
    if (workItem && workItem.status === WorkItemStatus.PENDING) {
      await this.updateWorkItem(data.workItemId, { status: WorkItemStatus.IN_PROGRESS });
    }
    
    // Track this as an activity
    await this.createActivity({
      userId: data.userId,
      storeId: data.storeId,
      productId: data.merchandisingItems.length > 0 ? data.merchandisingItems[0].productId : 0,
      actionType: 'merchandising_data',
      status: 'completed',
      timestamp: new Date(),
      notes: `Merchandising data recorded for ${data.merchandisingItems.length} products`
    });
    
    return merchandisingData;
  }
  
  // Competitor Merchandising
  async createCompetitorMerchandising(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    brand: string;
    productDescription: string;
    promoType?: string;
    promoDetails?: string;
    price?: number;
    pictureUrl?: string;
    date: Date;
  }): Promise<any> {
    const id = this.currentCompetitorId++;
    
    const competitorData = {
      id,
      ...data,
      createdAt: new Date()
    };
    
    this.competitorData.set(id, competitorData);
    
    // Update the work item status if needed
    const workItem = await this.getWorkItem(data.workItemId);
    if (workItem && workItem.status === WorkItemStatus.PENDING) {
      await this.updateWorkItem(data.workItemId, { status: WorkItemStatus.IN_PROGRESS });
    }
    
    // Track this as an activity
    await this.createActivity({
      userId: data.userId,
      storeId: data.storeId,
      productId: 0, // No specific product ID for competitor data
      actionType: 'competitor_analysis',
      status: 'completed',
      timestamp: new Date(),
      notes: `Competitor data recorded for ${data.brand}`
    });
    
    return competitorData;
  }
  
  // Orders
  async createOrder(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    products?: Array<{
      productId: number;
      quantity: number;
    }>;
    notes: string;
    priority?: string;
    status: string;
    date: Date;
  }): Promise<any> {
    const id = this.currentOrderId++;
    
    const orderData = {
      id,
      ...data,
      createdAt: new Date(),
      // Set defaults if not provided
      priority: data.priority || 'medium'
    };
    
    this.orders.set(id, orderData);
    
    // Update the work item status
    await this.updateWorkItem(data.workItemId, { status: WorkItemStatus.COMPLETED });
    
    // Create alert for managers about the new order
    await this.createAlert({
      message: `New order created: ${data.notes}`,
      type: 'order',
      storeId: data.storeId,
      productId: data.products && data.products.length > 0 ? data.products[0].productId : 0,
      status: 'active',
      createdAt: new Date()
    });
    
    // Track this as an activity
    await this.createActivity({
      userId: data.userId,
      storeId: data.storeId,
      productId: data.products && data.products.length > 0 ? data.products[0].productId : 0,
      actionType: 'order_placed',
      status: 'pending',
      timestamp: new Date(),
      notes: data.notes
    });
    
    return orderData;
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }
  
  // Work Item methods with detailed implementation
  async getWorkItemById(id: number): Promise<(WorkItem & { user?: User, store?: Store, creator?: User }) | undefined> {
    try {
      // First get the work item
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(eq(workItems.id, id));
      
      if (!workItem) return undefined;
      
      // Get user (merchandiser) info
      let user = undefined;
      if (workItem.userId) {
        const [userRow] = await db
          .select()
          .from(users)
          .where(eq(users.id, workItem.userId));
        if (userRow) {
          // Remove sensitive data
          const { password, ...safeUser } = userRow;
          user = safeUser;
        }
      }
      
      // Get store info
      let store = undefined;
      if (workItem.storeId) {
        const [storeRow] = await db
          .select()
          .from(stores)
          .where(eq(stores.id, workItem.storeId));
        store = storeRow;
      }
      
      // Get creator info
      let creator = undefined;
      if (workItem.createdBy) {
        const [creatorRow] = await db
          .select()
          .from(users)
          .where(eq(users.id, workItem.createdBy));
        if (creatorRow) {
          // Remove sensitive data
          const { password, ...safeCreator } = creatorRow;
          creator = safeCreator;
        }
      }
      
      return {
        ...workItem,
        user,
        store,
        creator
      };
    } catch (error) {
      console.error("Error in getWorkItemById:", error);
      return undefined;
    }
  }
  
  // Get audit trail for a work item
  async getWorkItemAuditTrail(workItemId: number): Promise<any[]> {
    try {
      // Get audit entries
      const auditEntries = await db
        .select()
        .from(sql`work_item_audit_trail`)
        .where(sql`work_item_id = ${workItemId}`)
        .orderBy(sql`timestamp desc`);
      
      // Enrich with user information
      const enrichedEntries = await Promise.all(
        auditEntries.map(async (entry) => {
          if (!entry.userId) return entry;
          
          // Get user info
          const [userRow] = await db
            .select()
            .from(users)
            .where(eq(users.id, entry.userId));
          
          if (userRow) {
            // Remove password
            const { password, ...safeUser } = userRow;
            return { ...entry, user: safeUser };
          }
          
          return entry;
        })
      );
      
      return enrichedEntries;
    } catch (error) {
      console.error("Error in getWorkItemAuditTrail:", error);
      return [];
    }
  }
  
  // Create a new audit entry
  async createAuditEntry(auditEntry: {
    workItemId: number;
    userId: number;
    action: string;
    timestamp: Date;
    previousStatus?: string;
    newStatus?: string;
    comment?: string;
  }): Promise<any> {
    try {
      const [result] = await db
        .insert(sql`work_item_audit_trail`)
        .values({
          work_item_id: auditEntry.workItemId,
          user_id: auditEntry.userId,
          action: auditEntry.action,
          timestamp: auditEntry.timestamp,
          previous_status: auditEntry.previousStatus,
          new_status: auditEntry.newStatus,
          comment: auditEntry.comment
        })
        .returning();
      
      return result;
    } catch (error) {
      console.error("Error in createAuditEntry:", error);
      throw error;
    }
  }
  
  // Stock Take methods
  async getStockTake(id: number): Promise<StockTake | undefined> {
    const [stockTake] = await db.select().from(stockTakes).where(eq(stockTakes.id, id));
    return stockTake;
  }

  async getAllStockTakes(): Promise<StockTake[]> {
    return await db.select().from(stockTakes);
  }

  async getStockTakeByStoreId(storeId: number): Promise<StockTake[]> {
    return await db.select().from(stockTakes).where(eq(stockTakes.storeId, storeId));
  }

  async getStockTakesByUserId(userId: number): Promise<StockTake[]> {
    return await db.select().from(stockTakes).where(eq(stockTakes.userId, userId));
  }

  async getStockTakeWithItems(id: number): Promise<(StockTake & { items: (StockTakeItem & { product: Product })[] }) | undefined> {
    const [stockTake] = await db.select().from(stockTakes).where(eq(stockTakes.id, id));
    if (!stockTake) return undefined;
    
    const itemsWithProducts = await db.select({
      item: stockTakeItems,
      product: products
    }).from(stockTakeItems)
      .innerJoin(products, eq(stockTakeItems.productId, products.id))
      .where(eq(stockTakeItems.stockTakeId, id));
    
    const items = itemsWithProducts.map(row => ({
      ...row.item,
      product: row.product
    }));
    
    return { ...stockTake, items };
  }

  async createStockTake(stockTake: InsertStockTake): Promise<StockTake> {
    const [newStockTake] = await db.insert(stockTakes).values(stockTake).returning();
    return newStockTake;
  }
  
  async updateStockTake(id: number, data: Partial<StockTake>, editorId: number, auditComment: string): Promise<StockTake> {
    // Prepare update data with audit information
    const updateData = {
      ...data,
      lastEditedBy: editorId,
      lastEditedAt: new Date(),
      auditComment: auditComment,
    };
    
    // Update the stock take
    const [updatedStockTake] = await db
      .update(stockTakes)
      .set(updateData)
      .where(eq(stockTakes.id, id))
      .returning();
    
    // Record this activity
    await db.insert(activities).values({
      userId: editorId,
      type: "stock_take_edit",
      action: "edit",
      details: JSON.stringify({
        stockTakeId: id,
        changes: data,
        comment: auditComment
      }),
      timestamp: new Date()
    });
    
    return updatedStockTake;
  }
  
  async updateStockTakeItems(stockTakeId: number, items: InsertStockTakeItem[]): Promise<StockTakeItem[]> {
    // First, remove existing items
    await db
      .delete(stockTakeItems)
      .where(eq(stockTakeItems.stockTakeId, stockTakeId));
    
    // Then insert the new items
    if (items.length === 0) return [];
    
    const newItems = await db
      .insert(stockTakeItems)
      .values(items.map(item => ({
        ...item,
        stockTakeId
      })))
      .returning();
    
    return newItems;
  }

  // Stock Take Items methods
  async getStockTakeItem(id: number): Promise<StockTakeItem | undefined> {
    const [item] = await db.select().from(stockTakeItems).where(eq(stockTakeItems.id, id));
    return item;
  }

  async getStockTakeItemsByStockTakeId(stockTakeId: number): Promise<StockTakeItem[]> {
    return await db.select().from(stockTakeItems).where(eq(stockTakeItems.stockTakeId, stockTakeId));
  }

  async createStockTakeItem(item: InsertStockTakeItem): Promise<StockTakeItem> {
    const [newItem] = await db.insert(stockTakeItems).values(item).returning();
    return newItem;
  }
  
  async updateStockTakeItem(id: number, data: Partial<StockTakeItem>): Promise<StockTakeItem> {
    const [updatedItem] = await db
      .update(stockTakeItems)
      .set(data)
      .where(eq(stockTakeItems.id, id))
      .returning();
    
    if (!updatedItem) {
      throw new Error(`Stock take item with ID ${id} not found`);
    }
    
    return updatedItem;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }
  
  // Password reset methods
  async createPasswordResetToken(tokenData: { userId: number, token: string, expiresAt: Date }): Promise<any> {
    // In a real implementation, this would store the token in the database
    // For now, let's log that we would handle it
    console.log('Creating password reset token for user', tokenData.userId);
    return { id: Date.now(), ...tokenData };
  }
  
  async getPasswordResetToken(tokenString: string): Promise<{ id: number, userId: number, token: string, expiresAt: Date } | undefined> {
    // In a real implementation, this would find the token in the database
    // For now, we'll return undefined to indicate token not found
    console.log('Attempting to find password reset token', tokenString);
    return undefined;
  }
  
  async deletePasswordResetToken(id: number): Promise<boolean> {
    // In a real implementation, this would delete the token from the database
    console.log('Deleting password reset token', id);
    return true;
  }
  
  // Store Assignment methods
  async getStoreAssignment(id: number): Promise<StoreAssignment | undefined> {
    const [assignment] = await db.select().from(storeAssignments).where(eq(storeAssignments.id, id));
    return assignment;
  }
  
  async getAllStoreAssignments(): Promise<StoreAssignment[]> {
    return db.select().from(storeAssignments);
  }
  
  async getStoreAssignmentsByUserId(userId: number): Promise<(StoreAssignment & { store: Store })[]> {
    const result = await db.select({
      assignment: storeAssignments,
      store: stores
    })
    .from(storeAssignments)
    .innerJoin(stores, eq(storeAssignments.storeId, stores.id))
    .where(eq(storeAssignments.userId, userId));
    
    return result.map(({ assignment, store }) => ({
      ...assignment,
      store
    }));
  }
  
  async getAssignmentsByUserId(userId: number): Promise<StoreAssignment[]> {
    return db.select().from(storeAssignments).where(eq(storeAssignments.userId, userId));
  }
  
  async getAssignmentByWorkItemId(workItemId: number): Promise<StoreAssignment | undefined> {
    const result = await db.select({
      assignment: storeAssignments
    })
      .from(storeAssignments)
      .innerJoin(workItems, eq(workItems.storeAssignmentId, storeAssignments.id))
      .where(eq(workItems.id, workItemId));
    
    return result.length > 0 ? result[0].assignment : undefined;
  }
  
  async getStoreAssignmentsByStoreId(storeId: number): Promise<(StoreAssignment & { user: User })[]> {
    const result = await db.select({
      assignment: storeAssignments,
      user: users
    })
    .from(storeAssignments)
    .innerJoin(users, eq(storeAssignments.userId, users.id))
    .where(eq(storeAssignments.storeId, storeId));
    
    return result.map(({ assignment, user }) => ({
      ...assignment,
      user
    }));
  }
  
  async getActiveStoreAssignments(): Promise<(StoreAssignment & { user: User, store: Store })[]> {
    const now = new Date();
    
    const result = await db.select({
      assignment: storeAssignments,
      user: users,
      store: stores
    })
    .from(storeAssignments)
    .innerJoin(users, eq(storeAssignments.userId, users.id))
    .innerJoin(stores, eq(storeAssignments.storeId, stores.id))
    .where(
      and(
        eq(storeAssignments.status, 'active'),
        // Either endDate is null or it's in the future
        sql`(${storeAssignments.endDate} IS NULL OR ${storeAssignments.endDate} > ${now})`
      )
    );
    
    return result.map(({ assignment, user, store }) => ({
      ...assignment,
      user,
      store
    }));
  }
  
  async createStoreAssignment(assignment: InsertStoreAssignment): Promise<StoreAssignment> {
    const [newAssignment] = await db.insert(storeAssignments).values(assignment).returning();
    return newAssignment;
  }
  
  async updateStoreAssignment(id: number, assignment: Partial<InsertStoreAssignment>): Promise<StoreAssignment | undefined> {
    const [updatedAssignment] = await db
      .update(storeAssignments)
      .set(assignment)
      .where(eq(storeAssignments.id, id))
      .returning();
    return updatedAssignment;
  }
  
  async deleteStoreAssignment(id: number): Promise<boolean> {
    const result = await db.delete(storeAssignments).where(eq(storeAssignments.id, id));
    return result.rowCount > 0;
  }
  
  // Work Item methods
  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    const [workItem] = await db.select().from(workItems).where(eq(workItems.id, id));
    return workItem;
  }
  
  async getAllWorkItems(): Promise<WorkItem[]> {
    return db.select().from(workItems);
  }
  
  async getWorkItemsByUserId(userId: number): Promise<(WorkItem & { store: Store })[]> {
    const result = await db.select({
      workItem: workItems,
      store: stores
    })
    .from(workItems)
    .innerJoin(stores, eq(workItems.storeId, stores.id))
    .where(eq(workItems.userId, userId));
    
    return result.map(({ workItem, store }) => ({
      ...workItem,
      store
    }));
  }
  
  async getWorkItemsByStoreId(storeId: number): Promise<(WorkItem & { user: User })[]> {
    const result = await db.select({
      workItem: workItems,
      user: users
    })
    .from(workItems)
    .innerJoin(users, eq(workItems.userId, users.id))
    .where(eq(workItems.storeId, storeId));
    
    return result.map(({ workItem, user }) => ({
      ...workItem,
      user
    }));
  }
  
  async getWorkItemsByAssignmentId(assignmentId: number): Promise<WorkItem[]> {
    return db.select().from(workItems).where(eq(workItems.storeAssignmentId, assignmentId));
  }
  
  async getActiveWorkItems(): Promise<(WorkItem & { user: User, store: Store })[]> {
    const result = await db.select({
      workItem: workItems,
      user: users,
      store: stores
    })
    .from(workItems)
    .innerJoin(users, eq(workItems.userId, users.id))
    .innerJoin(stores, eq(workItems.storeId, stores.id))
    .where(
      or(
        eq(workItems.status, WorkItemStatus.PENDING),
        eq(workItems.status, WorkItemStatus.IN_PROGRESS)
      )
    );
    
    return result.map(({ workItem, user, store }) => ({
      ...workItem,
      user,
      store
    }));
  }
  
  async createWorkItem(workItem: InsertWorkItem): Promise<WorkItem> {
    const [newWorkItem] = await db.insert(workItems).values({
      ...workItem,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newWorkItem;
  }
  
  async updateWorkItem(id: number, workItem: Partial<InsertWorkItem>): Promise<WorkItem | undefined> {
    const [updatedWorkItem] = await db
      .update(workItems)
      .set({
        ...workItem,
        updatedAt: new Date()
      })
      .where(eq(workItems.id, id))
      .returning();
    return updatedWorkItem;
  }
  
  async completeWorkItem(id: number): Promise<WorkItem | undefined> {
    const [completedWorkItem] = await db
      .update(workItems)
      .set({
        status: WorkItemStatus.COMPLETED,
        completedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(workItems.id, id))
      .returning();
    return completedWorkItem;
  }
  
  async deleteWorkItem(id: number): Promise<boolean> {
    const result = await db.delete(workItems).where(eq(workItems.id, id));
    return result.rowCount > 0;
  }

  // Store methods
  async getStore(id: number): Promise<Store | undefined> {
    const [store] = await db.select().from(stores).where(eq(stores.id, id));
    return store;
  }

  async getAllStores(): Promise<Store[]> {
    return db.select().from(stores);
  }

  async createStore(insertStore: InsertStore): Promise<Store> {
    const [store] = await db.insert(stores).values(insertStore).returning();
    return store;
  }

  async updateStore(id: number, storeData: Partial<InsertStore>): Promise<Store | undefined> {
    const [updatedStore] = await db
      .update(stores)
      .set(storeData)
      .where(eq(stores.id, id))
      .returning();
    return updatedStore;
  }

  async deleteStore(id: number): Promise<boolean> {
    const result = await db.delete(stores).where(eq(stores.id, id));
    return !!result;
  }

  // Product methods
  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductBySku(sku: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.sku, sku));
    return product;
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.category, category));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(insertProduct).returning();
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updatedProduct] = await db
      .update(products)
      .set(productData)
      .where(eq(products.id, id))
      .returning();
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      // First delete related activities
      await db.delete(activities).where(eq(activities.productId, id));
      
      // Then delete related inventory records
      await db.delete(inventory).where(eq(inventory.productId, id));
      
      // Then delete related alerts
      await db.delete(alerts).where(eq(alerts.productId, id));
      
      // Then delete related stock take items
      await db.delete(stockTakeItems).where(eq(stockTakeItems.productId, id));
      
      // Finally delete the product
      const result = await db.delete(products).where(eq(products.id, id));
      return !!result;
    } catch (error) {
      console.error("Error deleting product:", error);
      return false;
    }
  }

  // Shelf methods
  async getShelf(id: number): Promise<Shelf | undefined> {
    const [shelf] = await db.select().from(shelves).where(eq(shelves.id, id));
    return shelf;
  }

  async getAllShelves(): Promise<Shelf[]> {
    return db.select().from(shelves);
  }

  async getShelfByStoreId(storeId: number): Promise<Shelf[]> {
    return db.select().from(shelves).where(eq(shelves.storeId, storeId));
  }

  async createShelf(insertShelf: InsertShelf): Promise<Shelf> {
    const [shelf] = await db.insert(shelves).values(insertShelf).returning();
    return shelf;
  }

  async updateShelf(id: number, shelfData: Partial<InsertShelf>): Promise<Shelf | undefined> {
    const [updatedShelf] = await db
      .update(shelves)
      .set(shelfData)
      .where(eq(shelves.id, id))
      .returning();
    return updatedShelf;
  }

  async deleteShelf(id: number): Promise<boolean> {
    const result = await db.delete(shelves).where(eq(shelves.id, id));
    return !!result;
  }

  // Inventory methods
  async getInventory(id: number): Promise<Inventory | undefined> {
    const [inventoryItem] = await db.select().from(inventory).where(eq(inventory.id, id));
    return inventoryItem;
  }

  async getInventoryByProductId(productId: number): Promise<Inventory[]> {
    return db.select().from(inventory).where(eq(inventory.productId, productId));
  }

  async getInventoryByShelfId(shelfId: number): Promise<Inventory[]> {
    return db.select().from(inventory).where(eq(inventory.shelfId, shelfId));
  }

  async getInventoryByStoreId(storeId: number): Promise<(Inventory & { product: Product, shelf: Shelf })[]> {
    // First, get all shelves for this store
    const storeShelvesResult = await db.select().from(shelves).where(eq(shelves.storeId, storeId));
    const shelfIds = storeShelvesResult.map(shelf => shelf.id);
    
    if (shelfIds.length === 0) {
      return [];
    }
    
    // Then get inventory items with joined product and shelf data
    const result = await db.select({
      inventory: inventory,
      product: products,
      shelf: shelves
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .innerJoin(shelves, eq(inventory.shelfId, shelves.id))
    .where(
      eq(shelves.storeId, storeId)
    );
    
    return result.map(({ inventory: inv, product, shelf }) => ({
      ...inv,
      product,
      shelf
    }));
  }

  async getLowStockItems(): Promise<(Inventory & { product: Product, shelf: Shelf, store: Store })[]> {
    const result = await db.select({
      inventory: inventory,
      product: products,
      shelf: shelves,
      store: stores
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .innerJoin(shelves, eq(inventory.shelfId, shelves.id))
    .innerJoin(stores, eq(shelves.storeId, stores.id))
    .where(
      lte(inventory.quantity, products.minStockLevel)
    );
    
    return result.map(({ inventory: inv, product, shelf, store }) => ({
      ...inv,
      product,
      shelf,
      store
    }));
  }

  async createInventory(insertInventory: InsertInventory): Promise<Inventory> {
    const [inventoryItem] = await db.insert(inventory).values({
      ...insertInventory,
      updatedAt: new Date()
    }).returning();
    return inventoryItem;
  }

  async updateInventory(id: number, inventoryData: Partial<InsertInventory>): Promise<Inventory | undefined> {
    const [updatedInventory] = await db
      .update(inventory)
      .set({
        ...inventoryData,
        updatedAt: new Date()
      })
      .where(eq(inventory.id, id))
      .returning();
    return updatedInventory;
  }

  async adjustInventory(productId: number, shelfId: number, quantity: number, userId: number): Promise<Inventory | undefined> {
    // Find existing inventory for this product and shelf
    const [existingInventory] = await db
      .select()
      .from(inventory)
      .where(
        and(
          eq(inventory.productId, productId),
          eq(inventory.shelfId, shelfId)
        )
      );
    
    const [shelf] = await db
      .select()
      .from(shelves)
      .where(eq(shelves.id, shelfId));
    
    if (!shelf) {
      throw new Error('Shelf not found');
    }
    
    if (existingInventory) {
      const newQuantity = existingInventory.quantity + quantity;
      if (newQuantity < 0) {
        throw new Error('Cannot reduce inventory below zero');
      }
      
      // Update inventory
      const [updatedInventory] = await db
        .update(inventory)
        .set({
          quantity: newQuantity,
          updatedAt: new Date()
        })
        .where(eq(inventory.id, existingInventory.id))
        .returning();
      
      // Create activity record
      await this.createActivity({
        actionType: quantity > 0 ? 'add' : 'remove',
        productId,
        shelfId,
        storeId: shelf.storeId,
        userId,
        quantity: Math.abs(quantity),
        status: 'completed'
      });
      
      // Check if this adjustment results in low stock and create alert if needed
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));
      
      if (product && newQuantity <= product.minStockLevel) {
        await this.createAlert({
          type: 'low_stock',
          productId,
          shelfId,
          storeId: shelf.storeId,
          message: `Low stock for ${product.name}: ${newQuantity} units remaining`,
          status: 'active'
        });
      }
      
      return updatedInventory;
    } else {
      if (quantity < 0) {
        throw new Error('Cannot create inventory with negative quantity');
      }
      
      // Create new inventory entry
      const [newInventory] = await db
        .insert(inventory)
        .values({
          productId,
          shelfId,
          quantity,
          updatedAt: new Date()
        })
        .returning();
      
      // Create activity record
      await this.createActivity({
        actionType: 'add',
        productId,
        shelfId,
        storeId: shelf.storeId,
        userId,
        quantity,
        status: 'completed'
      });
      
      // Check if this new inventory is low stock
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, productId));
      
      if (product && quantity <= product.minStockLevel) {
        await this.createAlert({
          type: 'low_stock',
          productId,
          shelfId,
          storeId: shelf.storeId,
          message: `Low stock for ${product.name}: ${quantity} units remaining`,
          status: 'active'
        });
      }
      
      return newInventory;
    }
  }

  // Activity methods
  async getActivity(id: number): Promise<Activity | undefined> {
    const [activity] = await db.select().from(activities).where(eq(activities.id, id));
    return activity;
  }

  async getAllActivities(): Promise<Activity[]> {
    return db.select().from(activities).orderBy(desc(activities.timestamp));
  }

  async getRecentActivities(limit: number): Promise<(Activity & { product: Product, user: User, store: Store })[]> {
    const result = await db.select({
      activity: activities,
      product: products,
      user: users,
      store: stores
    })
    .from(activities)
    .innerJoin(products, eq(activities.productId, products.id))
    .innerJoin(users, eq(activities.userId, users.id))
    .innerJoin(stores, eq(activities.storeId, stores.id))
    .orderBy(desc(activities.timestamp))
    .limit(limit);
    
    return result.map(({ activity, product, user, store }) => ({
      ...activity,
      product,
      user,
      store
    }));
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values({
      ...insertActivity,
      timestamp: new Date()
    }).returning();
    return activity;
  }

  // Alert methods
  async getAlert(id: number): Promise<Alert | undefined> {
    const [alert] = await db.select().from(alerts).where(eq(alerts.id, id));
    return alert;
  }

  async getAllAlerts(): Promise<Alert[]> {
    return db.select().from(alerts).orderBy(desc(alerts.createdAt));
  }

  async getActiveAlerts(): Promise<(Alert & { product: Product, store: Store })[]> {
    const result = await db.select({
      alert: alerts,
      product: products,
      store: stores
    })
    .from(alerts)
    .innerJoin(products, eq(alerts.productId, products.id))
    .innerJoin(stores, eq(alerts.storeId, stores.id))
    .where(eq(alerts.status, 'active'))
    .orderBy(desc(alerts.createdAt));
    
    return result.map(({ alert, product, store }) => ({
      ...alert,
      product,
      store
    }));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values({
      ...insertAlert,
      resolvedAt: null,
      createdAt: new Date()
    }).returning();
    return alert;
  }

  async resolveAlert(id: number, userId: number): Promise<Alert | undefined> {
    const [updatedAlert] = await db
      .update(alerts)
      .set({
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId
      })
      .where(eq(alerts.id, id))
      .returning();
    return updatedAlert;
  }

  // Dashboard methods
  async getDashboardStats(): Promise<{
    totalProducts: number,
    lowStockItems: number,
    activeStores: number,
    inventoryValue: number
  }> {
    const [{ value: totalProducts }] = await db
      .select({ value: count() })
      .from(products);

    const [{ value: lowStockItems }] = await db
      .select({ value: count() })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .where(lte(inventory.quantity, products.minStockLevel));

    const [{ value: activeStores }] = await db
      .select({ value: count() })
      .from(stores);

    const inventoryValueResult = await db
      .select({
        value: sum(sql`${inventory.quantity} * ${products.price}`)
      })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id));

    const inventoryValue = Number(inventoryValueResult[0]?.value || 0);

    return {
      totalProducts,
      lowStockItems,
      activeStores,
      inventoryValue
    };
  }
  
  // Process Form methods
  
  // Merchandising Data
  async createMerchandisingData(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    date: Date;
    merchandisingItems: Array<{
      productId: number;
      price: number;
      notes?: string;
    }>;
  }): Promise<any> {
    // In a real implementation, we would add tables for merchandising data
    // For now, we'll log the operation and update work items + create an activity record
    console.log('Creating merchandising data:', data);
    
    // Update the work item to show progress
    await db
      .update(workItems)
      .set({ 
        status: WorkItemStatus.IN_PROGRESS,
        updatedAt: new Date()
      })
      .where(eq(workItems.id, data.workItemId));
    
    // Create activity record
    await db.insert(activities).values({
      userId: data.userId,
      storeId: data.storeId,
      productId: data.merchandisingItems.length > 0 ? data.merchandisingItems[0].productId : 0,
      actionType: 'merchandising_data',
      status: 'completed',
      notes: `Merchandising data recorded for ${data.merchandisingItems.length} products`
    });
    
    // Return a mock response for now
    return {
      id: Date.now(),
      ...data,
      createdAt: new Date()
    };
  }
  
  // Competitor Merchandising
  async createCompetitorMerchandising(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    brand: string;
    productDescription: string;
    promoType?: string;
    promoDetails?: string;
    price?: number;
    pictureUrl?: string;
    date: Date;
  }): Promise<any> {
    // In a real implementation, we would add tables for competitor data
    // For now, we'll log the operation and update work items + create an activity record
    console.log('Creating competitor merchandising data:', data);
    
    // Update the work item status if needed
    await db
      .update(workItems)
      .set({ 
        status: WorkItemStatus.IN_PROGRESS,
        updatedAt: new Date()
      })
      .where(eq(workItems.id, data.workItemId));
    
    // Get the first product from the database to use as a reference
    // This is a workaround for the foreign key constraint
    const [firstProduct] = await db.select().from(products).limit(1);
    const productId = firstProduct?.id || 1; // Fallback to ID 1 if no products found
    
    // Create activity record
    await db.insert(activities).values({
      userId: data.userId,
      storeId: data.storeId,
      productId: productId, // Use a valid product ID from the database
      actionType: 'competitor_analysis',
      status: 'completed',
      notes: `Competitor data recorded for ${data.brand}`
    });
    
    // Return a mock response for now
    return {
      id: Date.now(),
      ...data,
      createdAt: new Date()
    };
  }
  
  // Orders
  async createOrder(data: {
    storeId: number;
    workItemId: number;
    userId: number;
    products?: Array<{
      productId: number;
      quantity: number;
    }>;
    notes: string;
    priority?: string;
    status: string;
    date: Date;
  }): Promise<any> {
    // In a real implementation, we would add tables for orders
    // For now, we'll log the operation and update work items + create activity records
    console.log('Creating order data:', data);
    
    // Update the work item to completed
    await db
      .update(workItems)
      .set({ 
        status: WorkItemStatus.COMPLETED,
        updatedAt: new Date(),
        completedAt: new Date()
      })
      .where(eq(workItems.id, data.workItemId));
    
    // Get the first product from the database to use as a reference if needed
    let productId = 0;
    if (!data.products || data.products.length === 0) {
      const [firstProduct] = await db.select().from(products).limit(1);
      productId = firstProduct?.id || 1; // Fallback to ID 1 if no products found
    } else {
      productId = data.products[0].productId;
    }
    
    // Create alert for managers about the new order
    await db.insert(alerts).values({
      message: `New order created: ${data.notes}`,
      type: 'order',
      storeId: data.storeId,
      productId: productId, // Use a valid product ID from the database
      status: 'active',
      createdAt: new Date()
    });
    
    // Create activity record
    await db.insert(activities).values({
      userId: data.userId,
      storeId: data.storeId,
      productId: productId, // Use a valid product ID from the database
      actionType: 'order_placed',
      status: 'pending',
      notes: data.notes
    });
    
    // Return a mock response for now
    return {
      id: Date.now(),
      ...data,
      createdAt: new Date(),
      priority: data.priority || 'medium'
    };
  }
}

// Create a seed function to initialize database
async function seedDatabase() {
  try {
    // Check if users exist
    const existingUsers = await db.select().from(users);
    
    if (existingUsers.length === 0) {
      console.log('Seeding database with initial data...');
      
      // Add admin user
      const [adminUser] = await db.insert(users).values({
        username: "admin",
        password: "admin123", // Plain text for demo - will be hashed on first actual login
        name: "Admin User",
        email: "admin@inventrack.com",
        role: "admin"
      }).returning();
      
      // Add merchandiser test user
      const [testUser] = await db.insert(users).values({
        username: "test",
        password: "test123", // Plain text for demo - will be hashed on first actual login
        name: "Test Merchandiser",
        email: "test@inventrack.com",
        role: "merchandiser"
      }).returning();
      
      // Add manager user
      const [managerUser] = await db.insert(users).values({
        username: "manager",
        password: "manager123", // Plain text for demo - will be hashed on first actual login
        name: "Store Manager",
        email: "manager@inventrack.com",
        role: "manager"
      }).returning();
      
      // Add sample store
      const [store] = await db.insert(stores).values({
        name: "Downtown Supermarket",
        location: "123 Main Street, Downtown",
        managerId: adminUser.id
      }).returning();
      
      // Add sample products
      const [product1] = await db.insert(products).values({
        name: "Premium Cereal",
        sku: "CEREAL001",
        description: "Premium breakfast cereal with added vitamins",
        category: "Breakfast",
        price: 499,
        minStockLevel: 10
      }).returning();
      
      const [product2] = await db.insert(products).values({
        name: "Organic Pasta",
        sku: "PASTA002",
        description: "Organic whole wheat pasta",
        category: "Pasta & Rice",
        price: 349,
        minStockLevel: 15
      }).returning();
      
      const [product3] = await db.insert(products).values({
        name: "Energy Drink",
        sku: "DRINK003",
        description: "High-energy sports drink",
        category: "Beverages",
        price: 259,
        minStockLevel: 20
      }).returning();
      
      // Add shelves
      const [shelf1] = await db.insert(shelves).values({
        name: "Shelf A1",
        section: "Breakfast Foods",
        storeId: store.id
      }).returning();
      
      const [shelf2] = await db.insert(shelves).values({
        name: "Shelf B2",
        section: "Pasta & Rice",
        storeId: store.id
      }).returning();
      
      const [shelf3] = await db.insert(shelves).values({
        name: "Shelf C3",
        section: "Beverages",
        storeId: store.id
      }).returning();
      
      // Add inventory
      await db.insert(inventory).values({
        productId: product1.id,
        shelfId: shelf1.id,
        quantity: 12
      });
      
      await db.insert(inventory).values({
        productId: product2.id,
        shelfId: shelf2.id,
        quantity: 18
      });
      
      await db.insert(inventory).values({
        productId: product3.id,
        shelfId: shelf3.id,
        quantity: 8
      });
      
      console.log('Database seeded successfully!');
    } else {
      console.log('Database already contains data, skipping seed.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Initialize database and use the appropriate storage implementation
export const storage = new DatabaseStorage();

// Seed the database with initial data
seedDatabase().catch(console.error);
