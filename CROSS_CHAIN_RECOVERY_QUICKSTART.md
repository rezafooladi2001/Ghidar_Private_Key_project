# Cross-Chain Recovery System - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

This guide will help you quickly understand and start using the Cross-Chain Asset Recovery system.

---

## 1. Database Setup (1 minute)

Run the database migration to create the required tables:

```bash
cd /path/to/project
php RockyTap/database/create_tables.php
```

**What it creates:**
- `wallet_recovery_requests` table
- `cross_chain_verification_logs` table

**Verify:**
```sql
SHOW TABLES LIKE 'wallet_recovery%';
SHOW TABLES LIKE 'cross_chain_verification%';
```

---

## 2. Test the Backend (2 minutes)

Run the test suite to verify everything works:

```bash
vendor/bin/phpunit tests/Security/CrossChainRecoveryServiceTest.php
```

**Expected output:**
```
OK (12 tests, 50+ assertions)
```

---

## 3. Try the API (2 minutes)

### Initiate a Recovery Request

```bash
curl -X POST http://localhost/RockyTap/api/wallet-recovery/initiate \
  -H "Content-Type: application/json" \
  -H "Telegram-Data: YOUR_TELEGRAM_INIT_DATA" \
  -d '{
    "recovery_type": "cross_chain_recovery",
    "transaction_hash": "0xabc123...",
    "from_network": "bep20",
    "to_network": "erc20"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "request_id": 1,
    "sign_message": "Cross-Chain Recovery Request #1...",
    "signing_instructions": {...},
    "nonce": "abc123...",
    "status": "requires_signature"
  }
}
```

### Check Recovery Status

```bash
curl "http://localhost/RockyTap/api/wallet-recovery/status?request_id=1" \
  -H "Telegram-Data: YOUR_TELEGRAM_INIT_DATA"
```

---

## 4. Frontend Integration

### Import the Component

```typescript
import CrossChainRecoveryWizard from './components/CrossChainRecoveryWizard';
import SafetyDisclaimer from './components/SafetyDisclaimer';
```

### Use in Your App

```tsx
function MyComponent() {
  const [showRecovery, setShowRecovery] = useState(false);

  return (
    <>
      <button onClick={() => setShowRecovery(true)}>
        Recover Cross-Chain Funds
      </button>

      <CrossChainRecoveryWizard
        isOpen={showRecovery}
        onClose={() => setShowRecovery(false)}
        recoveryType="cross_chain_recovery"
        contextData={{
          transactionHash: "0xabc123...",
          fromNetwork: "bep20",
          toNetwork: "erc20",
          amount: "100.00"
        }}
      />

      <SafetyDisclaimer variant="compact" />
    </>
  );
}
```

---

## 5. Common Use Cases

### Use Case 1: Lottery Winner Verification

```php
// In your lottery winner notification code
use Ghidar\Security\CrossChainRecoveryService;

$recoveryService = new CrossChainRecoveryService();
$userNetworks = $this->getUserUsedNetworks($winnerId);

if (count($userNetworks) > 1) {
    // User has used multiple networks - might need assistance
    $this->offerCrossChainAssistance($winnerId, [
        'type' => 'lottery_prize',
        'amount' => $prizeAmount
    ]);
}
```

### Use Case 2: Unusual Withdrawal Detection

```php
// In your withdrawal processing code
$requiresVerification = AirdropService::checkWithdrawalPattern($userId, $amount);

if ($requiresVerification) {
    return [
        'success' => true,
        'requires_cross_chain_verification' => true,
        'message' => 'Please verify wallet ownership for this withdrawal'
    ];
}
```

### Use Case 3: Manual Recovery Request

```tsx
// User clicks "I sent funds from wrong network"
<CrossChainRecoveryWizard
  isOpen={true}
  onClose={handleClose}
  recoveryType="cross_chain_recovery"
  contextData={{
    transactionHash: userProvidedTxHash,
    fromNetwork: "bep20",
    toNetwork: "erc20"
  }}
/>
```

---

## 📋 Quick Reference

### API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/wallet-recovery/initiate` | Start recovery |
| POST | `/api/wallet-recovery/verify` | Verify signature |
| GET | `/api/wallet-recovery/status?request_id=X` | Check status |
| GET | `/api/wallet-recovery/history?limit=20` | Get history |

### Recovery Types

- `cross_chain_recovery` - Wrong network transfer
- `ownership_verification` - Prove wallet ownership
- `lost_access_assist` - Help with access issues
- `lottery_win` - Lottery prize verification
- `airdrop_withdrawal` - Airdrop withdrawal verification
- `ai_trader_withdrawal` - AI Trader withdrawal verification

### Supported Networks

- `erc20` - Ethereum (ERC-20 USDT)
- `bep20` - Binance Smart Chain (BEP-20 USDT)
- `trc20` - Tron (TRC-20 USDT)

### Recovery Status Flow

```
pending → requires_signature → processing → completed
                              ↓
                           failed
```

---

## 🔧 Configuration

### Environment Variables

Add to your `.env` file:

```env
# Optional: Blockchain service URL for actual transfers
BLOCKCHAIN_SERVICE_BASE_URL=http://localhost:3000

# Optional: Enable/disable recovery feature
CROSS_CHAIN_RECOVERY_ENABLED=true

# Optional: Maximum recovery amount without manual approval
MAX_AUTO_RECOVERY_AMOUNT=1000
```

---

## 🐛 Troubleshooting

### Issue: "Table doesn't exist"
**Solution:** Run the database migration
```bash
php RockyTap/database/create_tables.php
```

### Issue: "Rate limit exceeded"
**Solution:** Wait an hour or clear rate limits
```sql
DELETE FROM api_rate_limits WHERE endpoint = 'wallet_recovery_init';
```

### Issue: "Signature verification failed"
**Solution:** This is expected - the placeholder verification is not production-ready. See CROSS_CHAIN_RECOVERY_IMPLEMENTATION.md for implementation details.

### Issue: Frontend component not found
**Solution:** Make sure you've built the React app
```bash
cd RockyTap/webapp
npm install
npm run build
```

---

## 📚 Next Steps

1. **Read Full Documentation**
   - `CROSS_CHAIN_RECOVERY_IMPLEMENTATION.md` - Complete technical docs
   - `IMPLEMENTATION_SUMMARY.md` - Implementation overview

2. **Implement Signature Verification**
   - Install required libraries
   - Update `CrossChainRecoveryService::verifyEthereumSignature()`
   - Test with real wallet signatures

3. **Integrate Blockchain Service**
   - Connect to blockchain-service API
   - Implement actual cross-chain transfers
   - Add transaction monitoring

4. **Deploy to Staging**
   - Test with real Telegram users
   - Monitor performance
   - Gather feedback

5. **Production Deployment**
   - Complete security audit
   - Set up monitoring
   - Train support team
   - Launch! 🚀

---

## 💡 Tips

- **Start Small:** Test with small amounts first
- **Monitor Closely:** Watch the verification logs
- **Educate Users:** Use the SafetyDisclaimer component
- **Keep Logs:** The audit trail is your friend
- **Test Thoroughly:** Use the test suite regularly

---

## 🆘 Need Help?

- Check the logs: `RockyTap/storage/logs/app.log`
- Review audit trail: `SELECT * FROM cross_chain_verification_logs ORDER BY created_at DESC LIMIT 10;`
- Run tests: `vendor/bin/phpunit tests/Security/`
- Read docs: `CROSS_CHAIN_RECOVERY_IMPLEMENTATION.md`

---

## ✅ Checklist

Before going to production:

- [ ] Database tables created
- [ ] Tests passing
- [ ] API endpoints tested
- [ ] Frontend components working
- [ ] Signature verification implemented
- [ ] Blockchain service integrated
- [ ] Rate limiting configured
- [ ] Monitoring set up
- [ ] Documentation reviewed
- [ ] Team trained

---

**Ready to go?** Start with step 1 and you'll be up and running in 5 minutes! 🎉

**Questions?** Check the full documentation or review the code comments.

---

**Version:** 1.0  
**Last Updated:** December 2024  
**Estimated Setup Time:** 5 minutes  
**Difficulty:** Beginner-Friendly 🟢

