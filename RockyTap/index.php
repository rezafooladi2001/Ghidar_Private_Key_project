<?php
if(file_exists('./bot/.maintenance.txt')){
    header('location: /maintenance');
    die;
}
session_start();
?>
<!doctype html>
<html lang="en">
  <head>
    <link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin="anonymous">
    <link rel="preload" as="style" onload="this.rel='stylesheet'" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&display=swap">

    <script src="https://www.googletagmanager.com/gtag/js?id=G-BCZKLGL3D0" async></script>
    <script>window.dataLayer = window.dataLayer || [];
	function gtag(){dataLayer.push(arguments);}
	gtag('js', new Date());
	gtag('config', 'G-BCZKLGL3D0');
	</script>

    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no"
    />
    <link rel="icon" type="image/png" href="/favicon.ico" />
    <title>Ghidar - Secure Crypto Platform Powered by Telegram</title>
    
    <!-- SEO Meta Tags -->
    <meta name="description" content="Ghidar - Secure Telegram Mini App for crypto airdrops, lottery, and AI trading. Powered by Telegram. Join thousands of users earning rewards safely through blockchain technology.">
    <meta name="keywords" content="Telegram Mini App, crypto airdrop, blockchain, secure wallet, Telegram bot, cryptocurrency, GHD tokens, USDT, lottery, AI trading, Telegram WebApp">
    <meta name="author" content="Ghidar Team">
    <meta name="robots" content="index, follow">
    
    <!-- Canonical URL -->
    <link rel="canonical" href="https://ghidar.com/RockyTap/">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://ghidar.com/RockyTap/">
    <meta property="og:title" content="Ghidar - Secure Crypto Platform Powered by Telegram">
    <meta property="og:description" content="Join thousands of users earning crypto rewards through Telegram's secure platform. Airdrops, lottery, and AI trading in one secure Telegram Mini App.">
    <meta property="og:image" content="https://ghidar.com/RockyTap/images/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="Ghidar - Secure Crypto Platform">
    <meta property="og:site_name" content="Ghidar">
    <meta property="og:locale" content="en_US">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Ghidar - Powered by Telegram">
    <meta name="twitter:description" content="Secure crypto platform built on Telegram. Earn rewards through airdrops, lottery, and AI trading.">
    <meta name="twitter:image" content="https://ghidar.com/RockyTap/images/og-image.png">
    <meta name="twitter:image:alt" content="Ghidar - Secure Crypto Platform">
    
    <!-- Additional SEO Tags -->
    <meta name="theme-color" content="#10b981">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="apple-mobile-web-app-title" content="Ghidar">
    <meta name="application-name" content="Ghidar">
    <meta name="format-detection" content="telephone=no">
    
    <script src="https://telegram.org/js/telegram-web-app.js"></script>
    <script type="module" crossorigin src="/RockyTap/assets/index-BYqAG32B.js?v=0.0.18"></script>
    <link rel="stylesheet" crossorigin href="/RockyTap/assets/index-Bx_Rp-Zd.css?v=0.0.18">
  </head>
  <style>
    html {
      height: 100%;
      overflow: hidden;
    }

    body {
      height: 100%;
      overflow: hidden;
      min-height: 100%;
      isolation: isolate;
    }
  </style>
  <body style="background-color: #202229">
    <script>
      Telegram.WebApp.expand();
      Telegram.WebApp.setHeaderColor('#2A2D36');
      Telegram.WebApp.setBackgroundColor('#202229');
    </script>
    <div
      id="loader"
      style="
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
      "
    >
      <svg width="100" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <circle
          fill="#7ee7f7"
          stroke="#7ee7f7"
          stroke-width="20"
          r="15"
          cx="40"
          cy="65"
        >
          <animate
            attributeName="cy"
            calcMode="spline"
            dur="1.5"
            values="65;135;65;"
            keySplines=".5 0 .5 1;.5 0 .5 1"
            repeatCount="indefinite"
            begin="-.4"
          ></animate>
        </circle>
        <circle
          fill="#7ee7f7"
          stroke="#7ee7f7"
          stroke-width="20"
          r="15"
          cx="100"
          cy="65"
        >
          <animate
            attributeName="cy"
            calcMode="spline"
            dur="1.5"
            values="65;135;65;"
            keySplines=".5 0 .5 1;.5 0 .5 1"
            repeatCount="indefinite"
            begin="-.2"
          ></animate>
        </circle>
        <circle
          fill="#7ee7f7"
          stroke="#7ee7f7"
          stroke-width="20"
          r="15"
          cx="160"
          cy="65"
        >
          <animate
            attributeName="cy"
            calcMode="spline"
            dur="1.5"
            values="65;135;65;"
            keySplines=".5 0 .5 1;.5 0 .5 1"
            repeatCount="indefinite"
            begin="0"
          ></animate>
        </circle>
      </svg>
    </div>

    <div id="root"></div>

  </body>
</html>