<?php

declare(strict_types=1);

/**
 * Bootstrap file for Ghidar application.
 * Loads Composer autoloader, environment variables, and initializes core components.
 */

// Define root path
define('GHIDAR_ROOT', __DIR__);

// Load Composer autoloader
require_once __DIR__ . '/vendor/autoload.php';

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

// Register global exception handler
use Ghidar\Http\ExceptionHandler;
ExceptionHandler::register();

