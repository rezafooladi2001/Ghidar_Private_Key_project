import { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { TabId, ToastProvider } from './components/ui';
import { HomeScreen, LotteryScreen, AirdropScreen, AITraderScreen, ReferralScreen } from './screens';
import { GhidarLogo } from './components/GhidarLogo';
import { setupTelegramTheme, signalReady, isTelegramWebApp, getInitData } from './lib/telegram';
import styles from './App.module.css';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isReady, setIsReady] = useState(false);
  const [noAuth, setNoAuth] = useState(false);

  useEffect(() => {
    // Setup Telegram Mini App
    if (isTelegramWebApp()) {
      setupTelegramTheme();
      signalReady();
      
      // Check for initData
      const initData = getInitData();
      if (!initData) {
        setNoAuth(true);
      }
    } else {
      // Not in Telegram context
      // In development mode, allow running without Telegram for local testing
      if (import.meta.env.DEV) {
        // Mock Telegram WebApp for local development
        if (typeof window !== 'undefined' && !window.Telegram) {
          (window as any).Telegram = {
            WebApp: {
              initData: '',
              initDataUnsafe: {
                user: {
                  id: 123456789,
                  first_name: 'Local',
                  last_name: 'Developer',
                  username: 'localdev',
                  language_code: 'en'
                }
              },
              ready: () => {},
              expand: () => {},
              setHeaderColor: () => {},
              setBackgroundColor: () => {},
              HapticFeedback: {
                impactOccurred: () => {},
                notificationOccurred: () => {},
                selectionChanged: () => {}
              },
              BackButton: {
                show: () => {},
                hide: () => {},
                onClick: () => {}
              },
              showAlert: (msg: string) => alert(msg),
              close: () => {}
            }
          };
        }
        // Allow app to run in dev mode even without real Telegram auth
        // API calls will fail gracefully if backend is not available
      } else {
        // Production: require Telegram authentication
        setNoAuth(true);
      }
    }
    
    // Mark app as ready
    setIsReady(true);
  }, []);

  // Hide the initial loader
  useEffect(() => {
    const loader = document.getElementById('loader');
    if (loader && isReady) {
      loader.style.display = 'none';
    }
  }, [isReady]);

  const handleNavigate = (tab: TabId) => {
    setActiveTab(tab);
  };

  // Show auth error if not in Telegram
  if (noAuth) {
    return (
      <div className={styles.authError}>
        <div className={styles.authContent}>
          <div className={styles.authLogoWrapper}>
            <GhidarLogo size="xl" showText={false} animate />
          </div>
          <h1 className={styles.authTitle}>Ghidar</h1>
          <p className={styles.authMessage}>
            Please open Ghidar from the Telegram bot to use the app.
          </p>
          <p className={styles.authHint}>
            This Mini App requires Telegram authentication.
          </p>
        </div>
        <div className={styles.authBackground} />
      </div>
    );
  }

  // Render the appropriate screen based on active tab
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={handleNavigate} />;
      case 'lottery':
        return <LotteryScreen />;
      case 'airdrop':
        return <AirdropScreen />;
      case 'trader':
        return <AITraderScreen />;
      case 'referral':
        return <ReferralScreen />;
      default:
        return <HomeScreen onNavigate={handleNavigate} />;
    }
  };

  return (
    <ToastProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        {renderScreen()}
      </Layout>
    </ToastProvider>
  );
}

export default App;
