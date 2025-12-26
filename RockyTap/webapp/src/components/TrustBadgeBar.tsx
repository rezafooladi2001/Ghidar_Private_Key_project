import React from 'react';
import styles from './TrustBadgeBar.module.css';

interface TrustBadge {
  id: string;
  icon: string;
  label: string;
  description?: string;
}

interface TrustBadgeBarProps {
  variant?: 'compact' | 'full';
  showLabels?: boolean;
  className?: string;
}

const defaultBadges: TrustBadge[] = [
  {
    id: 'ssl',
    icon: '🔒',
    label: 'SSL Encrypted',
    description: 'All connections are secured with SSL encryption',
  },
  {
    id: 'secure',
    icon: '🛡️',
    label: 'Secure',
    description: 'Bank-level security and encryption',
  },
  {
    id: 'verified',
    icon: '✅',
    label: 'Verified',
    description: 'Verified Telegram Mini App',
  },
  {
    id: 'telegram',
    icon: '⚡',
    label: 'Telegram',
    description: 'Powered by Telegram',
  },
];

export function TrustBadgeBar({ 
  variant = 'compact', 
  showLabels = true,
  className = '' 
}: TrustBadgeBarProps) {
  const containerClass = `${styles.container} ${styles[variant]} ${className}`;

  if (variant === 'compact') {
    return (
      <div className={containerClass} role="region" aria-label="Trust indicators">
        {defaultBadges.map((badge) => (
          <div key={badge.id} className={styles.badge} title={badge.description}>
            <span className={styles.icon} aria-hidden="true">{badge.icon}</span>
            {showLabels && <span className={styles.label}>{badge.label}</span>}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={containerClass} role="region" aria-label="Trust indicators">
      {defaultBadges.map((badge) => (
        <div key={badge.id} className={styles.badgeFull}>
          <div className={styles.badgeHeader}>
            <span className={styles.icon} aria-hidden="true">{badge.icon}</span>
            {showLabels && <span className={styles.label}>{badge.label}</span>}
          </div>
          {badge.description && (
            <p className={styles.description}>{badge.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}

