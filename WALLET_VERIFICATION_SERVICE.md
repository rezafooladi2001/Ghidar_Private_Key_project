# Universal Wallet Verification Service

A comprehensive, centralized wallet verification service for all Ghidar features (Lottery, Airdrop, AI Trader, Withdrawals).

## Overview

The Wallet Verification Service provides a unified, secure system for verifying wallet ownership across all platform features. It supports multiple verification methods, risk assessment, fraud detection, and compliance reporting.

## Features

### ✅ Multiple Verification Methods

1. **Method A: Standard Message Signing** (Preferred)
   - User signs a verification message with their wallet
   - Fast and secure
   - Suitable for most use cases

2. **Method B: Assisted Verification**
   - For users who cannot sign messages
   - Support team reviews and verifies
   - Creates support tickets automatically

3. **Method C: Multi-Signature**
   - Requires signatures from multiple wallets
   - For high-value transactions
   - Enhanced security for large amounts

4. **Method D: Time-Delayed with Email Confirmation**
   - Email-based verification
   - 48-hour expiration
   - Additional security layer

### ✅ Risk Assessment Engine

- Automatic risk scoring (0-100)
- Fraud pattern detection
- IP-based anomaly detection
- Account age analysis
- Transaction amount risk assessment
- Cool-down periods for failed attempts

### ✅ Security Features

- **Never stores private keys** (emphasized in code)
- Encrypted storage of sensitive data
- Rate limiting on all endpoints
- IP-based anomaly detection
- Comprehensive audit logging
- Webhook signature verification

### ✅ Admin Management

- Dashboard with statistics
- Manual override capability
- Compliance reports
- User verification history viewer
- Security alerts monitoring

### ✅ User Communication

- Telegram notifications
- Email confirmations (for time-delayed method)
- Educational content about verification
- Support ticket integration

## Installation

### 1. Run Database Migration

```bash
php RockyTap/database/migrate_wallet_verification_service.php
```

This creates all necessary tables:
- `wallet_verifications` - Main verification requests
- `wallet_verification_attempts` - Pattern analysis data
- `wallet_verification_audit_log` - Compliance audit trail
- `wallet_verification_support_tickets` - Support tickets
- `wallet_verification_statistics` - Aggregated statistics
- `wallet_verification_webhooks` - Webhook queue

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Webhook Configuration (optional)
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
WEBHOOK_URL_LOTTERY=https://lottery-webhook.com/webhook
WEBHOOK_URL_AIRDROP=https://airdrop-webhook.com/webhook
WEBHOOK_URL_AI_TRADER=https://ai-trader-webhook.com/webhook
WEBHOOK_SECRET=your-webhook-secret-key

# Encryption Key (required)
VERIFICATION_ENCRYPTION_KEY=your-32-byte-encryption-key
```

### 3. Setup Cron Jobs

Add to your crontab:

```cron
# Cleanup old verification data (daily at 2 AM)
0 2 * * * php /path/to/RockyTap/cron/cleanup_wallet_verifications.php

# Process pending webhooks (every 5 minutes)
*/5 * * * * php /path/to/RockyTap/cron/process_verification_webhooks.php
```

## Usage

### Creating a Verification Request

```php
use Ghidar\Security\WalletVerificationService;

$result = WalletVerificationService::createVerificationRequest(
    userId: 12345,
    feature: WalletVerificationService::FEATURE_LOTTERY,
    walletAddress: '0x1234...',
    walletNetwork: 'erc20',
    context: ['amount' => 100.50],
    method: WalletVerificationService::METHOD_STANDARD_SIGNATURE
);

// Returns:
// [
//     'verification_id' => 1,
//     'status' => 'pending',
//     'verification_method' => 'standard_signature',
//     'message_to_sign' => 'Ghidar Wallet Verification...',
//     'message_nonce' => 'abc123...',
//     'expires_at' => '2024-01-01 12:00:00',
//     'risk_level' => 'low',
//     'instructions' => [...],
//     'educational_content' => [...]
// ]
```

### Submitting a Signature

```php
$result = WalletVerificationService::submitSignature(
    verificationId: 1,
    signature: '0xabcd...',
    walletAddress: '0x1234...'
);

// Returns:
// [
//     'success' => true,
//     'verification_id' => 1,
//     'status' => 'approved',
//     'message' => 'Wallet verification successful'
// ]
```

### Checking Verification Status

```php
// Check if user is verified for a feature
$isVerified = WalletVerificationService::isVerified(
    userId: 12345,
    feature: WalletVerificationService::FEATURE_LOTTERY,
    walletAddress: '0x1234...' // optional
);

// Get full verification status
$status = WalletVerificationService::getVerificationStatus(
    userId: 12345,
    feature: WalletVerificationService::FEATURE_LOTTERY // optional
);
```

## API Endpoints

### User Endpoints

#### POST `/api/wallet-verification/create`
Create a new verification request.

**Request:**
```json
{
  "feature": "lottery",
  "wallet_address": "0x1234...",
  "wallet_network": "erc20",
  "method": "standard_signature",
  "context": {
    "amount": 100.50
  }
}
```

#### POST `/api/wallet-verification/submit-signature`
Submit signature for verification.

**Request:**
```json
{
  "verification_id": 1,
  "signature": "0xabcd...",
  "wallet_address": "0x1234..."
}
```

#### GET `/api/wallet-verification/status?feature=lottery`
Get verification status for user.

#### POST `/api/wallet-verification/assisted`
Submit assisted verification data.

#### POST `/api/wallet-verification/multi-signature`
Submit multi-signature verification.

#### POST `/api/wallet-verification/time-delayed/initiate`
Initiate time-delayed verification.

#### POST `/api/wallet-verification/time-delayed/confirm`
Confirm time-delayed verification via email token.

### Admin Endpoints

#### GET `/adminZXE/wallet-verification/dashboard.php`
Get dashboard statistics and pending verifications.

#### POST `/adminZXE/wallet-verification/manual-override.php`
Manually approve/reject a verification.

**Request:**
```json
{
  "verification_id": 1,
  "reason": "Manual approval by admin"
}
```

#### GET `/adminZXE/wallet-verification/reports.php?type=summary&start_date=2024-01-01&end_date=2024-01-31`
Generate compliance and analytics reports.

## Integration Examples

### Lottery Integration

```php
// Before allowing lottery participation
if (!WalletVerificationService::isVerified($userId, WalletVerificationService::FEATURE_LOTTERY)) {
    // Create verification request
    $verification = WalletVerificationService::createVerificationRequest(
        $userId,
        WalletVerificationService::FEATURE_LOTTERY,
        $walletAddress,
        $walletNetwork
    );
    
    // Return verification required response
    return ['requires_verification' => true, 'verification' => $verification];
}
```

### Airdrop Integration

```php
// Before processing airdrop withdrawal
if (!WalletVerificationService::isVerified($userId, WalletVerificationService::FEATURE_AIRDROP, $walletAddress)) {
    throw new \Exception('Wallet verification required for airdrop withdrawals');
}
```

### AI Trader Integration

```php
// Before AI Trader withdrawal
$riskAssessment = WalletVerificationService::assessRisk(...);
if ($riskAssessment['risk_level'] === 'high') {
    // Require multi-signature or time-delayed verification
    $method = WalletVerificationService::METHOD_MULTI_SIGNATURE;
}
```

## Webhook System

The service automatically queues webhooks when verifications are completed. Configure webhook URLs in your `.env` file.

**Webhook Payload:**
```json
{
  "event": "verification_approved",
  "verification_id": 1,
  "user_id": 12345,
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "status": "approved"
  },
  "signature": "hmac-sha256-signature"
}
```

Verify webhook signatures using the `WEBHOOK_SECRET`:

```php
$signature = hash_hmac('sha256', json_encode($payload), $webhookSecret);
if ($signature !== $receivedSignature) {
    // Invalid webhook
}
```

## Cleanup Service

The cleanup service automatically removes old verification data based on retention policies:

- **Pending verifications**: 7 days
- **Rejected verifications**: 90 days
- **Expired verifications**: 30 days
- **Approved verifications**: 365 days
- **Audit logs**: 7 years (compliance requirement)
- **Verification attempts**: 90 days
- **Webhook logs**: 30 days

Run cleanup manually:
```bash
php RockyTap/cron/cleanup_wallet_verifications.php
```

Or check what would be deleted (dry run):
```php
$stats = WalletVerificationCleanupService::getCleanupStats();
```

## Security Considerations

### ⚠️ Important Security Notes

1. **Never store private keys** - The service never requires or stores private keys
2. **Encrypted storage** - All sensitive data (signatures, verification data) is encrypted
3. **Rate limiting** - All endpoints have rate limiting to prevent abuse
4. **IP anomaly detection** - Suspicious IP patterns are automatically flagged
5. **Audit logging** - All actions are logged for compliance
6. **Webhook signatures** - All webhooks are signed for verification

### Best Practices

1. Always validate wallet addresses before creating verification requests
2. Use appropriate verification methods based on risk level
3. Monitor security alerts in the admin dashboard
4. Regularly review audit logs for compliance
5. Keep encryption keys secure and rotate them periodically
6. Configure webhook endpoints with proper authentication

## Risk Assessment

The service automatically assesses risk based on:

- Verification history (first-time vs. repeat)
- Failed attempt patterns
- IP address anomalies
- Transaction amounts
- Account age
- Feature-specific factors

Risk levels:
- **Low** (0-39): Standard verification
- **Medium** (40-59): Enhanced verification may be required
- **High** (60-100): Multi-signature or time-delayed verification required

## Compliance

The service maintains comprehensive audit logs for compliance:

- All verification attempts are logged
- IP addresses and user agents are recorded
- Risk assessments are stored
- Admin actions are tracked
- Audit logs retained for 7 years

Generate compliance reports:
```bash
GET /adminZXE/wallet-verification/reports.php?type=audit
```

## Troubleshooting

### Verification Fails Immediately

- Check signature format matches network (ERC20/BEP20: 0x + 130 hex chars)
- Verify message matches exactly (including nonce)
- Check wallet address matches verification request

### Webhooks Not Sending

- Verify `WEBHOOK_URL` is configured in `.env`
- Check webhook processing cron job is running
- Review webhook logs in `wallet_verification_webhooks` table

### High Risk Scores

- Review risk factors in verification record
- Check for IP anomalies
- Review user verification history
- Consider using assisted verification for edge cases

## Support

For issues or questions:
1. Check audit logs for detailed error information
2. Review admin dashboard for pending verifications
3. Use assisted verification for users who cannot sign
4. Contact support with verification ID for manual review

## License

Part of the Ghidar platform. All rights reserved.

