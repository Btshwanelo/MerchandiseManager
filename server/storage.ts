import {
  users, stores, products, shelves, inventory, activities, alerts, stockTakes, stockTakeItems, storeAssignments, workItems, userAlerts,
  orders, orderItems, competitorMerchandising, merchandisingPromotions, merchandisingItems, base64Images,
  type User, type InsertUser, type Store, type InsertStore,
  type Product, type InsertProduct, type Shelf, type InsertShelf,
  type Inventory, type InsertInventory, type Activity, type InsertActivity,
  type Alert, type InsertAlert, type StockTake, type InsertStockTake, 
  type StockTakeItem, type InsertStockTakeItem, type StoreAssignment, type InsertStoreAssignment,
  type WorkItem, type InsertWorkItem, WorkItemStatus, AlertStatus,
  type UserAlert, type InsertUserAlert,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type CompetitorMerchandising, type InsertCompetitorMerchandising,
  type MerchandisingPromotion, type InsertMerchandisingPromotion,
  type MerchandisingItem, type InsertMerchandisingItem,
  type Base64Image, type InsertBase64Image
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
  
  // User Alerts methods
  createUserAlert(alert: InsertUserAlert): Promise<UserAlert>;
  getUserAlerts(userId: number): Promise<UserAlert[]>;
  getUserUnreadAlerts(userId: number): Promise<UserAlert[]>;
  markAlertAsRead(alertId: number): Promise<UserAlert | undefined>;
  deleteUserAlert(alertId: number): Promise<boolean>;
  
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
  getStoreAssignmentsByUserAndDate(userId: number, date: Date): Promise<StoreAssignment[]>;
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
  updateWorkItemStatus(id: number, status: WorkItemStatus): Promise<WorkItem | undefined>;
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
  getActivitiesByUserId(userId: number, limit: number): Promise<(Activity & { product: Product, user: User, store: Store })[]>;
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
  
  // Helper methods for data display
  getRecentlyOrderedProducts(storeId: number, limit?: number): Promise<Product[]>;
  getProductsByCategoryLimit(category: string, limit?: number): Promise<Product[]>;
  
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
  
  // Report methods
  getStockTakeReportsData(timeframe: string): Promise<any>;
  getOrderReportsData(timeframe: string): Promise<any>;
  getCompetitorReportsData(timeframe: string): Promise<any>;
  getActivityReportsData(timeframe: string): Promise<any>;
  
  // Base64 Image methods
  createBase64Image(image: InsertBase64Image): Promise<Base64Image>;
  getBase64Image(id: number): Promise<Base64Image | undefined>;
  getBase64ImageByFilename(filename: string): Promise<Base64Image | undefined>;
  getAllBase64Images(): Promise<Base64Image[]>;
  deleteBase64Image(id: number): Promise<boolean>;
  
  // Session store for authentication
  sessionStore: any; // Express session store
}

export class MemStorage implements IStorage {
  // Implementing the reports methods for MemStorage with mock data
  async getStockTakeReportsData(timeframe: string): Promise<any> {
    return {
      summary: { total: 0, completed: 0, pending: 0, canceled: 0 },
      byStore: [],
      byUser: [],
      discrepancies: { count: 0 },
      timeline: [],
      timeframe: timeframe
    };
  }
  
  async getOrderReportsData(timeframe: string): Promise<any> {
    return {
      summary: { total: 0, completed: 0, pending: 0, processing: 0, shipped: 0, canceled: 0 },
      byStore: [],
      byUser: [],
      topProducts: [],
      timeline: [],
      timeframe: timeframe
    };
  }
  
  async getCompetitorReportsData(timeframe: string): Promise<any> {
    return {
      summary: { total: 0, withPromos: 0 },
      byBrand: [],
      byStore: [],
      promoTypes: [],
      timeline: [],
      timeframe: timeframe
    };
  }
  
  async getActivityReportsData(timeframe: string): Promise<any> {
    return {
      total: 0,
      byType: [],
      byUser: [],
      byStore: [],
      timeline: [],
      timeframe: timeframe
    };
  }
  
  // Additional methods required by the interface
  async createMerchandisingData(data: any): Promise<any> {
    return { id: 0, ...data, createdAt: new Date() };
  }
  
  async createCompetitorMerchandising(data: any): Promise<any> {
    return { id: 0, ...data, createdAt: new Date() };
  }
  
  async createOrder(orderData: any): Promise<any> {
    return { id: 0, ...orderData, createdAt: new Date(), status: "pending" };
  }
  
  async getOrderByWorkItemId(workItemId: number): Promise<any | null> {
    return null;
  }
  
  async getMerchandisingDataByWorkItemId(workItemId: number): Promise<any | null> {
    return null;
  }
  
  async getCompetitorMerchandisingByWorkItemId(workItemId: number): Promise<any | null> {
    return null;
  }
  
  async createUserAlert(alertData: any): Promise<any> {
    return { id: 0, ...alertData, createdAt: new Date() };
  }
  
  async getUserAlerts(userId: number): Promise<any[]> {
    return [];
  }
  
  async getUserUnreadAlerts(userId: number): Promise<any[]> {
    return [];
  }
  
  async markAlertAsRead(alertId: number): Promise<boolean> {
    return true;
  }
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
  
  async updateWorkItemStatus(id: number, status: WorkItemStatus): Promise<WorkItem | undefined> {
    const item = await this.getWorkItem(id);
    if (!item) return undefined;
    
    const updatedItem = { 
      ...item, 
      status, 
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
      status: WorkItemStatus.COMPLETED, 
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
    console.log("Creating merchandising data:", data);
    
    try {
      // First, create the merchandising promotion record in the database
      const promotionResult = await db.insert(merchandisingPromotions).values({
        storeId: data.storeId,
        userId: data.userId,
        promotionPictures: [] // Empty array since we don't have pictures by default
      }).returning();
      
      const promotion = promotionResult[0];
      console.log("Created merchandising promotion:", promotion);
      
      // Now create the individual merchandising items linked to the promotion
      const savedItems = [];
      for (const item of data.merchandisingItems) {
        const itemResult = await db.insert(merchandisingItems).values({
          merchandisingPromotionId: promotion.id,
          productId: item.productId,
          price: item.price
        }).returning();
        
        savedItems.push(itemResult[0]);
      }
      
      console.log(`Added ${savedItems.length} merchandising items to the database`);
      
      // Create the complete merchandising data record with items
      const merchandisingData = {
        ...promotion,
        merchandisingItems: savedItems
      };
      
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
        notes: `Merchandising data recorded for ${data.merchandisingItems.length} products`
      });
      
      return merchandisingData;
    } catch (error) {
      console.error("Error saving merchandising data to database:", error);
      
      // Fallback to memory storage if database fails
      const id = this.currentMerchandisingId++;
      const merchandisingData = {
        id,
        ...data,
        createdAt: new Date()
      };
      
      this.merchandisingData.set(id, merchandisingData);
      console.log("Saved merchandising data to memory as fallback");
      
      return merchandisingData;
    }
  }
  
  // Competitor Merchandising
  async createCompetitorMerchandising(data: {
    storeId: number;
    workItemId?: number;
    userId: number;
    brand: string;
    productDescription: string;
    promoType?: string;
    promoDetails?: string;
    promotionalPrice?: number | null;
    promotionPictures?: string[];
    date?: Date;
  }): Promise<any> {
    console.log("Creating competitor merchandising with data:", data);
    
    try {
      // Ensure all required values are present
      if (!data.storeId || !data.userId || !data.brand || !data.productDescription) {
        throw new Error("Missing required fields for competitor merchandising");
      }
      
      // Validate values
      const insertValues = {
        storeId: data.storeId,
        userId: data.userId,
        workItemId: data.workItemId || null,
        brand: data.brand,
        productDescription: data.productDescription,
        promotionalPrice: data.promotionalPrice || null,
        promotionPictures: data.promotionPictures || []
      };
      
      console.log("Inserting competitor merchandising values:", insertValues);
      
      // Save the competitor merchandising data to the database
      const result = await db.insert(competitorMerchandising).values(insertValues).returning();
      
      if (!result || result.length === 0) {
        throw new Error("Failed to insert competitor merchandising data");
      }
      
      const competitorData = result[0];
      console.log("Saved competitor merchandising data to database:", competitorData);
      
      // Update the work item status if needed
      if (data.workItemId) {
        try {
          const workItem = await this.getWorkItem(data.workItemId);
          if (workItem && workItem.status === WorkItemStatus.PENDING) {
            await this.updateWorkItem(data.workItemId, { status: WorkItemStatus.IN_PROGRESS });
          }
        } catch (workItemError) {
          console.error("Error updating work item status:", workItemError);
          // Continue despite this error
        }
      }
      
      try {
        // Track this as an activity
        await this.createActivity({
          userId: data.userId,
          storeId: data.storeId,
          productId: 1, // Using a default product ID since it's required
          actionType: 'competitor_analysis',
          status: 'completed',
          notes: `Competitor data recorded for ${data.brand}`
        });
      } catch (activityError) {
        console.error("Error creating activity:", activityError);
        // Continue despite this error
      }
      
      return competitorData;
    } catch (error) {
      console.error("Error saving competitor data to database:", error);
      
      // Fallback to memory storage if database fails
      const id = this.currentCompetitorId++;
      const competitorData = {
        id,
        ...data,
        createdAt: new Date()
      };
      
      this.competitorData.set(id, competitorData);
      console.log("Saved competitor data to memory as fallback");
      
      return competitorData;
    }
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
    console.log("Creating order:", data);
    
    try {
      // Insert the order into the database
      // Add workItemId to match our updated schema
      const orderValues = {
        storeId: data.storeId,
        userId: data.userId,
        status: data.status || "submitted",
        notes: data.notes || null,
        pictures: [], // Empty array since we don't have pictures
        orderDate: new Date(),
        workItemId: data.workItemId // Add this to the database now
      };
      
      console.log("Inserting order with values:", orderValues);
      
      // Use raw SQL to avoid schema issues
      const orderResult = await pool.query(`
        INSERT INTO orders 
        (store_id, user_id, status, notes, pictures, order_date, work_item_id) 
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, store_id as "storeId", user_id as "userId", status, notes, pictures, order_date as "orderDate", work_item_id as "workItemId"
      `, [
        orderValues.storeId,
        orderValues.userId, 
        orderValues.status,
        orderValues.notes,
        orderValues.pictures,
        orderValues.orderDate,
        orderValues.workItemId
      ]);
      
      if (!orderResult || orderResult.rows.length === 0) {
        throw new Error("Failed to create order - no order was returned");
      }
      
      const order = orderResult.rows[0];
      console.log("Order created in database:", order);
      
      // Save order items if present
      if (data.products && data.products.length > 0) {
        for (const product of data.products) {
          await pool.query(`
            INSERT INTO order_items 
            (order_id, product_id, quantity, notes) 
            VALUES ($1, $2, $3, $4)
            RETURNING id, order_id as "orderId", product_id as "productId", quantity, notes
          `, [
            order.id,
            product.productId,
            product.quantity,
            null
          ]);
        }
        console.log(`Added ${data.products.length} products to order`);
      }
      
      // Update the work item status
      await this.updateWorkItem(data.workItemId, { status: WorkItemStatus.COMPLETED });
      
      // Create alert for managers about the new order
      await this.createAlert({
        message: `New order created: ${data.notes}`,
        type: 'order',
        storeId: data.storeId,
        productId: data.products && data.products.length > 0 ? data.products[0].productId : 0,
        status: 'active'
      });
      
      // Track this as an activity
      await this.createActivity({
        userId: data.userId,
        storeId: data.storeId,
        productId: data.products && data.products.length > 0 ? data.products[0].productId : 0,
        actionType: 'order_placed',
        status: 'pending',
        notes: data.notes
      });
      
      return order;
    } catch (error) {
      console.error("Error creating order in database:", error);
      
      // Fallback to memory storage if database fails
      const id = this.currentOrderId++;
      
      const orderData = {
        id,
        ...data,
        createdAt: new Date(),
        priority: data.priority || 'medium'
      };
      
      this.orders.set(id, orderData);
      console.log("Order saved to memory as fallback:", orderData);
      
      return orderData;
    }
  }
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // Implement methods for additional work item types
  async createMerchandisingData(data: any): Promise<any> {
    console.log("Creating merchandising data:", data);
    try {
      // Implementation would depend on the schema definition
      return { id: 0, ...data, createdAt: new Date() };
    } catch (error) {
      console.error("Error creating merchandising data:", error);
      throw error;
    }
  }
  
  async createCompetitorMerchandising(data: any): Promise<any> {
    console.log("Creating competitor merchandising data:", data);
    try {
      // Process promotion pictures to ensure they're coming through correctly
      let promotionPictures = [];
      
      if (data.promotionPictures && Array.isArray(data.promotionPictures)) {
        promotionPictures = data.promotionPictures;
      } else if (data.pictureUrl) {
        // For backward compatibility
        promotionPictures = [data.pictureUrl];
      }
      
      // Log the image paths being stored
      console.log("Storing promotion pictures:", promotionPictures);
      
      // Prepare the data object
      const insertData: any = {
        storeId: data.storeId,
        userId: data.userId,
        date: new Date(),
        brand: data.brand || '',
        productDescription: data.productDescription || '',
        promotionalPrice: data.promotionalPrice || data.price || 0,
        promotionPictures: promotionPictures
      };
      
      // Add workItemId if present in the data
      if (data.workItemId) {
        console.log(`Associating competitor merchandising data with work item ID: ${data.workItemId}`);
        // Check if the workItemId column exists in the schema
        try {
          // @ts-ignore - The workItemId field might not be in the schema yet
          insertData.workItemId = data.workItemId;
        } catch (err) {
          console.log("Could not add workItemId to competitor data, it might not be in the schema yet");
        }
      }
      
      // Insert the competitor merchandising data into the database
      const [result] = await db.insert(competitorMerchandising).values(insertData).returning();
      
      console.log("Created competitor merchandising data:", result);
      return result;
    } catch (error) {
      console.error("Error creating competitor merchandising data:", error);
      throw error;
    }
  }
  
  async createOrder(orderData: any): Promise<any> {
    console.log("Creating order:", orderData);
    try {
      // Implementation would depend on the schema definition
      return { id: 0, ...orderData, createdAt: new Date(), status: "pending" };
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }
  
  // Implementation of getStockTakeByWorkItemId for DatabaseStorage
  async getStockTakeByWorkItemId(workItemId: number): Promise<any | null> {
    try {
      console.log("Looking up stock take for work item:", workItemId);
      
      // First, get the work item to find store and user IDs
      const workItem = await db.query.workItems.findFirst({
        where: eq(workItems.id, workItemId),
      });
      
      if (!workItem) {
        console.log(`Work item ${workItemId} not found`);
        return null;
      }
      
      console.log(`Fetching stock take data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      // First try to find stock takes directly associated with this work item if available
      // This looks for stock takes that might have saved the workItemId
      const stockTakesWithWorkItemId = await db.query.stockTakes.findMany({
        where: and(
          eq(stockTakes.storeId, workItem.storeId),
          eq(stockTakes.userId, workItem.userId)
        ),
        with: {
          items: {
            with: {
              product: true
            }
          }
        }
      });
      
      // Log all found stock takes for debugging
      console.log(`Found ${stockTakesWithWorkItemId.length} potential stock takes for work item ${workItemId}`);
      
      // Try to match by completion date vs. work item completion date first
      if (workItem.completedAt) {
        const completionDate = new Date(workItem.completedAt);
        // Look for stock takes submitted around the same time as the work item completion
        // (within 10 minutes before or after)
        const matchingStockTake = stockTakesWithWorkItemId.find(st => {
          if (!st.createdAt) return false;
          const stDate = new Date(st.createdAt);
          const diffMs = Math.abs(stDate.getTime() - completionDate.getTime());
          const diffMinutes = diffMs / (1000 * 60);
          return diffMinutes < 10; // Within 10 minutes
        });
        
        if (matchingStockTake) {
          console.log(`Found matching stock take ${matchingStockTake.id} by completion time`);
          return matchingStockTake;
        }
      }
      
      // If no match by completion time, get the most recent completed stock take
      const completedStockTakes = stockTakesWithWorkItemId
        .filter(st => st.status === 'completed' || st.status === 'submitted')
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA; // Sort in descending order (newest first)
        });
      
      if (completedStockTakes.length > 0) {
        console.log(`Found most recent stock take ${completedStockTakes[0].id} for work item ${workItemId}`);
        return completedStockTakes[0];
      }
      
      console.log(`No suitable stock take found for work item ${workItemId}`);
      return null;
    } catch (error) {
      console.error("Error getting stock take by work item ID:", error);
      return null;
    }
  }
  
  async getOrderByWorkItemId(workItemId: number): Promise<any | null> {
    console.log("Getting order by work item ID:", workItemId);
    try {
      // First, try to find the work item to get relevant info
      const workItem = await db.query.workItems.findFirst({
        where: eq(workItems.id, workItemId)
      });
      
      if (!workItem) {
        console.log(`Work item ${workItemId} not found`);
        return null;
      }
      
      console.log(`Fetching order data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      // Use raw SQL to fetch order data - avoiding schema mismatches
      let orderResult;
      try {
        // First try to find orders with work_item_id
        orderResult = await pool.query(`
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
        `, [workItemId]);
        
        // If no exact match, fallback to user and store match
        if (orderResult.rows.length === 0) {
          orderResult = await pool.query(`
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
          `, [workItem.storeId, workItem.userId]);
        }
      } catch (sqlError) {
        console.log("Error in direct SQL query for orders, falling back to original schema query:", sqlError);
        
        // Fallback to original Drizzle query if SQL has error
        const existingOrder = await db.select({
            orders: orders,
            order_items: orderItems,
            products: products
          })
          .from(orders)
          .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
          .leftJoin(products, eq(products.id, orderItems.productId))
          .where(
            and(
              eq(orders.storeId, workItem.storeId),
              eq(orders.userId, workItem.userId)
            )
          )
          .execute();
          
        if (existingOrder && existingOrder.length > 0) {
          // Process the results to create a proper structure
          const order = {
            id: existingOrder[0].orders.id,
            storeId: existingOrder[0].orders.storeId,
            userId: existingOrder[0].orders.userId,
            orderDate: existingOrder[0].orders.orderDate,
            status: existingOrder[0].orders.status,
            notes: existingOrder[0].orders.notes,
            items: existingOrder.map(row => ({
              id: row.order_items?.id,
              productId: row.order_items?.productId,
              quantity: row.order_items?.quantity,
              notes: row.order_items?.notes,
              product: row.products ? {
                id: row.products.id,
                name: row.products.name,
                sku: row.products.sku,
                price: row.products.price,
                category: row.products.category,
                minStockLevel: row.products.minStockLevel,
                description: row.products.description,
                image: row.products.image
              } : null
            })).filter(item => item.id !== undefined)
          };
          
          console.log(`Found existing order for work item ${workItemId} using fallback query`);
          return order;
        }
      }
      
      if (orderResult && orderResult.rows.length > 0) {
        console.log(`Found existing order for work item ${workItemId} using direct SQL`);
        
        const orderData = orderResult.rows[0];
        
        // Process pictures if they exist and are in string format
        if (orderData.pictures) {
          console.log("Processing order pictures, original format:", typeof orderData.pictures);
          try {
            // If it's a string, try to parse as JSON
            if (typeof orderData.pictures === 'string') {
              try {
                const parsed = JSON.parse(orderData.pictures);
                orderData.pictures = Array.isArray(parsed) ? parsed : [orderData.pictures];
              } catch (e) {
                // If parsing fails, ensure it's an array
                orderData.pictures = [orderData.pictures];
              }
            } 
            // If pictures is already an object but not an array, convert to array
            else if (typeof orderData.pictures === 'object' && !Array.isArray(orderData.pictures)) {
              orderData.pictures = Object.values(orderData.pictures)
                .filter(Boolean)
                .map(value => String(value));
            }
            
            // Ensure all entries are strings and filter out empty values
            if (Array.isArray(orderData.pictures)) {
              orderData.pictures = orderData.pictures
                .filter(Boolean)
                .map(pic => String(pic))
                .filter(pic => pic.trim && pic.trim() !== '');
            }
            
            console.log("Processed order pictures:", orderData.pictures);
          } catch (e) {
            console.log("Error processing order pictures:", e);
            // Provide fallback empty array if processing fails
            orderData.pictures = [];
          }
        } else {
          orderData.pictures = [];
        }
        
        // Get order items if they exist
        try {
          const itemsResult = await pool.query(`
            SELECT 
              oi.id,
              oi.order_id as "orderId",
              oi.product_id as "productId",
              oi.quantity,
              oi.notes,
              p.name as "productName",
              p.sku,
              p.price,
              p.category,
              p.min_stock_level as "minStockLevel",
              p.description,
              p.image
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = $1
          `, [orderData.id]);
          
          if (itemsResult.rows.length > 0) {
            orderData.items = itemsResult.rows.map(item => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
              notes: item.notes,
              product: {
                id: item.productId,
                name: item.productName,
                sku: item.sku,
                price: item.price,
                category: item.category,
                minStockLevel: item.minStockLevel,
                description: item.description,
                image: item.image
              }
            }));
          } else {
            orderData.items = [];
          }
        } catch (itemsError) {
          console.log("Error fetching order items:", itemsError);
          
          // Attempt fallback if possible - just get products without order items
          try {
            console.log("Attempting to retrieve product data even without order items");
            const productsResult = await pool.query(`
              SELECT id, name, sku, price, category, min_stock_level as "minStockLevel", description, image
              FROM products 
              WHERE id IN (SELECT product_id FROM inventory WHERE store_id = $1 AND quantity < 5)
              LIMIT 5
            `, [orderData.storeId]);
            
            if (productsResult.rows.length > 0) {
              orderData.items = productsResult.rows.map(product => ({
                productId: product.id,
                quantity: 1,
                product: {
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  price: product.price,
                  category: product.category,
                  minStockLevel: product.minStockLevel,
                  description: product.description,
                  image: product.image
                },
                notes: "Auto-generated due to low stock"
              }));
            } else {
              orderData.items = [];
            }
          } catch (fallbackError) {
            console.log("Fallback product retrieval also failed:", fallbackError);
            orderData.items = [];
          }
        }
        
        // Ensure workItemId is set
        if (!orderData.workItemId) {
          orderData.workItemId = workItemId;
        }
        
        return orderData;
      }
      
      // If no existing order, try to generate one from stock take data
      const stockTake = await this.getStockTakeByWorkItemId(workItemId);
      
      if (stockTake && stockTake.items && stockTake.items.length > 0) {
        // Find all items with quantity 0 or below minimum stock level
        const lowStockItems = stockTake.items.filter(item => 
          item.quantity === 0 || 
          (item.product?.minStockLevel && item.quantity < item.product.minStockLevel)
        );
        
        // If we have items to order, create a synthetic order
        if (lowStockItems.length > 0) {
          console.log(`Found ${lowStockItems.length} items for potential order from work item ${workItemId}`);
          
          // Create order items from the low stock items
          const orderItems = lowStockItems.map(item => ({
            productId: item.productId,
            product: item.product,
            quantity: item.product?.minStockLevel ? 
              Math.max(item.product.minStockLevel - item.quantity, 1) : 1,
            notes: item.quantity === 0 ? "Out of stock" : "Low stock level"
          }));
          
          // Return a synthetic order
          return {
            id: `synthetic-${workItemId}`,
            workItemId: workItemId,
            storeId: workItem.storeId,
            userId: workItem.userId,
            orderDate: workItem.completedAt || new Date().toISOString(),
            status: "pending",
            items: orderItems,
            notes: "Automatically generated from stock take data",
            pictures: [] // Empty array for consistent structure
          };
        }
      } else {
        console.log(`No stock take found or no items in stock take for work item ${workItemId}`);
      }
      
      return null; // No order exists and none was generated
    } catch (error) {
      console.error("Error getting/generating order by work item ID:", error);
      return null;
    }
  }
  
  async getMerchandisingDataByWorkItemId(workItemId: number): Promise<any | null> {
    console.log("Getting merchandising data by work item ID:", workItemId);
    try {
      // First, get the work item to find store and user IDs
      const workItem = await db.query.workItems.findFirst({
        where: eq(workItems.id, workItemId),
      });
      
      if (!workItem) {
        console.log(`Work item ${workItemId} not found`);
        return null;
      }
      
      console.log(`Fetching merchandising data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      let merchandisingResult;
      
      try {
        // First try to find by work_item_id directly (if the column exists)
        merchandisingResult = await pool.query(`
          SELECT 
            mp.id, 
            mp.store_id as "storeId", 
            mp.user_id as "userId", 
            mp.date,
            mp.promotion_pictures as "promotionPictures",
            mp.work_item_id as "workItemId"
          FROM merchandising_promotions mp
          WHERE mp.work_item_id = $1
          ORDER BY mp.date DESC
          LIMIT 1
        `, [workItemId]);
        
        // If no direct match found, try the store and user match
        if (merchandisingResult.rows.length === 0) {
          merchandisingResult = await pool.query(`
            SELECT 
              mp.id, 
              mp.store_id as "storeId", 
              mp.user_id as "userId", 
              mp.date,
              mp.promotion_pictures as "promotionPictures"
            FROM merchandising_promotions mp
            WHERE mp.store_id = $1 AND mp.user_id = $2
            ORDER BY mp.date DESC
            LIMIT 1
          `, [workItem.storeId, workItem.userId]);
        }
      } catch (sqlError) {
        // If the first query fails (likely because work_item_id column doesn't exist),
        // fall back to the original approach
        console.log("Error in direct SQL query for merchandising (likely schema mismatch), falling back:", sqlError);
        
        merchandisingResult = await pool.query(`
          SELECT 
            mp.id, 
            mp.store_id as "storeId", 
            mp.user_id as "userId", 
            mp.date,
            mp.promotion_pictures as "promotionPictures"
          FROM merchandising_promotions mp
          WHERE mp.store_id = $1 AND mp.user_id = $2
          ORDER BY mp.date DESC
          LIMIT 1
        `, [workItem.storeId, workItem.userId]);
      }
      
      if (merchandisingResult.rows.length === 0) {
        console.log(`No merchandising data found for work item ${workItemId}`);
        return null;
      }
      
      const merchandisingData = merchandisingResult.rows[0];
      
      // Add workItemId if it doesn't exist
      if (!merchandisingData.workItemId) {
        merchandisingData.workItemId = workItemId;
      }
      
      // Process promotion pictures if they exist and are in string format
      if (merchandisingData.promotionPictures && typeof merchandisingData.promotionPictures === 'string') {
        try {
          // Try to parse as JSON if it's a JSON string
          merchandisingData.promotionPictures = JSON.parse(merchandisingData.promotionPictures);
        } catch (e) {
          // If parsing fails, ensure it's an array
          if (!Array.isArray(merchandisingData.promotionPictures)) {
            merchandisingData.promotionPictures = [merchandisingData.promotionPictures];
          }
        }
      }
      
      // Get merchandising items if they exist
      try {
        const itemsResult = await pool.query(`
          SELECT 
            mi.id,
            mi.merchandising_promotion_id as "merchandisingPromotionId",
            mi.product_id as "productId",
            mi.price,
            p.name as "productName",
            p.sku,
            p.category,
            p.price as "basePrice",
            p.min_stock_level as "minStockLevel"
          FROM merchandising_items mi
          JOIN products p ON mi.product_id = p.id
          WHERE mi.merchandising_promotion_id = $1
        `, [merchandisingData.id]);
        
        if (itemsResult.rows.length > 0) {
          merchandisingData.items = itemsResult.rows.map(item => ({
            ...item,
            product: {
              id: item.productId,
              name: item.productName,
              sku: item.sku,
              category: item.category,
              price: item.basePrice,
              minStockLevel: item.minStockLevel
            }
          }));
        } else {
          merchandisingData.items = [];
        }
      } catch (itemsError) {
        console.log("Error fetching merchandising items (may not exist in schema):", itemsError);
        merchandisingData.items = [];
      }
      
      console.log(`Found merchandising data for work item ${workItemId}:`, merchandisingData);
      return merchandisingData;
    } catch (error) {
      console.error("Error getting merchandising data by work item ID:", error);
      return null;
    }
  }
  
  async getCompetitorMerchandisingByWorkItemId(workItemId: number): Promise<any | null> {
    console.log("Getting competitor merchandising by work item ID:", workItemId);
    try {
      // First, get the work item to find store and user IDs
      const workItem = await db.query.workItems.findFirst({
        where: eq(workItems.id, workItemId),
      });
      
      if (!workItem) {
        console.log(`Work item ${workItemId} not found`);
        return null;
      }
      
      console.log(`Fetching competitor data for work item ${workItemId} (store: ${workItem.storeId}, user: ${workItem.userId})`);
      
      let result;
      
      try {
        // First try to find by work_item_id directly (if the column exists)
        result = await pool.query(`
          SELECT id, store_id as "storeId", user_id as "userId", date, 
                 brand, product_description as "productDescription", 
                 promotional_price as "promotionalPrice", promotion_pictures as "promotionPictures",
                 work_item_id as "workItemId"
          FROM competitor_merchandising 
          WHERE work_item_id = $1
          ORDER BY date DESC
          LIMIT 1
        `, [workItemId]);
        
        // If no direct match found, try the store and user match
        if (result.rows.length === 0) {
          result = await pool.query(`
            SELECT id, store_id as "storeId", user_id as "userId", date, 
                   brand, product_description as "productDescription", 
                   promotional_price as "promotionalPrice", promotion_pictures as "promotionPictures"
            FROM competitor_merchandising 
            WHERE store_id = $1 AND user_id = $2
            ORDER BY date DESC
            LIMIT 1
          `, [workItem.storeId, workItem.userId]);
        }
      } catch (sqlError) {
        // If the first query fails (likely because work_item_id column doesn't exist),
        // fall back to the original approach
        console.log("Error in direct SQL query for competitor data (likely schema mismatch), falling back:", sqlError);
        
        result = await pool.query(`
          SELECT id, store_id as "storeId", user_id as "userId", date, 
                 brand, product_description as "productDescription", 
                 promotional_price as "promotionalPrice", promotion_pictures as "promotionPictures"
          FROM competitor_merchandising 
          WHERE store_id = $1 AND user_id = $2
          ORDER BY date DESC
          LIMIT 1
        `, [workItem.storeId, workItem.userId]);
      }
      
      if (result.rows.length > 0) {
        const competitorData = result.rows[0];
        
        // Add workItemId if it doesn't exist
        if (!competitorData.workItemId) {
          competitorData.workItemId = workItemId;
        }
        
        // Process promotion pictures if they exist and are in string format
        if (competitorData.promotionPictures && typeof competitorData.promotionPictures === 'string') {
          try {
            // Try to parse as JSON if it's a JSON string
            competitorData.promotionPictures = JSON.parse(competitorData.promotionPictures);
          } catch (e) {
            // If parsing fails, ensure it's an array
            if (!Array.isArray(competitorData.promotionPictures)) {
              competitorData.promotionPictures = [competitorData.promotionPictures];
            }
          }
        }
        
        console.log(`Found competitor data for work item ${workItemId}:`, competitorData);
        return competitorData;
      } else {
        console.log(`No competitor data found for work item ${workItemId}`);
        return null;
      }
    } catch (error) {
      console.error("Error getting competitor merchandising by work item ID:", error);
      return null;
    }
  }

  async getRecentlyOrderedProducts(storeId: number, limit: number = 5): Promise<Product[]> {
    try {
      // Try to find products that have been ordered before at this store
      const query = `
        SELECT DISTINCT ON (p.id) p.*
        FROM products p
        JOIN order_items oi ON p.id = oi.product_id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.store_id = $1
        LIMIT $2;
      `;
      
      const result = await pool.query(query, [storeId, limit]);
      if (result.rows.length > 0) {
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          sku: row.sku,
          category: row.category,
          price: parseFloat(row.price || 0),
          description: row.description,
          minStockLevel: row.min_stock_level || 5,
          image: row.image,
          createdAt: row.created_at
        }));
      }
      return this.getProductsByCategoryLimit('General', limit);
    } catch (error) {
      console.error("Error getting recently ordered products:", error);
      return this.getProductsByCategoryLimit('General', limit);
    }
  }
  
  async getProductsByCategoryLimit(category: string, limit: number = 5): Promise<Product[]> {
    try {
      const query = `
        SELECT * FROM products 
        WHERE category ILIKE $1
        LIMIT $2;
      `;
      
      const result = await pool.query(query, [`%${category}%`, limit]);
      if (result.rows.length > 0) {
        return result.rows.map(row => ({
          id: row.id,
          name: row.name,
          sku: row.sku,
          category: row.category,
          price: parseFloat(row.price || 0),
          description: row.description,
          minStockLevel: row.min_stock_level || 5,
          image: row.image,
          createdAt: row.created_at
        }));
      }
      
      // If no products found in the specific category, just return any products
      const allProductsQuery = `SELECT * FROM products LIMIT $1;`;
      const allProductsResult = await pool.query(allProductsQuery, [limit]);
      
      return allProductsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category,
        price: parseFloat(row.price || 0),
        description: row.description,
        minStockLevel: row.min_stock_level || 5,
        image: row.image,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error("Error getting products by category:", error);
      return [];
    }
  }
  
  sessionStore: any;

  constructor() {
    // Initialize session store with fallback for production deployment
    try {
      this.sessionStore = new PostgresSessionStore({ 
        pool, 
        createTableIfMissing: true 
      });
    } catch (error) {
      console.warn("Failed to initialize PostgreSQL session store, falling back to memory store:", error);
      this.sessionStore = new MemoryStore({
        checkPeriod: 86400000, // 24 hours
      });
    }
  }
  
  // User Alerts methods
  async createUserAlert(alert: InsertUserAlert): Promise<UserAlert> {
    const [newAlert] = await db.insert(userAlerts).values({
      userId: alert.userId,
      type: alert.type,
      title: alert.title || "", // Provide default if not set
      message: alert.message,
      relatedItemId: alert.relatedItemId || null,
      status: alert.status || AlertStatus.UNREAD
    }).returning();
    
    return newAlert;
  }
  
  async getUserAlerts(userId: number): Promise<UserAlert[]> {
    const alerts = await db.select().from(userAlerts)
      .where(eq(userAlerts.userId, userId))
      .orderBy(desc(userAlerts.createdAt));
    
    return alerts;
  }
  
  async getUserUnreadAlerts(userId: number): Promise<UserAlert[]> {
    const alerts = await db.select().from(userAlerts)
      .where(and(
        eq(userAlerts.userId, userId),
        eq(userAlerts.status, AlertStatus.UNREAD)
      ))
      .orderBy(desc(userAlerts.createdAt));
    
    return alerts;
  }
  
  async markAlertAsRead(alertId: number): Promise<UserAlert | undefined> {
    const [updatedAlert] = await db.update(userAlerts)
      .set({ 
        status: AlertStatus.READ,
        readAt: new Date()
      })
      .where(eq(userAlerts.id, alertId))
      .returning();
    
    return updatedAlert;
  }
  
  async deleteUserAlert(alertId: number): Promise<boolean> {
    const result = await db.delete(userAlerts)
      .where(eq(userAlerts.id, alertId))
      .returning({ id: userAlerts.id });
    
    return result.length > 0;
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
    // Log the input data
    console.log("Creating stock take with pictures:", stockTake.pictures);
    
    // Make sure pictures is properly handled as an array
    let picturesToSave = stockTake.pictures || [];
    
    // If it's not an array, convert it
    if (!Array.isArray(picturesToSave)) {
      if (typeof picturesToSave === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(picturesToSave);
          picturesToSave = Array.isArray(parsed) ? parsed : [picturesToSave];
        } catch (e) {
          // If parsing fails, assume it's a single path
          picturesToSave = [picturesToSave];
        }
      } else {
        picturesToSave = [];
      }
    }
    
    // Filter out empty strings, null, undefined values
    picturesToSave = picturesToSave.filter(p => p && typeof p === 'string' && p.trim() !== '');
    
    console.log("Saving stock take with pictures array:", picturesToSave);
    
    // Create the record with the cleaned pictures array
    const [newStockTake] = await db.insert(stockTakes).values({
      ...stockTake,
      pictures: picturesToSave
    }).returning();
    
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
    .where(eq(storeAssignments.userId, userId))
    .orderBy(desc(storeAssignments.createdAt));
    
    return result.map(({ assignment, store }) => ({
      ...assignment,
      store
    }));
  }
  
  async getAssignmentsByUserId(userId: number): Promise<StoreAssignment[]> {
    return db.select()
      .from(storeAssignments)
      .where(eq(storeAssignments.userId, userId))
      .orderBy(desc(storeAssignments.createdAt));
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

  async getStoreAssignmentsByUserAndDate(userId: number, date: Date): Promise<StoreAssignment[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const assignments = await db.select()
      .from(storeAssignments)
      .where(
        and(
          eq(storeAssignments.userId, userId),
          eq(storeAssignments.status, 'active'),
          sql`${storeAssignments.startDate} <= ${endOfDay}`,
          sql`(${storeAssignments.endDate} IS NULL OR ${storeAssignments.endDate} >= ${startOfDay})`
        )
      );

    return assignments;
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
  
  async getAllWorkItems(): Promise<(WorkItem & { user?: User, store?: Store })[]> {
    try {
      // First, check directly how many work items are in the database
      const rawCount = await db.select({ count: count() }).from(workItems);
      console.log(`Raw count of work items in database: ${rawCount[0].count}`);
      
      // Let's also verify with a direct SQL query
      const directResult = await pool.query('SELECT COUNT(*) FROM work_items');
      console.log(`Direct SQL count: ${directResult.rows[0].count}`);
      
      // Check if there are completed work items
      const completedCount = await pool.query("SELECT COUNT(*) FROM work_items WHERE status = 'completed'");
      console.log(`Completed work items count: ${completedCount.rows[0].count}`);
      
      console.log('Running direct SQL query for ALL work items, including completed ones');
      
      // Use direct SQL query with LEFT JOINs to include all work items even if user or store references are invalid
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
      
      const directQueryResult = await pool.query(query);
      console.log(`Direct SQL query returned ${directQueryResult.rows.length} work items`);
      
      if (directQueryResult.rows.length > 0) {
        console.log('First 3 items from direct query:', 
          directQueryResult.rows.slice(0, 3).map(row => ({ 
            id: row.id, 
            title: row.title, 
            status: row.status 
          }))
        );
      }
      
      // Format the results to match the expected structure
      return directQueryResult.rows.map(row => {
        const workItem = {
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
          updatedAt: row.updated_at
        };
        
        // Only add user if we have valid user data
        if (row.username) {
          Object.assign(workItem, {
            user: {
              id: row.user_id,
              username: row.username,
              name: row.user_name,
              email: row.email,
              role: row.role
            }
          });
        }
        
        // Only add store if we have valid store data
        if (row.store_name) {
          Object.assign(workItem, {
            store: {
              id: row.store_id,
              name: row.store_name,
              location: row.location
            }
          });
        }
        
        return workItem;
      });
    } catch (error) {
      console.error('Error in getAllWorkItems:', error);
      throw error; // Let the API endpoint handle the error
    }
  }
  
  async getWorkItemsByUserId(userId: number): Promise<(WorkItem & { store: Store })[]> {
    const result = await db.select({
      workItem: workItems,
      store: stores
    })
    .from(workItems)
    .innerJoin(stores, eq(workItems.storeId, stores.id))
    .where(eq(workItems.userId, userId))
    .orderBy(desc(workItems.createdAt));
    
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
    .where(eq(workItems.storeId, storeId))
    .orderBy(desc(workItems.createdAt));
    
    return result.map(({ workItem, user }) => ({
      ...workItem,
      user
    }));
  }
  
  async getWorkItemsByAssignmentId(assignmentId: number): Promise<WorkItem[]> {
    return db.select()
      .from(workItems)
      .where(eq(workItems.storeAssignmentId, assignmentId))
      .orderBy(desc(workItems.createdAt));
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
    )
    .orderBy(desc(workItems.createdAt));
    
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
  
  async updateWorkItemStatus(id: number, status: WorkItemStatus): Promise<WorkItem | undefined> {
    try {
      const [updatedWorkItem] = await db
        .update(workItems)
        .set({
          status: status,
          updatedAt: new Date()
        })
        .where(eq(workItems.id, id))
        .returning();
        
      return updatedWorkItem;
    } catch (error) {
      console.error("Error updating work item status:", error);
      return undefined;
    }
  }
  
  async completeWorkItem(id: number): Promise<WorkItem | undefined> {
    try {
      console.log(`Attempting to complete work item ${id}`);
      const [completedWorkItem] = await db
        .update(workItems)
        .set({
          status: WorkItemStatus.COMPLETED,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(workItems.id, id))
        .returning();
      
      if (!completedWorkItem) {
        console.error(`No work item found with ID ${id} to complete`);
        return undefined;
      }
      
      console.log(`Successfully completed work item ${id}`);
      return completedWorkItem;
    } catch (error) {
      console.error(`Error completing work item ${id}:`, error);
      return undefined;
    }
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
    try {
      // First, delete all activities associated with this store
      await db.delete(activities).where(eq(activities.storeId, id));
      
      // Then, delete any alerts associated with this store
      await db.delete(alerts).where(eq(alerts.storeId, id));
      
      // Delete store assignments associated with this store
      await db.delete(storeAssignments).where(eq(storeAssignments.storeId, id));
      
      // Delete work items associated with this store
      await db.delete(workItems).where(eq(workItems.storeId, id));
      
      // Delete stock takes associated with this store
      const storeTakes = await db.select().from(stockTakes).where(eq(stockTakes.storeId, id));
      for (const take of storeTakes) {
        await db.delete(stockTakeItems).where(eq(stockTakeItems.stockTakeId, take.id));
      }
      await db.delete(stockTakes).where(eq(stockTakes.storeId, id));
      
      // Get all shelves in this store to delete related inventory
      const storeShelves = await db.select().from(shelves).where(eq(shelves.storeId, id));
      for (const shelf of storeShelves) {
        await db.delete(inventory).where(eq(inventory.shelfId, shelf.id));
      }
      
      // Delete shelves in the store
      await db.delete(shelves).where(eq(shelves.storeId, id));
      
      // Finally delete the store itself
      const result = await db.delete(stores).where(eq(stores.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting store:", error);
      throw error;
    }
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
    return db.select()
      .from(products)
      .orderBy(desc(products.createdAt));
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return db.select()
      .from(products)
      .where(eq(products.category, category))
      .orderBy(desc(products.createdAt));
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
  
  async getActivitiesCount(): Promise<number> {
    const [result] = await db.select({ count: count() }).from(activities);
    return Number(result.count);
  }
  
  async getAllActivitiesWithRelations(limit: number = 10, offset: number = 0): Promise<(Activity & { product: Product, user: User, store: Store })[]> {
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
    .limit(limit)
    .offset(offset);
    
    return result.map(({ activity, product, user, store }) => ({
      ...activity,
      product,
      user,
      store
    }));
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
  
  async getActivitiesByUserId(userId: number, limit: number = 10): Promise<(Activity & { product: Product, user: User, store: Store })[]> {
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
    .where(eq(activities.userId, userId))
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
  
  // Reports methods
  
  // Stock Take Reports Data
  async getStockTakeReportsData(timeframe: string): Promise<any> {
    // Calculate date range based on timeframe
    const today = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(today.getMonth() - 1); // Default to last month
    }
    
    // Query for stock take completion data
    const stockTakesResult = await db
      .select({
        total: count(),
        completed: count(stockTakes.id).filter(eq(stockTakes.status, 'completed')),
        pending: count(stockTakes.id).filter(eq(stockTakes.status, 'pending')),
        canceled: count(stockTakes.id).filter(eq(stockTakes.status, 'canceled'))
      })
      .from(stockTakes)
      .where(
        and(
          gte(stockTakes.createdAt, startDate),
          lte(stockTakes.createdAt, today)
        )
      );
    
    // Get stock take by store data
    const stockTakesByStore = await db
      .select({
        storeId: stockTakes.storeId,
        storeName: stores.name,
        count: count()
      })
      .from(stockTakes)
      .leftJoin(stores, eq(stockTakes.storeId, stores.id))
      .where(
        and(
          gte(stockTakes.createdAt, startDate),
          lte(stockTakes.createdAt, today)
        )
      )
      .groupBy(stockTakes.storeId, stores.name);
    
    // Get stock take by user data
    const stockTakesByUser = await db
      .select({
        userId: stockTakes.userId,
        userName: users.name,
        count: count()
      })
      .from(stockTakes)
      .leftJoin(users, eq(stockTakes.userId, users.id))
      .where(
        and(
          gte(stockTakes.createdAt, startDate),
          lte(stockTakes.createdAt, today)
        )
      )
      .groupBy(stockTakes.userId, users.name);
    
    // Get the count of discrepancies found in stock takes
    const stockTakeItemsQuery = await db
      .select({
        stockTakeId: stockTakeItems.stockTakeId,
        discrepancies: count(stockTakeItems.id).filter(
          sql`${stockTakeItems.expectedQuantity} <> ${stockTakeItems.actualQuantity}`
        )
      })
      .from(stockTakeItems)
      .innerJoin(stockTakes, eq(stockTakeItems.stockTakeId, stockTakes.id))
      .where(
        and(
          gte(stockTakes.createdAt, startDate),
          lte(stockTakes.createdAt, today)
        )
      )
      .groupBy(stockTakeItems.stockTakeId);
      
    // Calculate total discrepancies
    let totalDiscrepancies = 0;
    stockTakeItemsQuery.forEach(item => {
      totalDiscrepancies += Number(item.discrepancies);
    });
    
    // Get timeline data (counts by date)
    const timelineData = await this.getTimelineData(stockTakes, startDate, today);
    
    // Compile final report
    return {
      summary: stockTakesResult[0],
      byStore: stockTakesByStore,
      byUser: stockTakesByUser,
      discrepancies: { count: totalDiscrepancies },
      timeline: timelineData,
      timeframe: timeframe
    };
  }
  
  // Order Reports Data
  async getOrderReportsData(timeframe: string): Promise<any> {
    // Calculate date range based on timeframe
    const today = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(today.getMonth() - 1); // Default to last month
    }
    
    try {
      // Query for order summary data
      const ordersResult = await db
        .select({
          total: count(),
          completed: count(orders.id).filter(eq(orders.status, 'completed')),
          pending: count(orders.id).filter(eq(orders.status, 'pending')),
          processing: count(orders.id).filter(eq(orders.status, 'processing')),
          shipped: count(orders.id).filter(eq(orders.status, 'shipped')),
          canceled: count(orders.id).filter(eq(orders.status, 'canceled'))
        })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, today)
          )
        );
      
      // Get orders by store data
      const ordersByStore = await db
        .select({
          storeId: orders.storeId,
          storeName: stores.name,
          count: count()
        })
        .from(orders)
        .leftJoin(stores, eq(orders.storeId, stores.id))
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, today)
          )
        )
        .groupBy(orders.storeId, stores.name);
      
      // Get orders by user data
      const ordersByUser = await db
        .select({
          userId: orders.userId,
          userName: users.name,
          count: count()
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, today)
          )
        )
        .groupBy(orders.userId, users.name);
      
      // Get most ordered products
      const mostOrderedProducts = await db
        .select({
          productId: orderItems.productId,
          productName: products.name,
          totalQuantity: sum(orderItems.quantity)
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(orders, eq(orderItems.orderId, orders.id))
        .where(
          and(
            gte(orders.createdAt, startDate),
            lte(orders.createdAt, today)
          )
        )
        .groupBy(orderItems.productId, products.name)
        .orderBy(desc(sum(orderItems.quantity)))
        .limit(10);
      
      // Get timeline data (counts by date)
      const timelineData = await this.getTimelineData(orders, startDate, today);
      
      // Compile final report
      return {
        summary: ordersResult[0] || { total: 0, completed: 0, pending: 0, processing: 0, shipped: 0, canceled: 0 },
        byStore: ordersByStore,
        byUser: ordersByUser,
        topProducts: mostOrderedProducts,
        timeline: timelineData,
        timeframe: timeframe
      };
    } catch (error) {
      console.error("Error getting order reports data:", error);
      // Return default structure on error
      return {
        summary: { total: 0, completed: 0, pending: 0, processing: 0, shipped: 0, canceled: 0 },
        byStore: [],
        byUser: [],
        topProducts: [],
        timeline: [],
        timeframe: timeframe,
        error: "Failed to retrieve order data"
      };
    }
  }
  
  // Competitor Reports Data
  async getCompetitorReportsData(timeframe: string): Promise<any> {
    // Calculate date range based on timeframe
    const today = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(today.getMonth() - 1); // Default to last month
    }
    
    try {
      // Query for competitor data summary
      const competitorDataResult = await db
        .select({
          total: count(),
          withPromos: count(competitorMerchandising.id).filter(
            sql`${competitorMerchandising.promoType} IS NOT NULL`
          )
        })
        .from(competitorMerchandising)
        .where(
          and(
            gte(competitorMerchandising.createdAt, startDate),
            lte(competitorMerchandising.createdAt, today)
          )
        );
      
      // Get competitor data by brand
      const dataByBrand = await db
        .select({
          brand: competitorMerchandising.brand,
          count: count(),
          avgPrice: sql`AVG(${competitorMerchandising.price})` as any
        })
        .from(competitorMerchandising)
        .where(
          and(
            gte(competitorMerchandising.createdAt, startDate),
            lte(competitorMerchandising.createdAt, today),
            sql`${competitorMerchandising.price} IS NOT NULL`
          )
        )
        .groupBy(competitorMerchandising.brand);
      
      // Get competitor data by store
      const dataByStore = await db
        .select({
          storeId: competitorMerchandising.storeId,
          storeName: stores.name,
          count: count()
        })
        .from(competitorMerchandising)
        .leftJoin(stores, eq(competitorMerchandising.storeId, stores.id))
        .where(
          and(
            gte(competitorMerchandising.createdAt, startDate),
            lte(competitorMerchandising.createdAt, today)
          )
        )
        .groupBy(competitorMerchandising.storeId, stores.name);
      
      // Get promotion types distribution
      const promoTypes = await db
        .select({
          promoType: competitorMerchandising.promoType,
          count: count()
        })
        .from(competitorMerchandising)
        .where(
          and(
            gte(competitorMerchandising.createdAt, startDate),
            lte(competitorMerchandising.createdAt, today),
            sql`${competitorMerchandising.promoType} IS NOT NULL`
          )
        )
        .groupBy(competitorMerchandising.promoType);
      
      // Get timeline data (counts by date)
      const timelineData = await this.getTimelineData(competitorMerchandising, startDate, today);
      
      // Compile final report
      return {
        summary: competitorDataResult[0] || { total: 0, withPromos: 0 },
        byBrand: dataByBrand,
        byStore: dataByStore,
        promoTypes: promoTypes,
        timeline: timelineData,
        timeframe: timeframe
      };
    } catch (error) {
      console.error("Error getting competitor reports data:", error);
      // Return default structure on error
      return {
        summary: { total: 0, withPromos: 0 },
        byBrand: [],
        byStore: [],
        promoTypes: [],
        timeline: [],
        timeframe: timeframe,
        error: "Failed to retrieve competitor data"
      };
    }
  }
  
  // Activity Reports Data
  async getActivityReportsData(timeframe: string): Promise<any> {
    // Calculate date range based on timeframe
    const today = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(today.getMonth() - 1); // Default to last month
    }
    
    try {
      // Get activities by type
      const activitiesByType = await db
        .select({
          actionType: inventory.actionType,
          count: count()
        })
        .from(inventory)
        .where(
          and(
            gte(inventory.timestamp, startDate),
            lte(inventory.timestamp, today)
          )
        )
        .groupBy(inventory.actionType);
      
      // Get activities by user
      const activitiesByUser = await db
        .select({
          userId: inventory.userId,
          userName: users.name,
          count: count()
        })
        .from(inventory)
        .leftJoin(users, eq(inventory.userId, users.id))
        .where(
          and(
            gte(inventory.timestamp, startDate),
            lte(inventory.timestamp, today)
          )
        )
        .groupBy(inventory.userId, users.name);
      
      // Get activities by store
      const activitiesByStore = await db
        .select({
          storeId: inventory.storeId,
          storeName: stores.name,
          count: count()
        })
        .from(inventory)
        .leftJoin(stores, eq(inventory.storeId, stores.id))
        .where(
          and(
            gte(inventory.timestamp, startDate),
            lte(inventory.timestamp, today)
          )
        )
        .groupBy(inventory.storeId, stores.name);
      
      // Get timeline data (counts by date)
      const timelineData = await this.getTimelineData(inventory, startDate, today);
      
      // Get total activity count
      const totalActivities = await db
        .select({
          count: count()
        })
        .from(inventory)
        .where(
          and(
            gte(inventory.timestamp, startDate),
            lte(inventory.timestamp, today)
          )
        );
      
      // Compile final report
      return {
        total: totalActivities[0]?.count || 0,
        byType: activitiesByType,
        byUser: activitiesByUser,
        byStore: activitiesByStore,
        timeline: timelineData,
        timeframe: timeframe
      };
    } catch (error) {
      console.error("Error getting activity reports data:", error);
      // Return default structure on error
      return {
        total: 0,
        byType: [],
        byUser: [],
        byStore: [],
        timeline: [],
        timeframe: timeframe,
        error: "Failed to retrieve activity data"
      };
    }
  }
  
  // Helper method to get timeline data for reports
  private async getTimelineData(table: any, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      // Determine which timestamp column to use based on the table
      let timestampColumn = 'createdAt';
      if (table === inventory) {
        timestampColumn = 'timestamp';
      }
      
      // Query for counts by date
      const timelineResult = await db
        .select({
          date: sql`to_char(${table[timestampColumn]}, 'YYYY-MM-DD')`,
          count: count()
        })
        .from(table)
        .where(
          and(
            sql`${table[timestampColumn]} >= ${startDate}`,
            sql`${table[timestampColumn]} <= ${endDate}`
          )
        )
        .groupBy(sql`to_char(${table[timestampColumn]}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${table[timestampColumn]}, 'YYYY-MM-DD')`);
      
      // Format the result
      return timelineResult.map(item => ({
        date: item.date as string,
        count: Number(item.count)
      }));
    } catch (error) {
      console.error("Error getting timeline data:", error);
      return []; // Return empty array on error
    }
  }
}

export const storage = new DatabaseStorage();
