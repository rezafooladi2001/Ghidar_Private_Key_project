# Ghidar Production Deployment Guide

This guide covers deploying the Ghidar (Rocky Tap) backend to production.

## Prerequisites

- PHP 8.1+ with extensions: `pdo`, `pdo_mysql`, `json`, `curl`, `bcmath`, `mbstring`
- MySQL 8.0+ or MariaDB 10.5+
- Node.js 18+ (for blockchain-service)
- Nginx or Apache web server
- SSL certificate (required for Telegram WebApp)
- Supervisor or PM2 for process management

## 1. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### Required Environment Variables

```env
# Application
APP_ENV=production
APP_TIMEZONE=UTC

# Database
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=ghidar
DB_USERNAME=ghidar_user
DB_PASSWORD=<secure-password>

# Telegram
TELEGRAM_BOT_TOKEN=<your-bot-token>
TELEGRAM_BOT_USERNAME=<your-bot-username>

# Blockchain Service
BLOCKCHAIN_SERVICE_BASE_URL=http://localhost:4000
PAYMENTS_CALLBACK_TOKEN=<secure-random-token>

# CORS (comma-separated origins or * for all)
CORS_ALLOWED_ORIGINS=https://your-webapp-domain.com
```

## 2. PHP Backend Setup

### Install Dependencies

```bash
composer install --no-dev --optimize-autoloader
```

### Database Setup

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE ghidar CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Create user
mysql -u root -p -e "CREATE USER 'ghidar_user'@'localhost' IDENTIFIED BY '<password>';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON ghidar.* TO 'ghidar_user'@'localhost';"

# Run migrations
php RockyTap/database/create_tables.php
```

### Directory Permissions

```bash
# Create storage directories
mkdir -p RockyTap/storage/logs
chmod -R 755 RockyTap/storage
chown -R www-data:www-data RockyTap/storage
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name api.your-domain.com;
    root /var/www/ghidar/RockyTap;
    index index.php index.html;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API routes
    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;
        
        location ~ \.php$ {
            fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            include fastcgi_params;
            fastcgi_read_timeout 60;
        }
    }

    # Block direct PHP access outside /api/
    location ~ \.php$ {
        deny all;
    }

    # Block access to sensitive files
    location ~ /\.(env|git|htaccess) {
        deny all;
    }

    location ~ /(database|bot|storage)/ {
        deny all;
    }
}
```

## 3. Blockchain Service Setup

### Install Dependencies

```bash
cd blockchain-service
npm install --production
npm run build
```

### Configure Environment

```bash
cp .env.example .env
```

```env
# Blockchain Service
PORT=4000
PHP_BACKEND_BASE_URL=http://localhost/RockyTap
PAYMENTS_CALLBACK_TOKEN=<same-as-php-backend>

# Database (same as PHP)
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=ghidar
DB_USERNAME=ghidar_user
DB_PASSWORD=<password>

# RPC URLs (get from Alchemy, Infura, or similar)
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/<key>
BSC_RPC_URL=https://bsc-dataseed.binance.org/
TRON_RPC_URL=https://api.trongrid.io

# USDT Contract Addresses
USDT_ERC20_CONTRACT=0xdAC17F958D2ee523a2206206994597C13D831ec7
USDT_BEP20_CONTRACT=0x55d398326f99059fF775485246999027B3197955
USDT_TRC20_CONTRACT=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t

# Deposit Mnemonics (KEEP SECURE!)
DEPOSIT_ETH_MNEMONIC=<your-eth-mnemonic>
DEPOSIT_BSC_MNEMONIC=<your-bsc-mnemonic>
DEPOSIT_TRON_MNEMONIC=<your-tron-mnemonic>

# Optional
WATCH_INTERVAL_MS=60000
```

### Process Management (PM2)

```bash
# Install PM2
npm install -g pm2

# Start blockchain service
pm2 start dist/server.js --name "ghidar-blockchain"

# Save PM2 config
pm2 save
pm2 startup
```

### Process Management (Supervisor)

```ini
# /etc/supervisor/conf.d/ghidar-blockchain.conf
[program:ghidar-blockchain]
command=/usr/bin/node /var/www/ghidar/blockchain-service/dist/server.js
directory=/var/www/ghidar/blockchain-service
autostart=true
autorestart=true
user=www-data
environment=NODE_ENV="production"
stdout_logfile=/var/log/ghidar/blockchain.log
stderr_logfile=/var/log/ghidar/blockchain-error.log
```

## 4. Cron Jobs

Add to crontab (`crontab -e`):

```cron
# Rate limiter cleanup - every hour
0 * * * * php /var/www/ghidar/RockyTap/cron/cleanup_rate_limits.php >> /var/log/ghidar/cron.log 2>&1

# Log rotation (optional) - daily at 2 AM
0 2 * * * find /var/www/ghidar/RockyTap/storage/logs -name "*.log" -mtime +7 -delete
```

## 5. Security Checklist

- [ ] All secrets in `.env` are strong, random values
- [ ] Database uses non-root user with limited privileges
- [ ] `.env` file is not accessible via web
- [ ] SSL/TLS is enabled and configured correctly
- [ ] Firewall rules restrict database access
- [ ] `APP_ENV=production` is set
- [ ] Mnemonics are stored securely (consider HSM/vault)
- [ ] CORS origins are restricted to your domains
- [ ] Rate limiting is enabled for all API endpoints

## 6. Monitoring

### Health Check Endpoints

- PHP Backend: `GET /api/health/`
- Blockchain Service: `GET /health`

### Example Health Check Script

```bash
#!/bin/bash
# /usr/local/bin/ghidar-healthcheck.sh

PHP_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api.your-domain.com/api/health/)
BLOCKCHAIN_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)

if [ "$PHP_HEALTH" != "200" ]; then
    echo "PHP backend unhealthy: $PHP_HEALTH"
    # Send alert
fi

if [ "$BLOCKCHAIN_HEALTH" != "200" ]; then
    echo "Blockchain service unhealthy: $BLOCKCHAIN_HEALTH"
    # Send alert
fi
```

### Log Locations

- PHP Application: `RockyTap/storage/logs/ghidar.log`
- Blockchain Service: PM2 logs or supervisor configured location
- Nginx: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

## 7. Backup Strategy

### Database Backup

```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d)
mysqldump -u ghidar_user -p ghidar > /backups/ghidar_${DATE}.sql
gzip /backups/ghidar_${DATE}.sql

# Keep last 30 days
find /backups -name "ghidar_*.sql.gz" -mtime +30 -delete
```

### Critical Data

- Database (all tables)
- Mnemonics (blockchain wallets)
- `.env` configuration

## 8. Troubleshooting

### Common Issues

1. **"Database connection failed"**
   - Check DB credentials in `.env`
   - Verify MySQL is running: `systemctl status mysql`
   - Check database exists: `mysql -e "SHOW DATABASES"`

2. **"Telegram authentication failed"**
   - Verify `TELEGRAM_BOT_TOKEN` is correct
   - Check initData is being sent in headers
   - Ensure SSL is properly configured

3. **"Blockchain service not responding"**
   - Check if process is running: `pm2 status` or `supervisorctl status`
   - Check logs for errors
   - Verify RPC URLs are accessible

4. **"Deposit not being detected"**
   - Check blockchain service logs
   - Verify RPC endpoints are responding
   - Check `deposits` table for pending records

### Debug Mode

For debugging (NOT in production):

```env
APP_ENV=local
```

This enables detailed error messages in API responses.

## 9. Updates and Maintenance

### Updating PHP Backend

```bash
cd /var/www/ghidar
git pull origin main
composer install --no-dev --optimize-autoloader
```

### Updating Blockchain Service

```bash
cd /var/www/ghidar/blockchain-service
git pull origin main
npm install --production
npm run build
pm2 restart ghidar-blockchain
```

### Zero-Downtime Deployment

For zero-downtime updates, consider:
1. Blue-green deployment
2. Rolling updates behind load balancer
3. Database migrations as separate step

---

For additional support, refer to the project documentation or contact the development team.

