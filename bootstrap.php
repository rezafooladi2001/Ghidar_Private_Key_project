<?php

declare(strict_types=1);

/**
 * Bootstrap file for Ghidar application.
 * Loads Composer autoloader, environment variables, and initializes core components.
 */

// Define root path
define('GHIDAR_ROOT', __DIR__);

// Get request method safely (handle CLI and unusual server configurations)
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// Handle CORS preflight requests immediately (before loading anything else)
if ($requestMethod === 'OPTIONS') {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    
    // Always respond to OPTIONS requests with CORS headers
    if (!empty($origin)) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    } else {
        header('Access-Control-Allow-Origin: *');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Telegram-Data, Telegram-Init-Data, Accept, Origin');
    header('Access-Control-Max-Age: 86400'); // 24 hours
    header('Content-Length: 0');
    http_response_code(204);
    exit;
}

// Check if vendor autoload exists before requiring it
$autoloadPath = __DIR__ . '/vendor/autoload.php';
if (!file_exists($autoloadPath)) {
    // Return a JSON error if autoload is missing
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => [
            'code' => 'AUTOLOAD_MISSING',
            'message' => 'Composer autoload not found. Run: composer install'
        ]
    ]);
    exit;
}

// Load Composer autoloader
require_once $autoloadPath;

// Load environment configuration
use Ghidar\Config\Config;
Config::load(__DIR__);

// Set timezone
date_default_timezone_set(Config::get('APP_TIMEZONE', 'UTC'));

// Error reporting based on environment
$env = Config::get('APP_ENV', 'local');
if ($env === 'production') {
    error_reporting(0);
    ini_set('display_errors', '0');
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

ini_set('log_errors', '1');

// Set error log path
$logDir = GHIDAR_ROOT . '/RockyTap/storage/logs';
if (is_dir($logDir) && is_writable($logDir)) {
    ini_set('error_log', $logDir . '/php_errors.log');
}

// Register global exception handler
use Ghidar\Http\ExceptionHandler;
ExceptionHandler::register();
