import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, NumberInput, LoadingScreen, ErrorState, EmptyState, useToast, PullToRefresh } from '../components/ui';
import { WalletSummary } from '../components/WalletSummary';
import { TraderIcon, ArrowUpIcon, ArrowDownIcon } from '../components/Icons';
import {
  getAiTraderStatus,
  depositToAiTrader,
  withdrawFromAiTrader,
  getAiTraderHistory,
  AiTraderStatusResponse,
  AiTraderHistoryItem,
} from '../api/client';
import { hapticFeedback } from '../lib/telegram';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import styles from './AITraderScreen.module.css';

type ActionType = 'deposit' | 'withdraw' | null;

export function AITraderScreen() {
  const [status, setStatus] = useState<AiTraderStatusResponse | null>(null);
  const [history, setHistory] = useState<AiTraderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActionType>(null);
  const [amount, setAmount] = useState('');
  const { showError: showToastError, showSuccess } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        getAiTraderStatus(),
        getAiTraderHistory(30),
      ]);
      setStatus(statusRes);
      setHistory(historyRes.snapshots);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!activeAction) return;
    
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

    if (activeAction === 'deposit') {
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
    } else {
      const aiBalance = parseFloat(status?.ai_trader.current_balance_usdt || '0');
      if (amountNum > aiBalance) {
        const errorMsg = `Insufficient AI Trader balance. You have $${aiBalance.toFixed(2)} USDT available.`;
        setAmountError(errorMsg);
        showToastError(errorMsg);
        return;
      }
    }

    try {
      setActionLoading(true);
      setAmountError(null);
      
      if (activeAction === 'deposit') {
        const result = await depositToAiTrader(amount);
        hapticFeedback('success');
        setStatus(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            wallet: result.wallet,
            ai_trader: result.ai_trader,
          };
        });
        showSuccess(`Deposited $${parseFloat(result.amount_usdt).toFixed(2)} to AI Trader`);
      } else {
        const result = await withdrawFromAiTrader(amount);
        hapticFeedback('success');
        setStatus(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            wallet: result.wallet,
            ai_trader: result.ai_trader,
          };
        });
        showSuccess(`Withdrew $${parseFloat(result.amount_usdt).toFixed(2)} to wallet`);
      }
      
      setAmount('');
      setActiveAction(null);
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setAmountError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setActionLoading(false);
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
    return <LoadingScreen message="Loading AI Trader..." />;
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
                <span className={styles.statLabel}>Total Deposited</span>
                <span className={styles.statValue}>${formatAmount(status?.ai_trader.total_deposited_usdt || '0')}</span>
              </div>
              <div className={styles.statDivider} />
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Total P&L</span>
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
                  {activeAction === 'deposit' ? 'Deposit' : 'Withdraw'}
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

      {/* Info */}
      <div className={styles.infoSection}>
        <p className={styles.infoText}>
          💡 AI Trader uses advanced algorithms to trade crypto markets automatically.
          Deposit USDT and let AI work for you!
        </p>
      </div>
      </div>
    </PullToRefresh>
  );
}
