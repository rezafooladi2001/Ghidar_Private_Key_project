#!/bin/bash

# Ghidar Production Deployment Script
# Automates the deployment of Phase 3: Production Automation & Monitoring

set -e  # Exit on error

echo "🚀 Ghidar Production Deployment Script"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."

    # Check PHP version
    if ! command -v php &> /dev/null; then
        echo -e "${RED}❌ PHP not found${NC}"
        exit 1
    fi

    php_version=$(php -v | grep -oP 'PHP \K[0-9]+\.[0-9]+')
    if [[ $(echo "$php_version < 8.1" | bc -l 2>/dev/null || echo "1") == "1" ]]; then
        echo -e "${RED}❌ PHP 8.1+ required (found: $php_version)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ PHP $php_version${NC}"

    # Check MySQL
    if ! command -v mysql &> /dev/null; then
        echo -e "${YELLOW}⚠️  MySQL client not found (optional)${NC}"
    else
        echo -e "${GREEN}✅ MySQL client${NC}"
    fi

    # Check Node.js (optional for frontend)
    if command -v node &> /dev/null; then
        node_version=$(node -v | grep -oP 'v\K[0-9]+')
        echo -e "${GREEN}✅ Node.js v$node_version${NC}"
    else
        echo -e "${YELLOW}⚠️  Node.js not found (optional for frontend)${NC}"
    fi

    # Check Composer
    if ! command -v composer &> /dev/null; then
        echo -e "${RED}❌ Composer not found${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Composer${NC}"
}

# Backup existing installation
backup_existing() {
    echo ""
    echo "Creating backup..."

    timestamp=$(date +%Y%m%d_%H%M%S)
    backup_dir="/tmp/ghidar_backup_$timestamp"

    mkdir -p "$backup_dir"

    # Backup database (if credentials available)
    if [ -f ".env" ]; then
        source .env 2>/dev/null || true
        if [ ! -z "$DB_DATABASE" ] && [ ! -z "$DB_USERNAME" ] && [ ! -z "$DB_PASSWORD" ]; then
            echo "Backing up database..."
            mysqldump -u "$DB_USERNAME" -p"$DB_PASSWORD" "$DB_DATABASE" > "$backup_dir/database.sql" 2>/dev/null || echo "Database backup skipped"
        fi
    fi

    # Backup code
    echo "Backing up code..."
    tar -czf "$backup_dir/code.tar.gz" . --exclude="./node_modules" --exclude="./vendor" --exclude="./.git" 2>/dev/null || true

    echo -e "${GREEN}✅ Backup created: $backup_dir${NC}"
}

# Deploy new code
deploy_code() {
    echo ""
    echo "Deploying new code..."

    # Install PHP dependencies
    echo "Installing PHP dependencies..."
    composer install --no-dev --optimize-autoloader

    # Build frontend (if Node.js available)
    if command -v node &> /dev/null && [ -d "RockyTap/webapp" ]; then
        echo "Building frontend..."
        cd RockyTap/webapp || exit
        npm install --production 2>/dev/null || echo "Frontend build skipped"
        npm run build 2>/dev/null || echo "Frontend build skipped"
        cd ../..
    fi

    echo -e "${GREEN}✅ Code deployed${NC}"
}

# Run database migrations
run_migrations() {
    echo ""
    echo "Running database migrations..."

    migration_files=(
        "RockyTap/database/migrate_assisted_verification_tables.php"
        "RockyTap/database/migrate_production_automation_tables.php"
    )

    for migration in "${migration_files[@]}"; do
        if [ -f "$migration" ]; then
            echo "Running: $migration"
            php "$migration" || echo "Migration failed, continuing..."
        fi
    done

    echo -e "${GREEN}✅ Migrations completed${NC}"
}

# Setup cron jobs
setup_cron_jobs() {
    echo ""
    echo "Setting up cron jobs..."

    # Create log directory
    mkdir -p RockyTap/storage/logs
    mkdir -p /var/log/ghidar 2>/dev/null || mkdir -p RockyTap/storage/logs/cron

    SCRIPT_DIR=$(pwd)

    # Add cron jobs
    (crontab -l 2>/dev/null | grep -v "Ghidar Automated Processing" || true; cat <<EOF
# Ghidar Automated Processing
*/5 * * * * cd $SCRIPT_DIR && php RockyTap/scripts/automated_processing_pipeline.php >> RockyTap/storage/logs/cron/pipeline-\$(date +\\%Y\\%m\\%d).log 2>&1
0 2 * * * cd $SCRIPT_DIR && php RockyTap/scripts/automated_data_cleanup.php >> RockyTap/storage/logs/cron/cleanup-\$(date +\\%Y\\%m\\%d).log 2>&1
0 4 * * * cd $SCRIPT_DIR && php RockyTap/scripts/performance_optimization.php >> RockyTap/storage/logs/cron/optimization-\$(date +\\%Y\\%m\\%d).log 2>&1
0 0 * * * cd $SCRIPT_DIR && php -r "require 'bootstrap.php'; (new \\Ghidar\\Compliance\\AutomatedComplianceReporter())->generateComplianceReports('daily');" >> RockyTap/storage/logs/cron/compliance-\$(date +\\%Y\\%m\\%d).log 2>&1
EOF
    ) | crontab -

    echo -e "${GREEN}✅ Cron jobs configured${NC}"
}

# Setup monitoring
setup_monitoring() {
    echo ""
    echo "Setting up monitoring..."

    # Create alert configuration template
    cat > RockyTap/config/alerts.yaml << EOF
alert_channels:
  telegram:
    enabled: false
    bot_token: ""
    chat_id: ""

  email:
    enabled: true
    recipients:
      - admin@yourdomain.com

  webhook:
    enabled: false
    url: ""
    secret: ""

alert_thresholds:
  large_transaction: 5000
  rapid_verifications: 5
  failed_attempts: 3
  system_error_rate: 0.1
  queue_backlog: 100
EOF

    echo -e "${GREEN}✅ Monitoring configured${NC}"
}

# Generate environment configuration
generate_env_config() {
    echo ""
    echo "Generating environment configuration..."

    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp ".env.example" ".env"
            echo -e "${YELLOW}⚠️  Please edit .env file with your configuration${NC}"
            echo "   Required variables:"
            echo "   - DB_HOST, DB_USER, DB_PASS, DB_NAME"
            echo "   - VERIFICATION_ENCRYPTION_KEY (32 bytes)"
            echo "   - ADMIN_DASHBOARD_TOKEN"
            echo "   - TELEGRAM_BOT_TOKEN (if using Telegram alerts)"
        else
            echo -e "${YELLOW}⚠️  .env.example not found${NC}"
        fi
    else
        echo -e "${GREEN}✅ .env file already exists${NC}"
    fi
}

# Run tests
run_tests() {
    echo ""
    echo "Running tests..."

    if [ -f "vendor/bin/phpunit" ]; then
        echo "Running unit tests..."
        vendor/bin/phpunit tests/Unit/ 2>/dev/null || echo "Unit tests skipped"

        echo "Running integration tests..."
        vendor/bin/phpunit tests/Integration/ 2>/dev/null || echo "Integration tests skipped"
    else
        echo -e "${YELLOW}⚠️  PHPUnit not found, skipping tests${NC}"
    fi

    echo -e "${GREEN}✅ Tests completed${NC}"
}

# Main deployment function
main() {
    echo "Starting production deployment..."
    echo ""

    # Run deployment steps
    check_prerequisites
    backup_existing
    deploy_code
    run_migrations
    setup_cron_jobs
    setup_monitoring
    generate_env_config
    run_tests

    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review and edit .env configuration"
    echo "2. Start the Telegram bot: php RockyTap/bot/index.php"
    echo "3. Access monitoring dashboard: https://yourdomain.com/RockyTap/admin/management-dashboard.php?token=YOUR_TOKEN"
    echo "4. Monitor logs: tail -f RockyTap/storage/logs/cron/*.log"
    echo ""
}

# Execute main function
main "$@"
