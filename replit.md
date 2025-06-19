# InvenTrack - Inventory Management System

## Overview

InvenTrack is a comprehensive inventory management application designed for retail merchandising operations. The system provides role-based access control with distinct interfaces for administrators, managers, and merchandisers. It enables real-time inventory tracking, work item management, and comprehensive reporting across multiple store locations.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui with Tailwind CSS for consistent design
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js 20 with Express.js server
- **API Pattern**: RESTful API with role-based access control
- **Authentication**: Passport.js with local strategy and session management
- **File Handling**: Multer with base64 encoding for database storage
- **Request Validation**: Zod schemas for type-safe API validation

## Key Components

### Database Layer
- **ORM**: Drizzle ORM for type-safe database operations
- **Database**: PostgreSQL (configurable via DATABASE_URL)
- **Schema**: Comprehensive schema covering users, stores, products, inventory, work items, and assignments
- **Migrations**: Drizzle Kit for database schema management

### Authentication & Authorization
- **Session Management**: Express-session with configurable secrets
- **Password Security**: Scrypt-based password hashing with salt
- **Role-Based Access**: Three-tier role system (Admin, Manager, Merchandiser)
- **Protected Routes**: Client and server-side route protection

### Core Business Logic
- **Work Item Management**: Complete workflow for merchandiser tasks
- **Store Assignments**: Flexible assignment system with day-of-week scheduling
- **Inventory Tracking**: Real-time stock level monitoring with alerts
- **File Storage**: Base64-encoded file storage in database with metadata tracking
- **Reporting**: Comprehensive analytics and reporting dashboard

## Data Flow

### User Authentication Flow
1. User submits credentials via login form
2. Server validates against database using Passport.js
3. Session established with role-based permissions
4. Client receives user context and redirects based on role

### Work Item Processing Flow
1. Managers create and assign work items to merchandisers
2. Merchandisers receive assignments based on store assignments
3. Multi-step process form handles: stock takes, merchandising, competitor analysis, orders
4. Real-time status updates with database synchronization
5. Completed work items available for management review

### Inventory Management Flow
1. Stock takes captured through mobile-friendly forms
2. Image uploads processed and stored as base64 in database
3. Inventory levels updated with automatic low-stock alerting
4. Activity logging for audit trail and reporting

## External Dependencies

### Production Dependencies
- **Database**: PostgreSQL connection required via DATABASE_URL
- **Session Storage**: Configurable session secret for production security
- **File Processing**: Multer for multipart form handling
- **Email**: SendGrid integration for notifications (optional)

### Development Dependencies
- **TypeScript**: Full type safety across client and server
- **ESBuild**: Fast production builds
- **Tailwind CSS**: Utility-first styling with design system
- **Testing**: Vitest with React Testing Library setup

## Deployment Strategy

### Environment Configuration
- **Port Binding**: Fixed to port 5000 for Replit Autoscale compatibility
- **Database URL**: Required environment variable for full functionality
- **Session Secret**: Auto-generated if not provided (not recommended for production)
- **Build Process**: Vite client build + ESBuild server bundle

### Production Readiness Features
- Graceful database connection handling with retry logic
- Environment variable validation at startup
- Health check endpoints for deployment monitoring
- Production-optimized server configuration
- Comprehensive error handling and logging

### Replit-Specific Optimizations
- WebSocket constructor configuration for Neon serverless
- Autoscale deployment target with proper port binding
- Development mode detection with appropriate tooling
- Cookie-based session management compatible with Replit hosting

## Changelog

```
Changelog:
- June 18, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```