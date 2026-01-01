import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, NumberInput, LoadingScreen, ErrorState, useToast, PullToRefresh, HelpTooltip } from '../components/ui';
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

// Optimized constants for high-speed tapping
const TAP_BATCH_SIZE = 50; // Increased batch size
const TAP_SYNC_INTERVAL = 3000; // Sync every 3 seconds
const MAX_FLOATING_NUMBERS = 8; // Limit floating numbers
const HAPTIC_THROTTLE_MS = 50; // Minimum time between haptic feedback

export function AirdropScreen() {
  const [status, setStatus] = useState<AirdropStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');
  const [convertError, setConvertError] = useState<string | null>(null);
  const [showConvert, setShowConvert] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationData, setVerificationData] = useState<{
    amountUsdt: string;
    riskLevel?: 'low' | 'medium' | 'high';
    riskFactors?: string[];
    educationalContent?: any;
  } | null>(null);
  const { showError: showToastError, showSuccess } = useToast();
  
  // Use refs for values that change frequently but don't need to trigger re-renders
  const tapCountRef = useRef(0);
  const pendingTapsRef = useRef(0);
  const localGhdRef = useRef(0);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHapticRef = useRef(0);
  const floatingNumbersRef = useRef<{ id: number; x: number; y: number }[]>([]);
  const floatingIdRef = useRef(0);
  const tapButtonRef = useRef<HTMLButtonElement>(null);
  const floatingContainerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLSpanElement>(null);
  const pendingDisplayRef = useRef<HTMLSpanElement>(null);
  const isSyncingRef = useRef(false);
  
  // Force update trigger for periodic display updates
  const [displayTrigger, setDisplayTrigger] = useState(0);

  useEffect(() => {
    loadData();
    
    // Periodic display update for tap counts (every 500ms)
    const displayInterval = setInterval(() => {
      setDisplayTrigger(prev => prev + 1);
    }, 500);
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      clearInterval(displayInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAirdropStatus();
      setStatus(response);
      // Reset local counters
      tapCountRef.current = 0;
      pendingTapsRef.current = 0;
      localGhdRef.current = 0;
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const syncTaps = useCallback(async () => {
    const tapsToSync = pendingTapsRef.current;
    if (tapsToSync <= 0 || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    setSyncing(true);
    
    try {
      const result = await sendAirdropTaps(tapsToSync);
      
      // Only subtract synced taps
      pendingTapsRef.current = Math.max(0, pendingTapsRef.current - tapsToSync);
      localGhdRef.current = pendingTapsRef.current; // Remaining unsynced
      
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
    } catch (err) {
      console.error('Failed to sync taps:', err);
    } finally {
      isSyncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  const scheduleTapSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncTaps();
    }, TAP_SYNC_INTERVAL);
  }, [syncTaps]);

  // Optimized floating number creation using DOM manipulation
  const createFloatingNumber = useCallback((x: number, y: number) => {
    if (!floatingContainerRef.current) return;
    
    const container = floatingContainerRef.current;
    
    // Remove oldest if too many
    while (container.children.length >= MAX_FLOATING_NUMBERS) {
      container.removeChild(container.firstChild!);
    }
    
    const span = document.createElement('span');
    span.className = styles.floatingNumber;
    span.textContent = '+1';
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    container.appendChild(span);
    
    // Remove after animation
    setTimeout(() => {
      if (span.parentNode) {
        span.parentNode.removeChild(span);
      }
    }, 800);
  }, []);

  // Optimized tap handler with throttled haptics and minimal state updates
  const handleTap = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!status) return;
    
    // Get tap position for floating number
    let x = 0, y = 0;
    if ('touches' in event && event.touches.length > 0) {
      const touch = event.touches[0];
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      x = touch.clientX - rect.left;
      y = touch.clientY - rect.top;
    } else if ('clientX' in event) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
    }
    
    // Throttled haptic feedback
    const now = Date.now();
    if (now - lastHapticRef.current >= HAPTIC_THROTTLE_MS) {
      hapticFeedback('light');
      lastHapticRef.current = now;
    }
    
    // Update counters (no state updates here!)
    tapCountRef.current += 1;
    pendingTapsRef.current += 1;
    localGhdRef.current += 1;
    
    // Create floating number using DOM (avoids React re-render)
    createFloatingNumber(x, y);
    
    // Add visual tap effect using CSS class
    if (tapButtonRef.current) {
      tapButtonRef.current.classList.add(styles.tapping);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          tapButtonRef.current?.classList.remove(styles.tapping);
        });
      });
    }
    
    // Update display directly (no React state)
    if (displayRef.current) {
      displayRef.current.textContent = tapCountRef.current.toString();
    }
    if (pendingDisplayRef.current && localGhdRef.current > 0) {
      pendingDisplayRef.current.textContent = `+${localGhdRef.current} pending ${isSyncingRef.current ? '(syncing...)' : ''}`;
      pendingDisplayRef.current.style.display = 'block';
    }
    
    // Check if we should sync
    if (pendingTapsRef.current >= TAP_BATCH_SIZE) {
      syncTaps();
    } else {
      scheduleTapSync();
    }
  }, [status, syncTaps, scheduleTapSync, createFloatingNumber]);

  // Handle touch events for multi-touch support
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault(); // Prevent double-tap zoom
    
    // Process each touch point
    for (let i = 0; i < event.touches.length; i++) {
      handleTap(event);
    }
  }, [handleTap]);

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

    const totalGhd = parseFloat(status?.wallet.ghd_balance || '0') + localGhdRef.current;
    if (amount > totalGhd) {
      const errorMsg = `Insufficient GHD balance. You have ${totalGhd.toFixed(2)} GHD available.`;
      setConvertError(errorMsg);
      showToastError(errorMsg);
      return;
    }

    try {
      setConverting(true);
      setConvertError(null);
      
      // Sync any pending taps first
      if (pendingTapsRef.current > 0) {
        await syncTaps();
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
    const totalGhd = parseFloat(status?.wallet.ghd_balance || '0') + localGhdRef.current;
    setConvertAmount(totalGhd.toString());
  };

  // Memoized display values (updated by displayTrigger)
  const displayValues = useMemo(() => {
    const totalGhd = parseFloat(status?.wallet.ghd_balance || '0') + localGhdRef.current;
    const estimatedUsdt = totalGhd / (status?.airdrop.ghd_per_usdt || 1000);
    return { totalGhd, estimatedUsdt };
  }, [status, displayTrigger]);

  if (loading) {
    return <LoadingScreen message="Loading airdrop..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className={styles.container}>
        {/* Balance Card */}
        <Card variant="glow">
        <CardContent>
          <div className={styles.balanceSection}>
            <span className={styles.balanceLabel}>Your GHD Balance</span>
            <div className={styles.balanceValue}>
              <span className={styles.ghdAmount}>{displayValues.totalGhd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className={styles.ghdSymbol}>GHD</span>
            </div>
            <span className={styles.usdtEstimate}>≈ ${displayValues.estimatedUsdt.toFixed(4)} USDT</span>
            <span 
              ref={pendingDisplayRef}
              className={styles.pendingTaps}
              style={{ display: localGhdRef.current > 0 ? 'block' : 'none' }}
            >
              +{localGhdRef.current} pending {syncing && '(syncing...)'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Tapping Area */}
      <div className={styles.tapSection}>
        <div className={styles.tapHeader}>
          <h2 className={styles.tapTitle}>Tap to Mine</h2>
          <p className={styles.tapSubtitle}>Earn 1 GHD per tap • Tap fast!</p>
        </div>
        
        <div className={styles.tapButtonWrapper}>
          <button 
            ref={tapButtonRef}
            className={styles.tapButton}
            onClick={handleTap}
            onTouchStart={handleTouchStart}
            onTouchMove={(e) => e.preventDefault()}
          >
            <GhidarCoin size={100} animate />
            <div className={styles.tapRipple} />
          </button>
          
          {/* Floating numbers container - managed via DOM */}
          <div ref={floatingContainerRef} className={styles.floatingContainer} />
        </div>
        
        <div className={styles.tapStats}>
          <div className={styles.tapStat}>
            <span ref={displayRef} className={styles.tapStatValue}>0</span>
            <span className={styles.tapStatLabel}>Taps this session</span>
          </div>
        </div>
      </div>

      {/* Convert Section */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>
            Convert to USDT
            <HelpTooltip content="Convert your mined GHD tokens to USDT at the current exchange rate. USDT can be withdrawn to your external wallet." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.convertInfo}>
            <div className={styles.convertRate}>
              <span className={styles.rateLabel}>
                Exchange Rate
                <HelpTooltip content="This rate determines how many GHD tokens equal 1 USDT. The rate may change based on market conditions." />
              </span>
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
    </PullToRefresh>
  );
}
