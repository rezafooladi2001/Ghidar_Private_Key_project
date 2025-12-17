# Production Deployment Guide
## Cross-Chain Asset Recovery System v2.0

---

## 📋 **Pre-Deployment Checklist**

### System Requirements
- [ ] PHP 8.1+ with required extensions (openssl, json, mbstring, curl)
- [ ] MySQL 5.7+ or MariaDB 10.3+ (utf8mb4 support)
- [ ] Node.js 16+ (for blockchain-service integration)
- [ ] Composer 2.x
- [ ] 2GB+ RAM recommended
- [ ] SSL/TLS certificates configured

### Dependencies Installation
```bash
# Install PHP dependencies
composer install --no-dev --optimize-autoloader

# Install cryptographic libraries
composer require kornrunner/keccak simplito/elliptic-php

# Verify extensions
php -m | grep -E 'openssl|json|mbstring|curl'
```

---

## 🗄️ **Database Migration**

### Step 1: Backup Current Database
```bash
# Create backup before migration
php RockyTap/bot/functions.php dbBackup \
  localhost dbuser dbpass ghidar_db ./backups/pre-recovery-$(date +%Y%m%d)
```

### Step 2: Run Migration
```bash
# Execute table creation script
php RockyTap/database/create_tables.php

# Verify tables created
mysql -u dbuser -p ghidar_db -e "SHOW TABLES LIKE '%recovery%';"
```

Expected output:
```
wallet_recovery_requests
cross_chain_verification_logs
```

### Step 3: Verify Schema
```bash
# Check table structure
mysql -u dbuser -p ghidar_db -e "DESCRIBE wallet_recovery_requests;"
mysql -u dbuser -p ghidar_db -e "DESCRIBE cross_chain_verification_logs;"
```

---

## ⚙️ **Environment Configuration**

### Update .env File
```env
# Blockchain Service Integration
BLOCKCHAIN_SERVICE_URL=https://blockchain-service.yourdomain.com
BLOCKCHAIN_SERVICE_API_KEY=your_secure_api_key_here_min_32_chars

# Recovery System Settings
RECOVERY_ENABLED=true
ENHANCED_VERIFICATION_THRESHOLD=100
RISK_SCORE_THRESHOLD=40
MAX_AUTO_RECOVERY_AMOUNT=1000

# Compliance Settings
COMPLIANCE_MODE=enabled
AUDIT_TRAIL_RETENTION_DAYS=2555
COMPLIANCE_REPORT_RETENTION=7years

# Security Settings
APP_KEY=your_app_secret_key_for_signatures_min_32_chars
SIGNATURE_VERIFICATION_MODE=strict

# Rate Limiting
RECOVERY_INIT_RATE_LIMIT=5
RECOVERY_VERIFY_RATE_LIMIT=10
RECOVERY_RATE_WINDOW=3600

# Monitoring & Alerts
MONITORING_ENABLED=true
ALERT_EMAIL=security@yourdomain.com
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Generate Secure Keys
```bash
# Generate APP_KEY
php -r "echo bin2hex(random_bytes(32)) . PHP_EOL;"

# Generate API keys
php -r "echo 'API_KEY_' . bin2hex(random_bytes(24)) . PHP_EOL;"
```

---

## 🔐 **Security Hardening**

### 1. File Permissions
```bash
# Set correct permissions
chmod 755 src/ RockyTap/
chmod 644 src/**/*.php RockyTap/api/**/*.php
chmod 600 .env
chmod 755 storage/logs/
chmod 644 storage/logs/*.log

# Verify ownership
chown -R www-data:www-data /path/to/ghidar
```

### 2. Web Server Configuration

#### Apache (.htaccess)
```apache
# Deny access to sensitive files
<FilesMatch "(\.env|composer\.(json|lock)|\.git)">
    Require all denied
</FilesMatch>

# Enable HTTPS redirect
RewriteEngine On
RewriteCond %{HTTPS} !=on
RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
```

#### Nginx
```nginx
# Add to server block
location ~ /\.(env|git) {
    deny all;
    return 404;
}

location ~ composer\.(json|lock) {
    deny all;
    return 404;
}

# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

### 3. Database Security
```sql
-- Create dedicated database user
CREATE USER 'ghidar_recovery'@'localhost' IDENTIFIED BY 'strong_password_here';

-- Grant minimum required permissions
GRANT SELECT, INSERT, UPDATE ON ghidar_db.wallet_recovery_requests TO 'ghidar_recovery'@'localhost';
GRANT SELECT, INSERT ON ghidar_db.cross_chain_verification_logs TO 'ghidar_recovery'@'localhost';

FLUSH PRIVILEGES;
```

---

## 🧪 **Testing in Production**

### 1. Run Unit Tests
```bash
# Run all tests
vendor/bin/phpunit

# Run specific test suites
vendor/bin/phpunit tests/Security/CrossChainRecoveryServiceTest.php
vendor/bin/phpunit tests/Integration/RecoveryFlowTest.php
```

### 2. API Endpoint Testing
```bash
# Test recovery initiation
curl -X POST https://yourdomain.com/RockyTap/api/wallet-recovery/initiate \
  -H "Content-Type: application/json" \
  -H "Telegram-Data: YOUR_TEST_INIT_DATA" \
  -d '{
    "recovery_type": "cross_chain_recovery",
    "transaction_hash": "0xtest123...",
    "from_network": "bep20",
    "to_network": "erc20"
  }'

# Test status endpoint
curl "https://yourdomain.com/RockyTap/api/wallet-recovery/status?request_id=1" \
  -H "Telegram-Data: YOUR_TEST_INIT_DATA"
```

### 3. Frontend Testing
```bash
# Build React app
cd RockyTap/webapp
npm install
npm run build

# Verify build
ls -lh dist/

# Test in Telegram WebApp
# Open Telegram Bot -> Mini App -> Test recovery flow
```

---

## 📊 **Monitoring Setup**

### 1. Log Monitoring
```bash
# Create log rotation
cat > /etc/logrotate.d/ghidar <<EOF
/path/to/ghidar/storage/logs/*.log {
    daily
    rotate 90
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        /usr/bin/systemctl reload php8.1-fpm > /dev/null 2>&1 || true
    endscript
}
EOF
```

### 2. Database Monitoring Queries
```sql
-- Monitor recovery requests
SELECT 
    recovery_status,
    COUNT(*) as count,
    AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
FROM wallet_recovery_requests
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY recovery_status;

-- Monitor verification logs
SELECT 
    verification_step,
    COUNT(*) as count,
    DATE(created_at) as date
FROM cross_chain_verification_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY verification_step, DATE(created_at);

-- Failed recoveries
SELECT *
FROM wallet_recovery_requests
WHERE recovery_status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

### 3. Application Monitoring Script
```php
<?php
// Create: /path/to/ghidar/scripts/monitor-recovery.php

require_once __DIR__ . '/../bootstrap.php';

use Ghidar\Core\Database;

$db = Database::getConnection();

// Check pending recoveries older than 24 hours
$stmt = $db->query("
    SELECT COUNT(*) as count
    FROM wallet_recovery_requests
    WHERE recovery_status IN ('pending', 'requires_signature')
    AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
");
$stuckRequests = $stmt->fetch(PDO::FETCH_ASSOC);

if ($stuckRequests['count'] > 5) {
    // Send alert
    error_log("ALERT: {$stuckRequests['count']} stuck recovery requests");
    // Implement your alerting (email, Slack, etc.)
}

echo "Recovery system health check completed\n";
```

### 4. Setup Cron Jobs
```bash
# Add to crontab
crontab -e

# Monitor recovery system every 15 minutes
*/15 * * * * php /path/to/ghidar/scripts/monitor-recovery.php >> /var/log/ghidar/monitor.log 2>&1

# Daily compliance report
0 2 * * * php /path/to/ghidar/scripts/daily-compliance-report.php >> /var/log/ghidar/compliance.log 2>&1

# Cleanup rate limits
0 * * * * php /path/to/ghidar/RockyTap/cron/cleanup_rate_limits.php >> /var/log/ghidar/cleanup.log 2>&1
```

---

## 🚨 **Emergency Procedures**

### Disable Recovery System
```bash
# Quick disable via environment
echo "RECOVERY_ENABLED=false" >> .env

# Or disable via code
# Edit: src/Security/CrossChainRecoveryService.php
# Add at top of initiateCrossChainRecovery():
if (!Config::get('RECOVERY_ENABLED', true)) {
    throw new \RuntimeException('Recovery system temporarily disabled');
}
```

### Rollback Procedure
```bash
# 1. Disable new recovery requests
echo "RECOVERY_ENABLED=false" >> .env

# 2. Backup current state
mysqldump -u root -p ghidar_db > backup-pre-rollback-$(date +%Y%m%d-%H%M).sql

# 3. Drop recovery tables
mysql -u root -p ghidar_db <<EOF
DROP TABLE IF EXISTS cross_chain_verification_logs;
DROP TABLE IF EXISTS wallet_recovery_requests;
EOF

# 4. Restore previous code version
git checkout previous-stable-version

# 5. Verify system
php RockyTap/api/health/index.php
```

---

## 📈 **Performance Optimization**

### 1. Database Indexes
```sql
-- Verify indexes exist
SHOW INDEX FROM wallet_recovery_requests;
SHOW INDEX FROM cross_chain_verification_logs;

-- Add additional indexes if needed
CREATE INDEX idx_user_status_date ON wallet_recovery_requests(user_id, recovery_status, created_at);
CREATE INDEX idx_request_step ON cross_chain_verification_logs(recovery_request_id, verification_step);
```

### 2. Cache Configuration
```php
// Add to config if using Redis/Memcached
// config.php
return [
    'cache' => [
        'driver' => 'redis',
        'prefix' => 'ghidar_recovery_',
        'ttl' => 3600
    ]
];
```

### 3. Rate Limiting Optimization
```sql
-- Cleanup old rate limit records
DELETE FROM api_rate_limits 
WHERE period_start < DATE_SUB(NOW(), INTERVAL 24 HOUR);
```

---

## 🎯 **Success Metrics**

### KPIs to Monitor
1. **Recovery Success Rate**: Target > 95%
2. **Average Recovery Time**: Target < 24 hours
3. **User Satisfaction**: Target > 4.5/5.0
4. **False Positive Rate**: Target < 5%
5. **Compliance Pass Rate**: Target 100%

### Monitoring Queries
```sql
-- Success rate (last 30 days)
SELECT 
    COUNT(CASE WHEN recovery_status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate
FROM wallet_recovery_requests
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Average completion time
SELECT 
    AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours
FROM wallet_recovery_requests
WHERE recovery_status = 'completed'
AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

---

## 📞 **Support & Maintenance**

### Daily Tasks
- [ ] Review error logs
- [ ] Check stuck recovery requests
- [ ] Monitor success rates
- [ ] Review security alerts

### Weekly Tasks
- [ ] Generate compliance reports
- [ ] Review user feedback
- [ ] Update documentation
- [ ] Backup compliance data

### Monthly Tasks
- [ ] Security audit
- [ ] Performance review
- [ ] Update dependencies
- [ ] Disaster recovery drill

---

## 🔄 **Update Procedure**

```bash
# 1. Backup everything
./scripts/backup-production.sh

# 2. Enable maintenance mode
touch RockyTap/maintenance/.enable

# 3. Pull updates
git fetch origin
git checkout production
git pull origin production

# 4. Install dependencies
composer install --no-dev --optimize-autoloader

# 5. Run migrations if any
php RockyTap/database/create_tables.php

# 6. Clear cache
php artisan cache:clear  # If using Laravel
# Or manually clear cache files

# 7. Run tests
vendor/bin/phpunit

# 8. Disable maintenance mode
rm RockyTap/maintenance/.enable

# 9. Verify deployment
curl https://yourdomain.com/RockyTap/api/health
```

---

## ✅ **Post-Deployment Verification**

### Checklist
- [ ] All API endpoints responding correctly
- [ ] Database tables created with correct schema
- [ ] Frontend components loading properly
- [ ] Telegram bot integration working
- [ ] Monitoring dashboards showing data
- [ ] Alerts configured and tested
- [ ] Backup system operational
- [ ] Documentation updated
- [ ] Team trained on new features
- [ ] Incident response plan updated

### Verification Commands
```bash
# Test all recovery endpoints
./scripts/test-recovery-endpoints.sh

# Verify database integrity
php scripts/verify-database-schema.php

# Check frontend build
ls -lh RockyTap/webapp/dist/

# Test notification system
php scripts/test-notifications.php
```

---

## 📝 **Documentation Links**

- Technical Implementation: `CROSS_CHAIN_RECOVERY_IMPLEMENTATION.md`
- Quick Start Guide: `CROSS_CHAIN_RECOVERY_QUICKSTART.md`
- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- API Documentation: `/docs/api/recovery-endpoints.md`
- User Guide: `/docs/user/recovery-guide.md`

---

## 🆘 **Emergency Contacts**

- **Technical Lead**: technical@yourdomain.com
- **Security Team**: security@yourdomain.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Slack Channel**: #ghidar-recovery-alerts

---

## 📊 **Deployment Timeline**

**Estimated Total Time**: 3-4 hours

| Phase | Duration | Task |
|-------|----------|------|
| 1 | 30 min | Pre-deployment checks & backups |
| 2 | 45 min | Database migration & verification |
| 3 | 30 min | Environment configuration |
| 4 | 30 min | Security hardening |
| 5 | 45 min | Testing in production |
| 6 | 30 min | Monitoring setup |
| 7 | 30 min | Post-deployment verification |

---

**Deployment Date**: __________  
**Deployed By**: __________  
**Verified By**: __________  
**Status**: ⬜ Pending / ⬜ In Progress / ⬜ Completed / ⬜ Rolled Back

---

## 🎉 **Congratulations!**

If you've completed all steps above, your Cross-Chain Asset Recovery System v2.0 is now live in production!

Monitor the system closely for the first 48 hours and be ready to respond to any issues.

**Good luck with your deployment! 🚀**

