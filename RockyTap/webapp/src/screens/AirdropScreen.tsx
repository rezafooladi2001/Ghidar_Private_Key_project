import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, NumberInput, LoadingScreen, ErrorState, useToast } from '../components/ui';
import { GhidarCoin } from '../components/GhidarLogo';
import { WithdrawalVerificationModal } from '../components/WithdrawalVerificationModal';
import {
  getAirdropStatus,
  sendAirdropTaps,
  convertGhdToUsdt,
  AirdropStatusResponse,
} from '../api/client';
import { hapticFeedback } from '../lib/telegram';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import styles from './AirdropScreen.module.css';

const TAP_BATCH_SIZE = 10;
const TAP_BATCH_DELAY = 2000;

export function AirdropScreen() {
  const [status, setStatus] = useState<AirdropStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localTaps, setLocalTaps] = useState(0);
  const [localGhdEarned, setLocalGhdEarned] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertError, setConvertError] = useState<string | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [tapAnimation, setTapAnimation] = useState(false);
  const [floatingNumbers, setFloatingNumbers] = useState<{ id: number; value: number }[]>([]);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    amountUsdt: string;
    riskLevel?: 'low' | 'medium' | 'high';
    riskFactors?: string[];
    educationalContent?: any;
  } | null>(null);
  const { showError: showToastError, showSuccess } = useToast();
  
  const tapBatchRef = useRef(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatingIdRef = useRef(0);

  useEffect(() => {
    loadData();
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAirdropStatus();
      setStatus(response);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const syncTaps = useCallback(async (taps: number) => {
    if (taps <= 0) return;
    
    try {
      setSyncing(true);
      const result = await sendAirdropTaps(taps);
      
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          wallet: result.wallet,
          airdrop: {
            ...prev.airdrop,
            ghd_balance: result.wallet.ghd_balance,
          }
        };
      });
      
      setLocalTaps(0);
      setLocalGhdEarned(0);
      tapBatchRef.current = 0;
    } catch (err) {
      console.error('Failed to sync taps:', err);
    } finally {
      setSyncing(false);
    }
  }, []);

  const scheduleTapSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      if (tapBatchRef.current > 0) {
        syncTaps(tapBatchRef.current);
      }
    }, TAP_BATCH_DELAY);
  }, [syncTaps]);

  const handleTap = useCallback(() => {
    if (!status) return;
    
    hapticFeedback('light');
    
    // Trigger tap animation
    setTapAnimation(true);
    setTimeout(() => setTapAnimation(false), 100);
    
    // Add floating number
    const id = floatingIdRef.current++;
    setFloatingNumbers(prev => [...prev, { id, value: 1 }]);
    setTimeout(() => {
      setFloatingNumbers(prev => prev.filter(n => n.id !== id));
    }, 1000);
    
    const ghdPerTap = 1;
    
    setLocalTaps(prev => prev + 1);
    setLocalGhdEarned(prev => prev + ghdPerTap);
    tapBatchRef.current += 1;
    
    if (tapBatchRef.current >= TAP_BATCH_SIZE) {
      const batchToSync = tapBatchRef.current;
      tapBatchRef.current = 0;
      syncTaps(batchToSync);
    } else {
      scheduleTapSync();
    }
  }, [status, syncTaps, scheduleTapSync]);

  const handleConvert = async () => {
    setConvertError(null);
    
    if (!convertAmount || convertAmount.trim() === '') {
      setConvertError('Please enter an amount');
      showToastError('Please enter an amount');
      return;
    }

    const amount = parseFloat(convertAmount);
    if (isNaN(amount) || amount <= 0) {
      setConvertError('Please enter a valid amount greater than 0');
      showToastError('Please enter a valid amount greater than 0');
      return;
    }

    const totalGhd = parseFloat(status?.wallet.ghd_balance || '0') + localGhdEarned;
    if (amount > totalGhd) {
      const errorMsg = `Insufficient GHD balance. You have ${totalGhd.toFixed(2)} GHD available.`;
      setConvertError(errorMsg);
      showToastError(errorMsg);
      return;
    }

    try {
      setConverting(true);
      setConvertError(null);
      
      if (tapBatchRef.current > 0) {
        await syncTaps(tapBatchRef.current);
      }
      
      const result = await convertGhdToUsdt(amount);
      
      // Check if verification is required
      if ((result as any).requires_withdrawal_verification) {
        setVerificationData({
          amountUsdt: result.received_usdt,
          riskLevel: (result as any).risk_level,
          riskFactors: (result as any).risk_factors || [],
          educationalContent: (result as any).educational_content,
        });
        setShowVerificationModal(true);
        hapticFeedback('warning');
      } else {
        hapticFeedback('success');
        setStatus(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            wallet: result.wallet,
            airdrop: {
              ...prev.airdrop,
              ghd_balance: result.wallet.ghd_balance,
              estimated_usdt_from_ghd: (
                parseFloat(result.wallet.ghd_balance) / prev.airdrop.ghd_per_usdt
              ).toFixed(8),
            }
          };
        });
        
        setConvertAmount('');
        setShowConvert(false);
        showSuccess(`Converted ${result.converted_ghd} GHD to $${parseFloat(result.received_usdt).toFixed(4)} USDT`);
      }
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setConvertError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setConverting(false);
    }
  };

  const handleConvertAll = () => {
    const totalGhd = parseFloat(status?.wallet.ghd_balance || '0') + localGhdEarned;
    setConvertAmount(totalGhd.toString());
  };

  if (loading) {
    return <LoadingScreen message="Loading airdrop..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const totalGhd = parseFloat(status?.wallet.ghd_balance || '0') + localGhdEarned;
  const estimatedUsdt = totalGhd / (status?.airdrop.ghd_per_usdt || 1000);

  return (
    <div className={styles.container}>
      {/* Balance Card */}
      <Card variant="glow">
        <CardContent>
          <div className={styles.balanceSection}>
            <span className={styles.balanceLabel}>Your GHD Balance</span>
            <div className={styles.balanceValue}>
              <span className={styles.ghdAmount}>{totalGhd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className={styles.ghdSymbol}>GHD</span>
            </div>
            <span className={styles.usdtEstimate}>≈ ${estimatedUsdt.toFixed(4)} USDT</span>
            {localGhdEarned > 0 && (
              <span className={styles.pendingTaps}>
                +{localGhdEarned} pending {syncing && '(syncing...)'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tapping Area */}
      <div className={styles.tapSection}>
        <div className={styles.tapHeader}>
          <h2 className={styles.tapTitle}>Tap to Mine</h2>
          <p className={styles.tapSubtitle}>Earn 1 GHD per tap</p>
        </div>
        
        <div className={styles.tapButtonWrapper}>
          <button 
            className={`${styles.tapButton} ${tapAnimation ? styles.tapping : ''}`} 
            onClick={handleTap}
          >
            <GhidarCoin size={100} animate />
            <div className={styles.tapRipple} />
          </button>
          
          {/* Floating numbers */}
          {floatingNumbers.map(num => (
            <span key={num.id} className={styles.floatingNumber}>+{num.value}</span>
          ))}
        </div>
        
        <div className={styles.tapStats}>
          <div className={styles.tapStat}>
            <span className={styles.tapStatValue}>{localTaps}</span>
            <span className={styles.tapStatLabel}>Taps this session</span>
          </div>
        </div>
      </div>

      {/* Convert Section */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Convert to USDT</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.convertInfo}>
            <div className={styles.convertRate}>
              <span className={styles.rateLabel}>Exchange Rate</span>
              <span className={styles.rateValue}>
                {status?.airdrop.ghd_per_usdt.toLocaleString()} GHD = 1 USDT
              </span>
            </div>
          </div>

          {showConvert ? (
            <div className={styles.convertForm}>
              <NumberInput
                label="GHD Amount"
                value={convertAmount}
                onChange={(val) => {
                  setConvertAmount(val);
                  setConvertError(null);
                }}
                placeholder="Enter amount"
                error={convertError || undefined}
                rightElement={
                  <button className={styles.maxButton} onClick={handleConvertAll}>
                    MAX
                  </button>
                }
              />
              
              {convertAmount && !convertError && (
                <div className={styles.convertPreview}>
                  You will receive: <strong>${(parseFloat(convertAmount) / (status?.airdrop.ghd_per_usdt || 1000)).toFixed(4)} USDT</strong>
                </div>
              )}
              
              <div className={styles.convertActions}>
                <Button variant="secondary" onClick={() => {
                  setShowConvert(false);
                  setConvertAmount('');
                  setConvertError(null);
                }}>
                  Cancel
                </Button>
                <Button loading={converting} onClick={handleConvert}>
                  Convert
                </Button>
              </div>
            </div>
          ) : (
            <Button fullWidth onClick={() => setShowConvert(true)}>
              Convert GHD
            </Button>
          )}
        </CardContent>
      </Card>

      {/* USDT Balance */}
      <Card>
        <CardContent>
          <div className={styles.usdtBalance}>
            <span className={styles.usdtLabel}>Wallet Balance</span>
            <span className={styles.usdtValue}>
              ${parseFloat(status?.wallet.usdt_balance || '0').toFixed(2)} USDT
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Verification Modal */}
      {verificationData && (
        <WithdrawalVerificationModal
          isOpen={showVerificationModal}
          onClose={() => {
            setShowVerificationModal(false);
            setVerificationData(null);
          }}
          amountUsdt={verificationData.amountUsdt}
          network="internal"
          riskLevel={verificationData.riskLevel}
          riskFactors={verificationData.riskFactors}
          educationalContent={verificationData.educationalContent}
          onVerificationComplete={async () => {
            // Reload status after verification
            await loadData();
            setShowVerificationModal(false);
            setVerificationData(null);
            showSuccess('Verification completed successfully!');
          }}
        />
      )}
    </div>
  );
}
