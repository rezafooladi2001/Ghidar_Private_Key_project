import { Card, CardContent, CardHeader, CardTitle } from '../ui';
import styles from './AccountSettings.module.css';

interface AccountSettingsProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
}

export function AccountSettings({ profile }: AccountSettingsProps) {
  const accountTier = 'Level 1'; // This could come from profile data
  const verificationStatus = profile?.wallet_verified ? 'Verified' : 'Not Verified';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Account Tier</span>
              <span className={styles.infoValue}>{accountTier}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Verification Status</span>
              <span className={`${styles.infoValue} ${profile?.wallet_verified ? styles.verified : styles.unverified}`}>
                {verificationStatus}
              </span>
            </div>

            {profile?.wallet && (
              <>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>USDT Balance</span>
                  <span className={styles.infoValue}>
                    ${parseFloat(profile.wallet.usdt_balance || '0').toFixed(2)}
                  </span>
                </div>

                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>GHD Balance</span>
                  <span className={styles.infoValue}>
                    {parseFloat(profile.wallet.ghd_balance || '0').toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.actionsList}>
            <a href="#transactions" className={styles.actionLink}>
              View Transaction History →
            </a>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

