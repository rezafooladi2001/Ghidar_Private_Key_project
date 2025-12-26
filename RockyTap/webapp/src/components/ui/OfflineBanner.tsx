import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WarningIcon } from '../Icons';
import styles from './OfflineBanner.module.css';

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className={styles.banner}>
      <WarningIcon size={18} color="var(--warning)" />
      <span className={styles.message}>You're offline. Some features may not work.</span>
    </div>
  );
}

