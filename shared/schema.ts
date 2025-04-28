import { pgTable, text, serial, integer, boolean, timestamp, jsonb, unique, foreignKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Role enum for role-based access control
export enum UserRole {
  ADMIN = "admin",
  MANAGER = "manager",
  MERCHANDISER = "merchandiser"
}

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default(UserRole.MERCHANDISER),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Stores table
export const stores = pgTable("stores", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  managerId: integer("manager_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStoreSchema = createInsertSchema(stores).omit({
  id: true,
  createdAt: true,
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  description: text("description"),
  category: text("category").notNull(),
  price: integer("price").notNull(), // In cents
  minStockLevel: integer("min_stock_level").notNull().default(10), // Minimum stock level before alert
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});

// Shelves table
export const shelves = pgTable("shelves", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  section: text("section").notNull(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    unq: unique().on(table.name, table.storeId),
  };
});

export const insertShelfSchema = createInsertSchema(shelves).omit({
  id: true,
  createdAt: true,
});

// Inventory table (product stock at shelf level)
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id).notNull(),
  shelfId: integer("shelf_id").references(() => shelves.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => {
  return {
    unq: unique().on(table.productId, table.shelfId),
  };
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  updatedAt: true,
});

// Activities table for tracking all inventory changes
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  actionType: text("action_type").notNull(), // e.g., "add", "remove", "transfer", "adjust", "new_product"
  productId: integer("product_id").references(() => products.id).notNull(),
  shelfId: integer("shelf_id").references(() => shelves.id),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  quantity: integer("quantity"),
  fromShelfId: integer("from_shelf_id").references(() => shelves.id),
  toShelfId: integer("to_shelf_id").references(() => shelves.id),
  notes: text("notes"),
  status: text("status").notNull().default("completed"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  timestamp: true,
});

// Alerts table for tracking low stock and other issues
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // e.g., "low_stock", "expired", "damaged"
  productId: integer("product_id").references(() => products.id).notNull(),
  shelfId: integer("shelf_id").references(() => shelves.id),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  message: text("message").notNull(),
  status: text("status").notNull().default("active"), // active, resolved
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

// Stock Take table
export const stockTakes = pgTable("stock_takes", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow(),
  comment: text("comment"),
  pictures: text("pictures").array(), // Store URLs to shelf pictures
  status: text("status").notNull().default("draft"),
});

export const insertStockTakeSchema = createInsertSchema(stockTakes).omit({
  id: true,
  date: true,
});

// Stock take items table
// Enum for stock location
export enum StockLocation {
  SHELF = "shelf",
  BACK_STORE = "back_store"
}

export const stockTakeItems = pgTable("stock_take_items", {
  id: serial("id").primaryKey(),
  stockTakeId: integer("stock_take_id").references(() => stockTakes.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
  location: text("location", { enum: Object.values(StockLocation) }).notNull().default(StockLocation.SHELF),
});

export const insertStockTakeItemSchema = createInsertSchema(stockTakeItems).omit({
  id: true,
});

// Merchandising/Promotions table
export const merchandisingPromotions = pgTable("merchandising_promotions", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow(),
  promotionPictures: text("promotion_pictures").array(),
});

export const insertMerchandisingPromotionSchema = createInsertSchema(merchandisingPromotions).omit({
  id: true,
  date: true,
});

// Merchandising promotion items table
export const merchandisingItems = pgTable("merchandising_items", {
  id: serial("id").primaryKey(),
  merchandisingPromotionId: integer("merchandising_promotion_id").references(() => merchandisingPromotions.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  price: integer("price").notNull(), // In cents
});

export const insertMerchandisingItemSchema = createInsertSchema(merchandisingItems).omit({
  id: true,
});

// Competitor Merchandising table
export const competitorMerchandising = pgTable("competitor_merchandising", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow(),
  brand: text("brand").notNull(),
  productDescription: text("product_description").notNull(),
  promotionalPrice: integer("promotional_price"), // In cents
  promotionPictures: text("promotion_pictures").array(),
});

export const insertCompetitorMerchandisingSchema = createInsertSchema(competitorMerchandising).omit({
  id: true,
  date: true,
});

// Product flow images (shelf arrangements)
export const productFlows = pgTable("product_flows", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  flowImage: text("flow_image").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductFlowSchema = createInsertSchema(productFlows).omit({
  id: true,
  createdAt: true,
});

// Product sheet documents
export const productSheets = pgTable("product_sheets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProductSheetSchema = createInsertSchema(productSheets).omit({
  id: true,
  createdAt: true,
});

// List price documents
export const listPrices = pgTable("list_prices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertListPriceSchema = createInsertSchema(listPrices).omit({
  id: true,
  createdAt: true,
});

// Deals documents
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
});

// Orders with pictures
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  storeId: integer("store_id").references(() => stores.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  orderDate: timestamp("order_date").defaultNow(),
  notes: text("notes"),
  pictures: text("pictures").array(),
  status: text("status").notNull().default("submitted"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderDate: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Store = typeof stores.$inferSelect;
export type InsertStore = z.infer<typeof insertStoreSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Shelf = typeof shelves.$inferSelect;
export type InsertShelf = z.infer<typeof insertShelfSchema>;

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = z.infer<typeof insertInventorySchema>;

export type Activity = typeof activities.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type StockTake = typeof stockTakes.$inferSelect;
export type InsertStockTake = z.infer<typeof insertStockTakeSchema>;

export type StockTakeItem = typeof stockTakeItems.$inferSelect;
export type InsertStockTakeItem = z.infer<typeof insertStockTakeItemSchema>;

export type MerchandisingPromotion = typeof merchandisingPromotions.$inferSelect;
export type InsertMerchandisingPromotion = z.infer<typeof insertMerchandisingPromotionSchema>;

export type MerchandisingItem = typeof merchandisingItems.$inferSelect;
export type InsertMerchandisingItem = z.infer<typeof insertMerchandisingItemSchema>;

export type CompetitorMerchandising = typeof competitorMerchandising.$inferSelect;
export type InsertCompetitorMerchandising = z.infer<typeof insertCompetitorMerchandisingSchema>;

export type ProductFlow = typeof productFlows.$inferSelect;
export type InsertProductFlow = z.infer<typeof insertProductFlowSchema>;

export type ProductSheet = typeof productSheets.$inferSelect;
export type InsertProductSheet = z.infer<typeof insertProductSheetSchema>;

export type ListPrice = typeof listPrices.$inferSelect;
export type InsertListPrice = z.infer<typeof insertListPriceSchema>;

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  stores: many(stores),
  activities: many(activities),
  alerts: many(alerts, { relationName: "resolvedByUser" }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  manager: one(users, {
    fields: [stores.managerId],
    references: [users.id],
  }),
  shelves: many(shelves),
  activities: many(activities),
  alerts: many(alerts),
  stockTakes: many(stockTakes),
  merchandisingPromotions: many(merchandisingPromotions),
  competitorMerchandising: many(competitorMerchandising),
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
  activities: many(activities),
  alerts: many(alerts),
  stockTakeItems: many(stockTakeItems),
  merchandisingItems: many(merchandisingItems),
}));

export const shelvesRelations = relations(shelves, ({ one, many }) => ({
  store: one(stores, {
    fields: [shelves.storeId],
    references: [stores.id],
  }),
  inventory: many(inventory),
  activities: many(activities),
  alerts: many(alerts),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
  shelf: one(shelves, {
    fields: [inventory.shelfId],
    references: [shelves.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  product: one(products, {
    fields: [activities.productId],
    references: [products.id],
  }),
  shelf: one(shelves, {
    fields: [activities.shelfId],
    references: [shelves.id],
  }),
  store: one(stores, {
    fields: [activities.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  fromShelf: one(shelves, {
    fields: [activities.fromShelfId],
    references: [shelves.id],
  }),
  toShelf: one(shelves, {
    fields: [activities.toShelfId],
    references: [shelves.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  product: one(products, {
    fields: [alerts.productId],
    references: [products.id],
  }),
  shelf: one(shelves, {
    fields: [alerts.shelfId],
    references: [shelves.id],
  }),
  store: one(stores, {
    fields: [alerts.storeId],
    references: [stores.id],
  }),
  resolvedByUser: one(users, {
    fields: [alerts.resolvedBy],
    references: [users.id],
  }),
}));

export const stockTakesRelations = relations(stockTakes, ({ one, many }) => ({
  store: one(stores, {
    fields: [stockTakes.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [stockTakes.userId],
    references: [users.id],
  }),
  items: many(stockTakeItems),
}));

export const stockTakeItemsRelations = relations(stockTakeItems, ({ one }) => ({
  stockTake: one(stockTakes, {
    fields: [stockTakeItems.stockTakeId],
    references: [stockTakes.id],
  }),
  product: one(products, {
    fields: [stockTakeItems.productId],
    references: [products.id],
  }),
}));

export const merchandisingPromotionsRelations = relations(merchandisingPromotions, ({ one, many }) => ({
  store: one(stores, {
    fields: [merchandisingPromotions.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [merchandisingPromotions.userId],
    references: [users.id],
  }),
  items: many(merchandisingItems),
}));

export const merchandisingItemsRelations = relations(merchandisingItems, ({ one }) => ({
  promotion: one(merchandisingPromotions, {
    fields: [merchandisingItems.merchandisingPromotionId],
    references: [merchandisingPromotions.id],
  }),
  product: one(products, {
    fields: [merchandisingItems.productId],
    references: [products.id],
  }),
}));

export const competitorMerchandisingRelations = relations(competitorMerchandising, ({ one }) => ({
  store: one(stores, {
    fields: [competitorMerchandising.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [competitorMerchandising.userId],
    references: [users.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  store: one(stores, {
    fields: [orders.storeId],
    references: [stores.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
}));
