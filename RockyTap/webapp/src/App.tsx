import { useEffect, useState, lazy } from 'react';
import { Layout } from './components/Layout';
import { TabId, ToastProvider, LazyScreen } from './components/ui';
import { GhidarLogo } from './components/GhidarLogo';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useOnboarding } from './hooks/useOnboarding';
import { 
  setupTelegramTheme, 
  signalReady, 
  waitForTelegramSdk,
  isSdkReady,
  getInitData,
  getSdkDebugInfo 
} from './lib/telegram';
import { checkApiHealth } from './api/client';
import styles from './App.module.css';

// Lazy load screens for code splitting
const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })));
const LotteryScreen = lazy(() => import('./screens/LotteryScreen').then(m => ({ default: m.LotteryScreen })));
const AirdropScreen = lazy(() => import('./screens/AirdropScreen').then(m => ({ default: m.AirdropScreen })));
const AITraderScreen = lazy(() => import('./screens/AITraderScreen').then(m => ({ default: m.AITraderScreen })));
const ReferralScreen = lazy(() => import('./screens/ReferralScreen').then(m => ({ default: m.ReferralScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

type AppState = 'loading' | 'ready' | 'no_auth' | 'error';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [appState, setAppState] = useState<AppState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      console.log('[Ghidar] Starting app initialization...');
      console.log('[Ghidar] Environment:', import.meta.env.DEV ? 'development' : 'production');
      console.log('[Ghidar] Current URL:', window.location.href);
      
      // Check if we're in an iframe (typical for Telegram Mini Apps)
      const isInIframe = window !== window.parent;
      console.log('[Ghidar] Running in iframe:', isInIframe);
      
      // Run API health check first to verify connectivity
      console.log('[Ghidar] Running API health check...');
      const healthResult = await checkApiHealth();
      console.log('[Ghidar] API health check result:', healthResult);
      
      if (!healthResult.ok) {
        console.error('[Ghidar] API health check failed:', healthResult.error);
      }
      
      // Check initial SDK state
      const initialSdkState = {
        telegramExists: typeof window !== 'undefined' && !!window.Telegram,
        webAppExists: typeof window !== 'undefined' && !!window.Telegram?.WebApp,
        initDataExists: typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData,
        initDataLength: window.Telegram?.WebApp?.initData?.length || 0
      };
      console.log('[Ghidar] Initial SDK state:', initialSdkState);

      // If SDK is already ready with initData, proceed immediately
      if (isSdkReady()) {
        console.log('[Ghidar] SDK already ready with initData');
        setupTelegramTheme();
        signalReady();
        if (mounted) setAppState('ready');
        return;
      }

      // Wait for SDK to be ready (with polling)
      console.log('[Ghidar] Waiting for Telegram SDK...');
      const sdkReady = await waitForTelegramSdk(5000, 100); // Wait up to 5 seconds
      
      if (!mounted) return;

      if (sdkReady) {
        console.log('[Ghidar] SDK is ready with initData');
        console.log('[Ghidar] initData length:', getInitData().length);
        setupTelegramTheme();
        signalReady();
        setAppState('ready');
      } else {
        // SDK not ready after timeout
        console.warn('[Ghidar] SDK timeout - initData not available');
        
        // Check if SDK is loaded but just missing initData
        const hasWebApp = typeof window !== 'undefined' && !!window.Telegram?.WebApp;
        
        if (hasWebApp) {
          // SDK is loaded but initData is empty
          // This could mean the app was opened directly in browser
          console.warn('[Ghidar] Telegram WebApp exists but initData is empty');
          
          // Setup theme anyway for visual consistency
          setupTelegramTheme();
          signalReady();
          
          if (import.meta.env.DEV) {
            // In development, allow app to run for UI testing
            console.warn('[Ghidar] Development mode - allowing app to run without auth');
            setAppState('ready');
          } else {
            // In production, show auth error with debug info
            const info = getSdkDebugInfo();
            setDebugInfo(JSON.stringify(info, null, 2));
            setAppState('no_auth');
            setErrorMessage('Telegram authentication data not received. Please open this app from the Telegram bot.');
          }
        } else {
          // No Telegram SDK at all
          console.warn('[Ghidar] Telegram SDK not found');
          
          if (import.meta.env.DEV) {
            // Create mock for development
            console.warn('[Ghidar] Creating mock Telegram SDK for development');
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
            setAppState('ready');
          } else {
            const info = getSdkDebugInfo();
            setDebugInfo(JSON.stringify(info, null, 2));
            setAppState('no_auth');
            setErrorMessage('This app must be opened from Telegram.');
          }
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  // Hide the initial HTML loader when app is ready
  useEffect(() => {
    if (appState !== 'loading') {
      const loader = document.getElementById('loader');
      if (loader) {
        loader.style.display = 'none';
      }
    }
  }, [appState]);

  const handleNavigate = (tab: TabId) => {
    setActiveTab(tab);
  };

  // Loading state - show while waiting for SDK
  if (appState === 'loading') {
    return (
      <div className={styles.authError}>
        <div className={styles.authContent}>
          <div className={styles.authLogoWrapper}>
            <GhidarLogo size="xl" showText={false} animate />
          </div>
          <h1 className={styles.authTitle}>Ghidar</h1>
          <p className={styles.authMessage}>
            Connecting to Telegram...
          </p>
          <div className={styles.loadingSpinner} />
        </div>
        <div className={styles.authBackground} />
      </div>
    );
  }

  // Auth error state
  if (appState === 'no_auth' || appState === 'error') {
    return (
      <div className={styles.authError}>
        <div className={styles.authContent}>
          <div className={styles.authLogoWrapper}>
            <GhidarLogo size="xl" showText={false} animate />
          </div>
          <h1 className={styles.authTitle}>Ghidar</h1>
          <p className={styles.authMessage}>
            {errorMessage || 'Please open Ghidar from the Telegram bot to use the app.'}
          </p>
          <p className={styles.authHint}>
            This Mini App requires Telegram authentication.
          </p>
          <button 
            className={styles.retryButton}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
          {debugInfo && (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setShowDebug(!showDebug)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.5)',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showDebug ? 'Hide' : 'Show'} Debug Info
              </button>
              {showDebug && (
                <pre style={{
                  marginTop: '12px',
                  padding: '12px',
                  background: 'rgba(0,0,0,0.5)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#10b981',
                  textAlign: 'left',
                  overflow: 'auto',
                  maxHeight: '200px',
                  wordBreak: 'break-all'
                }}>
                  {debugInfo}
                </pre>
              )}
            </div>
          )}
        </div>
        <div className={styles.authBackground} />
      </div>
    );
  }

  // Show onboarding if needed (only after auth check passes)
  if (appState === 'ready' && showOnboarding && !onboardingLoading) {
    return (
      <OnboardingFlow
        onComplete={completeOnboarding}
        onSkip={completeOnboarding}
      />
    );
  }

  // Render the appropriate screen based on active tab
  const renderScreen = () => {
    if (activeTab === 'home') {
      return (
        <LazyScreen>
          <HomeScreen onNavigate={handleNavigate} />
        </LazyScreen>
      );
    }

    const ScreenComponent = (() => {
      switch (activeTab) {
        case 'lottery':
          return LotteryScreen;
        case 'airdrop':
          return AirdropScreen;
        case 'trader':
          return AITraderScreen;
        case 'referral':
          return ReferralScreen;
        case 'settings':
          return SettingsScreen;
        default:
          return HomeScreen;
      }
    })();

    return (
      <LazyScreen>
        <ScreenComponent onNavigate={handleNavigate} />
      </LazyScreen>
    );
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
