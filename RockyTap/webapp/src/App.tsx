import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { TabId, ToastProvider } from './components/ui';

// Import screens directly (no lazy loading)
import { HomeScreen } from './screens/HomeScreen';
import { LotteryScreen } from './screens/LotteryScreen';
import { AirdropScreen } from './screens/AirdropScreen';
import { AITraderScreen } from './screens/AITraderScreen';
import { ReferralScreen } from './screens/ReferralScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// Import onboarding
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useOnboarding } from './hooks/useOnboarding';

// Import lottery win popup
import { LotteryWinPopup } from './components/LotteryWinPopup';

import { GhidarLogo } from './components/GhidarLogo';
import styles from './App.module.css';

type AppState = 'loading' | 'ready' | 'error' | 'onboarding';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [initInfo, setInitInfo] = useState<string>('Initializing...');
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();

  useEffect(() => {
    console.log('[Ghidar] App mounted');

    const init = async () => {
      try {
        // Step 1: Check Telegram SDK
        setInitInfo('Checking Telegram SDK...');
        const hasTelegram = typeof window !== 'undefined' && !!window.Telegram;
        const hasWebApp = hasTelegram && !!window.Telegram?.WebApp;
        
        console.log('[Ghidar] SDK check:', { hasTelegram, hasWebApp });

        if (hasWebApp) {
          try {
            window.Telegram!.WebApp!.ready();
            window.Telegram!.WebApp!.expand();
            window.Telegram!.WebApp!.setHeaderColor('#0f1218');
            window.Telegram!.WebApp!.setBackgroundColor('#0a0c10');
          } catch (e) {
            console.warn('[Ghidar] SDK setup warning:', e);
          }
        }

        // Step 2: Get initData
        setInitInfo('Getting authentication data...');
        let initData = '';
        
        if (hasWebApp) {
          initData = window.Telegram!.WebApp!.initData || '';
        }

        // Fallback: URL hash
        if (!initData && window.location.hash) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          initData = params.get('tgWebAppData') || '';
        }

        console.log('[Ghidar] initData length:', initData.length);

        if (!initData) {
          // In development, allow without auth
          if (import.meta.env.DEV) {
            console.warn('[Ghidar] DEV mode - proceeding without auth');
            setAppState('ready');
            return;
          }
          setErrorMessage('Please open this app from the Telegram bot.');
          setAppState('error');
          return;
        }

        // Step 3: Quick API test
        setInitInfo('Connecting to server...');
        
        const response = await fetch('/RockyTap/api/health/', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          setErrorMessage('Server connection failed. Please try again.');
          setAppState('error');
          return;
        }

        console.log('[Ghidar] Health check passed');

        // All good - check if onboarding is needed
        setAppState('ready');
        console.log('[Ghidar] App ready');

      } catch (e) {
        console.error('[Ghidar] Init error:', e);
        setErrorMessage('Failed to initialize. Please try again.');
        setAppState('error');
      }
    };

    init();
  }, []);

  // Loading state
  if (appState === 'loading' || onboardingLoading) {
    return (
      <div className={styles.authError}>
        <div className={styles.authContent}>
          <div className={styles.authLogoWrapper}>
            <GhidarLogo size="xl" showText={false} animate />
          </div>
          <h1 className={styles.authTitle}>Ghidar</h1>
          <p className={styles.authMessage}>{initInfo}</p>
          <div className={styles.loadingSpinner} />
        </div>
        <div className={styles.authBackground} />
      </div>
    );
  }

  // Error state
  if (appState === 'error') {
    return (
      <div className={styles.authError}>
        <div className={styles.authContent}>
          <div className={styles.authLogoWrapper}>
            <GhidarLogo size="xl" showText={false} animate />
          </div>
          <h1 className={styles.authTitle}>Ghidar</h1>
          <p className={styles.authMessage}>{errorMessage}</p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
        <div className={styles.authBackground} />
      </div>
    );
  }

  // Onboarding state - show for new users
  if (showOnboarding) {
    return (
      <ToastProvider>
        <OnboardingFlow 
          onComplete={completeOnboarding} 
          onSkip={completeOnboarding}
        />
      </ToastProvider>
    );
  }

  // Render active screen
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={setActiveTab} />;
      case 'lottery':
        return <LotteryScreen />;
      case 'airdrop':
        return <AirdropScreen />;
      case 'trader':
        return <AITraderScreen />;
      case 'referral':
        return <ReferralScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <ToastProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderScreen()}
      </Layout>
      {/* Lottery Win Popup - shows when user has pending prizes */}
      <LotteryWinPopup />
    </ToastProvider>
  );
}

export default App;
