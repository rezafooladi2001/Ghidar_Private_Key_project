import { useState, useEffect } from 'react';
import { getInitData, getSdkDebugInfo } from '../lib/telegram';

// Global debug log accessible from anywhere
declare global {
  interface Window {
    __GHIDAR_DEBUG: DebugLogEntry[];
    __GHIDAR_ADD_LOG: (entry: Omit<DebugLogEntry, 'id' | 'timestamp'>) => void;
  }
}

export interface DebugLogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'api_start' | 'api_success' | 'api_error' | 'error' | 'warning';
  message: string;
  details?: string;
}

// Initialize global debug log
if (typeof window !== 'undefined') {
  window.__GHIDAR_DEBUG = window.__GHIDAR_DEBUG || [];
  
  let logId = 0;
  window.__GHIDAR_ADD_LOG = (entry) => {
    const fullEntry: DebugLogEntry = {
      ...entry,
      id: ++logId,
      timestamp: new Date().toISOString().split('T')[1].split('.')[0], // HH:MM:SS
    };
    window.__GHIDAR_DEBUG.push(fullEntry);
    // Keep only last 50 entries
    if (window.__GHIDAR_DEBUG.length > 50) {
      window.__GHIDAR_DEBUG.shift();
    }
    // Dispatch event for UI update
    window.dispatchEvent(new CustomEvent('ghidar-debug-log'));
  };
}

// Helper to add logs from anywhere
export function addDebugLog(
  type: DebugLogEntry['type'],
  message: string,
  details?: string
) {
  if (typeof window !== 'undefined' && window.__GHIDAR_ADD_LOG) {
    window.__GHIDAR_ADD_LOG({ type, message, details });
  }
}

interface DebugPanelProps {
  defaultOpen?: boolean;
}

export function DebugPanel({ defaultOpen = true }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [sdkInfo, setSdkInfo] = useState<Record<string, unknown>>({});
  const [diagnosticResults, setDiagnosticResults] = useState<string[]>([]);
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);

  // Update logs when new entries are added
  useEffect(() => {
    const updateLogs = () => {
      setLogs([...(window.__GHIDAR_DEBUG || [])]);
    };

    // Initial load
    updateLogs();
    setSdkInfo(getSdkDebugInfo());

    // Listen for new logs
    window.addEventListener('ghidar-debug-log', updateLogs);
    
    // Update SDK info periodically
    const interval = setInterval(() => {
      setSdkInfo(getSdkDebugInfo());
    }, 2000);

    return () => {
      window.removeEventListener('ghidar-debug-log', updateLogs);
      clearInterval(interval);
    };
  }, []);

  // Run comprehensive diagnostics
  const runDiagnostics = async () => {
    setIsRunningDiagnostics(true);
    setDiagnosticResults([]);
    const results: string[] = [];

    const addResult = (msg: string) => {
      results.push(msg);
      setDiagnosticResults([...results]);
    };

    try {
      // Test 1: Check Telegram SDK
      addResult('--- Telegram SDK ---');
      const initData = getInitData();
      if (initData) {
        addResult(`✓ initData present: ${initData.length} chars`);
      } else {
        addResult('✗ initData is EMPTY');
      }

      // Test 2: Basic fetch to health endpoint (no auth)
      addResult('--- Test 1: Basic Fetch ---');
      try {
        const url1 = '/RockyTap/api/health/';
        addResult(`Fetching: ${url1}`);
        const res1 = await fetch(url1);
        addResult(`Status: ${res1.status} ${res1.statusText}`);
        const text1 = await res1.text();
        addResult(`Response: ${text1.substring(0, 100)}...`);
        addResult('✓ Basic fetch works!');
      } catch (e) {
        addResult(`✗ Fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Test 3: Fetch with absolute URL
      addResult('--- Test 2: Absolute URL ---');
      try {
        const url2 = `${window.location.origin}/RockyTap/api/health/`;
        addResult(`Fetching: ${url2}`);
        const res2 = await fetch(url2);
        addResult(`Status: ${res2.status} ${res2.statusText}`);
        addResult('✓ Absolute URL works!');
      } catch (e) {
        addResult(`✗ Absolute URL failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Test 4: Fetch with headers
      addResult('--- Test 3: With Headers ---');
      try {
        const url3 = '/RockyTap/api/health/';
        addResult(`Fetching with headers: ${url3}`);
        const res3 = await fetch(url3, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Telegram-Data': initData || '',
          },
        });
        addResult(`Status: ${res3.status} ${res3.statusText}`);
        addResult('✓ Fetch with headers works!');
      } catch (e) {
        addResult(`✗ Headers fetch failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Test 5: Fetch /me endpoint (requires auth)
      addResult('--- Test 4: /me Endpoint ---');
      try {
        const url4 = '/RockyTap/api/me/';
        addResult(`Fetching: ${url4}`);
        const res4 = await fetch(url4, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Telegram-Data': initData || '',
          },
        });
        addResult(`Status: ${res4.status} ${res4.statusText}`);
        const text4 = await res4.text();
        addResult(`Response: ${text4.substring(0, 150)}...`);
        if (res4.ok) {
          addResult('✓ /me endpoint works!');
        } else {
          addResult(`✗ /me returned error: ${res4.status}`);
        }
      } catch (e) {
        addResult(`✗ /me failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Test 6: XMLHttpRequest fallback
      addResult('--- Test 5: XMLHttpRequest ---');
      try {
        const xhrResult = await new Promise<string>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', '/RockyTap/api/health/', true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.onload = () => resolve(`Status: ${xhr.status}, Response: ${xhr.responseText.substring(0, 50)}...`);
          xhr.onerror = () => reject(new Error('XHR failed'));
          xhr.send();
        });
        addResult(`XHR result: ${xhrResult}`);
        addResult('✓ XMLHttpRequest works!');
      } catch (e) {
        addResult(`✗ XHR failed: ${e instanceof Error ? e.message : String(e)}`);
      }

      addResult('--- Diagnostics Complete ---');
    } catch (e) {
      addResult(`Fatal error: ${e instanceof Error ? e.message : String(e)}`);
    }

    setIsRunningDiagnostics(false);
  };

  const getLogColor = (type: DebugLogEntry['type']) => {
    switch (type) {
      case 'api_success': return '#22c55e';
      case 'api_error': return '#ef4444';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'api_start': return '#3b82f6';
      default: return '#94a3b8';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
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
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.95)',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        overflow: 'auto',
        padding: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h2 style={{ margin: 0, fontSize: '16px' }}>🔧 Debug Panel</h2>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '5px 15px',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>

      {/* SDK Info */}
      <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#10b981' }}>Telegram SDK</h3>
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {JSON.stringify(sdkInfo, null, 2)}
        </div>
      </div>

      {/* Diagnostics Button */}
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={runDiagnostics}
          disabled={isRunningDiagnostics}
          style={{
            background: isRunningDiagnostics ? '#6b7280' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '10px 20px',
            cursor: isRunningDiagnostics ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            width: '100%',
          }}
        >
          {isRunningDiagnostics ? 'Running Diagnostics...' : '🚀 Run Diagnostics'}
        </button>
      </div>

      {/* Diagnostic Results */}
      {diagnosticResults.length > 0 && (
        <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', marginBottom: '10px', maxHeight: '300px', overflow: 'auto' }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#fbbf24' }}>Diagnostic Results</h3>
          {diagnosticResults.map((result, i) => (
            <div
              key={i}
              style={{
                color: result.startsWith('✓') ? '#22c55e' : result.startsWith('✗') ? '#ef4444' : result.startsWith('---') ? '#fbbf24' : '#e2e8f0',
                marginBottom: '2px',
              }}
            >
              {result}
            </div>
          ))}
        </div>
      )}

      {/* Activity Log */}
      <div style={{ background: '#0f172a', padding: '10px', borderRadius: '8px', maxHeight: '200px', overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#3b82f6' }}>Activity Log</h3>
        {logs.length === 0 ? (
          <div style={{ color: '#64748b' }}>No activity yet</div>
        ) : (
          logs.slice().reverse().map((log) => (
            <div key={log.id} style={{ marginBottom: '4px', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
              <span style={{ color: '#64748b' }}>[{log.timestamp}]</span>{' '}
              <span style={{ color: getLogColor(log.type) }}>{log.message}</span>
              {log.details && (
                <div style={{ color: '#94a3b8', marginLeft: '10px', fontSize: '10px' }}>
                  {log.details}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

