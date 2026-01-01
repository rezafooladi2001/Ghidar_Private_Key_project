import { useEffect, useState } from 'react';
import { Card, CardContent, ErrorState, useToast, PullToRefresh } from '../components/ui';
import { WalletSummary } from '../components/WalletSummary';
import { LotteryIcon, AirdropIcon, TraderIcon, ReferralIcon, ChevronRightIcon } from '../components/Icons';
import { TrustBadgeBar } from '../components/TrustBadgeBar';
import { StatisticsBanner } from '../components/StatisticsBanner';
import { TelegramBranding } from '../components/TelegramBranding';
import { MeResponse } from '../api/client';
import { getUserInfo, getInitData } from '../lib/telegram';
import { TabId } from '../components/ui/NavTabs';
import { GhidarLogo } from '../components/GhidarLogo';
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

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');
  const { showError: showToastError } = useToast();

  const telegramUser = getUserInfo();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.log('[HomeScreen] loadData called');
    
    try {
      setLoading(true);
      setError(null);
      setErrorDetails('');
      
      // Direct fetch instead of using client.ts
      const initData = getInitData();
      console.log('[HomeScreen] initData length:', initData?.length || 0);
      
      const response = await fetch('/RockyTap/api/me/', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        }
      });
      
      console.log('[HomeScreen] /me/ response status:', response.status);
      
      const json = await response.json();
      console.log('[HomeScreen] /me/ response:', json);
      
      if (!response.ok || !json.success) {
        const errMsg = json.error?.message || `HTTP ${response.status}`;
        setError(errMsg);
        setErrorDetails(`Status: ${response.status}, Code: ${json.error?.code || 'UNKNOWN'}`);
        showToastError(errMsg);
        return;
      }
      
      setData(json.data);
      
    } catch (err) {
      console.error('[HomeScreen] loadData error:', err);
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setError(errMsg);
      setErrorDetails(String(err));
      showToastError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SimpleLoading message="Loading your wallet..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <ErrorState message={error} onRetry={loadData} />
        {errorDetails && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            background: '#1e293b', 
            borderRadius: '8px',
            fontSize: '12px',
            color: '#94a3b8'
          }}>
            <strong>Debug Info:</strong><br/>
            {errorDetails}
          </div>
        )}
      </div>
    );
  }

  const displayName = telegramUser?.first_name || data?.user.first_name || 'User';

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className={styles.container}>
        {/* Hero Section */}
        <section className={styles.hero}>
        <div className={styles.heroBackground} />
        <div className={styles.heroContent}>
          <div className={styles.greeting}>
            <span className={styles.greetingText}>Welcome back,</span>
            <h1 className={styles.userName}>{displayName}</h1>
          </div>
          <p className={styles.tagline}>Your secure gateway to crypto opportunities</p>
          <div className={styles.telegramBranding}>
            <TelegramBranding variant="text" />
          </div>
          {telegramUser?.is_premium && (
            <div className={styles.premiumBadge}>
              <span className={styles.premiumIcon}>⭐</span>
              <span>Premium Member</span>
            </div>
          )}
        </div>
      </section>

      {/* Trust Badge Bar */}
      <section className={styles.trustSection}>
        <TrustBadgeBar variant="compact" showLabels={true} />
      </section>

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

      {/* Platform Statistics */}
      <section className={styles.statsSection}>
        <StatisticsBanner />
      </section>

      {/* User Stats */}
      <section className={styles.userStatsSection}>
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
    </PullToRefresh>
  );
}
