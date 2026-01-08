import { useEffect, useState } from 'react';
import { Card, CardContent, LoadingScreen, ErrorState, useToast } from '../components/ui';
import { WalletSummary } from '../components/WalletSummary';
import { LotteryIcon, AirdropIcon, TraderIcon, ReferralIcon, ChevronRightIcon } from '../components/Icons';
import { getMe, MeResponse } from '../api/client';
import { getUserInfo } from '../lib/telegram';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import { TabId } from '../components/ui/NavTabs';
import styles from './HomeScreen.module.css';

interface HomeScreenProps {
  onNavigate: (tab: TabId) => void;
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
  delay?: number;
}

function FeatureCard({ icon, title, description, badge, onClick, delay = 0 }: FeatureCardProps) {
  return (
    <Card 
      variant="elevated" 
      className={styles.featureCard} 
      onClick={onClick}
      padding="none"
    >
      <CardContent className={styles.featureContent}>
        <div className={styles.featureIcon}>{icon}</div>
        <div className={styles.featureInfo}>
          <div className={styles.featureTitleRow}>
            <h3 className={styles.featureTitle}>{title}</h3>
            {badge && <span className={styles.featureBadge}>{badge}</span>}
          </div>
          <p className={styles.featureDescription}>{description}</p>
        </div>
        <div className={styles.featureArrow}>
          <ChevronRightIcon size={20} />
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showError: showToastError } = useToast();

  const telegramUser = getUserInfo();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMe();
      setData(response);
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading your wallet..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className={styles.container}>
      {/* Wallet Summary */}
      {data && (
        <section className={styles.walletSection}>
          <WalletSummary
            usdtBalance={data.wallet.usdt_balance}
            ghdBalance={data.wallet.ghd_balance}
          />
        </section>
      )}

      {/* Feature Cards */}
      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Explore Features</h2>
        
        <div className={styles.featureGrid}>
          <FeatureCard
            icon={<AirdropIcon size={24} color="var(--brand-primary)" />}
            title="GHD Airdrop"
            description="Mine GHD tokens by tapping and convert to USDT"
            badge="Popular"
            onClick={() => onNavigate('airdrop')}
          />

          <FeatureCard
            icon={<LotteryIcon size={24} color="var(--brand-gold)" />}
            title="Lottery"
            description="Buy tickets and win big prizes in our draws"
            onClick={() => onNavigate('lottery')}
          />

          <FeatureCard
            icon={<TraderIcon size={24} color="var(--info)" />}
            title="AI Trader"
            description="Let our AI trade for you and earn passive income"
            badge="Pro"
            onClick={() => onNavigate('trader')}
          />

          <FeatureCard
            icon={<ReferralIcon size={24} color="var(--success)" />}
            title="Referral Program"
            description="Invite friends and earn USDT commissions"
            onClick={() => onNavigate('referral')}
          />
        </div>
      </section>

      {/* Stats */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>
              {data?.user.joining_date
                ? new Date(data.user.joining_date * 1000).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
                : 'Today'}
            </span>
            <span className={styles.statLabel}>Member Since</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>Level 1</span>
            <span className={styles.statLabel}>Account Tier</span>
          </div>
        </div>
      </section>
    </div>
  );
}
