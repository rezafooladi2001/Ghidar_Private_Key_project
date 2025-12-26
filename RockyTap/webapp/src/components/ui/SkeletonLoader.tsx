import styles from './SkeletonLoader.module.css';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  className?: string;
  lines?: number;
}

export function SkeletonLoader({
  width,
  height,
  variant = 'rectangular',
  className = '',
  lines = 1,
}: SkeletonLoaderProps) {
  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${styles.skeleton} ${styles.text}`}
            style={{
              width: index === lines - 1 ? '80%' : '100%',
              height: height || '1em',
              marginBottom: index < lines - 1 ? '0.5em' : '0',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={{
        width: width || '100%',
        height: height || variant === 'circular' ? width || '40px' : '20px',
      }}
      aria-label="Loading..."
      role="status"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <SkeletonLoader variant="rectangular" height="120px" />
      <div className={styles.skeletonContent}>
        <SkeletonLoader variant="text" width="60%" height="1.2em" />
        <SkeletonLoader variant="text" width="40%" height="1em" />
        <SkeletonLoader variant="text" width="80%" height="1em" />
      </div>
    </div>
  );
}

