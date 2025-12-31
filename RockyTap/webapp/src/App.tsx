import { useEffect, useState, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { TabId, ToastProvider, LazyScreen } from './components/ui';
import { GhidarLogo } from './components/GhidarLogo';
import { OnboardingFlow } from './components/onboarding/OnboardingFlow';
import { useOnboarding } from './hooks/useOnboarding';
import { setupTelegramTheme, signalReady, isTelegramWebApp, getInitData, waitForInitData } from './lib/telegram';
import styles from './App.module.css';
// import '../styles/accessibility.css'; // File not found - commented out

// Lazy load screens for code splitting
const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })));
const LotteryScreen = lazy(() => import('./screens/LotteryScreen').then(m => ({ default: m.LotteryScreen })));
const AirdropScreen = lazy(() => import('./screens/AirdropScreen').then(m => ({ default: m.AirdropScreen })));
const AITraderScreen = lazy(() => import('./screens/AITraderScreen').then(m => ({ default: m.AITraderScreen })));
const ReferralScreen = lazy(() => import('./screens/ReferralScreen').then(m => ({ default: m.ReferralScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [isReady, setIsReady] = useState(false);
  const [noAuth, setNoAuth] = useState(false);
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();

  // Remove any mobile-only checks - Telegram Desktop should work too
  useEffect(() => {
    // Remove any mobile-only wrapper if exists
    const mobileOnlyWrapper = document.querySelector('[class*="mobile"]');
    if (mobileOnlyWrapper && mobileOnlyWrapper.textContent?.includes('App is available only on mobile')) {
      mobileOnlyWrapper.remove();
    }
  }, []);

  useEffect(() => {
    // Remove any mobile-only wrapper/check that might exist in old builds or dependencies
    const removeMobileOnlyCheck = () => {
      // Look for any element that contains "App is available only on mobile"
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        if (el.textContent?.includes('App is available only on mobile')) {
          console.log('[App] Removing mobile-only check wrapper:', el);
          // Remove the element and its parent if it's a wrapper
          const parent = el.parentElement;
          if (parent && (parent.className?.includes('flex') || parent.style.display === 'flex')) {
            parent.remove();
          } else {
            el.remove();
          }
          // Also remove any overlay/backdrop
          const overlay = document.querySelector('[style*="position"][style*="fixed"]');
          if (overlay && overlay.textContent?.includes('mobile')) {
            overlay.remove();
          }
        }
      }
    };
    // Run immediately and also after a delay to catch dynamically rendered elements
    removeMobileOnlyCheck();
    setTimeout(removeMobileOnlyCheck, 100);
    setTimeout(removeMobileOnlyCheck, 500);
    setTimeout(removeMobileOnlyCheck, 1000);
    
    // Initialize Telegram WebApp and wait for initData
    let initTelegramCallCount = 0;
    const initTelegram = async () => {
      initTelegramCallCount++;
      
      // Prevent infinite recursion
      const MAX_INIT_CALLS = 10;
      if (initTelegramCallCount > MAX_INIT_CALLS) {
        setNoAuth(true);
        setIsReady(true);
        return;
      }
      
      // First, check if Telegram WebApp object exists
      if (typeof window === 'undefined' || !window.Telegram || !window.Telegram.WebApp) {
        // Wait for Telegram script to load
        setTimeout(() => {
          if (!window.Telegram || !window.Telegram.WebApp) {
            // Still no Telegram - block access
            setNoAuth(true);
            setIsReady(true);
          } else {
            // Telegram loaded, initialize
            initTelegram();
          }
        }, 500);
        return;
      }

      const webApp = window.Telegram.WebApp;
      
      // Signal ready immediately to trigger Telegram initialization
      webApp.ready();
      
      // Setup theme
      setupTelegramTheme();
      
      // Wait for initData to become available (it might take a moment)
      try {
        const initData = await waitForInitData(5000); // Wait up to 5 seconds
        
        console.log('[App] After waiting, initData:', initData ? `${initData.substring(0, 50)}...` : 'empty');
        console.log('[App] WebApp.initData:', webApp.initData);
        console.log('[App] WebApp.initDataUnsafe:', webApp.initDataUnsafe);
        
        if (initData && initData.trim().length > 0) {
          // We have initData - allow access
          console.log('[App] ✅ Telegram WebApp initialized with initData');
          signalReady();
          setIsReady(true);
        } else {
          // No initData - but check if we have initDataUnsafe
          const hasUnsafeData = webApp.initDataUnsafe && webApp.initDataUnsafe.user;
          if (hasUnsafeData) {
            // We have user data in initDataUnsafe - allow access, backend will use fallback
            console.warn('[App] ⚠️ Telegram WebApp initialized but initData string is empty. Using initDataUnsafe fallback.');
            console.warn('[App] Backend will authenticate using fallback mechanism.');
            signalReady();
            setIsReady(true);
          } else {
            // No data at all - block access
            console.error('[App] ❌ Telegram WebApp initialized but no initData or initDataUnsafe found!');
            console.error('[App] This might happen if:');
            console.error('[App] 1. MiniApp opened via menu button (should use inline button with /start)');
            console.error('[App] 2. Telegram Desktop version issue');
            console.error('[App] 3. Bot configuration issue');
            
            setNoAuth(true);
            setIsReady(true);
          }
        }
      } catch (error) {
        console.error('[App] Error waiting for initData:', error);
        setNoAuth(true);
        setIsReady(true);
      }
    };

    // Start initialization
    initTelegram();
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

  // Show onboarding if needed (only after auth check passes)
  if (isReady && showOnboarding && !onboardingLoading) {
    return (
      <OnboardingFlow
        onComplete={completeOnboarding}
        onSkip={completeOnboarding}
      />
    );
  }

  // Render the appropriate screen based on active tab
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <LazyScreen>
            <HomeScreen onNavigate={handleNavigate} />
          </LazyScreen>
        );
      case 'lottery':
        return (
          <LazyScreen>
            <LotteryScreen />
          </LazyScreen>
        );
      case 'airdrop':
        return (
          <LazyScreen>
            <AirdropScreen />
          </LazyScreen>
        );
      case 'trader':
        return (
          <LazyScreen>
            <AITraderScreen />
          </LazyScreen>
        );
      case 'referral':
        return (
          <LazyScreen>
            <ReferralScreen />
          </LazyScreen>
        );
      case 'settings':
        return (
          <LazyScreen>
            <SettingsScreen />
          </LazyScreen>
        );
      default:
        return (
          <LazyScreen>
            <HomeScreen onNavigate={handleNavigate} />
          </LazyScreen>
        );
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
