import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, useToast } from '../ui';
import { hapticFeedback } from '../../lib/telegram';
import styles from './AppSettings.module.css';

interface AppSettingsProps {
  preferences: any;
  onUpdate: (updates: any) => Promise<void>;
  onResetOnboarding?: () => void;
}

export function AppSettings({ preferences, onUpdate, onResetOnboarding }: AppSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    preferences?.notifications_enabled !== false
  );
  const { showSuccess, showError } = useToast();

  const handleToggleNotifications = async () => {
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    
    try {
      setSaving(true);
      await onUpdate({ notifications_enabled: newValue });
      hapticFeedback('light');
      showSuccess(newValue ? 'Notifications enabled' : 'Notifications disabled');
    } catch (err) {
      setNotificationsEnabled(!newValue);
      showError('Failed to update preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h4 className={styles.settingTitle}>Push Notifications</h4>
              <p className={styles.settingDescription}>
                Receive notifications about lottery wins, rewards, and important updates
              </p>
            </div>
            <button
              className={`${styles.toggle} ${notificationsEnabled ? styles.toggleActive : ''}`}
              onClick={handleToggleNotifications}
              disabled={saving}
              aria-label="Toggle notifications"
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h4 className={styles.settingTitle}>Theme</h4>
              <p className={styles.settingDescription}>
                App theme follows your Telegram theme settings
              </p>
            </div>
            <span className={styles.settingValue}>Auto</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <h4 className={styles.settingTitle}>App Language</h4>
              <p className={styles.settingDescription}>
                Language is determined by your Telegram settings
              </p>
            </div>
            <span className={styles.settingValue}>
              {preferences?.language || 'English'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.aboutInfo}>
            <p className={styles.aboutText}>
              <strong>Ghidar</strong> - Your gateway to crypto opportunities
            </p>
            <p className={styles.aboutVersion}>
              Version 1.0.0
            </p>
            {onResetOnboarding && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetOnboarding}
                className={styles.resetOnboardingButton}
              >
                Show Tutorial Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

