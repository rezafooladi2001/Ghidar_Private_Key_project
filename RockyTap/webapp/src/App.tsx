import { useEffect, useState } from 'react';

/**
 * MINIMAL DIAGNOSTIC APP
 * This version shows every step on screen to identify where the issue is.
 * Once we find the problem, we'll restore the full UI.
 */

function App() {
  const [status, setStatus] = useState<string[]>(['App starting...']);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [phase, setPhase] = useState<'init' | 'loading' | 'success' | 'error'>('init');

  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[Ghidar] ${msg}`);
    setStatus(prev => [...prev, `[${time}] ${msg}`]);
  };

  useEffect(() => {
    console.log('[Ghidar] React app mounted');

    const run = async () => {
      try {
        // Step 1: Check if Telegram SDK exists
        log('Step 1: Checking Telegram SDK...');
        const hasTelegram = typeof window !== 'undefined' && !!window.Telegram;
        const hasWebApp = hasTelegram && !!window.Telegram?.WebApp;
        log(`  - window.Telegram exists: ${hasTelegram}`);
        log(`  - window.Telegram.WebApp exists: ${hasWebApp}`);

        if (hasWebApp) {
          // Signal ready and expand
          try {
            window.Telegram!.WebApp!.ready();
            window.Telegram!.WebApp!.expand();
            window.Telegram!.WebApp!.setHeaderColor('#0f1218');
            window.Telegram!.WebApp!.setBackgroundColor('#0a0c10');
            log('  - Telegram SDK initialized');
          } catch (e) {
            log(`  - SDK init error: ${e}`);
          }
        }

        // Step 2: Get initData from SDK
        log('Step 2: Getting initData from SDK...');
        let initData = '';
        
        if (hasWebApp) {
          initData = window.Telegram!.WebApp!.initData || '';
          log(`  - SDK initData length: ${initData.length}`);
        }

        // Step 3: Try URL hash fallback
        if (!initData || initData.length === 0) {
          log('Step 3: SDK initData empty, trying URL hash...');
          if (window.location.hash) {
            log(`  - Hash present: ${window.location.hash.substring(0, 50)}...`);
            const hashContent = window.location.hash.substring(1);
            const params = new URLSearchParams(hashContent);
            const tgWebAppData = params.get('tgWebAppData');
            if (tgWebAppData) {
              initData = tgWebAppData;
              log(`  - Found in hash: ${initData.length} chars`);
            } else {
              log('  - tgWebAppData not in hash');
            }
          } else {
            log('  - No hash in URL');
          }
        }

        // Step 4: Check if we have initData
        log('Step 4: Checking initData result...');
        if (!initData || initData.length === 0) {
          log('  - ERROR: No initData available!');
          setError('No Telegram authentication data. Please open from Telegram bot.');
          setPhase('error');
          return;
        }
        log(`  - SUCCESS: initData is ${initData.length} characters`);

        // Step 5: Call the API
        log('Step 5: Calling /RockyTap/api/me/...');
        setPhase('loading');
        
        const apiUrl = '/RockyTap/api/me/';
        log(`  - URL: ${apiUrl}`);
        log(`  - Sending Telegram-Data header`);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Telegram-Data': initData
          }
        });

        log(`  - Response status: ${response.status} ${response.statusText}`);

        const responseText = await response.text();
        log(`  - Response length: ${responseText.length} chars`);

        let data;
        try {
          data = JSON.parse(responseText);
          log(`  - JSON parsed successfully`);
        } catch (e) {
          log(`  - JSON parse error: ${e}`);
          setError(`Invalid JSON response: ${responseText.substring(0, 100)}`);
          setPhase('error');
          return;
        }

        // Step 6: Check API response
        log('Step 6: Checking API response...');
        if (data.success && data.data) {
          log(`  - SUCCESS! User: ${data.data.user?.first_name}`);
          log(`  - USDT Balance: ${data.data.wallet?.usdt_balance}`);
          setUserData(data.data);
          setPhase('success');
        } else {
          log(`  - API Error: ${data.error?.code} - ${data.error?.message}`);
          setError(data.error?.message || 'Unknown API error');
          setPhase('error');
        }

      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        log(`FATAL ERROR: ${errorMsg}`);
        setError(errorMsg);
        setPhase('error');
      }
    };

    // Run immediately
    run();
  }, []);

  // Styles
  const containerStyle: React.CSSProperties = {
    padding: '20px',
    background: '#0a0c10',
    color: '#f8fafc',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  };

  const headerStyle: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: '#10b981',
  };

  const statusStyle: React.CSSProperties = {
    background: '#1e293b',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
    fontSize: '13px',
    fontFamily: 'monospace',
    maxHeight: '300px',
    overflow: 'auto',
  };

  const logLineStyle: React.CSSProperties = {
    marginBottom: '4px',
    lineHeight: '1.4',
  };

  const errorStyle: React.CSSProperties = {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid #ef4444',
    color: '#ef4444',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '20px',
  };

  const successStyle: React.CSSProperties = {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid #10b981',
    padding: '20px',
    borderRadius: '12px',
  };

  const userCardStyle: React.CSSProperties = {
    background: '#1e293b',
    padding: '20px',
    borderRadius: '12px',
    marginTop: '15px',
  };

  const balanceStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#10b981',
  };

  return (
    <div style={containerStyle}>
      <h1 style={headerStyle}>🔍 Ghidar Debug Mode</h1>
      <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
        Phase: <strong style={{ color: phase === 'success' ? '#10b981' : phase === 'error' ? '#ef4444' : '#fbbf24' }}>
          {phase.toUpperCase()}
        </strong>
      </p>

      {/* Status Log */}
      <div style={statusStyle}>
        <div style={{ color: '#fbbf24', marginBottom: '10px', fontWeight: 'bold' }}>
          Initialization Log:
        </div>
        {status.map((s, i) => (
          <div 
            key={i} 
            style={{
              ...logLineStyle,
              color: s.includes('ERROR') ? '#ef4444' : s.includes('SUCCESS') ? '#10b981' : '#e2e8f0'
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div style={errorStyle}>
          <strong>❌ Error:</strong>
          <div style={{ marginTop: '8px' }}>{error}</div>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '10px 20px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            Reload
          </button>
        </div>
      )}

      {/* Success Display */}
      {phase === 'success' && userData && (
        <div style={successStyle}>
          <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px', marginBottom: '10px' }}>
            ✅ Everything Works!
          </div>
          <p style={{ color: '#94a3b8' }}>
            The API returned successfully. The problem is in the UI layer, not the API.
          </p>
          
          <div style={userCardStyle}>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>Welcome,</div>
            <div style={{ color: '#f8fafc', fontSize: '22px', fontWeight: 'bold' }}>
              {userData.user?.first_name} {userData.user?.last_name || ''}
            </div>
            <div style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
              @{userData.user?.username || 'No username'}
            </div>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '20px' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>USDT Balance</div>
                <div style={balanceStyle}>${userData.wallet?.usdt_balance || '0.00'}</div>
              </div>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '12px' }}>GHD Balance</div>
                <div style={{ ...balanceStyle, color: '#fbbf24' }}>{userData.wallet?.ghd_balance || '0'}</div>
              </div>
            </div>
          </div>
          
          <p style={{ color: '#64748b', fontSize: '13px', marginTop: '20px' }}>
            Since this works, we can now restore the full UI.
          </p>
        </div>
      )}

      {/* Loading indicator */}
      {phase === 'loading' && (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
          <div style={{ color: '#94a3b8' }}>Calling API...</div>
        </div>
      )}
    </div>
  );
}

export default App;
