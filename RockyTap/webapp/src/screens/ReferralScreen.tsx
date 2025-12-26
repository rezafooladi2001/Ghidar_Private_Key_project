import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, LoadingScreen, ErrorState, EmptyState, useToast, PullToRefresh } from '../components/ui';
import { ReferralIcon, TrophyIcon, HistoryIcon, CopyIcon, GiftIcon } from '../components/Icons';
import {
  getReferralInfo,
  getReferralLeaderboard,
  getReferralHistory,
  ReferralInfo,
  ReferralLeaderboardEntry,
  ReferralReward,
} from '../api/client';
import { hapticFeedback } from '../lib/telegram';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import styles from './ReferralScreen.module.css';

type TabView = 'info' | 'leaderboard' | 'history';

export function ReferralScreen() {
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [leaderboard, setLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [history, setHistory] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabView>('info');
  const [copySuccess, setCopySuccess] = useState(false);
  const { showError: showToastError, showSuccess } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard' && leaderboard.length === 0) {
      loadLeaderboard();
    } else if (activeTab === 'history' && history.length === 0) {
      loadHistory();
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const infoRes = await getReferralInfo();
      setInfo(infoRes);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await getReferralLeaderboard(50);
      setLeaderboard(res.leaderboard);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      showToastError(errorMessage);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await getReferralHistory(1, 20);
      setHistory(res.rewards);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      showToastError(errorMessage);
    }
  };

  const copyReferralLink = async () => {
    if (!info) return;

    try {
      hapticFeedback('light');
      await navigator.clipboard.writeText(info.referral_link);
      setCopySuccess(true);
      showSuccess('Referral link copied!');
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      showToastError('Failed to copy link. Please try again.');
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading referral info..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (!info) {
    return null;
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className={styles.container}>
        {/* Tabs */}
        <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'info' ? styles.active : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <ReferralIcon size={16} />
          <span>Invite</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'leaderboard' ? styles.active : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <TrophyIcon size={16} />
          <span>Top</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <HistoryIcon size={16} />
          <span>Rewards</span>
        </button>
      </div>

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className={styles.tabContent}>
          {/* Referral Link Card */}
          <Card variant="glow">
            <CardHeader>
              <CardTitle>
                <GiftIcon size={20} color="var(--brand-primary)" />
                Your Referral Link
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.linkWrapper}>
                <code className={styles.referralLink}>{info.referral_link}</code>
                <Button
                  onClick={copyReferralLink}
                  variant={copySuccess ? 'success' : 'primary'}
                  size="sm"
                >
                  {copySuccess ? (
                    <>✓ Copied</>
                  ) : (
                    <><CopyIcon size={16} /> Copy</>
                  )}
                </Button>
              </div>
              <p className={styles.linkHint}>
                Share this link with friends. Earn USDT when they deposit!
              </p>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className={styles.statsGrid}>
            <Card variant="elevated" padding="sm">
              <CardContent>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>👤</div>
                  <div className={styles.statValue}>{info.stats.direct_referrals}</div>
                  <div className={styles.statLabel}>Direct</div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="sm">
              <CardContent>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>👥</div>
                  <div className={styles.statValue}>{info.stats.indirect_referrals}</div>
                  <div className={styles.statLabel}>Indirect</div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" padding="sm">
              <CardContent>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>💰</div>
                  <div className={styles.statValue}>${parseFloat(info.stats.total_rewards_usdt).toFixed(2)}</div>
                  <div className={styles.statLabel}>Earned</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Rewards Preview */}
          {info.recent_rewards.length > 0 && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Recent Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={styles.rewardsList}>
                  {info.recent_rewards.slice(0, 5).map((reward, idx) => (
                    <div key={idx} className={styles.rewardItem}>
                      <div className={styles.rewardInfo}>
                        <span className={styles.rewardAmount}>+${parseFloat(reward.amount_usdt).toFixed(2)}</span>
                        <span className={styles.rewardSource}>
                          L{reward.level} • {reward.source_type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={styles.rewardDate}>
                        {new Date(reward.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setActiveTab('history')}
                >
                  View All Rewards →
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Commission Info */}
          <Card>
            <CardHeader>
              <CardTitle>Commission Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={styles.commissionList}>
                <div className={styles.commissionItem}>
                  <span className={styles.commissionType}>Wallet Deposit</span>
                  <span className={styles.commissionRate}>5% L1 • 2% L2</span>
                </div>
                <div className={styles.commissionItem}>
                  <span className={styles.commissionType}>AI Trader Deposit</span>
                  <span className={styles.commissionRate}>7% L1 • 3% L2</span>
                </div>
                <div className={styles.commissionItem}>
                  <span className={styles.commissionType}>Lottery Purchase</span>
                  <span className={styles.commissionRate}>3% L1 • 1% L2</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leaderboard Tab */}
      {activeTab === 'leaderboard' && (
        <div className={styles.tabContent}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Top Referrers</CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <EmptyState
                  icon="📊"
                  message="No leaderboard data available yet."
                />
              ) : (
                <div className={styles.leaderboardList}>
                  {leaderboard.map((entry, idx) => (
                    <div key={entry.user_id} className={styles.leaderboardItem}>
                      <div className={`${styles.leaderboardRank} ${idx < 3 ? styles[`rank${idx + 1}`] : ''}`}>
                        {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : `#${idx + 1}`}
                      </div>
                      <div className={styles.leaderboardInfo}>
                        <div className={styles.leaderboardName}>
                          {entry.first_name}
                          {entry.username && <span className={styles.leaderboardUsername}>@{entry.username}</span>}
                        </div>
                        <div className={styles.leaderboardStats}>
                          {entry.direct_referrals} referrals
                        </div>
                      </div>
                      <div className={styles.leaderboardEarned}>
                        ${parseFloat(entry.total_rewards_usdt).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className={styles.tabContent}>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Reward History</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <EmptyState
                  icon="📜"
                  message="No referral rewards yet. Share your link to earn!"
                />
              ) : (
                <div className={styles.historyList}>
                  {history.map((reward, idx) => (
                    <div key={idx} className={styles.historyItem}>
                      <div className={styles.historyInfo}>
                        <div className={styles.historyAmount}>+${parseFloat(reward.amount_usdt).toFixed(2)}</div>
                        <div className={styles.historyDetails}>
                          Level {reward.level} • {reward.source_type.replace('_', ' ')}
                        </div>
                      </div>
                      <div className={styles.historyDate}>
                        {new Date(reward.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      </div>
    </PullToRefresh>
  );
}
