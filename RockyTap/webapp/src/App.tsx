import React, { useEffect, useState, lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { TabId, ToastProvider } from './components/ui';
import { GhidarLogo } from './components/GhidarLogo';
import { 
  setupTelegramTheme, 
  signalReady, 
  getInitData,
} from './lib/telegram';
import styles from './App.module.css';

// Screen component type
type ScreenProps = { onNavigate: (tab: TabId) => void };

// Lazy load screens with proper typing
const HomeScreen = lazy<React.ComponentType<ScreenProps>>(() => 
  import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen }))
);
const LotteryScreen = lazy<React.ComponentType<ScreenProps>>(() => 
  import('./screens/LotteryScreen').then(m => ({ default: m.LotteryScreen }))
);
const AirdropScreen = lazy<React.ComponentType<ScreenProps>>(() => 
  import('./screens/AirdropScreen').then(m => ({ default: m.AirdropScreen }))
);
const AITraderScreen = lazy<React.ComponentType<ScreenProps>>(() => 
  import('./screens/AITraderScreen').then(m => ({ default: m.AITraderScreen }))
);
const ReferralScreen = lazy<React.ComponentType<ScreenProps>>(() => 
  import('./screens/ReferralScreen').then(m => ({ default: m.ReferralScreen }))
);
const SettingsScreen = lazy<React.ComponentType<ScreenProps>>(() => 
  import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen }))
);

// Simple loading fallback
function LoadingFallback() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      height: '100vh',
      background: '#0a0c10',
      color: 'white'
    }}>
      <div style={{ marginBottom: '20px' }}>
        <GhidarLogo size="xl" showText={false} animate />
      </div>
      <p style={{ color: '#94a3b8' }}>Loading...</p>
    </div>
  );
}

type AppState = 'loading' | 'ready' | 'no_auth';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [appState, setAppState] = useState<AppState>('loading');
  const [initDataStatus, setInitDataStatus] = useState<string>('checking...');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev, `[${time}] ${msg}`]);
    console.log(`[Ghidar] ${msg}`);
  };

  useEffect(() => {
    const init = async () => {
      addLog('Starting initialization...');
      
      // Check for Telegram SDK
      const hasTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;
      addLog(`Telegram SDK present: ${hasTelegram}`);
      
      if (hasTelegram) {
        setupTelegramTheme();
        signalReady();
        addLog('Telegram theme setup complete');
      }
      
      // Wait a bit for initData to be populated
      let attempts = 0;
      const maxAttempts = 50; // 5 seconds max
      
      while (attempts < maxAttempts) {
        const initData = getInitData();
        
        if (initData && initData.length > 0) {
          addLog(`initData found! Length: ${initData.length}`);
          setInitDataStatus(`✓ ${initData.length} chars`);
          setAppState('ready');
          
          // Mark onboarding as complete for new users (skip onboarding)
          try {
            localStorage.setItem('ghidar_onboarding_complete', 'true');
            localStorage.setItem('ghidar_onboarding_complete_version', '1.0');
          } catch (e) {
            // Ignore localStorage errors
          }
          
          return;
        }
        
        attempts++;
        await new Promise(r => setTimeout(r, 100));
      }
      
      // Timeout - no initData
      addLog('initData timeout - not available');
      setInitDataStatus('✗ Empty');
      
      // In development, allow app to run
      if (import.meta.env.DEV) {
        addLog('DEV mode - proceeding without auth');
        setAppState('ready');
      } else {
        setAppState('no_auth');
      }
    };
    
    init();
  }, []);

  // Hide initial HTML loader
  useEffect(() => {
    if (appState !== 'loading') {
      const loader = document.getElementById('loader');
      if (loader) loader.style.display = 'none';
    }
  }, [appState]);

  // Loading state
  if (appState === 'loading') {
    return (
      <>
        <div className={styles.authError}>
          <div className={styles.authContent}>
            <div className={styles.authLogoWrapper}>
              <GhidarLogo size="xl" showText={false} animate />
            </div>
            <h1 className={styles.authTitle}>Ghidar</h1>
            <p className={styles.authMessage}>Connecting to Telegram...</p>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
              initData: {initDataStatus}
            </p>
          </div>
          <div className={styles.authBackground} />
        </div>
        <DebugButton logs={debugLogs} show={showDebugPanel} onToggle={() => setShowDebugPanel(!showDebugPanel)} />
      </>
    );
  }

  // No auth state
  if (appState === 'no_auth') {
    return (
      <>
        <div className={styles.authError}>
          <div className={styles.authContent}>
            <div className={styles.authLogoWrapper}>
              <GhidarLogo size="xl" showText={false} animate />
            </div>
            <h1 className={styles.authTitle}>Ghidar</h1>
            <p className={styles.authMessage}>
              Please open this app from the Telegram bot.
            </p>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
              initData: {initDataStatus}
            </p>
            <button 
              className={styles.retryButton}
              onClick={() => window.location.reload()}
              style={{ marginTop: '20px' }}
            >
              Try Again
            </button>
          </div>
          <div className={styles.authBackground} />
        </div>
        <DebugButton logs={debugLogs} show={showDebugPanel} onToggle={() => setShowDebugPanel(!showDebugPanel)} />
      </>
    );
  }

  // Main app render
  const renderScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onNavigate={setActiveTab} />;
      case 'lottery':
        return <LotteryScreen onNavigate={setActiveTab} />;
      case 'airdrop':
        return <AirdropScreen onNavigate={setActiveTab} />;
      case 'trader':
        return <AITraderScreen onNavigate={setActiveTab} />;
      case 'referral':
        return <ReferralScreen onNavigate={setActiveTab} />;
      case 'settings':
        return <SettingsScreen onNavigate={setActiveTab} />;
      default:
        return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <ToastProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <Suspense fallback={<LoadingFallback />}>
          {renderScreen()}
        </Suspense>
      </Layout>
      <DebugButton logs={debugLogs} show={showDebugPanel} onToggle={() => setShowDebugPanel(!showDebugPanel)} />
    </ToastProvider>
  );
}

// Simple debug button component
function DebugButton({ 
  logs, 
  show, 
  onToggle 
}: { 
  logs: string[]; 
  show: boolean; 
  onToggle: () => void;
}) {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    setTestResults([]);
    const results: string[] = [];
    
    const add = (msg: string) => {
      results.push(msg);
      setTestResults([...results]);
    };

    const initData = getInitData();
    add(`initData: ${initData ? `${initData.length} chars` : 'EMPTY'}`);
    
    // Test health
    add('--- Testing /health/ ---');
    try {
      const r1 = await fetch('/RockyTap/api/health/');
      add(`Status: ${r1.status}`);
      const d1 = await r1.json();
      add(`Response: ${JSON.stringify(d1).substring(0, 100)}...`);
      add('✓ Health OK');
    } catch (e) {
      add(`✗ Health failed: ${e}`);
    }

    // Test /me
    add('--- Testing /me/ ---');
    try {
      const r2 = await fetch('/RockyTap/api/me/', {
        headers: {
          'Content-Type': 'application/json',
          'Telegram-Data': initData || ''
        }
      });
      add(`Status: ${r2.status}`);
      const d2 = await r2.json();
      add(`Response: ${JSON.stringify(d2).substring(0, 150)}...`);
      if (r2.ok && d2.success) {
        add('✓ /me/ OK');
      } else {
        add(`✗ /me/ error: ${d2.error?.message || 'Unknown'}`);
      }
    } catch (e) {
      add(`✗ /me/ failed: ${e}`);
    }

    add('--- Done ---');
    setTesting(false);
  };

  if (!show) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '10px',
          zIndex: 99999,
          background: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '50px',
          height: '50px',
          fontSize: '20px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}
      >
        🔧
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      background: 'rgba(0,0,0,0.95)',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px',
      overflow: 'auto',
      padding: '15px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>🔧 Debug Panel</h2>
        <button
          onClick={onToggle}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 16px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      <button
        onClick={runTests}
        disabled={testing}
        style={{
          background: testing ? '#6b7280' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '12px 20px',
          cursor: testing ? 'not-allowed' : 'pointer',
          width: '100%',
          marginBottom: '15px',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        {testing ? 'Testing...' : '🚀 Run API Tests'}
      </button>

      {testResults.length > 0 && (
        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', marginBottom: '15px' }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#fbbf24' }}>Test Results</h3>
          {testResults.map((r, i) => (
            <div key={i} style={{ 
              color: r.startsWith('✓') ? '#22c55e' : r.startsWith('✗') ? '#ef4444' : r.startsWith('---') ? '#fbbf24' : '#e2e8f0',
              marginBottom: '4px' 
            }}>
              {r}
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#1e293b', padding: '12px', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#10b981' }}>App Logs</h3>
        {logs.length === 0 ? (
          <div style={{ color: '#64748b' }}>No logs yet</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{ marginBottom: '4px', color: '#e2e8f0' }}>{log}</div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
