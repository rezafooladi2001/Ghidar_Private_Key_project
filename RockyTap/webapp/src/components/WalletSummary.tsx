import { Card } from './ui';
import styles from './WalletSummary.module.css';

interface WalletSummaryProps {
  usdtBalance: string;
  ghdBalance: string;
  className?: string;
}

export function WalletSummary({ usdtBalance, ghdBalance, className = '' }: WalletSummaryProps) {
  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatGhd = (balance: string) => {
    const num = parseFloat(balance);
    if (isNaN(num)) return '0';
    return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <Card variant="glow" className={className}>
      <div className={styles.wallet}>
        <div className={styles.balance}>
          <span className={styles.label}>USDT Balance</span>
          <span className={styles.value}>
            <span className={styles.currency}>$</span>
            {formatBalance(usdtBalance)}
          </span>
        </div>
        <div className={styles.divider} />
        <div className={styles.balance}>
          <span className={styles.label}>GHD Tokens</span>
          <span className={styles.value}>
            <span className={styles.token}>G</span>
            {formatGhd(ghdBalance)}
          </span>
        </div>
      </div>
    </Card>
  );
}
