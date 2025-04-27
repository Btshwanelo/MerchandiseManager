import {
  users, stores, products, shelves, inventory, activities, alerts,
  type User, type InsertUser, type Store, type InsertStore,
  type Product, type InsertProduct, type Shelf, type InsertShelf,
  type Inventory, type InsertInventory, type Activity, type InsertActivity,
  type Alert, type InsertAlert
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface defining all storage methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
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
  
  // Dashboard methods
  getDashboardStats(): Promise<{
    totalProducts: number,
    lowStockItems: number,
    activeStores: number,
    inventoryValue: number
  }>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stores: Map<number, Store>;
  private products: Map<number, Product>;
  private shelves: Map<number, Shelf>;
  private inventoryItems: Map<number, Inventory>;
  private activities: Map<number, Activity>;
  private alerts: Map<number, Alert>;
  
  sessionStore: session.SessionStore;
  currentUserId: number;
  currentStoreId: number;
  currentProductId: number;
  currentShelfId: number;
  currentInventoryId: number;
  currentActivityId: number;
  currentAlertId: number;

  constructor() {
    this.users = new Map();
    this.stores = new Map();
    this.products = new Map();
    this.shelves = new Map();
    this.inventoryItems = new Map();
    this.activities = new Map();
    this.alerts = new Map();
    
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
    
    // Initialize with sample admin user
    this.createUser({
      username: "admin",
      password: "651aad8e9c3db25e49e5727df1b3686c1a21515de40a78f3aad1279086ab.92ec21e16", // hashed "admin123"
      name: "Admin User",
      email: "admin@inventrack.com",
      role: "admin"
    });
    
    // Add a merchandiser test user
    this.createUser({
      username: "test",
      password: "651aad8e9c3db25e49e5727df1b3686c1a21515de40a78f3aad1279086ab.92ec21e16", // hashed "test123"
      name: "Test Merchandiser",
      email: "test@inventrack.com",
      role: "merchandiser"
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

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
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
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
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
}

export const storage = new MemStorage();
