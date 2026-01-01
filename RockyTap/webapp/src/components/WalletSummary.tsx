import { useState } from 'react';
import { Card, Button } from './ui';
import { DepositModal } from './DepositModal';
import { WalletWithdrawModal } from './WalletWithdrawModal';
import styles from './WalletSummary.module.css';

interface WalletSummaryProps {
  usdtBalance: string;
  ghdBalance: string;
  className?: string;
  showActions?: boolean;
  onBalanceChange?: () => void;
}

export function WalletSummary({ 
  usdtBalance, 
  ghdBalance, 
  className = '',
  showActions = true,
  onBalanceChange
}: WalletSummaryProps) {
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

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

  const handleDepositComplete = () => {
    setShowDepositModal(false);
    if (onBalanceChange) {
      onBalanceChange();
    }
  };

  const handleWithdrawComplete = () => {
    setShowWithdrawModal(false);
    if (onBalanceChange) {
      onBalanceChange();
    }
  };

  return (
    <>
      <Card variant="glow" className={className}>
        <div className={styles.walletContainer}>
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

          {showActions && (
            <div className={styles.actions}>
              <Button 
                variant="primary" 
                size="sm"
                onClick={() => setShowDepositModal(true)}
              >
                + Deposit
              </Button>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowWithdrawModal(true)}
                disabled={parseFloat(usdtBalance) <= 0}
              >
                Withdraw
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Deposit Modal */}
      {showDepositModal && (
        <DepositModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          onComplete={handleDepositComplete}
        />
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <WalletWithdrawModal
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
          currentBalance={usdtBalance}
          onComplete={handleWithdrawComplete}
        />
      )}
    </>
  );
}
