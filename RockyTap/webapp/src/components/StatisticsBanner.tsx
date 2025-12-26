import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui';
import { getStatistics, PlatformStatistics } from '../api/client';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import styles from './StatisticsBanner.module.css';

interface StatisticsBannerProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M+`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K+`;
  }
  return num.toLocaleString();
}

export function StatisticsBanner({ 
  autoRefresh = true, 
  refreshInterval = 30000,
  className = '' 
}: StatisticsBannerProps) {
  const [stats, setStats] = useState<PlatformStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const loadStatistics = async () => {
    try {
      setError(null);
      const data = await getStatistics();
      setStats(data);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      // Don't show error to user, just keep previous data
      console.warn('Failed to load statistics:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatistics();

    if (autoRefresh) {
      const interval = setInterval(loadStatistics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading && !stats) {
    return (
      <Card className={`${styles.container} ${className}`}>
        <CardContent className={styles.content}>
          <div className={styles.stat}>
            <div className={styles.statSkeleton} />
            <div className={styles.labelSkeleton} />
          </div>
          <div className={styles.stat}>
            <div className={styles.statSkeleton} />
            <div className={styles.labelSkeleton} />
          </div>
          <div className={styles.stat}>
            <div className={styles.statSkeleton} />
            <div className={styles.labelSkeleton} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <Card className={`${styles.container} ${className}`}>
      <CardContent className={styles.content}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatNumber(stats.total_players)}</span>
          <span className={styles.statLabel}>Total Users</span>
        </div>
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatNumber(stats.online)}</span>
          <span className={styles.statLabel}>Online Now</span>
        </div>
        <div className={styles.divider} aria-hidden="true" />
        <div className={styles.stat}>
          <span className={styles.statValue}>{formatNumber(stats.daily)}</span>
          <span className={styles.statLabel}>New Today</span>
        </div>
        {lastUpdate && (
          <div className={styles.updateIndicator} aria-label={`Last updated: ${lastUpdate.toLocaleTimeString()}`}>
            <span className={styles.updateDot} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

