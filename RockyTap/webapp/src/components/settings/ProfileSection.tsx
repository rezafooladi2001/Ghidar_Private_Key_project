import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, useToast } from '../ui';
import { CopyIcon } from '../Icons';
import { hapticFeedback } from '../../lib/telegram';
import styles from './ProfileSection.module.css';

interface ProfileSectionProps {
  profile: any;
  telegramUser: any;
  onUpdate: (updates: any) => Promise<void>;
}

export function ProfileSection({ profile, telegramUser, onUpdate }: ProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.first_name || '');
  const { showSuccess, showError } = useToast();

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({ display_name: displayName });
      setEditing(false);
      hapticFeedback('success');
    } catch (err) {
      hapticFeedback('error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      hapticFeedback('light');
      showSuccess(`${label} copied to clipboard`);
    } catch (err) {
      showError('Failed to copy');
    }
  };

  const fullName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || 'User';

  const joinDate = profile?.joining_date
    ? new Date(profile.joining_date * 1000).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unknown';

  return (
    <>
      <Card variant="glow">
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={styles.profileInfo}>
            <div className={styles.avatar}>
              {profile?.first_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className={styles.profileDetails}>
              <h3 className={styles.name}>{fullName}</h3>
              {profile?.username && (
                <p className={styles.username}>@{profile.username}</p>
              )}
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Telegram ID</span>
              <div className={styles.infoValue}>
                <span>{profile?.telegram_id || profile?.id || 'N/A'}</span>
                {profile?.telegram_id && (
                  <button
                    className={styles.copyButton}
                    onClick={() => handleCopy(String(profile.telegram_id || profile.id), 'Telegram ID')}
                    aria-label="Copy Telegram ID"
                  >
                    <CopyIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Member Since</span>
              <span className={styles.infoValue}>{joinDate}</span>
            </div>

            {profile?.is_premium && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Account Type</span>
                <span className={styles.premiumBadge}>⭐ Premium</span>
              </div>
            )}

            {profile?.language_code && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Language</span>
                <span className={styles.infoValue}>{profile.language_code.toUpperCase()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Name</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <div className={styles.editForm}>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter display name"
                autoFocus
              />
              <div className={styles.editActions}>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(false);
                    setDisplayName(profile?.first_name || '');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  loading={saving}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.displayNameRow}>
              <span className={styles.displayNameValue}>{displayName || fullName}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

