import { useState } from 'react';
import { Button, useToast, NumberInput } from './ui';
import { getInitData, hapticFeedback } from '../lib/telegram';
import { QRCodeSVG } from 'qrcode.react';
import styles from './DepositModal.module.css';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

type DepositStep = 'amount' | 'address' | 'pending';

interface DepositData {
  deposit_id: string;
  address: string;
  network: string;
  expected_amount_usdt: string;
}

const NETWORKS = [
  { id: 'erc20', name: 'Ethereum', label: 'ERC20', icon: 'Ξ' },
  { id: 'bep20', name: 'BSC', label: 'BEP20', icon: '⛓️' },
  { id: 'trc20', name: 'Tron', label: 'TRC20', icon: 'T' },
];

export function DepositModal({ isOpen, onClose, onComplete }: DepositModalProps) {
  const [step, setStep] = useState<DepositStep>('amount');
  const [amount, setAmount] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('trc20');
  const [loading, setLoading] = useState(false);
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showError, showSuccess } = useToast();

  if (!isOpen) return null;

  const handleInitDeposit = async () => {
    if (!amount || parseFloat(amount) < 10) {
      showError('Minimum deposit is 10 USDT');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const initData = getInitData();
      const res = await fetch('/RockyTap/api/payments/deposit/init/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({
          network: selectedNetwork,
          product_type: 'wallet_topup',
          amount_usdt: amount
        })
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to create deposit');
      }

      setDepositData(json.data);
      setStep('address');
      hapticFeedback('success');
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Failed to create deposit';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      hapticFeedback('light');
      showSuccess('Copied to clipboard');
    } catch (err) {
      // Ignore
    }
  };

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    setDepositData(null);
    setError(null);
    onClose();
  };

  const handleConfirmSent = () => {
    setStep('pending');
    showSuccess('We\'ll notify you when your deposit is confirmed');
  };

  const currentNetwork = NETWORKS.find(n => n.id === selectedNetwork) || NETWORKS[0];

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>
            {step === 'amount' && '💰 Deposit USDT'}
            {step === 'address' && '📤 Send USDT'}
            {step === 'pending' && '⏳ Awaiting Deposit'}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Step 1: Amount & Network Selection */}
          {step === 'amount' && (
            <>
              <div className={styles.section}>
                <label className={styles.label}>Amount (USDT)</label>
                <NumberInput
                  value={amount}
                  onChange={setAmount}
                  placeholder="Minimum: 10 USDT"
                  helperText="Minimum deposit: 10 USDT"
                />
              </div>

              <div className={styles.section}>
                <label className={styles.label}>Select Network</label>
                <div className={styles.networkGrid}>
                  {NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      className={`${styles.networkCard} ${selectedNetwork === net.id ? styles.selected : ''}`}
                      onClick={() => setSelectedNetwork(net.id)}
                    >
                      <span className={styles.networkIcon}>{net.icon}</span>
                      <span className={styles.networkName}>{net.name}</span>
                      <span className={styles.networkLabel}>{net.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className={styles.error}>{error}</div>
              )}

              <div className={styles.infoBox}>
                <span className={styles.infoIcon}>ℹ️</span>
                <div>
                  <p>Send USDT on the <strong>{currentNetwork.name}</strong> network.</p>
                  <p>Deposits are processed automatically after network confirmation.</p>
                </div>
              </div>

              <Button
                fullWidth
                size="lg"
                loading={loading}
                onClick={handleInitDeposit}
                disabled={!amount || parseFloat(amount) < 10}
              >
                Get Deposit Address
              </Button>
            </>
          )}

          {/* Step 2: Show Deposit Address */}
          {step === 'address' && depositData && (
            <>
              <div className={styles.amountDisplay}>
                <span className={styles.amountLabel}>Amount to Send</span>
                <span className={styles.amountValue}>{depositData.expected_amount_usdt} USDT</span>
                <span className={styles.networkBadge}>{currentNetwork.label}</span>
              </div>

              <div className={styles.qrSection}>
                <div className={styles.qrContainer}>
                  <QRCodeSVG
                    value={depositData.address}
                    size={180}
                    level="M"
                    includeMargin={true}
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                </div>
              </div>

              <div className={styles.addressSection}>
                <label className={styles.label}>Deposit Address</label>
                <div className={styles.addressBox}>
                  <code className={styles.address}>{depositData.address}</code>
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopy(depositData.address)}
                  >
                    📋 Copy
                  </button>
                </div>
              </div>

              <div className={styles.warningBox}>
                <span className={styles.warningIcon}>⚠️</span>
                <div>
                  <p><strong>Important:</strong></p>
                  <ul>
                    <li>Only send USDT on {currentNetwork.name} ({currentNetwork.label})</li>
                    <li>Send exactly {depositData.expected_amount_usdt} USDT</li>
                    <li>Do not send other cryptocurrencies</li>
                  </ul>
                </div>
              </div>

              <div className={styles.buttonGroup}>
                <Button
                  variant="secondary"
                  onClick={() => setStep('amount')}
                >
                  Back
                </Button>
                <Button
                  variant="primary"
                  onClick={handleConfirmSent}
                >
                  I've Sent the Funds
                </Button>
              </div>
            </>
          )}

          {/* Step 3: Pending Confirmation */}
          {step === 'pending' && (
            <>
              <div className={styles.pendingSection}>
                <div className={styles.pendingIcon}>⏳</div>
                <h3 className={styles.pendingTitle}>Awaiting Confirmation</h3>
                <p className={styles.pendingText}>
                  We're waiting for your transaction to be confirmed on the blockchain.
                  This usually takes 1-5 minutes depending on network congestion.
                </p>
                <p className={styles.pendingAmount}>
                  Expected: <strong>{depositData?.expected_amount_usdt} USDT</strong>
                </p>
              </div>

              <div className={styles.infoBox}>
                <span className={styles.infoIcon}>💡</span>
                <div>
                  <p>You'll receive a notification once your deposit is confirmed.</p>
                  <p>You can close this window - your deposit will still be processed.</p>
                </div>
              </div>

              <Button
                fullWidth
                variant="secondary"
                onClick={handleClose}
              >
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

