import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`${styles.spinner} ${styles[size]} ${className}`} />
  );
}

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <div className={styles.loadingScreen}>
      <Spinner size="lg" />
      <p className={styles.loadingMessage}>{message}</p>
      <div className={styles.loadingBars}>
        <div className={styles.loadingBar} />
        <div className={styles.loadingBar} />
        <div className={styles.loadingBar} />
      </div>
    </div>
  );
}
