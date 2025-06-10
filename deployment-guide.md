# Production Deployment Guide

## Environment Variables Required for Production

### Database Configuration
- `DATABASE_URL` - PostgreSQL connection string (required for full functionality)

### Session Management
- `SESSION_SECRET` - Random secret for session encryption (auto-generated if not provided)

## Deployment Steps

1. **Add DATABASE_URL Secret**
   - In Replit Console, go to Secrets tab
   - Add `DATABASE_URL` with your PostgreSQL connection string
   - Format: `postgresql://username:password@host:port/database`

2. **Deploy Application**
   - Click Deploy button in Replit
   - Application will build and start on port 5000
   - Health checks will verify server startup

## Production Readiness Features

✅ Graceful database connection handling
✅ Environment variable validation
✅ Production-optimized server configuration
✅ Error handling for missing dependencies
✅ Proper port binding for Autoscale deployments

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correctly formatted
- Check database server accessibility
- Review connection pool settings

### Application Startup Issues
- Check build logs for TypeScript errors
- Verify all dependencies are installed
- Review port configuration (must use 5000)