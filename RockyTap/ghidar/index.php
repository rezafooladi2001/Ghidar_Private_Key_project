<?php
/**
 * Ghidar Mini App Entry Point
 * Modern React-based Telegram Mini App for Ghidar platform
 */

// Check maintenance mode
if (file_exists(__DIR__ . '/../bot/.maintenance.txt')) {
    header('Location: /RockyTap/maintenance');
    exit;
}

// Load bootstrap for configuration
require_once __DIR__ . '/../../bootstrap.php';

use Ghidar\Config\Config;

// Get app version for cache busting
$appVersion = Config::get('APP_VERSION', '1.0.0');
?>
<!doctype html>
<html lang="en">
  <head>
    <!-- Preload fonts for better performance -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap" rel="stylesheet">

    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no" />
    <meta name="theme-color" content="#0a0c10">
    <meta name="description" content="Ghidar - Your gateway to crypto opportunities. Lottery, Airdrop, and AI Trading.">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    
    <link rel="icon" type="image/png" href="/favicon.ico" />
    <title>Ghidar</title>
    
    <!-- Telegram WebApp SDK -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    
    <!-- Ghidar Mini App -->
    <script type="module" crossorigin src="/RockyTap/assets/ghidar/index.js?v=<?= htmlspecialchars($appVersion) ?>"></script>
    <link rel="stylesheet" crossorigin href="/RockyTap/assets/ghidar/index.css?v=<?= htmlspecialchars($appVersion) ?>">
  </head>
  
  <style>
    :root {
      --bg-primary: #0a0c10;
      --brand-primary: #10b981;
      --brand-gold: #fbbf24;
    }

    html {
      height: 100%;
      overflow: hidden;
    }

    body {
      height: 100%;
      overflow: hidden;
      min-height: 100%;
      isolation: isolate;
      margin: 0;
      padding: 0;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg-primary);
    }

    /* Initial loader */
    #loader {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100%;
      background: var(--bg-primary);
      gap: 24px;
    }

    .loader-logo {
      width: 80px;
      height: 80px;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .loader-logo svg {
      width: 100%;
      height: 100%;
    }

    .loader-spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(16, 185, 129, 0.2);
      border-top-color: var(--brand-primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .loader-text {
      color: rgba(255, 255, 255, 0.5);
      font-size: 14px;
      letter-spacing: 0.5px;
    }

    .loader-bars {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 200px;
      margin-top: 8px;
    }

    .loader-bar {
      height: 4px;
      background: linear-gradient(90deg, rgba(16, 185, 129, 0.2) 25%, rgba(16, 185, 129, 0.4) 50%, rgba(16, 185, 129, 0.2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 2px;
    }

    .loader-bar:nth-child(2) {
      width: 80%;
      animation-delay: 0.1s;
    }

    .loader-bar:nth-child(3) {
      width: 60%;
      animation-delay: 0.2s;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(0.95); }
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  </style>
  
  <body>
    <script>
      // Debug logging for Telegram SDK
      console.log('[GHIDAR-HTML] Page loaded at:', new Date().toISOString());
      console.log('[GHIDAR-HTML] window.Telegram exists:', !!window.Telegram);
      console.log('[GHIDAR-HTML] window.Telegram.WebApp exists:', !!(window.Telegram && window.Telegram.WebApp));
      
      if (window.Telegram && window.Telegram.WebApp) {
        var webapp = window.Telegram.WebApp;
        console.log('[GHIDAR-HTML] initData:', webapp.initData ? 'present (length: ' + webapp.initData.length + ')' : 'EMPTY');
        console.log('[GHIDAR-HTML] initDataUnsafe:', JSON.stringify(webapp.initDataUnsafe));
        console.log('[GHIDAR-HTML] platform:', webapp.platform);
        console.log('[GHIDAR-HTML] version:', webapp.version);
        
        // Store SDK info for debugging
        window.__GHIDAR_SDK_INFO = {
          initDataLength: webapp.initData ? webapp.initData.length : 0,
          hasUser: !!(webapp.initDataUnsafe && webapp.initDataUnsafe.user),
          platform: webapp.platform,
          version: webapp.version,
          timestamp: new Date().toISOString()
        };
        
        // Initialize Telegram WebApp early
        webapp.expand();
        webapp.setHeaderColor('#0f1218');
        webapp.setBackgroundColor('#0a0c10');
        
        // Signal that we're ready
        webapp.ready();
        
        console.log('[GHIDAR-HTML] Telegram.WebApp.ready() called');
      } else {
        console.error('[GHIDAR-HTML] Telegram SDK NOT AVAILABLE!');
        console.log('[GHIDAR-HTML] URL:', window.location.href);
        console.log('[GHIDAR-HTML] Hash:', window.location.hash);
        
        // Check if data is in URL hash (legacy mode)
        if (window.location.hash && window.location.hash.includes('tgWebAppData')) {
          console.log('[GHIDAR-HTML] Found tgWebAppData in URL hash - legacy mode detected');
        }
        
        window.__GHIDAR_SDK_INFO = {
          error: 'SDK not available',
          url: window.location.href,
          timestamp: new Date().toISOString()
        };
      }
    </script>
    
    <!-- Loading screen -->
    <div id="loader">
      <div class="loader-logo">
        <svg viewBox="0 0 48 48" fill="none">
          <defs>
            <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#10b981" />
              <stop offset="50%" stop-color="#34d399" />
              <stop offset="100%" stop-color="#fbbf24" />
            </linearGradient>
            <linearGradient id="gold" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#f59e0b" />
              <stop offset="100%" stop-color="#fcd34d" />
            </linearGradient>
          </defs>
          <path d="M24 4L44 18L36 44H12L4 18L24 4Z" fill="url(#lg)" opacity="0.15"/>
          <path d="M24 8L40 20L34 40H14L8 20L24 8Z" stroke="url(#lg)" stroke-width="2" fill="none"/>
          <path d="M24 8L24 40M8 20H40M14 40L24 24L34 40M24 24L8 20M24 24L40 20" stroke="url(#lg)" stroke-width="1.5" opacity="0.6" fill="none"/>
          <circle cx="24" cy="24" r="6" fill="url(#gold)"/>
          <circle cx="24" cy="24" r="3" fill="#0a0c10"/>
        </svg>
      </div>
      <div class="loader-spinner"></div>
      <div class="loader-text">Loading Ghidar...</div>
      <div class="loader-bars">
        <div class="loader-bar"></div>
        <div class="loader-bar"></div>
        <div class="loader-bar"></div>
      </div>
    </div>

    <!-- React app root -->
    <div id="root"></div>

    <!-- HTML Debug Panel - Works even if React crashes -->
    <div id="html-debug-btn" onclick="toggleHtmlDebug()" style="
      position: fixed;
      bottom: 80px;
      right: 10px;
      z-index: 999999;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(239,68,68,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    ">🔧</div>

    <div id="html-debug-panel" style="
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999999;
      background: rgba(0,0,0,0.97);
      color: white;
      font-family: monospace;
      font-size: 12px;
      overflow: auto;
      padding: 15px;
    ">
      <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
        <h2 style="margin: 0; color: #10b981;">🔧 HTML Debug Panel</h2>
        <button onclick="toggleHtmlDebug()" style="background: #ef4444; color: white; border: none; border-radius: 6px; padding: 8px 20px; cursor: pointer; font-size: 14px;">Close</button>
      </div>

      <div id="sdk-info" style="background: #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 15px;">
        <h3 style="margin: 0 0 10px 0; color: #fbbf24;">Telegram SDK Info</h3>
        <div id="sdk-content">Loading...</div>
      </div>

      <button onclick="runHtmlDiagnostics()" id="diag-btn" style="
        background: #10b981;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 15px 30px;
        cursor: pointer;
        font-size: 16px;
        font-weight: bold;
        width: 100%;
        margin-bottom: 15px;
      ">🚀 Run Diagnostics</button>

      <div id="diag-results" style="background: #0f172a; padding: 12px; border-radius: 8px; max-height: 400px; overflow: auto;">
        <h3 style="margin: 0 0 10px 0; color: #3b82f6;">Diagnostic Results</h3>
        <div id="diag-content">Click "Run Diagnostics" to test API connectivity</div>
      </div>
    </div>

    <script>
      function toggleHtmlDebug() {
        var panel = document.getElementById('html-debug-panel');
        var btn = document.getElementById('html-debug-btn');
        if (panel.style.display === 'none') {
          panel.style.display = 'block';
          btn.style.display = 'none';
          updateSdkInfo();
        } else {
          panel.style.display = 'none';
          btn.style.display = 'flex';
        }
      }

      function updateSdkInfo() {
        var content = document.getElementById('sdk-content');
        var info = {
          telegramExists: !!window.Telegram,
          webAppExists: !!(window.Telegram && window.Telegram.WebApp),
          initDataLength: (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) ? window.Telegram.WebApp.initData.length : 0,
          platform: (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp.platform : 'N/A',
          version: (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp.version : 'N/A',
          userAgent: navigator.userAgent.substring(0, 100)
        };
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user) {
          info.userId = window.Telegram.WebApp.initDataUnsafe.user.id;
          info.userName = window.Telegram.WebApp.initDataUnsafe.user.first_name;
        }
        
        content.innerHTML = '<pre style="margin:0;white-space:pre-wrap;word-break:break-all;">' + JSON.stringify(info, null, 2) + '</pre>';
      }

      async function runHtmlDiagnostics() {
        var content = document.getElementById('diag-content');
        var btn = document.getElementById('diag-btn');
        btn.disabled = true;
        btn.textContent = 'Running...';
        
        var results = [];
        
        function addResult(msg, isError) {
          var color = msg.startsWith('✓') ? '#22c55e' : msg.startsWith('✗') ? '#ef4444' : msg.startsWith('---') ? '#fbbf24' : '#e2e8f0';
          results.push('<div style="color:' + color + ';margin-bottom:3px;">' + msg + '</div>');
          content.innerHTML = results.join('');
        }
        
        try {
          // Get initData
          var initData = '';
          if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData) {
            initData = window.Telegram.WebApp.initData;
          }
          
          addResult('--- Telegram SDK ---');
          if (initData) {
            addResult('✓ initData present: ' + initData.length + ' chars');
          } else {
            addResult('✗ initData is EMPTY');
          }
          
          // Test 1: Basic fetch
          addResult('--- Test 1: Basic Fetch to /health/ ---');
          try {
            var url1 = '/RockyTap/api/health/';
            addResult('Fetching: ' + url1);
            var res1 = await fetch(url1);
            addResult('Status: ' + res1.status + ' ' + res1.statusText);
            var text1 = await res1.text();
            addResult('Response length: ' + text1.length + ' chars');
            if (res1.ok) {
              addResult('✓ Basic fetch WORKS!');
            } else {
              addResult('✗ HTTP error: ' + res1.status);
            }
          } catch (e) {
            addResult('✗ Fetch FAILED: ' + e.message);
          }
          
          // Test 2: Absolute URL
          addResult('--- Test 2: Absolute URL ---');
          try {
            var url2 = window.location.origin + '/RockyTap/api/health/';
            addResult('Fetching: ' + url2);
            var res2 = await fetch(url2);
            addResult('Status: ' + res2.status);
            if (res2.ok) {
              addResult('✓ Absolute URL WORKS!');
            }
          } catch (e) {
            addResult('✗ Absolute URL FAILED: ' + e.message);
          }
          
          // Test 3: With headers
          addResult('--- Test 3: With Telegram-Data Header ---');
          try {
            var res3 = await fetch('/RockyTap/api/health/', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Telegram-Data': initData || ''
              }
            });
            addResult('Status: ' + res3.status);
            if (res3.ok) {
              addResult('✓ Headers fetch WORKS!');
            }
          } catch (e) {
            addResult('✗ Headers fetch FAILED: ' + e.message);
          }
          
          // Test 4: /me endpoint
          addResult('--- Test 4: /me Endpoint (Requires Auth) ---');
          try {
            var res4 = await fetch('/RockyTap/api/me/', {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Telegram-Data': initData || ''
              }
            });
            addResult('Status: ' + res4.status + ' ' + res4.statusText);
            var text4 = await res4.text();
            addResult('Response: ' + text4.substring(0, 200));
            if (res4.ok) {
              addResult('✓ /me endpoint WORKS!');
            } else {
              addResult('✗ /me returned error');
            }
          } catch (e) {
            addResult('✗ /me FAILED: ' + e.message);
          }
          
          // Test 5: XMLHttpRequest
          addResult('--- Test 5: XMLHttpRequest Fallback ---');
          try {
            var xhrResult = await new Promise(function(resolve, reject) {
              var xhr = new XMLHttpRequest();
              xhr.open('GET', '/RockyTap/api/health/', true);
              xhr.onload = function() { resolve('Status: ' + xhr.status + ', Length: ' + xhr.responseText.length); };
              xhr.onerror = function() { reject(new Error('XHR network error')); };
              xhr.send();
            });
            addResult('XHR: ' + xhrResult);
            addResult('✓ XMLHttpRequest WORKS!');
          } catch (e) {
            addResult('✗ XHR FAILED: ' + e.message);
          }
          
          addResult('--- Diagnostics Complete ---');
          
        } catch (e) {
          addResult('✗ Fatal error: ' + e.message);
        }
        
        btn.disabled = false;
        btn.textContent = '🚀 Run Diagnostics';
      }
    </script>
  </body>
</html>
