# Carindex Configuration Guide

## Environment Variables

Copy these variables to your `.env` file or deployment platform:

```bash
# API Configuration
CARINDEX_API_KEY=your_api_key_here
CARINDEX_API_BASE_URL=https://api.carindex.com/v1

# Webhook Configuration
CARINDEX_WEBHOOK_SECRET=your_webhook_secret_here
CARINDEX_WEBHOOK_URL=https://your-domain.com/webhooks/carindex

# Apify Configuration
APIFY_API_TOKEN=your_apify_token_here
APIFY_ACTOR_ID_AUTOSCOUT24=your_actor_id
APIFY_ACTOR_ID_MOBILEDE=your_actor_id
APIFY_ACTOR_ID_LEBONCOIN=your_actor_id

# OpenAI Configuration (using GPT-5.2)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5.2

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/carindex
DATABASE_POOL_SIZE=20

# Redis Configuration (for queues)
REDIS_URL=redis://localhost:6379

# Monitoring
SENTRY_DSN=your_sentry_dsn_here
LOG_LEVEL=info

# Email Configuration (for alerts)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_password
SMTP_FROM=noreply@carindex.com

# Frontend URLs
FRONTEND_URL=https://app.carindex.com
MARKETING_URL=https://carindex.com

# Frontend build: base URL for in-app links (e.g. arbitrage "Nos annonces")
# In frontend/.env or Vercel: VITE_APP_URL=https://app.carindex.com

# Feature Flags
ENABLE_API=true
ENABLE_WEBHOOKS=true
ENABLE_ALERTS=true
```

---

## Platform-Specific Configuration

### Vercel
Add environment variables in Vercel Dashboard > Settings > Environment Variables

### Heroku
```bash
heroku config:set CARINDEX_API_KEY=your_key
heroku config:set DATABASE_URL=your_database_url
```

### AWS
Use AWS Systems Manager Parameter Store or Secrets Manager

### Docker
Create a `.env` file in your project root or use docker-compose environment variables

---

## API Key Management

### Generating API Keys
1. Log in to Carindex Dashboard
2. Navigate to Settings > API
3. Click "Generate New API Key"
4. Copy and store securely (key shown only once)

### Key Permissions
- **Read-only**: Can fetch data, cannot modify
- **Read-write**: Can create alerts, analyze stock
- **Admin**: Full access (internal use only)

### Key Rotation
- Rotate keys every 90 days
- Use key versioning for zero-downtime rotation
- Notify users 30 days before expiration

---

## Webhook Configuration

### Setting Up Webhooks
1. Generate webhook secret in dashboard
2. Configure webhook URL endpoint
3. Verify signature in your handler
4. Test with sample payload

### Webhook Security
- Always verify HMAC signature
- Use HTTPS endpoints only
- Implement idempotency for duplicate events
- Log all webhook events

---

## Database Configuration

### PostgreSQL Setup
```sql
-- Create database
CREATE DATABASE carindex;

-- Create user
CREATE USER carindex_user WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE carindex TO carindex_user;
```

### Connection Pooling
- Use PgBouncer for connection pooling
- Recommended pool size: 20 connections
- Enable connection timeout: 30 seconds

### Backup Strategy
- Daily automated backups
- 30-day retention
- Point-in-time recovery enabled

---

## Monitoring Setup

### Sentry Configuration
```javascript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### Logging Levels
- **DEBUG**: Development only
- **INFO**: General information
- **WARN**: Warning messages
- **ERROR**: Error conditions
- **FATAL**: Critical failures

---

## Feature Flags

Control feature rollout:

```javascript
const features = {
  enableAPI: process.env.ENABLE_API === 'true',
  enableWebhooks: process.env.ENABLE_WEBHOOKS === 'true',
  enableAlerts: process.env.ENABLE_ALERTS === 'true',
};
```

---

## Security Best Practices

1. **Never commit secrets**: Use environment variables
2. **Rotate credentials**: Every 90 days
3. **Use HTTPS**: For all API and webhook endpoints
4. **Implement rate limiting**: Prevent abuse
5. **Validate inputs**: Sanitize all user inputs
6. **Monitor access**: Log all API usage
7. **Use secrets manager**: For production deployments

---

## Testing Configuration

### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
DATABASE_URL=postgresql://localhost/carindex_dev
```

### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgresql://staging-db/carindex_staging
```

### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://prod-db/carindex_prod
```

---

## Troubleshooting

### Common Issues

**Issue**: API key not working
- Check key is correctly set in environment
- Verify key hasn't expired
- Check key permissions

**Issue**: Webhooks not receiving events
- Verify webhook URL is accessible
- Check signature verification
- Review webhook logs in dashboard

**Issue**: Database connection errors
- Verify DATABASE_URL format
- Check network connectivity
- Review connection pool settings

---

## Support

For configuration help:
- Email: tech@carindex.com
- Documentation: https://docs.carindex.com
- Status: https://status.carindex.com








