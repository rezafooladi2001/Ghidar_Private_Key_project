import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, NumberInput, ErrorState, EmptyState, useToast, PullToRefresh, HelpTooltip } from '../components/ui';
import { WalletSummary } from '../components/WalletSummary';
import { TraderIcon, ArrowUpIcon, ArrowDownIcon } from '../components/Icons';
import { GhidarLogo } from '../components/GhidarLogo';
import { getInitData, hapticFeedback } from '../lib/telegram';
import { WithdrawalVerificationModal } from '../components/WithdrawalVerificationModal';
import styles from './AITraderScreen.module.css';

// Types for AI Trader data
interface AiTraderSummary {
  total_deposited_usdt: string;
  current_balance_usdt: string;
  realized_pnl_usdt: string;
}

interface WalletData {
  usdt_balance: string;
  ghd_balance: string;
}

interface AiTraderStatusResponse {
  user: any;
  wallet: WalletData;
  ai_trader: AiTraderSummary;
}

interface AiTraderHistoryItem {
  id: number;
  time: string;
  balance: string;
  pnl: string;
}

type ActionType = 'deposit' | 'withdraw' | null;

// Simple loading component
function SimpleLoading({ message }: { message: string }) {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100%',
      minHeight: '300px',
      padding: '20px'
    }}>
      <GhidarLogo size="lg" animate />
      <p style={{ color: '#94a3b8', marginTop: '20px' }}>{message}</p>
    </div>
  );
}

export function AITraderScreen() {
  const [status, setStatus] = useState<AiTraderStatusResponse | null>(null);
  const [history, setHistory] = useState<AiTraderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [amount, setAmount] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const { showError: showToastError, showSuccess } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('[AITrader] Loading data...');
    try {
      setLoading(true);
      setError(null);
      
      const initData = getInitData();
      console.log('[AITrader] initData length:', initData?.length || 0);

      // Fetch status
      const statusRes = await fetch('/RockyTap/api/ai_trader/status/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        }
      });

      console.log('[AITrader] Status response:', statusRes.status);
      const statusJson = await statusRes.json();

      if (!statusRes.ok || !statusJson.success) {
        throw new Error(statusJson.error?.message || 'Failed to load AI Trader status');
      }

      setStatus(statusJson.data);

      // Fetch history
      const historyRes = await fetch('/RockyTap/api/ai_trader/history/?limit=30', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        }
      });

      const historyJson = await historyRes.json();
      if (historyRes.ok && historyJson.success) {
        setHistory(historyJson.data?.snapshots || []);
      }

    } catch (err) {
      console.error('[AITrader] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    setAmountError(null);
    
    if (!amount || amount.trim() === '') {
      setAmountError('Please enter an amount');
      showToastError('Please enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAmountError('Please enter a valid amount greater than 0');
      showToastError('Please enter a valid amount greater than 0');
      return;
    }

    const walletBalance = parseFloat(status?.wallet.usdt_balance || '0');
    if (amountNum > walletBalance) {
      const errorMsg = `Insufficient wallet balance. You have $${walletBalance.toFixed(2)} USDT available.`;
      setAmountError(errorMsg);
      showToastError(errorMsg);
      return;
    }

    if (amountNum < 100) {
      setAmountError('Minimum deposit is 100 USDT');
      showToastError('Minimum deposit is 100 USDT');
      return;
    }

    try {
      setActionLoading(true);
      
      const initData = getInitData();
      const res = await fetch('/RockyTap/api/ai_trader/deposit/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({ amount_usdt: amount })
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Deposit failed');
      }

      hapticFeedback('success');
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          wallet: json.data.wallet,
          ai_trader: json.data.ai_trader,
        };
      });
      showSuccess(`Deposited $${parseFloat(json.data.amount_usdt).toFixed(2)} to AI Trader`);
      
      setAmount('');
      setActiveAction(null);
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Deposit failed';
      setAmountError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawRequest = () => {
    setAmountError(null);
    
    if (!amount || amount.trim() === '') {
      setAmountError('Please enter an amount');
      showToastError('Please enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setAmountError('Please enter a valid amount greater than 0');
      showToastError('Please enter a valid amount greater than 0');
      return;
    }

    const aiBalance = parseFloat(status?.ai_trader.current_balance_usdt || '0');
    if (amountNum > aiBalance) {
      const errorMsg = `Insufficient AI Trader balance. You have $${aiBalance.toFixed(2)} USDT available.`;
      setAmountError(errorMsg);
      showToastError(errorMsg);
      return;
    }

    // Open verification modal
    setWithdrawAmount(amount);
    setShowVerificationModal(true);
  };

  const handleWithdrawalComplete = async (verificationId: number) => {
    // Withdrawal verified - now execute it with verification_id
    try {
      setActionLoading(true);
      
      const initData = getInitData();
      const res = await fetch('/RockyTap/api/ai_trader/withdraw/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        },
        body: JSON.stringify({ 
          amount_usdt: withdrawAmount,
          verification_id: verificationId
        })
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Withdrawal failed');
      }

      hapticFeedback('success');
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          wallet: json.data.wallet,
          ai_trader: json.data.ai_trader,
        };
      });
      showSuccess(`Withdrew $${parseFloat(json.data.amount_usdt).toFixed(2)} to wallet`);
      
      setAmount('');
      setWithdrawAmount('');
      setActiveAction(null);
      setShowVerificationModal(false);
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal failed';
      showToastError(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAction = async () => {
    if (activeAction === 'deposit') {
      await handleDeposit();
    } else if (activeAction === 'withdraw') {
      handleWithdrawRequest();
    }
  };

  const handleMaxAmount = () => {
    if (activeAction === 'deposit') {
      setAmount(status?.wallet.usdt_balance || '0');
    } else {
      setAmount(status?.ai_trader.current_balance_usdt || '0');
    }
  };

  if (loading) {
    return <SimpleLoading message="Loading AI Trader..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const formatAmount = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const pnl = parseFloat(status?.ai_trader.realized_pnl_usdt || '0');
  const pnlPositive = pnl >= 0;
  const currentBalance = parseFloat(status?.ai_trader.current_balance_usdt || '0');
  const totalDeposited = parseFloat(status?.ai_trader.total_deposited_usdt || '0');

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className={styles.container}>
        {/* AI Trading Info Banner */}
        <div className={styles.infoBanner}>
          <span className={styles.infoIcon}>🤖</span>
          <div className={styles.infoText}>
            <strong>AI-Powered Trading</strong>
            <p>Our advanced AI algorithms work to generate returns on your deposits.</p>
          </div>
        </div>

        {/* Wallet Summary */}
        {status?.wallet && (
          <WalletSummary
            usdtBalance={status.wallet.usdt_balance}
            ghdBalance={status.wallet.ghd_balance}
          />
        )}

        {/* AI Trader Summary */}
        <Card variant="glow">
          <CardHeader>
            <CardTitle>
              <TraderIcon size={20} color="var(--brand-primary)" />
              AI Trader Account
              <HelpTooltip content="Deposit USDT and let our AI algorithms trade on your behalf. Track your performance and withdraw anytime." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.aiSummary}>
              <div className={styles.mainBalance}>
                <span className={styles.mainLabel}>Current Balance</span>
                <span className={styles.mainValue}>${formatAmount(status?.ai_trader.current_balance_usdt || '0')}</span>
              </div>
              
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>
                    Total Deposited
                    <HelpTooltip content="The total amount you've deposited into your AI Trader account." />
                  </span>
                  <span className={styles.statValue}>${formatAmount(status?.ai_trader.total_deposited_usdt || '0')}</span>
                </div>
                <div className={styles.statDivider} />
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>
                    Total P&L
                    <HelpTooltip content="Your total Profit and Loss from AI trading activities." />
                  </span>
                  <span className={`${styles.statValue} ${pnlPositive ? styles.positive : styles.negative}`}>
                    {pnlPositive ? '+' : ''}${formatAmount(status?.ai_trader.realized_pnl_usdt || '0')}
                  </span>
                </div>
              </div>
              
              {totalDeposited > 0 && (
                <div className={styles.performanceBar}>
                  <div 
                    className={`${styles.performanceFill} ${pnlPositive ? styles.positive : styles.negative}`}
                    style={{ width: `${Math.min(100, Math.max(0, (currentBalance / totalDeposited) * 100))}%` }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Transfer Funds</CardTitle>
          </CardHeader>
          <CardContent>
            {activeAction ? (
              <div className={styles.actionForm}>
                <div className={styles.actionHeader}>
                  {activeAction === 'deposit' ? (
                    <ArrowUpIcon size={20} color="var(--brand-primary)" />
                  ) : (
                    <ArrowDownIcon size={20} color="var(--warning)" />
                  )}
                  <span className={styles.actionTitle}>
                    {activeAction === 'deposit' ? 'Deposit to AI Trader' : 'Withdraw to Wallet'}
                  </span>
                </div>
                
                {activeAction === 'withdraw' && (
                  <div className={styles.verificationNote}>
                    <span>🔐</span>
                    <span>Wallet verification required for withdrawals</span>
                  </div>
                )}
                
                <NumberInput
                  label="Amount (USDT)"
                  value={amount}
                  onChange={(val) => {
                    setAmount(val);
                    setAmountError(null);
                  }}
                  placeholder={activeAction === 'deposit' ? 'Min: 100 USDT' : '0.00'}
                  error={amountError || undefined}
                  helperText={activeAction === 'deposit' ? 'Minimum deposit: 100 USDT' : undefined}
                  rightElement={
                    <button className={styles.maxButton} onClick={handleMaxAmount}>
                      MAX
                    </button>
                  }
                />
                
                <div className={styles.actionButtons}>
                  <Button variant="secondary" onClick={() => {
                    setActiveAction(null);
                    setAmount('');
                    setAmountError(null);
                  }}>
                    Cancel
                  </Button>
                  <Button loading={actionLoading} onClick={handleAction}>
                    {activeAction === 'deposit' ? 'Deposit' : 'Verify & Withdraw'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.actionButtons}>
                <Button fullWidth onClick={() => setActiveAction('deposit')}>
                  <ArrowUpIcon size={18} />
                  Deposit
                </Button>
                <Button fullWidth variant="secondary" onClick={() => setActiveAction('withdraw')}>
                  <ArrowDownIcon size={18} />
                  Withdraw
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle>Performance History</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <EmptyState
                icon="📊"
                message="No history yet. Start trading to see performance!"
              />
            ) : (
              <div className={styles.historyList}>
                {history.slice(0, 10).map((item) => {
                  const itemPnl = parseFloat(item.pnl);
                  const itemPnlPositive = itemPnl >= 0;
                  return (
                    <div key={item.id} className={styles.historyItem}>
                      <div className={styles.historyDate}>
                        {new Date(item.time).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className={styles.historyBalance}>
                        ${formatAmount(item.balance)}
                      </div>
                      <div className={`${styles.historyPnl} ${itemPnlPositive ? styles.positive : styles.negative}`}>
                        {itemPnlPositive ? '+' : ''}${formatAmount(item.pnl)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features Info */}
        <div className={styles.infoSection}>
          <div className={styles.infoCard}>
            <span className={styles.featureIcon}>🤖</span>
            <div>
              <strong>AI-Powered Trading</strong>
              <p>Our algorithms analyze market patterns to optimize your trading returns.</p>
            </div>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.featureIcon}>📈</span>
            <div>
              <strong>Smart Portfolio Management</strong>
              <p>Let AI manage your portfolio with advanced trading strategies.</p>
            </div>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.featureIcon}>🔒</span>
            <div>
              <strong>Secure & Reliable</strong>
              <p>All transactions are secured and protected with bank-level encryption.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Verification Modal */}
      <WithdrawalVerificationModal
        isOpen={showVerificationModal}
        onClose={() => {
          setShowVerificationModal(false);
          setWithdrawAmount('');
        }}
        amountUsdt={withdrawAmount}
        onVerificationComplete={handleWithdrawalComplete}
      />
    </PullToRefresh>
  );
}
