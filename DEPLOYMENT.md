# Deployment Guide

This guide covers deploying the Codegrade application to production.

## Prerequisites

- Docker and Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)
- Production database (Supabase recommended)
- Sentry account for error monitoring

## Environment Setup

### 1. Configure Environment Variables

Copy the production environment template:
```bash
cp .env.production .env
```

Edit `.env` and fill in your production values:

**Required Variables:**
- `SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key (public)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (private)
- `ANTHROPIC_API_KEY` - Claude API key for AI grading
- `VITE_SENTRY_DSN` - Sentry DSN for error monitoring
- `ORIGIN` - Your production domain (e.g., https://codegrade.school)

**Optional Variables:**
- Email configuration (if using custom SMTP)
- Redis configuration (for sessions/caching)
- Custom database URL (if not using Supabase)

### 2. Database Setup (Supabase)

1. Create a new Supabase project at https://supabase.com
2. Run the database migrations in the Supabase SQL editor
3. Configure authentication providers
4. Set up Row Level Security (RLS) policies
5. Configure storage buckets for file uploads

### 3. Sentry Setup

1. Create a new Sentry project at https://sentry.io
2. Get your DSN from the project settings
3. Configure performance monitoring
4. Set up release tracking

## Deployment Options

### Option 1: Docker Compose (Recommended)

1. **Build and deploy:**
```bash
# Production build with tests
npm run deploy:build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

2. **SSL Certificate (Let's Encrypt):**
The included Traefik configuration will automatically obtain SSL certificates.

3. **Health checks:**
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs app

# Health check
curl -f http://localhost:3000/
```

### Option 2: Cloud Platform Deployment

#### Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway deploy
```

#### Digital Ocean App Platform
1. Connect your GitHub repository
2. Configure environment variables
3. Set build command: `npm run build:prod`
4. Set run command: `npm start`

## Database Migrations

### Supabase Migrations
```sql
-- Run these in Supabase SQL editor

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coding_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Create policies (example)
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Teachers can manage their tests" ON coding_tests
    FOR ALL USING (auth.uid() = created_by);
```

## Monitoring and Logging

### Application Monitoring
- **Sentry**: Error tracking and performance monitoring
- **Health checks**: Built-in health endpoint at `/health`
- **Docker health checks**: Container-level monitoring

### Log Management
```bash
# View application logs
docker logs codegrade-app

# Follow logs in real-time
docker logs -f codegrade-app

# View all service logs
docker-compose -f docker-compose.prod.yml logs
```

## Backup and Recovery

### Database Backup (Supabase)
- Supabase provides automatic daily backups
- Additional backups can be scheduled via Supabase CLI
- Point-in-time recovery available on Pro plans

### File Storage Backup
- Configure Supabase Storage backup policies
- Consider cross-region replication for critical files

## Security Considerations

### SSL/TLS
- Use HTTPS for all production traffic
- Configure HSTS headers
- Use secure cookies

### Environment Variables
- Never commit secrets to version control
- Use environment-specific configuration
- Rotate API keys regularly

### Database Security
- Enable Row Level Security (RLS)
- Use least-privilege access
- Regular security audits

### Application Security
- Content Security Policy (CSP) headers
- CORS configuration
- Input validation and sanitization
- Rate limiting

## Performance Optimization

### Frontend Optimization
- Code splitting and lazy loading
- Image optimization
- CDN for static assets
- Service worker for caching

### Backend Optimization
- Database query optimization
- Connection pooling
- Redis caching (optional)
- Load balancing (for high traffic)

## Scaling Considerations

### Horizontal Scaling
```yaml
# docker-compose.prod.yml
services:
  app:
    deploy:
      replicas: 3
    ports:
      - "3000-3002:3000"
```

### Database Scaling
- Supabase automatically handles read replicas
- Consider connection pooling for high concurrency
- Monitor query performance

### File Storage Scaling
- Supabase Storage scales automatically
- Consider CDN for global file delivery

## Maintenance

### Updates
```bash
# Pull latest code
git pull origin main

# Run tests
npm run deploy:build

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Maintenance
- Monitor query performance
- Regular VACUUM and ANALYZE (handled by Supabase)
- Monitor storage usage

### Certificate Renewal
- Let's Encrypt certificates auto-renew
- Monitor certificate expiration dates

## Troubleshooting

### Common Issues

1. **503 Service Unavailable**
   - Check container health: `docker ps`
   - Check logs: `docker logs codegrade-app`
   - Verify environment variables

2. **Database Connection Issues**
   - Verify Supabase URL and keys
   - Check network connectivity
   - Verify RLS policies

3. **SSL Certificate Issues**
   - Check Traefik logs: `docker logs codegrade-traefik`
   - Verify domain DNS configuration
   - Check Let's Encrypt rate limits

4. **File Upload Issues**
   - Verify Supabase Storage configuration
   - Check file size limits
   - Verify storage permissions

### Debugging Commands
```bash
# Container status
docker-compose -f docker-compose.prod.yml ps

# Application logs
docker-compose -f docker-compose.prod.yml logs app

# Database connectivity test
docker-compose -f docker-compose.prod.yml exec app npm run test:db

# Health check
curl -f https://your-domain.com/health
```

## Rollback Procedure

If deployment issues occur:

1. **Quick rollback:**
```bash
# Stop current deployment
docker-compose -f docker-compose.prod.yml down

# Switch to previous version
git checkout previous-stable-tag

# Rebuild and deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

2. **Database rollback:**
- Use Supabase point-in-time recovery
- Restore from backup if needed

## Support and Monitoring

### Monitoring Checklist
- [ ] Application is responding to health checks
- [ ] SSL certificate is valid and auto-renewing
- [ ] Database connections are stable
- [ ] Error rates are within acceptable limits
- [ ] Performance metrics are healthy
- [ ] Storage usage is within limits

### Alert Configuration
Set up alerts for:
- Application downtime
- High error rates
- SSL certificate expiration
- Database connection issues
- High response times
- Storage quota approaching limits