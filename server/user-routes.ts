import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { UserRole, insertUserSchema, User as UserType } from "@shared/schema";
import { z } from "zod";
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { checkRole } from "./auth";
import crypto from "crypto";

// Promisify scrypt
const scryptAsync = promisify(scrypt);

// Utility to hash passwords
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Utility to compare passwords
async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Generate a secure token for password reset
function generateSecureToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function registerUserRoutes(app: Express) {
  // Get all users (admin/manager only)
  app.get("/api/users", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = req.user as UserType;
      
      // Check if user is admin or manager
      if (user.role !== UserRole.ADMIN && user.role !== UserRole.MANAGER) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      const users = await storage.getAllUsers();
      
      // Remove password fields for security
      const sanitizedUsers = users.map(({ password, ...rest }) => rest);
      
      res.json(sanitizedUsers);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });

  // Get user by ID (admin/manager only, or self)
  app.get("/api/users/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const currentUser = req.user as UserType;
      const userId = parseInt(req.params.id);
      
      // Allow if user is requesting their own data, or is admin/manager
      if (
        currentUser.id !== userId && 
        currentUser.role !== UserRole.ADMIN && 
        currentUser.role !== UserRole.MANAGER
      ) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password field for security
      const { password, ...sanitizedUser } = user;
      
      res.json(sanitizedUser);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to retrieve user" });
    }
  });

  // Update user (admin/manager only, or self)
  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const currentUser = req.user as UserType;
      const userId = parseInt(req.params.id);
      
      // Get user to update
      const userToUpdate = await storage.getUser(userId);
      
      if (!userToUpdate) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check permissions
      // Admin can edit anyone
      // Manager can edit merchandisers
      // Any user can edit themselves
      const canEdit = 
        currentUser.id === userId || 
        currentUser.role === UserRole.ADMIN || 
        (currentUser.role === UserRole.MANAGER && userToUpdate.role === UserRole.MERCHANDISER);
      
      if (!canEdit) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      // Prevent changing role unless admin
      if (req.body.role && currentUser.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Forbidden - Only admins can change roles" });
      }
      
      // Update the user
      const updatedUser = await storage.updateUser(userId, req.body);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password field for security
      const { password, ...sanitizedUser } = updatedUser;
      
      res.json(sanitizedUser);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/users/:id", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user as UserType;
      
      // Prevent self-deletion
      if (currentUser.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }
      
      const success = await storage.deleteUser(userId);
      
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Change password
  app.post("/api/change-password", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const currentUser = req.user as UserType;
      const { userId, currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!userId || !currentPassword || !newPassword) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if user is changing their own password or has admin rights
      if (currentUser.id !== userId && currentUser.role !== UserRole.ADMIN) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Verify current password (skip for admins changing others' passwords)
      if (currentUser.id === userId) {
        const isPasswordValid = await comparePasswords(currentPassword, user.password);
        
        if (!isPasswordValid) {
          return res.status(400).json({ message: "Current password is incorrect" });
        }
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      await storage.updateUser(userId, { password: hashedPassword });
      
      res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Generate password reset token and send email (not actually sending email in this implementation)
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const currentUser = req.user as UserType;
      
      // Get the user
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check permissions (admin, manager, or self)
      if (
        currentUser.id !== userId && 
        currentUser.role !== UserRole.ADMIN && 
        (currentUser.role !== UserRole.MANAGER || user.role !== UserRole.MERCHANDISER)
      ) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      // Generate a token
      const token = generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry
      
      // Store the token
      await storage.createPasswordResetToken({
        userId,
        token,
        expiresAt,
      });
      
      // In a real implementation, we would send an email with a link like:
      // ${process.env.APP_URL}/reset-password?token=${token}
      console.log(`Password reset link for user ${user.email}: /reset-password?token=${token}`);
      
      res.json({ 
        success: true, 
        message: "Password reset link generated",
        // In a real app, don't return the token in the response
        // This is just for demonstration
        resetLink: `/reset-password?token=${token}`,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to create password reset link" });
    }
  });

  // Complete password reset
  app.post("/api/complete-reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Validate the token
      const resetToken = await storage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      
      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await storage.deletePasswordResetToken(resetToken.id);
        return res.status(400).json({ message: "Token has expired" });
      }
      
      // Get the user
      const user = await storage.getUser(resetToken.userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(newPassword);
      
      // Update the password
      await storage.updateUser(user.id, { password: hashedPassword });
      
      // Delete the token
      await storage.deletePasswordResetToken(resetToken.id);
      
      res.json({ success: true, message: "Password reset successfully" });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Bulk import users (admin only)
  app.post("/api/users/bulk-import", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { users } = req.body;
      
      if (!Array.isArray(users)) {
        return res.status(400).json({ message: "Users must be an array" });
      }
      
      const results = [];
      const errors = [];
      
      for (const userData of users) {
        try {
          // Validate user data
          const userSchema = z.object({
            username: z.string().min(3),
            name: z.string().min(2),
            email: z.string().email(),
            role: z.enum([UserRole.ADMIN, UserRole.MANAGER, UserRole.MERCHANDISER]),
            password: z.string().min(6),
          });
          
          const validatedData = userSchema.parse(userData);
          
          // Check if username already exists
          const existingUser = await storage.getUserByUsername(validatedData.username);
          
          if (existingUser) {
            errors.push({
              item: userData,
              error: `Username ${validatedData.username} already exists`,
            });
            continue;
          }
          
          // Hash the password
          const hashedPassword = await hashPassword(validatedData.password);
          
          // Create the user
          const newUser = await storage.createUser({
            ...validatedData,
            password: hashedPassword,
          });
          
          // Remove password from result
          const { password, ...sanitizedUser } = newUser;
          
          results.push({ ...sanitizedUser, success: true });
        } catch (error) {
          if (error instanceof z.ZodError) {
            errors.push({
              item: userData,
              error: error.errors.map(e => `${e.path}: ${e.message}`).join(", "),
            });
          } else if (error instanceof Error) {
            errors.push({
              item: userData,
              error: error.message,
            });
          } else {
            errors.push({
              item: userData,
              error: "Unknown error",
            });
          }
        }
      }
      
      res.json({
        results,
        errors,
        totalSuccessful: results.length,
        totalFailed: errors.length,
        message: `Processed ${results.length + errors.length} users, ${results.length} successful, ${errors.length} failed`,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to import users" });
    }
  });

  // Masquerade as another user (admin only)
  app.post("/api/masquerade", checkRole(UserRole.ADMIN), async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const userToMasquerade = await storage.getUser(userId);
      
      if (!userToMasquerade) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Log in as the target user
      req.login(userToMasquerade, (err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to masquerade as user" });
        }
        
        // Login time updates are managed by the auth system
        
        // Remove password for security
        const { password, ...sanitizedUser } = userToMasquerade;
        
        res.json({
          success: true,
          message: `Now masquerading as ${userToMasquerade.name}`,
          user: sanitizedUser,
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to masquerade as user" });
    }
  });

  // Invite user (admin/manager only) - in a real app, this would send an email
  app.post("/api/invite-user", async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const currentUser = req.user as UserType;
      const { email, role, name } = req.body;
      
      // Check permissions
      if (
        currentUser.role !== UserRole.ADMIN && 
        (currentUser.role !== UserRole.MANAGER || role === UserRole.ADMIN || role === UserRole.MANAGER)
      ) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      // Generate a temporary password
      const tempPassword = crypto.randomBytes(8).toString("hex");
      
      // Generate a username based on the email
      const username = email.split("@")[0].toLowerCase() + Math.floor(Math.random() * 1000);
      
      // Hash the password
      const hashedPassword = await hashPassword(tempPassword);
      
      // Create the user
      const newUser = await storage.createUser({
        username,
        name,
        email,
        role,
        password: hashedPassword,
      });
      
      // In a real app, send an invitation email with the temporary credentials
      console.log(`Invitation for ${email}: Username: ${username}, Password: ${tempPassword}`);
      
      // Remove password from result
      const { password, ...sanitizedUser } = newUser;
      
      res.json({
        success: true,
        message: "User invited successfully",
        user: sanitizedUser,
        // In a real app, don't return these credentials in the response
        tempCredentials: {
          username,
          password: tempPassword,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(500).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to invite user" });
    }
  });
}