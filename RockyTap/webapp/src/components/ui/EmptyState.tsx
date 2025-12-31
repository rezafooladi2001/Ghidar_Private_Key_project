import React from 'react';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon?: React.ReactNode | string;
  title?: string;
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = '📭', title, message, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        {typeof icon === 'string' ? icon : icon}
      </div>
      {title && <h3 className={styles.title}>{title}</h3>}
      <p className={styles.message}>{message}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
