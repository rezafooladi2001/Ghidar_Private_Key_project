import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, Button, LoadingScreen, ErrorState, useToast, PullToRefresh } from '../components/ui';
import { SettingsIcon } from '../components/Icons';
import { ProfileSection } from '../components/settings/ProfileSection';
import { AccountSettings } from '../components/settings/AccountSettings';
import { SecuritySettings } from '../components/settings/SecuritySettings';
import { AppSettings } from '../components/settings/AppSettings';
import { AboutSection } from '../components/settings/AboutSection';
import { getMe, getUserProfile, updateUserProfile, getUserPreferences, updateUserPreferences } from '../api/client';
import { getUserInfo } from '../lib/telegram';
import { getFriendlyErrorMessage } from '../lib/errorMessages';
import { closeApp } from '../lib/telegram';
import { useOnboarding } from '../hooks/useOnboarding';
import styles from './SettingsScreen.module.css';

export function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [preferences, setPreferences] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'account' | 'security' | 'app' | 'about'>('profile');
  const { showError: showToastError, showSuccess } = useToast();
  const { resetOnboarding } = useOnboarding();

  const telegramUser = getUserInfo();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [meRes, profileRes, preferencesRes] = await Promise.all([
        getMe(),
        getUserProfile().catch(() => null),
        getUserPreferences().catch(() => null),
      ]);
      
      setProfile({
        ...meRes.user,
        wallet: meRes.wallet,
        ...(profileRes || {}),
      });
      setPreferences(preferencesRes || {});
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      setError(errorMessage);
      showToastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: any) => {
    try {
      const updated = await updateUserProfile(updates);
      setProfile((prev: any) => ({ ...prev, ...updated }));
      showSuccess('Profile updated successfully');
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      showToastError(errorMessage);
      throw err;
    }
  };

  const handleUpdatePreferences = async (updates: any) => {
    try {
      const updated = await updateUserPreferences(updates);
      setPreferences((prev: any) => ({ ...prev, ...updated }));
      showSuccess('Preferences updated successfully');
    } catch (err) {
      const errorMessage = getFriendlyErrorMessage(err as Error);
      showToastError(errorMessage);
      throw err;
    }
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      closeApp();
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  if (error && !profile) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <PullToRefresh onRefresh={loadData}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
        <div className={styles.headerContent}>
          <SettingsIcon size={24} color="var(--brand-primary)" />
          <h1 className={styles.title}>Settings</h1>
        </div>
      </div>

      {/* Section Navigation */}
      <div className={styles.sectionNav}>
        <button
          className={`${styles.sectionNavButton} ${activeSection === 'profile' ? styles.active : ''}`}
          onClick={() => setActiveSection('profile')}
        >
          Profile
        </button>
        <button
          className={`${styles.sectionNavButton} ${activeSection === 'account' ? styles.active : ''}`}
          onClick={() => setActiveSection('account')}
        >
          Account
        </button>
        <button
          className={`${styles.sectionNavButton} ${activeSection === 'security' ? styles.active : ''}`}
          onClick={() => setActiveSection('security')}
        >
          Security
        </button>
        <button
          className={`${styles.sectionNavButton} ${activeSection === 'app' ? styles.active : ''}`}
          onClick={() => setActiveSection('app')}
        >
          App
        </button>
        <button
          className={`${styles.sectionNavButton} ${activeSection === 'about' ? styles.active : ''}`}
          onClick={() => setActiveSection('about')}
        >
          About
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeSection === 'profile' && (
          <ProfileSection
            profile={profile}
            telegramUser={telegramUser}
            onUpdate={handleUpdateProfile}
          />
        )}
        {activeSection === 'account' && (
          <AccountSettings
            profile={profile}
            onUpdate={handleUpdateProfile}
          />
        )}
        {activeSection === 'security' && (
          <SecuritySettings
            profile={profile}
            onUpdate={handleUpdateProfile}
          />
        )}
        {activeSection === 'app' && (
          <AppSettings
            preferences={preferences}
            onUpdate={handleUpdatePreferences}
            onResetOnboarding={resetOnboarding}
          />
        )}
        {activeSection === 'about' && (
          <AboutSection />
        )}
      </div>

      {/* Logout Button */}
      <div className={styles.logoutSection}>
        <Button
          variant="danger"
          fullWidth
          onClick={handleLogout}
        >
          Logout
        </Button>
      </div>
      </div>
    </PullToRefresh>
  );
}

