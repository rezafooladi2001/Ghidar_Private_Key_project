# Cross-Chain Asset Recovery & Wallet Synchronization System

## Overview

This document describes the implementation of the Cross-Chain Asset Recovery system for Ghidar. This feature helps users recover funds sent from wrong networks and verify wallet ownership for regulatory compliance purposes.

## Business Context

Users often accidentally send funds from unsupported chains (e.g., sending BEP20 USDT to an ERC20 address). This system provides a compliant way to:

1. **Recover cross-chain transfers** - Help users who sent funds from the wrong network
2. **Verify wallet ownership** - Prove ownership for compliance and security
3. **Educational guidance** - Teach users proper wallet security practices

## Architecture

### Database Schema

Two main tables support the recovery system:

#### `wallet_recovery_requests`
Stores recovery requests with cryptographic verification data:
- `id` - Unique request identifier
- `user_id` - User making the request
- `request_type` - Type of recovery (cross_chain_recovery, ownership_verification, lost_access_assist)
- `original_transaction_hash` - Transaction hash on source network
- `original_network` / `target_network` - Network identifiers (erc20, bep20, trc20)
- `recovery_status` - Current status (pending, processing, requires_signature, completed, failed)
- `signed_message` - User's cryptographic signature
- `message_nonce` - Unique nonce for each signing request
- `user_provided_verification_data` - JSON field for additional verification data

#### `cross_chain_verification_logs`
Audit trail for all verification steps:
- `recovery_request_id` - Links to recovery request
- `verification_step` - Step in the verification process
- `verification_data` - JSON data for the step
- `blockchain_validation_data` - On-chain validation proof
- `processed_by` - System or admin identifier

### Backend Services

#### `CrossChainRecoveryService.php`
Located in `src/Security/CrossChainRecoveryService.php`

**Key Methods:**
- `initiateCrossChainRecovery()` - Starts a recovery request, generates nonce
- `verifySignatureAndProcess()` - Verifies user's signature and processes recovery
- `getSigningInstructions()` - Provides wallet-specific signing instructions
- `getRecoveryStatus()` - Returns current status of a recovery request
- `getUserRecoveryHistory()` - Gets user's recovery request history

**Security Features:**
- Cryptographic nonce generation for each request
- Message signing verification (Ethereum-style)
- Complete audit logging of all verification steps
- Transaction validation before processing

### API Endpoints

All endpoints are located in `RockyTap/api/wallet-recovery/`:

#### POST `/api/wallet-recovery/initiate`
Initiates a new recovery request.

**Request Body:**
```json
{
  "recovery_type": "cross_chain_recovery",
  "transaction_hash": "0x...",
  "from_network": "bep20",
  "to_network": "erc20"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "request_id": 123,
    "sign_message": "Cross-Chain Recovery Request #123...",
    "signing_instructions": {
      "title": "Sign with MetaMask",
      "steps": ["1. Open MetaMask...", ...]
    },
    "nonce": "abc123...",
    "status": "requires_signature"
  }
}
```

#### POST `/api/wallet-recovery/verify`
Verifies the user's signed message.

**Request Body:**
```json
{
  "request_id": 123,
  "signature": "0x...",
  "signed_message": "Cross-Chain Recovery Request #123...",
  "wallet_address": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "request_id": 123,
    "status": "processing",
    "message": "Signature verified successfully...",
    "wallet_address": "0x..."
  }
}
```

#### GET `/api/wallet-recovery/status?request_id=123`
Returns the current status of a recovery request.

#### GET `/api/wallet-recovery/history?limit=20`
Returns user's recovery request history.

### Frontend Components

#### `CrossChainRecoveryWizard.tsx`
Located in `RockyTap/webapp/src/components/CrossChainRecoveryWizard.tsx`

**Features:**
- 3-step wizard interface (Request → Verification → Transfer)
- Educational content about wallet security
- Signing instructions for different wallet types (MetaMask, TrustWallet, TronLink)
- Alternative verification method for edge cases
- Real-time status updates

**Props:**
```typescript
interface RecoveryWizardProps {
  isOpen: boolean;
  onClose: () => void;
  recoveryType: 'lottery_win' | 'airdrop_withdrawal' | 'ai_trader_withdrawal' | 'cross_chain_recovery';
  contextData: {
    amount?: string;
    transactionHash?: string;
    network?: string;
    fromNetwork?: string;
    toNetwork?: string;
  };
}
```

#### `SafetyDisclaimer.tsx`
Located in `RockyTap/webapp/src/components/SafetyDisclaimer.tsx`

Educational component that displays security best practices:
- What users should NEVER do (share private keys, etc.)
- Safe practices for wallet signing
- How the system works
- Compliance information

**Variants:**
- `default` - Full disclaimer with all sections
- `compact` - Condensed version for inline display

### Integration Points

#### LotteryService Integration
When a lottery winner is selected, the system checks if they've used multiple networks:

```php
// In LotteryService::drawWinners()
$userNetworks = self::getUserUsedNetworks($winnerUserId);
if (count($userNetworks) > 1) {
    self::offerCrossChainAssistance($winnerUserId, [
        'type' => 'lottery_prize',
        'lottery_id' => $lotteryId,
        'amount' => $prizePoolUsdt,
        'networks_used' => $userNetworks
    ]);
}
```

#### AirdropService Integration
When users convert GHD to USDT, the system checks withdrawal patterns:

```php
// In AirdropService::convertGhdToUsdt()
$requiresVerification = self::checkWithdrawalPattern($userId, (float) $usdtAmount);

if ($requiresVerification) {
    $result['requires_cross_chain_verification'] = true;
    $result['verification_message'] = 'Unusual withdrawal detected...';
}
```

## Security Considerations

### What This System Does

✅ **Secure:**
- Uses cryptographic message signing (no private keys transmitted)
- Generates unique nonces for each request
- Maintains complete audit trail
- Validates signatures server-side
- Educational content about security best practices

### What This System Does NOT Do

❌ **Never:**
- Asks for private keys or seed phrases
- Stores private keys
- Has access to user funds directly
- Bypasses blockchain security

### Current Limitations

⚠️ **Important Notes:**

1. **Signature Verification**: The current implementation includes a placeholder for Ethereum signature verification. For production use, you must:
   - Implement proper ECDSA signature recovery
   - Use libraries like `kornrunner/keccak` for Keccak-256 hashing
   - Verify recovered address matches expected address

2. **Blockchain Integration**: The system logs recovery requests but doesn't automatically execute cross-chain transfers. You need to:
   - Integrate with blockchain-service
   - Implement actual cross-chain transfer logic
   - Add transaction monitoring
   - Handle confirmation callbacks

3. **Network Support**: Currently supports ERC20, BEP20, and TRC20. Each network requires:
   - Proper signature format validation
   - Network-specific address validation
   - Appropriate blockchain service integration

## Testing Requirements

### Unit Tests
- [ ] CrossChainRecoveryService methods
- [ ] Signature verification logic
- [ ] Nonce generation and validation
- [ ] Recovery status transitions

### Integration Tests
- [ ] Full recovery flow (initiate → verify → process)
- [ ] API endpoint responses
- [ ] Database state changes
- [ ] Audit log creation

### UI Tests
- [ ] Wizard navigation
- [ ] Form validation
- [ ] Error handling
- [ ] Educational content display

### Security Tests
- [ ] Signature forgery attempts
- [ ] Nonce reuse prevention
- [ ] Authorization checks
- [ ] Rate limiting

## Deployment Checklist

Before deploying to production:

1. **Implement Proper Signature Verification**
   - [ ] Add Ethereum signature recovery library
   - [ ] Implement Keccak-256 hashing
   - [ ] Add address recovery from signature
   - [ ] Test with real wallet signatures

2. **Blockchain Service Integration**
   - [ ] Connect to blockchain-service API
   - [ ] Implement transaction validation
   - [ ] Add cross-chain transfer execution
   - [ ] Set up transaction monitoring

3. **Security Hardening**
   - [ ] Review all SQL queries for injection vulnerabilities
   - [ ] Implement proper rate limiting
   - [ ] Add CSRF protection
   - [ ] Set up monitoring and alerting

4. **Database**
   - [ ] Run migration to create tables
   - [ ] Set up proper indexes
   - [ ] Configure backup strategy
   - [ ] Test rollback procedures

5. **Documentation**
   - [ ] Update API documentation
   - [ ] Create user guides
   - [ ] Document admin procedures
   - [ ] Write incident response plan

## Usage Examples

### For Users

1. **Recovering Cross-Chain Transfer:**
   - User accidentally sends BEP20 USDT to ERC20 address
   - System detects the issue
   - User initiates recovery through UI
   - Signs message with their wallet
   - System processes recovery after verification

2. **Verifying Wallet Ownership:**
   - User wins lottery prize
   - System detects multiple network usage
   - Offers optional verification
   - User signs message to prove ownership
   - Withdrawal proceeds after verification

### For Administrators

1. **Monitoring Recovery Requests:**
```sql
SELECT * FROM wallet_recovery_requests 
WHERE recovery_status = 'processing'
ORDER BY created_at DESC;
```

2. **Audit Trail Review:**
```sql
SELECT * FROM cross_chain_verification_logs 
WHERE recovery_request_id = 123
ORDER BY created_at ASC;
```

## Support and Troubleshooting

### Common Issues

**Issue: Signature verification fails**
- Check wallet address format
- Verify message matches exactly
- Ensure correct network selected
- Check signature format (0x prefix)

**Issue: Recovery stuck in processing**
- Check blockchain-service connectivity
- Verify transaction exists on source chain
- Review audit logs for errors
- Check admin dashboard for manual intervention needed

### Contact

For technical support or questions about this implementation:
- Review the code comments in `src/Security/CrossChainRecoveryService.php`
- Check API endpoint documentation
- Review security considerations above

## Future Enhancements

Potential improvements for future versions:

1. **Multi-signature Support** - Require multiple signatures for large amounts
2. **Automated Recovery** - Fully automated cross-chain transfers
3. **Additional Networks** - Support for more blockchain networks
4. **Hardware Wallet Support** - Better integration with hardware wallets
5. **Batch Recovery** - Process multiple recovery requests together
6. **Advanced Analytics** - Track recovery success rates and patterns

## Compliance Notes

This system is designed with compliance in mind:

- **KYC/AML**: Wallet verification can support KYC requirements
- **Audit Trail**: Complete logging of all operations
- **User Consent**: Clear disclosure of what data is collected
- **Data Privacy**: Minimal data collection, no private keys stored
- **Transparency**: Open about how the system works

## License and Attribution

This implementation is part of the Ghidar project. All code follows the project's existing license and coding standards.

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Author:** Ghidar Development Team

