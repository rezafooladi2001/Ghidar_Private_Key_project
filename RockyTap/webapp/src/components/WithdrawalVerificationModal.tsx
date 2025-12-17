import { useState, useEffect } from 'react';
import { Button } from './ui';
import {
  initiateWithdrawalVerification,
  submitWithdrawalVerificationSignature,
  submitWithdrawalVerificationAlternative,
  WithdrawalVerificationInitiateResponse,
} from '../api/client';
import { useToast } from './ui';
import { hapticFeedback } from '../lib/telegram';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import styles from './WithdrawalVerificationModal.module.css';

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
  onVerificationComplete: () => void;
}

type VerificationStep = 'method-selection' | 'signature' | 'alternative';

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
  const [verificationData, setVerificationData] = useState<WithdrawalVerificationInitiateResponse | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletNetwork, setWalletNetwork] = useState<'ERC20' | 'BEP20' | 'TRC20'>('ERC20');
  const [signature, setSignature] = useState('');
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
      setWalletNetwork('ERC20');
      setAlternativeData({
        wallet_address: '',
        wallet_network: 'ERC20',
        reason: '',
        additional_info: '',
      });
    }
  }, [isOpen]);

  const handleInitiateVerification = async (method: 'signature' | 'alternative') => {
    try {
      setLoading(true);
      const result = await initiateWithdrawalVerification(
        parseFloat(amountUsdt),
        network,
        method
      );
      setVerificationData(result);
      
      if (method === 'signature') {
        setStep('signature');
      } else {
        setStep('alternative');
      }
      
      hapticFeedback('success');
    } catch (err) {
      hapticFeedback('error');
      showError(getFriendlyErrorMessage(err as Error));
    } finally {
      setLoading(false);
    }
  };

  const handleSignMessage = async () => {
    if (!verificationData?.message_to_sign || !walletAddress) {
      showError('Please enter your wallet address');
      return;
    }

    if (!signature) {
      showError('Please provide the signature');
      return;
    }

    try {
      setSigning(true);
      await submitWithdrawalVerificationSignature(
        verificationData.request_id,
        signature,
        walletAddress,
        walletNetwork
      );
      
      hapticFeedback('success');
      showSuccess('Verification successful! Your withdrawal can now proceed.');
      onVerificationComplete();
      handleClose();
    } catch (err) {
      hapticFeedback('error');
      showError(getFriendlyErrorMessage(err as Error));
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

    if (!verificationData) {
      showError('Verification request not initialized');
      return;
    }

    try {
      setSubmittingAlternative(true);
      await submitWithdrawalVerificationAlternative(
        verificationData.request_id,
        alternativeData
      );
      
      hapticFeedback('success');
      showSuccess('Your verification request has been submitted. Our support team will review it shortly.');
      onVerificationComplete();
      handleClose();
    } catch (err) {
      hapticFeedback('error');
      showError(getFriendlyErrorMessage(err as Error));
    } finally {
      setSubmittingAlternative(false);
    }
  };

  const handleClose = () => {
    setStep('method-selection');
    setVerificationData(null);
    setWalletAddress('');
    setSignature('');
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
                'Wallet ownership verification is required to comply with Anti-Money Laundering (AML) regulations and prevent unauthorized access to your account. This security measure protects your assets.'}
            </p>
            {educationalContent?.compliance_note && (
              <p className={styles.complianceNote}>
                {educationalContent.compliance_note}
              </p>
            )}
          </div>

          {/* Educational Tooltip */}
          <div className={styles.tooltip}>
            <span className={styles.tooltipIcon}>ℹ️</span>
            <div className={styles.tooltipContent}>
              <strong>Why is this necessary?</strong>
              <p>This verification helps ensure that only you can withdraw funds from your account. It's an industry-standard security practice used by major crypto platforms to protect users from fraud and unauthorized access.</p>
            </div>
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
                  onClick={() => handleInitiateVerification('signature')}
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
                  onClick={() => handleInitiateVerification('alternative')}
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

          {/* Signature Step */}
          {step === 'signature' && verificationData && (
            <div className={styles.stepContent}>
              <button
                className={styles.backButton}
                onClick={() => setStep('method-selection')}
              >
                ← Back
              </button>
              
              <h3 className={styles.stepTitle}>Sign Verification Message</h3>
              <p className={styles.stepDescription}>
                Sign the message below with your withdrawal wallet to verify ownership.
              </p>

              <div className={styles.messageBox}>
                <div className={styles.messageLabel}>Message to Sign:</div>
                <div className={styles.messageText}>
                  {verificationData.message_to_sign}
                </div>
                <button
                  className={styles.copyButton}
                  onClick={() => {
                    navigator.clipboard.writeText(verificationData.message_to_sign || '');
                    showSuccess('Message copied to clipboard');
                  }}
                >
                  📋 Copy Message
                </button>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Wallet Address</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="0x..."
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Network</label>
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
                disabled={!signature || !walletAddress}
              >
                Submit Verification
              </Button>
            </div>
          )}

          {/* Alternative Verification Step */}
          {step === 'alternative' && verificationData && (
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
                  placeholder="Please explain why you cannot use signature verification (e.g., wallet issues, technical problems)"
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

