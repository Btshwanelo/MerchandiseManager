import { Express } from "express";
import { storage } from "./storage";
import { isAuthenticated, checkRole } from "./auth";
import { UserRole, insertSettingsSchema } from "@shared/schema";
import { z } from "zod";

export function registerSettingsRoutes(app: Express) {
  // Get all settings
  app.get("/api/settings", isAuthenticated, checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Get a specific setting by key
  app.get("/api/settings/:key", isAuthenticated, async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSetting(key);
      
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error(`Error fetching setting ${req.params.key}:`, error);
      res.status(500).json({ error: "Failed to fetch setting" });
    }
  });

  // Create a new setting
  app.post("/api/settings", isAuthenticated, checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const parsedData = insertSettingsSchema.parse(req.body);
      
      // Check if setting with this key already exists
      const existingSetting = await storage.getSetting(parsedData.key);
      if (existingSetting) {
        return res.status(400).json({ error: "Setting with this key already exists" });
      }
      
      const newSetting = await storage.createSetting({
        ...parsedData,
        updatedBy: req.user?.id || null
      });
      
      res.status(201).json(newSetting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Error creating setting:", error);
      res.status(500).json({ error: "Failed to create setting" });
    }
  });

  // Update a setting
  app.put("/api/settings/:key", isAuthenticated, checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ error: "Value is required" });
      }
      
      const existingSetting = await storage.getSetting(key);
      if (!existingSetting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      
      const updatedSetting = await storage.updateSetting(key, value, req.user?.id || null);
      res.json(updatedSetting);
    } catch (error) {
      console.error(`Error updating setting ${req.params.key}:`, error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  // Delete a setting
  app.delete("/api/settings/:key", isAuthenticated, checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { key } = req.params;
      
      const existingSetting = await storage.getSetting(key);
      if (!existingSetting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      
      const success = await storage.deleteSetting(key);
      
      if (success) {
        res.status(200).json({ message: "Setting deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete setting" });
      }
    } catch (error) {
      console.error(`Error deleting setting ${req.params.key}:`, error);
      res.status(500).json({ error: "Failed to delete setting" });
    }
  });
}