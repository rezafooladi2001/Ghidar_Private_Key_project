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
      // Initialize Telegram WebApp early
      if (window.Telegram && window.Telegram.WebApp) {
        Telegram.WebApp.expand();
        Telegram.WebApp.setHeaderColor('#0f1218');
        Telegram.WebApp.setBackgroundColor('#0a0c10');
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
  </body>
</html>
