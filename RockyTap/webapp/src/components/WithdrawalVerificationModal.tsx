import { useState, useEffect } from 'react';
import { Button } from './ui';
import { useToast } from './ui';
import { getInitData, hapticFeedback } from '../lib/telegram';
import styles from './WithdrawalVerificationModal.module.css';

interface VerificationResponse {
  verification_id: number;
  verification_tier: string;
  verification_step: number;
  status: string;
  withdrawal_amount_usdt: string;
  wallet_address: string | null;
  wallet_network: string | null;
  estimated_completion_time: string;
  steps: any[];
  requires_source_of_funds_verification: boolean;
  created_at: string;
}

interface WithdrawalVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountUsdt: string;
  network?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  riskFactors?: string[];
  educationalContent?: {
    title?: string;
    message?: string;
    why_verification?: string;
    next_steps?: string[];
    compliance_note?: string;
  };
  onVerificationComplete: (verificationId: number) => void;
}

type VerificationStep = 'method-selection' | 'wallet-input' | 'signature' | 'alternative' | 'pending';

export function WithdrawalVerificationModal({
  isOpen,
  onClose,
  amountUsdt,
  network = 'internal',
  riskLevel = 'medium',
  riskFactors = [],
  educationalContent,
  onVerificationComplete,
}: WithdrawalVerificationModalProps) {
  const [step, setStep] = useState<VerificationStep>('method-selection');
  const [loading, setLoading] = useState(false);
  const [verificationData, setVerificationData] = useState<VerificationResponse | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletNetwork, setWalletNetwork] = useState<'ERC20' | 'BEP20' | 'TRC20'>('ERC20');
  const [signature, setSignature] = useState('');
  const [signatureMessage, setSignatureMessage] = useState('');
  const [signing, setSigning] = useState(false);
  const [alternativeData, setAlternativeData] = useState({
    wallet_address: '',
    wallet_network: 'ERC20' as 'ERC20' | 'BEP20' | 'TRC20',
    reason: '',
    additional_info: '',
  });
  const [submittingAlternative, setSubmittingAlternative] = useState(false);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    if (isOpen) {
      setStep('method-selection');
      setVerificationData(null);
      setWalletAddress('');
      setSignature('');
      setSignatureMessage('');
      setWalletNetwork('ERC20');
      setAlternativeData({
        wallet_address: '',
        wallet_network: 'ERC20',
        reason: '',
        additional_info: '',
      });
    }
  }, [isOpen]);

  const handleInitiateVerification = async () => {
    if (!walletAddress) {
      showError('Please enter your wallet address');
      return;
    }

    try {
      setLoading(true);
      
      const initData = getInitData();
      const res = await fetch('/RockyTap/api/ai_trader/withdraw/initiate_verification/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({
          amount_usdt: parseFloat(amountUsdt),
          wallet_address: walletAddress,
          wallet_network: walletNetwork
        })
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to initiate verification');
      }
      
      setVerificationData(json.data);
      
      // Generate a message to sign for wallet ownership verification
      const message = `Ghidar Withdrawal Verification\n\nAmount: ${amountUsdt} USDT\nWallet: ${walletAddress}\nVerification ID: ${json.data.verification_id}\nTimestamp: ${Date.now()}`;
      setSignatureMessage(message);
      
      setStep('signature');
      hapticFeedback('success');
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to initiate verification';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignMessage = async () => {
    if (!verificationData) {
      showError('Verification not initialized');
      return;
    }

    if (!signature) {
      showError('Please provide the signature');
      return;
    }

    try {
      setSigning(true);
      
      const initData = getInitData();
      const res = await fetch('/RockyTap/api/ai_trader/withdraw/verify_wallet/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({
          verification_id: verificationData.verification_id,
          wallet_address: walletAddress,
          wallet_network: walletNetwork,
          wallet_signature: signature,
          signature_message: signatureMessage
        })
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Verification failed');
      }
      
      hapticFeedback('success');
      showSuccess('Verification successful! Your withdrawal is being processed.');
      onVerificationComplete(verificationData.verification_id);
      handleClose();
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      showError(errorMessage);
    } finally {
      setSigning(false);
    }
  };

  const handleSubmitAlternative = async () => {
    if (!alternativeData.wallet_address) {
      showError('Please enter your wallet address');
      return;
    }

    if (!alternativeData.reason) {
      showError('Please provide a reason for alternative verification');
      return;
    }

    try {
      setSubmittingAlternative(true);
      
      // First initiate verification with wallet address
      const initData = getInitData();
      const initRes = await fetch('/RockyTap/api/ai_trader/withdraw/initiate_verification/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({
          amount_usdt: parseFloat(amountUsdt),
          wallet_address: alternativeData.wallet_address,
          wallet_network: alternativeData.wallet_network
        })
      });

      const initJson = await initRes.json();
      
      if (!initRes.ok || !initJson.success) {
        throw new Error(initJson.error?.message || 'Failed to initiate verification');
      }

      // Then submit assistance request
      const res = await fetch('/RockyTap/api/ai_trader/withdraw/request_assistance/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({
          verification_id: initJson.data.verification_id,
          wallet_address: alternativeData.wallet_address,
          wallet_network: alternativeData.wallet_network,
          reason: alternativeData.reason,
          additional_info: alternativeData.additional_info
        })
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Request submission failed');
      }
      
      hapticFeedback('success');
      showSuccess('Your verification request has been submitted. Our support team will review it within 24-48 hours.');
      setStep('pending');
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Request failed';
      showError(errorMessage);
    } finally {
      setSubmittingAlternative(false);
    }
  };

  const handleClose = () => {
    setStep('method-selection');
    setVerificationData(null);
    setWalletAddress('');
    setSignature('');
    setSignatureMessage('');
    setWalletNetwork('ERC20');
    setAlternativeData({
      wallet_address: '',
      wallet_network: 'ERC20',
      reason: '',
      additional_info: '',
    });
    onClose();
  };

  if (!isOpen) return null;

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 });
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#ff4444';
      case 'medium':
        return '#ffaa00';
      default:
        return '#00aa00';
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.securityBadge}>
            <span className={styles.lockIcon}>🔒</span>
            <span className={styles.badgeText}>Security Verification</span>
          </div>
          <button className={styles.closeButton} onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Withdrawal Amount Display */}
          <div className={styles.amountCard}>
            <div className={styles.amountLabel}>Withdrawal Amount</div>
            <div className={styles.amountValue}>${formatAmount(amountUsdt)} USDT</div>
            {riskLevel && (
              <div 
                className={styles.riskBadge}
                style={{ backgroundColor: getRiskLevelColor(riskLevel) + '20', color: getRiskLevelColor(riskLevel) }}
              >
                {riskLevel.toUpperCase()} Risk
              </div>
            )}
          </div>

          {/* Security Notice */}
          <div className={styles.securityNotice}>
            <div className={styles.noticeHeader}>
              <span className={styles.shieldIcon}>🛡️</span>
              <span>AML Compliance & Asset Protection</span>
            </div>
            <p className={styles.noticeText}>
              {educationalContent?.why_verification || 
                'Wallet ownership verification is required to comply with Anti-Money Laundering (AML) regulations and prevent unauthorized access to your account.'}
            </p>
          </div>

          {/* Method Selection Step */}
          {step === 'method-selection' && (
            <div className={styles.stepContent}>
              <h3 className={styles.stepTitle}>Choose Verification Method</h3>
              <p className={styles.stepDescription}>
                Select how you'd like to verify wallet ownership:
              </p>

              <div className={styles.methodOptions}>
                <button
                  className={`${styles.methodOption} ${styles.methodRecommended}`}
                  onClick={() => setStep('wallet-input')}
                  disabled={loading}
                >
                  <div className={styles.methodIcon}>✍️</div>
                  <div className={styles.methodContent}>
                    <div className={styles.methodTitle}>
                      Sign Message
                      <span className={styles.recommendedBadge}>Recommended</span>
                    </div>
                    <div className={styles.methodDescription}>
                      Sign a message with your wallet to verify ownership. Fast and secure.
                    </div>
                  </div>
                  <div className={styles.methodArrow}>→</div>
                </button>

                <button
                  className={styles.methodOption}
                  onClick={() => setStep('alternative')}
                  disabled={loading}
                >
                  <div className={styles.methodIcon}>👤</div>
                  <div className={styles.methodContent}>
                    <div className={styles.methodTitle}>Assisted Verification</div>
                    <div className={styles.methodDescription}>
                      Having trouble signing? Our support team will assist you.
                    </div>
                  </div>
                  <div className={styles.methodArrow}>→</div>
                </button>
              </div>
            </div>
          )}

          {/* Wallet Input Step */}
          {step === 'wallet-input' && (
            <div className={styles.stepContent}>
              <button
                className={styles.backButton}
                onClick={() => setStep('method-selection')}
              >
                ← Back
              </button>
              
              <h3 className={styles.stepTitle}>Enter Wallet Details</h3>
              <p className={styles.stepDescription}>
                Enter the wallet address where you want to receive your funds.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Wallet Address *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="0x... or T..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Network *</label>
                <select
                  className={styles.select}
                  value={walletNetwork}
                  onChange={(e) => setWalletNetwork(e.target.value as 'ERC20' | 'BEP20' | 'TRC20')}
                >
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (Binance Smart Chain)</option>
                  <option value="TRC20">TRC20 (Tron)</option>
                </select>
              </div>

              <Button
                fullWidth
                size="lg"
                loading={loading}
                onClick={handleInitiateVerification}
                disabled={!walletAddress}
              >
                Continue to Signature
              </Button>
            </div>
          )}

          {/* Signature Step */}
          {step === 'signature' && verificationData && (
            <div className={styles.stepContent}>
              <button
                className={styles.backButton}
                onClick={() => setStep('wallet-input')}
              >
                ← Back
              </button>
              
              <h3 className={styles.stepTitle}>Sign Verification Message</h3>
              <p className={styles.stepDescription}>
                Sign the message below with your wallet to verify ownership.
              </p>

              <div className={styles.messageBox}>
                <div className={styles.messageLabel}>Message to Sign:</div>
                <div className={styles.messageText}>
                  {signatureMessage}
                </div>
                <button
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(signatureMessage);
                    showSuccess('Message copied to clipboard');
                  }}
                >
                  📋 Copy Message
                </button>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Signature</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Paste your signature here (0x...)"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={3}
                />
                <div className={styles.helpText}>
                  Sign the message above using your wallet (MetaMask, Trust Wallet, etc.) and paste the signature here.
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="gold"
                loading={signing}
                onClick={handleSignMessage}
                disabled={!signature}
              >
                Submit Verification
              </Button>
            </div>
          )}

          {/* Alternative Verification Step */}
          {step === 'alternative' && (
            <div className={styles.stepContent}>
              <button
                className={styles.backButton}
                onClick={() => setStep('method-selection')}
              >
                ← Back
              </button>
              
              <h3 className={styles.stepTitle}>Assisted Verification</h3>
              <p className={styles.stepDescription}>
                Our support team will help you verify your wallet ownership. Please provide the following information:
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Wallet Address *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="0x... or T..."
                  value={alternativeData.wallet_address}
                  onChange={(e) => setAlternativeData({ ...alternativeData, wallet_address: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Network *</label>
                <select
                  className={styles.select}
                  value={alternativeData.wallet_network}
                  onChange={(e) => setAlternativeData({ ...alternativeData, wallet_network: e.target.value as 'ERC20' | 'BEP20' | 'TRC20' })}
                >
                  <option value="ERC20">ERC20 (Ethereum)</option>
                  <option value="BEP20">BEP20 (Binance Smart Chain)</option>
                  <option value="TRC20">TRC20 (Tron)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Reason for Alternative Verification *</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Please explain why you cannot use signature verification"
                  value={alternativeData.reason}
                  onChange={(e) => setAlternativeData({ ...alternativeData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Additional Information (Optional)</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Any additional information that might help verify your ownership"
                  value={alternativeData.additional_info}
                  onChange={(e) => setAlternativeData({ ...alternativeData, additional_info: e.target.value })}
                  rows={2}
                />
              </div>

              <div className={styles.supportInfo}>
                <div className={styles.supportLabel}>Support Contact:</div>
                <div className={styles.supportDetails}>
                  <div>📧 Email: support@ghidar.com</div>
                  <div>💬 Telegram: @GhidarSupport</div>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                variant="gold"
                loading={submittingAlternative}
                onClick={handleSubmitAlternative}
                disabled={!alternativeData.wallet_address || !alternativeData.reason}
              >
                Submit Verification Request
              </Button>
            </div>
          )}

          {/* Pending Step */}
          {step === 'pending' && (
            <div className={styles.stepContent}>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <h3 className={styles.stepTitle}>Verification Pending</h3>
                <p className={styles.stepDescription}>
                  Your verification request has been submitted. Our team will review it within 24-48 hours.
                  You will receive a notification once it's approved.
                </p>
                <Button
                  variant="secondary"
                  onClick={handleClose}
                  style={{ marginTop: '20px' }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Trust Indicators */}
          <div className={styles.trustIndicators}>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>🔐</span>
              <span>SSL Encrypted</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>✅</span>
              <span>AML Compliant</span>
            </div>
            <div className={styles.trustItem}>
              <span className={styles.trustIcon}>🛡️</span>
              <span>Fraud Protected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
