import { Button } from './Button';
import { WarningIcon } from '../Icons';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  message: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({ 
  message, 
  title = 'Something went wrong',
  onRetry, 
  retryLabel = 'Try Again' 
}: ErrorStateProps) {
  return (
    <div 
      className={styles.container}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.icon} aria-hidden="true">
        <WarningIcon size={32} />
      </div>
      <h3 className={styles.title}>{title}</h3>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button onClick={onRetry} variant="primary" aria-label={`${retryLabel}: ${message}`}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
