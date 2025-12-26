import { Card, CardContent, CardHeader, CardTitle, Button } from '../ui';
import { InfoIcon } from '../Icons';
import styles from './SecuritySettings.module.css';

interface SecuritySettingsProps {
  profile: any;
  onUpdate: (updates: any) => Promise<void>;
}

export function SecuritySettings({ profile }: SecuritySettingsProps) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.securityInfo}>
            <InfoIcon size={20} color="var(--brand-primary)" />
            <div className={styles.securityText}>
              <p>Your account is secured through Telegram authentication.</p>
              <p className={styles.securityNote}>
                All transactions require wallet verification for additional security.
              </p>
            </div>
          </div>

          <div className={styles.securityFeatures}>
            <div className={styles.featureItem}>
              <div className={styles.featureInfo}>
                <h4 className={styles.featureTitle}>Two-Factor Authentication</h4>
                <p className={styles.featureDescription}>
                  Enhanced security through Telegram's built-in 2FA
                </p>
              </div>
              <span className={styles.featureStatus}>Active</span>
            </div>

            <div className={styles.featureItem}>
              <div className={styles.featureInfo}>
                <h4 className={styles.featureTitle}>Wallet Verification</h4>
                <p className={styles.featureDescription}>
                  Required for withdrawals and high-value transactions
                </p>
              </div>
              <span className={styles.featureStatus}>
                {profile?.wallet_verified ? 'Verified' : 'Not Verified'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.sessionInfo}>
            <p className={styles.sessionText}>
              Your current session is active. You can logout to end your session.
            </p>
            <p className={styles.sessionNote}>
              Sessions are automatically managed through Telegram WebApp.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

