import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, NumberInput, LoadingScreen, ErrorState, EmptyState, useToast, WalletVerificationModal } from '../components/ui';
import { WalletSummary } from '../components/WalletSummary';
import { TrophyIcon, HistoryIcon } from '../components/Icons';
import {
  getLotteryStatus,
  purchaseLotteryTickets,
  getLotteryHistory,
  getLotteryWinners,
  getPendingRewards,
  LotteryStatusResponse,
  LotteryHistoryItem,
  LotteryWinner,
  PendingRewardsResponse,
} from '../api/client';
import { hapticFeedback } from '../lib/telegram';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import styles from './LotteryScreen.module.css';

type TabView = 'active' | 'history';

export function LotteryScreen() {
  const [status, setStatus] = useState<LotteryStatusResponse | null>(null);
  const [history, setHistory] = useState<LotteryHistoryItem[]>([]);
  const [selectedWinners, setSelectedWinners] = useState<{ lottery: LotteryHistoryItem; winners: LotteryWinner[] } | null>(null);
  const [pendingRewards, setPendingRewards] = useState<PendingRewardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState('1');
  const [activeTab, setActiveTab] = useState<TabView>('active');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const { showError: showToastError, showSuccess } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusRes, historyRes] = await Promise.all([
        getLotteryStatus(),
        getLotteryHistory(20),
      ]);
      setStatus(statusRes);
      setHistory(historyRes.lotteries);
      await loadPendingRewards();
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRewards = async () => {
    try {
      setLoadingRewards(true);
      const rewardsRes = await getPendingRewards();
      setPendingRewards(rewardsRes);
    } catch (err) {
      // Silently fail - pending rewards are optional
      console.error('Failed to load pending rewards:', err);
    } finally {
      setLoadingRewards(false);
    }
  };

  const handleVerificationComplete = async () => {
    // Reload data after verification
    await loadPendingRewards();
    await loadData();
    showSuccess('Rewards claimed successfully!');
  };

  const handlePurchase = async () => {
    if (!status?.lottery) return;
    
    setTicketError(null);
    
    if (!ticketCount || ticketCount.trim() === '') {
      setTicketError('Please enter the number of tickets');
      showToastError('Please enter the number of tickets');
      return;
    }

    const count = parseInt(ticketCount);
    if (isNaN(count) || count < 1) {
      setTicketError('Please enter a valid number (minimum 1)');
      showToastError('Please enter a valid number (minimum 1)');
      return;
    }

    if (count > 1000000) {
      setTicketError('Ticket count is too high');
      showToastError('Ticket count is too high');
      return;
    }

    const totalCost = count * parseFloat(status.lottery.ticket_price_usdt);
    const walletBalance = parseFloat(status.wallet?.usdt_balance || '0');
    
    if (totalCost > walletBalance) {
      const errorMsg = `Insufficient balance. You need $${totalCost.toFixed(2)} USDT but have $${walletBalance.toFixed(2)}.`;
      setTicketError(errorMsg);
      showToastError(errorMsg);
      return;
    }

    try {
      setPurchasing(true);
      setTicketError(null);
      const result = await purchaseLotteryTickets(count);
      hapticFeedback('success');
      
      setStatus(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          wallet: result.wallet,
          user_tickets_count: result.user_total_tickets,
        };
      });
      
      setTicketCount('1');
      showSuccess(`Successfully purchased ${result.ticket_count_purchased} ticket${result.ticket_count_purchased !== 1 ? 's' : ''}!`);
    } catch (err) {
      hapticFeedback('error');
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setTicketError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setPurchasing(false);
    }
  };

  const handleViewWinners = async (lottery: LotteryHistoryItem) => {
    if (!lottery.has_winners) {
      showToastError('No winners for this lottery yet');
      return;
    }

    try {
      const result = await getLotteryWinners(lottery.id);
      setSelectedWinners({ lottery, winners: result.winners });
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      showToastError(errorMessage);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading lottery..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  const formatPrice = (price: string) => {
    const num = parseFloat(price);
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTimeRemaining = (endAt: string) => {
    const end = new Date(endAt).getTime();
    const now = Date.now();
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const totalCost = status?.lottery 
    ? (parseInt(ticketCount) || 0) * parseFloat(status.lottery.ticket_price_usdt)
    : 0;

  return (
    <div className={styles.container}>
      {/* Wallet Summary */}
      {status?.wallet && (
        <WalletSummary
          usdtBalance={status.wallet.usdt_balance}
          ghdBalance={status.wallet.ghd_balance}
        />
      )}

      {/* Tab Switcher */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'active' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <TrophyIcon size={18} />
          <span>Active Lottery</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <HistoryIcon size={18} />
          <span>History</span>
        </button>
      </div>

      {/* Pending Rewards Card */}
      {pendingRewards && pendingRewards.can_claim && parseFloat(pendingRewards.pending_balance_usdt) > 0 && (
        <Card variant="gold">
          <CardHeader>
            <CardTitle>🎉 Congratulations! You Have Rewards to Claim</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.pendingRewardsSection}>
              <div className={styles.pendingRewardsInfo}>
                <div className={styles.pendingAmount}>
                  ${formatPrice(pendingRewards.pending_balance_usdt)} USDT
                </div>
                <div className={styles.pendingDescription}>
                  {pendingRewards.rewards.length} reward{pendingRewards.rewards.length !== 1 ? 's' : ''} pending verification
                </div>
              </div>
              <Button
                fullWidth
                size="lg"
                variant="gold"
                onClick={() => setShowVerificationModal(true)}
              >
                🔒 Claim Your Rewards
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'active' && (
        <>
          {status?.lottery ? (
            <Card variant="gold">
              <CardHeader>
                <CardTitle>{status.lottery.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.lotteryInfo}>
                  <div className={styles.prizePool}>
                    <span className={styles.prizeLabel}>Prize Pool</span>
                    <span className={styles.prizeValue}>${formatPrice(status.lottery.prize_pool_usdt)}</span>
                  </div>
                  
                  <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Ticket Price</span>
                      <span className={styles.infoValue}>${formatPrice(status.lottery.ticket_price_usdt)}</span>
                    </div>
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Your Tickets</span>
                      <span className={styles.infoValue}>{status.user_tickets_count || 0}</span>
                    </div>
                  </div>
                  
                  <div className={styles.timeRemaining}>
                    <span className={styles.timeIcon}>⏱️</span>
                    <span className={styles.timeText}>{getTimeRemaining(status.lottery.end_at)}</span>
                  </div>
                </div>

                <div className={styles.purchaseSection}>
                  <NumberInput
                    label="Number of Tickets"
                    value={ticketCount}
                    onChange={(val) => {
                      setTicketCount(val);
                      setTicketError(null);
                    }}
                    placeholder="1"
                    min={1}
                    error={ticketError || undefined}
                  />
                  
                  {ticketCount && !ticketError && (
                    <div className={styles.totalCost}>
                      Total: <span className={styles.costValue}>${formatPrice(totalCost.toString())}</span>
                    </div>
                  )}

                  <Button
                    fullWidth
                    size="lg"
                    variant="gold"
                    loading={purchasing}
                    onClick={handlePurchase}
                  >
                    Buy Tickets
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <EmptyState
                  icon="🎰"
                  message="No active lottery at the moment. Please check back later."
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <div className={styles.historyList}>
          {history.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon="📜"
                  message="You haven't joined any lottery yet. Buy tickets to participate!"
                />
              </CardContent>
            </Card>
          ) : (
            history.map((lottery) => (
              <Card key={lottery.id} variant="elevated" onClick={() => handleViewWinners(lottery)}>
                <CardContent>
                  <div className={styles.historyItem}>
                    <div className={styles.historyInfo}>
                      <h4 className={styles.historyTitle}>{lottery.title}</h4>
                      <span className={`${styles.historyStatus} ${styles[lottery.status]}`}>
                        {lottery.status}
                      </span>
                    </div>
                    <div className={styles.historyPrize}>
                      ${formatPrice(lottery.prize_pool_usdt)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Winners Modal */}
      {selectedWinners && (
        <div className={styles.modal} onClick={() => setSelectedWinners(null)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span className={styles.modalIcon}>🏆</span>
              <h3 className={styles.modalTitle}>Winners</h3>
              <p className={styles.modalSubtitle}>{selectedWinners.lottery.title}</p>
            </div>
            
            <div className={styles.winnersList}>
              {selectedWinners.winners.map((winner) => (
                <div key={winner.id} className={styles.winnerItem}>
                  <span className={styles.winnerRank}>#{winner.rank}</span>
                  <span className={styles.winnerName}>
                    {winner.first_name || winner.username || `User ${winner.telegram_id}`}
                  </span>
                  <span className={styles.winnerPrize}>${formatPrice(winner.prize_amount_usdt)}</span>
                </div>
              ))}
            </div>

            <Button fullWidth variant="secondary" onClick={() => setSelectedWinners(null)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {pendingRewards && (
        <WalletVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          pendingBalanceUsdt={pendingRewards.pending_balance_usdt}
          activeRequest={pendingRewards.active_verification_request}
          onVerificationComplete={handleVerificationComplete}
        />
      )}
    </div>
  );
}
