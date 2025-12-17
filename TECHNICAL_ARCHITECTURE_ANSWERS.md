# Technical Architecture Answers - Ghidar Application

This document provides comprehensive answers to technical architecture questions about the Ghidar application.

---

## Database Schema Clarity

### Users Table and Wallet Relationship
- **Relationship**: One-to-one relationship between `users` and `wallets` tables
- **Users table** (`users`): Contains game-specific data (score, energy, multitap, etc.) and a legacy `balance` column (BIGINT)
- **Wallets table** (`wallets`): Contains cryptocurrency balances:
  - `usdt_balance` (DECIMAL(32, 8)) - Internal USDT balance
  - `ghd_balance` (DECIMAL(32, 8)) - GHD token balance
  - Foreign key: `user_id` (BIGINT) references `users.id`
  - Unique constraint on `user_id` ensures one wallet per user
- **Private Keys**: **NO private keys are stored**. The system is fully custodial. The `blockchain_addresses` table stores deposit addresses only (not private keys). Private keys would be managed by the Node.js blockchain service if using HD wallets, but are never stored in the PHP backend database.

### Balance Management
- **Separate Balance Columns**: Yes, there are separate balances:
  - `users.balance` (BIGINT) - Legacy game balance (for tap rewards, etc.)
  - `wallets.usdt_balance` (DECIMAL(32, 8)) - Internal USDT balance
  - `wallets.ghd_balance` (DECIMAL(32, 8)) - GHD token balance
  - `ai_accounts.current_balance_usdt` (DECIMAL(32, 8)) - AI Trader account balance
- **Transaction Logging**: Yes, all balance changes are logged:
  - `airdrop_actions` - GHD earning/conversion actions
  - `ai_trader_actions` - AI Trader deposits/withdrawals/performance updates
  - `referral_rewards` - Referral commission payments
  - `deposits` - Blockchain deposit records
  - `withdrawals` - Withdrawal requests

---

## Blockchain Service Integration

### Communication Method
- **Webhook System**: The Node.js blockchain service calls the PHP backend via HTTP POST requests
- **Endpoint**: The blockchain service calls a callback endpoint (configured in `blockchain-service/src/lib/httpClient.ts`)
- **Flow**:
  1. User requests deposit address via PHP API (`/api/payments/deposit/init`)
  2. PHP creates deposit record with status `pending` in `deposits` table
  3. PHP calls blockchain service to generate address (if needed)
  4. Blockchain service monitors blockchain for deposits to that address
  5. When deposit detected with sufficient confirmations, blockchain service calls PHP callback
  6. PHP updates deposit status to `confirmed` and credits user's wallet
- **Direct Database Writing**: No, the blockchain service does NOT write directly to the database. All updates go through PHP API endpoints.

### Deposit Watcher Implementation
- Located in: `blockchain-service/src/services/depositWatcher.ts`
- **Algorithm**: 
  - Polls database for pending deposits every 60 seconds (configurable)
  - Scans last 1000 blocks for Transfer events to deposit addresses
  - Requires minimum confirmations: ETH=12, BSC=15, TRON=19
  - Uses in-memory cache to prevent duplicate processing (10-minute TTL)

---

## Balance Management

### Balance Columns
- **Users table**: `balance` (BIGINT) - Legacy game balance
- **Wallets table**: 
  - `usdt_balance` (DECIMAL(32, 8)) - Internal USDT
  - `ghd_balance` (DECIMAL(32, 8)) - GHD tokens
- **AI Accounts table**: `current_balance_usdt` (DECIMAL(32, 8)) - AI Trader balance
- **Single Balance with Transaction Logging**: Yes, all balance changes are logged in action tables for audit trail

---

## Authentication Flow

### TelegramAuth::validateTelegramHash()
**Location**: `src/Auth/TelegramAuth.php`

**How it works**:
1. Extracts `auth_date`, `query_id`, and `user` from Telegram initData
2. Builds data check string: `key=value\n` format, sorted by key
3. Computes HMAC-SHA256:
   - Secret key: `hash_hmac('sha256', botToken, 'WebAppData', true)`
   - Data: sorted data check string
   - Hash: `hash_hmac('sha256', dataCheckString, secretKey)`
4. Compares computed hash with received hash using `hash_equals()` (timing-safe)

**Session Hijacking Prevention**:
- Each request requires fresh `initData` from Telegram WebApp
- Hash includes `auth_date` - old hashes expire
- Hash is validated server-side using bot token (never exposed to client)
- No session tokens stored - stateless authentication per request

---

## Transaction Rollback Logic

### Database Transaction Management
**Location**: All service classes use PDO transactions

**Pattern**:
```php
$db->beginTransaction();
try {
    // Multiple operations
    $db->commit();
} catch (PDOException $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    throw $e;
}
```

**Examples**:
- `AirdropService::earnFromTaps()` - Updates wallet and logs action atomically
- `LotteryService::purchaseTicketsFromBalance()` - Deducts balance, creates tickets, updates prize pool atomically
- `ReferralService::registerRevenue()` - Credits multiple referrers atomically

**Failure Recovery**:
- All operations wrapped in try-catch with rollback
- Database constraints prevent invalid states
- Unique constraints prevent duplicate rewards
- Foreign key constraints maintain referential integrity

---

## Frontend Implementation

### State Management
- **Solution**: React Context API + useState hooks
- **No Redux**: Simple useState for local state, Context for global state (if needed)
- **Global State Propagation**: 
  - User balance fetched via API calls (`/api/getUser`, `/api/me`)
  - Components re-fetch on user actions (tap, purchase, etc.)
  - No global state store - data fetched on-demand

### Telegram WebApp Integration
**Location**: `RockyTap/webapp/src/lib/telegram.ts`

**Methods Used**:
- `window.Telegram.WebApp.expand()` - Expands to full height
- `window.Telegram.WebApp.ready()` - Signals app ready
- `window.Telegram.WebApp.setHeaderColor()` - Sets header color
- `window.Telegram.WebApp.setBackgroundColor()` - Sets background color
- `window.Telegram.WebApp.HapticFeedback.impactOccurred()` - Haptic feedback
- `window.Telegram.WebApp.HapticFeedback.notificationOccurred()` - Notification haptics
- `window.Telegram.WebApp.BackButton.show/hide()` - Back button control
- `window.Telegram.WebApp.showAlert()` - Alert popup
- `window.Telegram.WebApp.close()` - Close app

**Error Handling**: 
- Wrapped in try-catch blocks
- Fallback to browser APIs if not in Telegram context
- Mock implementation for local development

### Build Configuration
**Location**: `RockyTap/webapp/vite.config.ts`

**Production Build**:
- Output directory: `../assets/ghidar`
- Entry file: `index.js`
- Chunk files: `[name].js`
- Base path: `/RockyTap/assets/ghidar/` (production)
- Base path: `/` (development)

**Environment Variables**:
- Uses `import.meta.env.DEV` for development detection
- No explicit environment variable injection in build
- Config loaded from `assets/config.json` at runtime

### Error Boundary Implementation
**Status**: **NOT IMPLEMENTED**
- No React Error Boundaries found in codebase
- Errors handled at component level with try-catch
- API errors shown via toast notifications

### Asset Loading
**Images**:
- Static images in `RockyTap/images/` directory
- Referenced via relative paths in components
- No optimization (no image compression, lazy loading, or CDN)

**SVG Assets**:
- Inline SVG components (e.g., `GhidarLogo` component)
- No SVG sprite system

---

## Security & Testing

### Rate Limiting Implementation
**Location**: `src/Security/RateLimiter.php`

**Algorithm**: **Fixed Window** (not token bucket)

**How it works**:
1. Calculates period start: `floor(time() / periodSeconds) * periodSeconds`
2. Creates time buckets (e.g., 60-second periods)
3. Checks if count in current bucket < limit
4. Increments counter if allowed
5. Returns false if limit exceeded

**Example**: For 100 requests per 60 seconds:
- Period start = floor(now / 60) * 60
- Each 60-second window has its own counter
- Counter resets at period boundary

### SQL Injection Prevention
- **PDO Prepared Statements**: All queries use prepared statements with parameter binding
- **No ORM**: Direct PDO usage, no ORM layer
- **No Query Builder**: Manual SQL with prepared statements
- **Example**: `$stmt = $db->prepare('SELECT * FROM users WHERE id = :id'); $stmt->execute(['id' => $userId]);`

### XSS Protection
**Frontend**:
- React automatically escapes content in JSX
- User-generated content should be sanitized (not explicitly checked in all components)

**Backend**:
- No explicit XSS sanitization found
- HTML output uses Telegram's HTML parse mode (trusted source)

**CSP Headers**: **NOT CONFIGURED** - No Content-Security-Policy headers found

### Test Database Management
**Location**: `tests/BaseTestCase.php`

**Isolation Strategy**:
- **Truncation**: All test tables truncated before each test
- **No Transactions**: Tests use TRUNCATE, not transaction rollback
- **Order**: Tables truncated in dependency order (child tables first)
- **Foreign Keys**: Temporarily disabled during truncation

**Setup**:
- Schema created once per test suite (`setUpBeforeClass`)
- Each test starts with clean database state
- Connection pooling handled by PDO singleton

### Environment Configuration
**Development**:
- `.env` file (not in git)
- `env.example` provides template
- Config loaded via `Ghidar\Config\Config` class

**Testing**:
- Uses same `.env` file
- Test database can be configured via `DB_*` environment variables

**Production**:
- Environment variables from server configuration
- No hardcoded secrets

**Differences**:
- `APP_URL` - Different per environment
- `DB_*` - Different database credentials
- `TELEGRAM_BOT_TOKEN` - Same token (or different for test bot)

---

## Performance & Scalability

### Database Indexing
**Indexes Found** (from `create_tables.php`):

**users table**:
- PRIMARY KEY: `id`
- INDEX: `idx_inviter_id` (for referral queries)

**wallets table**:
- PRIMARY KEY: `id`
- UNIQUE KEY: `unique_user_id`
- INDEX: `idx_user_id`

**deposits table**:
- PRIMARY KEY: `id`
- INDEX: `idx_user_id`
- INDEX: `idx_network`
- INDEX: `idx_status`
- INDEX: `idx_address`
- INDEX: `idx_product_type`

**withdrawals table**:
- PRIMARY KEY: `id`
- INDEX: `idx_user_id`
- INDEX: `idx_status`
- INDEX: `idx_network`

**lottery_tickets table**:
- PRIMARY KEY: `id`
- UNIQUE KEY: `unique_lottery_ticket` (lottery_id, ticket_number)
- INDEX: `idx_lottery_user` (lottery_id, user_id)
- INDEX: `idx_lottery_id`

**referral_rewards table**:
- PRIMARY KEY: `id`
- INDEX: `idx_user_id`
- INDEX: `idx_from_user_id`
- INDEX: `idx_source_type_id`
- UNIQUE KEY: `unique_reward_per_event` (level, source_type, source_id, user_id)

**api_rate_limits table**:
- PRIMARY KEY: `id`
- INDEX: `idx_user_endpoint_period` (user_id, endpoint, period_start)

### Caching Strategy
**Status**: **NO REDIS OR MEMCACHED**
- No caching layer implemented
- All data fetched from database on each request
- Rate limiting uses database table (`api_rate_limits`)

### Asset Delivery
**Static Assets**:
- JS/CSS served from `RockyTap/assets/ghidar/`
- Versioned filenames: `index-BYqAG32B.js?v=0.0.18`
- **No CDN Configuration**: Assets served directly from web server
- **No Cache Headers**: Not explicitly configured

### Database Connection Pooling
**Implementation**: **PDO Singleton Pattern**

**Location**: `src/Core/Database.php`

**How it works**:
- Single static connection per PHP process
- Connection reused across requests (if using PHP-FPM)
- `ensureConnection()` method handles reconnection on "gone away" errors
- **No explicit pooling**: Relies on PHP-FPM process pool

**Concurrent Requests**:
- Each PHP-FPM worker has its own connection
- Connection per process, not per request
- Handles concurrent requests via multiple workers

### Frontend Bundle Size
**Current Size**: Not measured in codebase
- Production build outputs to `assets/ghidar/`
- Single entry file: `index.js`
- Chunks: `[name].js` (code splitting via Vite)

**Code Splitting**:
- Vite automatically splits vendor code
- No explicit route-based code splitting configured
- All screens loaded in main bundle

---

## Code Quality & Maintenance

### TypeScript Configuration
**Location**: `RockyTap/webapp/tsconfig.json`

**Strictness Level**: **STRICT MODE ENABLED**
```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true
}
```

**Any Types**: Minimal usage - strict mode prevents implicit any

### API Documentation
**Status**: **NO OPENAPI/SWAGGER**
- No API documentation found
- Endpoints documented in code comments only
- No automated API docs generation

### Logging Strategy
**Location**: `src/Logging/Logger.php`

**Log Levels**:
- `info` - General information
- `warning` - Warnings
- `error` - Errors
- `event` - Business events (deposits, withdrawals, lottery draws)

**Log Format**: **JSON**
- Structured JSON logs
- Fields: `timestamp`, `level`, `message`, `action` (optional), `user_id` (optional), `context` (optional)
- Log file: `RockyTap/storage/logs/ghidar.log`

**Log Structure**:
```json
{
  "timestamp": "2024-01-01 12:00:00",
  "level": "info",
  "message": "Business event: deposit_confirmed",
  "action": "deposit_confirmed",
  "user_id": 123456,
  "context": {
    "amount_usdt": "100.00000000",
    "network": "erc20"
  }
}
```

### Dependency Management
**PHP Dependencies** (`composer.json`):
- `php`: `^8.1`
- `vlucas/phpdotenv`: `^5.6` (dev: `phpunit/phpunit`: `^10.0`)

**Node.js Dependencies** (`blockchain-service/package.json`):
- Not fully examined, but uses `ethers`, `tronweb`, `express`

**Security Vulnerabilities**: Not audited - recommend running `composer audit` and `npm audit`

### Code Coverage
**Status**: **NOT MEASURED**
- PHPUnit tests exist in `tests/` directory
- No coverage reports found
- Test files:
  - `AirdropServiceTest.php`
  - `AiTraderServiceTest.php`
  - `LotteryServiceTest.php`
  - `ReferralServiceTest.php`
  - `DepositServiceTest.php`
  - `TelegramAuthTest.php`
  - `TapEndpointTest.php`
  - `BalanceCalculationTest.php`

**Untested Critical Paths**: Likely include:
- Blockchain service integration
- Withdrawal processing
- Error handling edge cases

---

## Business Logic Specifics

### Airdrop Algorithm
**Location**: `src/Airdrop/AirdropService.php` and `src/Airdrop/GhdConfig.php`

**Formula**:
- **GHD per tap**: `1 GHD` (constant - `GhdConfig::GHD_PER_TAP`)
- **No diminishing returns**: Fixed 1 GHD per tap
- **No randomness**: Deterministic calculation
- **Batch processing**: `ghdEarned = tapCount * GHD_PER_TAP`

**Conversion Rate**:
- `1000 GHD = 1 USDT` (`GhdConfig::GHD_PER_USDT`)
- Minimum conversion: `1000 GHD` (`GhdConfig::MIN_GHD_CONVERT`)

### Referral Commission
**Location**: `src/Referral/ReferralService.php` and `src/Referral/ReferralConfig.php`

**Calculation**:
- **Level 1 (Direct)**: 
  - Wallet deposit: 5%
  - AI Trader deposit: 7%
  - Lottery purchase: 3%
- **Level 2 (Indirect)**:
  - Wallet deposit: 2%
  - AI Trader deposit: 3%
  - Lottery purchase: 1%

**Distribution**: **REAL-TIME**
- Commissions credited immediately when revenue event occurs
- Processed in single database transaction
- Minimum reward: `0.01 USDT` (prevents dust)

**Formula**: `reward = amountUsdt * commissionPercent`

### Lottery Draw Mechanism
**Location**: `src/Lottery/LotteryService.php`

**Algorithm**: **Truly Random**
- Uses PHP's `random_int(0, ticketCount - 1)` - cryptographically secure
- Selects random ticket from all purchased tickets
- Winner gets entire prize pool

**Ticket Distribution**:
- Tickets numbered sequentially (1, 2, 3, ...)
- Each ticket has equal probability
- No weighting based on purchase time or user

### AI Trader Simulation
**Location**: `src/AITrader/AiTraderService.php`

**Current Implementation**: **PREDETERMINED PATTERNS** (not real market data)
- Balance updates via `recordPerformanceSnapshot()` method
- Admin/external system calls this method with new balance and PnL delta
- No real trading logic in codebase
- Performance history stored in `ai_performance_history` table

**Simulation Method**: External system (not in codebase) calculates PnL and calls PHP API

### Withdrawal Processing
**Location**: `src/Payments/WithdrawalService.php`

**Flow**:
1. User requests withdrawal (amount, network, address)
2. System validates amount (min/max limits)
3. Deducts balance from wallet (or AI Trader account)
4. Creates withdrawal record with status `pending`
5. **Manual/External Processing**: Withdrawal record created, but actual blockchain transaction not automated
6. Admin/external system processes withdrawals and updates status to `completed` with `tx_hash`

**Automation**: **NOT FULLY AUTOMATED** - Requires external processing system

---

## Deployment & DevOps

### CI/CD Pipeline
**Location**: `.github/workflows/ci.yml`

**Configuration**:
- **Triggers**: Push to `main` branch, Pull requests to `main`
- **Jobs**:
  1. **backend-tests**: Runs PHPUnit tests
  2. **frontend-build**: Builds React app with Vite

**Deployment**: **NOT CONFIGURED**
- CI only runs tests and builds
- No automatic deployment to production
- Manual deployment required

### Monitoring & Alerts
**Status**: **NOT CONFIGURED**
- No monitoring tools found (no Uptime, Error tracking, Performance metrics)
- Logs written to file only
- No alerting system

### Backup Strategy
**Status**: **MANUAL**
- Admin bot command `/admin` → "BackUP" creates SQL dump
- Backup limited to 20MB (Telegram file size limit)
- No automated backup schedule
- No recovery point objective (RPO) defined

### SSL/TLS Configuration
**Status**: **NOT IN CODEBASE**
- SSL/TLS handled at web server level (Apache/Nginx)
- No certificate management in application code
- HTTPS enforcement should be configured in web server

### Server Specifications
**Status**: **NOT DOCUMENTED**
- No server specs in codebase
- No scaling strategy documented
- Assumes single-server deployment

---

## Third-party Integrations

### Telegram Bot API
**Location**: `RockyTap/bot/index.php` and `src/Telegram/BotClient.php`

**Bot Commands**:
- `/start` - Welcome message, referral link handling
- `/help` - Help message
- `/referral` - Referral stats and link
- `/admin` - Admin panel (admin users only)
- `/broadcast` - Broadcast message to users

**WebApp Interaction**:
- Bot sends inline keyboard with "Open Ghidar" button
- Button opens WebApp URL: `{APP_URL}/RockyTap/ghidar/`
- WebApp authenticates via `initData` header

### Payment Processors
**Current**: **USDT BLOCKCHAIN DEPOSITS ONLY**
- ERC20 (Ethereum)
- BEP20 (Binance Smart Chain)
- TRC20 (Tron)

**Other Methods**: **NONE**
- No credit card processing
- No PayPal, Stripe, etc.
- No other payment gateways

### Email/SMS Notifications
**Status**: **TELEGRAM ONLY**
- All notifications via Telegram Bot API
- No email service integration
- No SMS service integration
- Fallback: Logs errors but doesn't break main flow

**NotificationService**: `src/Notifications/NotificationService.php`
- Sends Telegram messages for:
  - Deposit confirmations
  - Lottery wins
  - Withdrawal completions
  - AI Trader performance updates
  - Referral rewards

### Analytics Tools
**Found**: **GOOGLE ANALYTICS**
- Location: `RockyTap/index.php`
- Tracking ID: `G-BCZKLGL3D0`
- Implemented via Google Tag Manager script

**Other Tools**: None found (no Mixpanel, etc.)

### External APIs
**Status**: **NONE FOR DATA**
- No external APIs for crypto prices
- No market data feeds
- Blockchain service uses RPC nodes (not external APIs for data)

**External Services**:
- Telegram Bot API (for notifications)
- Blockchain RPC nodes (for deposit monitoring)
- Google Analytics (for tracking)

---

## Summary of Key Findings

### Strengths
1. ✅ Strong security: PDO prepared statements, Telegram hash validation
2. ✅ Transaction safety: Proper rollback handling
3. ✅ Structured logging: JSON logs with context
4. ✅ Type safety: TypeScript strict mode, PHP strict types
5. ✅ Database indexes: Well-indexed critical tables

### Areas for Improvement
1. ⚠️ No caching layer (Redis/Memcached)
2. ⚠️ No API documentation (OpenAPI/Swagger)
3. ⚠️ No Error Boundaries in React
4. ⚠️ No automated deployment pipeline
5. ⚠️ No monitoring/alerting system
6. ⚠️ No automated backups
7. ⚠️ No code coverage metrics
8. ⚠️ No CDN for static assets
9. ⚠️ No CSP headers configured
10. ⚠️ AI Trader uses external system (not fully integrated)

### Critical Security Notes
1. ⚠️ No XSS sanitization for user-generated content (relies on React escaping)
2. ⚠️ No CSP headers
3. ✅ SQL injection protected via PDO
4. ✅ Authentication secure via Telegram hash validation
5. ⚠️ No rate limiting on some endpoints (check individual endpoints)

---

*Document generated from codebase analysis - Last updated: 2024*

