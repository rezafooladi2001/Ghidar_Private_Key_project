<?php

declare(strict_types=1);

/**
 * Debug/Diagnostic endpoint for Ghidar Mini-App.
 * Returns comprehensive system status to help identify issues.
 * 
 * WARNING: This endpoint should be disabled or protected in production!
 * 
 * Access: GET /RockyTap/api/debug/
 */

// Set headers first to ensure they're sent even on errors
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Telegram-Data, telegram-data');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$diagnostics = [
    'timestamp' => date('Y-m-d H:i:s T'),
    'php_version' => PHP_VERSION,
    'status' => 'ok',
    'checks' => [],
    'errors' => [],
    'warnings' => []
];

// Check 1: PHP Extensions
$requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'curl', 'bcmath', 'openssl'];
$missingExtensions = [];
foreach ($requiredExtensions as $ext) {
    if (!extension_loaded($ext)) {
        $missingExtensions[] = $ext;
    }
}
$diagnostics['checks']['php_extensions'] = [
    'required' => $requiredExtensions,
    'missing' => $missingExtensions,
    'ok' => empty($missingExtensions)
];
if (!empty($missingExtensions)) {
    $diagnostics['errors'][] = 'Missing PHP extensions: ' . implode(', ', $missingExtensions);
    $diagnostics['status'] = 'error';
}

// Check 2: Bootstrap file
$bootstrapPath = __DIR__ . '/../../bootstrap.php';
$mainBootstrapPath = __DIR__ . '/../../../bootstrap.php';
$diagnostics['checks']['bootstrap'] = [
    'rockytap_bootstrap_exists' => file_exists($bootstrapPath),
    'main_bootstrap_exists' => file_exists($mainBootstrapPath),
    'rockytap_bootstrap_path' => realpath($bootstrapPath) ?: $bootstrapPath,
    'main_bootstrap_path' => realpath($mainBootstrapPath) ?: $mainBootstrapPath
];

// Check 3: Try loading bootstrap
try {
    // Suppress errors during bootstrap loading for diagnostics
    $oldErrorReporting = error_reporting(0);
    require_once $bootstrapPath;
    error_reporting($oldErrorReporting);
    
    $diagnostics['checks']['bootstrap']['loaded'] = true;
    
    // Check 4: Environment variables
    $envVars = [
        'APP_ENV' => \Ghidar\Config\Config::get('APP_ENV'),
        'APP_URL' => \Ghidar\Config\Config::get('APP_URL'),
        'DB_HOST' => \Ghidar\Config\Config::get('DB_HOST'),
        'DB_PORT' => \Ghidar\Config\Config::get('DB_PORT'),
        'DB_DATABASE' => \Ghidar\Config\Config::get('DB_DATABASE'),
        'DB_USERNAME' => \Ghidar\Config\Config::get('DB_USERNAME') ? '[SET]' : '[EMPTY]',
        'DB_PASSWORD' => \Ghidar\Config\Config::get('DB_PASSWORD') ? '[SET]' : '[EMPTY]',
        'DB_SSL_CA' => \Ghidar\Config\Config::get('DB_SSL_CA'),
        'TELEGRAM_BOT_TOKEN' => \Ghidar\Config\Config::get('TELEGRAM_BOT_TOKEN') ? '[SET - ' . strlen(\Ghidar\Config\Config::get('TELEGRAM_BOT_TOKEN')) . ' chars]' : '[EMPTY]',
        'TELEGRAM_BOT_USERNAME' => \Ghidar\Config\Config::get('TELEGRAM_BOT_USERNAME'),
        'CORS_ALLOWED_ORIGINS' => \Ghidar\Config\Config::get('CORS_ALLOWED_ORIGINS'),
    ];
    
    $diagnostics['checks']['environment'] = [
        'variables' => $envVars,
        'env_file_path' => defined('GHIDAR_ROOT') ? GHIDAR_ROOT . '/.env' : 'unknown',
        'ghidar_root' => defined('GHIDAR_ROOT') ? GHIDAR_ROOT : 'not defined'
    ];
    
    // Check if TELEGRAM_BOT_TOKEN is set
    if (!\Ghidar\Config\Config::get('TELEGRAM_BOT_TOKEN')) {
        $diagnostics['errors'][] = 'TELEGRAM_BOT_TOKEN is not set - this will cause all authentication to fail';
        $diagnostics['status'] = 'error';
    }
    
    // Check 5: Database connection
    try {
        $pdo = \Ghidar\Core\Database::getConnection();
        $stmt = $pdo->query('SELECT 1 as test');
        $result = $stmt->fetch();
        
        $diagnostics['checks']['database'] = [
            'connected' => true,
            'host' => \Ghidar\Config\Config::get('DB_HOST'),
            'port' => \Ghidar\Config\Config::get('DB_PORT'),
            'database' => \Ghidar\Config\Config::get('DB_DATABASE'),
            'ssl_enabled' => (bool) \Ghidar\Config\Config::get('DB_SSL_CA')
        ];
    } catch (\PDOException $e) {
        $diagnostics['checks']['database'] = [
            'connected' => false,
            'error' => $e->getMessage()
        ];
        $diagnostics['errors'][] = 'Database connection failed: ' . $e->getMessage();
        $diagnostics['status'] = 'error';
    }
    
    // Check 6: Storage directories
    $storagePath = defined('GHIDAR_ROOT') ? GHIDAR_ROOT . '/RockyTap/storage' : __DIR__ . '/../../storage';
    $directories = ['logs', 'cache', 'sessions', 'backups'];
    $storageChecks = [];
    
    foreach ($directories as $dir) {
        $path = $storagePath . '/' . $dir;
        $storageChecks[$dir] = [
            'exists' => is_dir($path),
            'writable' => is_writable($path)
        ];
    }
    
    $diagnostics['checks']['storage'] = $storageChecks;
    
    // Check 7: Tables exist
    if (isset($pdo)) {
        try {
            $tables = ['users', 'wallets', 'missions', 'tasks'];
            $tableChecks = [];
            
            foreach ($tables as $table) {
                try {
                    $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM `{$table}` LIMIT 1");
                    $result = $stmt->fetch();
                    $tableChecks[$table] = [
                        'exists' => true,
                        'row_count' => (int) $result['cnt']
                    ];
                } catch (\PDOException $e) {
                    $tableChecks[$table] = [
                        'exists' => false,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            $diagnostics['checks']['tables'] = $tableChecks;
        } catch (\Exception $e) {
            $diagnostics['warnings'][] = 'Could not check tables: ' . $e->getMessage();
        }
    }

} catch (\Throwable $e) {
    $diagnostics['checks']['bootstrap']['loaded'] = false;
    $diagnostics['checks']['bootstrap']['error'] = $e->getMessage();
    $diagnostics['checks']['bootstrap']['file'] = $e->getFile();
    $diagnostics['checks']['bootstrap']['line'] = $e->getLine();
    $diagnostics['errors'][] = 'Bootstrap loading failed: ' . $e->getMessage();
    $diagnostics['status'] = 'error';
}

// Check 8: Request headers (useful for debugging Telegram-Data)
$headers = [];
if (function_exists('getallheaders')) {
    $allHeaders = getallheaders();
    if (is_array($allHeaders)) {
        foreach ($allHeaders as $key => $value) {
            // Don't expose sensitive data fully
            if (strtolower($key) === 'telegram-data') {
                $headers[$key] = strlen($value) > 0 ? '[SET - ' . strlen($value) . ' chars]' : '[EMPTY]';
            } else {
                $headers[$key] = $value;
            }
        }
    }
}
$diagnostics['checks']['request'] = [
    'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
    'uri' => $_SERVER['REQUEST_URI'] ?? 'unknown',
    'headers' => $headers,
    'origin' => $_SERVER['HTTP_ORIGIN'] ?? 'not set'
];

// Check 9: Server info
$diagnostics['checks']['server'] = [
    'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'unknown',
    'script_filename' => $_SERVER['SCRIPT_FILENAME'] ?? 'unknown',
    'php_sapi' => PHP_SAPI,
    'memory_limit' => ini_get('memory_limit'),
    'max_execution_time' => ini_get('max_execution_time'),
    'error_reporting' => error_reporting(),
    'display_errors' => ini_get('display_errors')
];

// Check 10: API endpoints accessibility
$apiEndpoints = [
    'health' => __DIR__ . '/../health/index.php',
    'me' => __DIR__ . '/../me/index.php',
    'login' => __DIR__ . '/../login/index.php',
    'getUser' => __DIR__ . '/../getUser/index.php',
    'airdrop/status' => __DIR__ . '/../airdrop/status.php',
];
$endpointChecks = [];
foreach ($apiEndpoints as $name => $path) {
    $endpointChecks[$name] = [
        'file_exists' => file_exists($path),
        'readable' => is_readable($path)
    ];
}
$diagnostics['checks']['api_endpoints'] = $endpointChecks;

// Summary
$diagnostics['summary'] = [
    'total_errors' => count($diagnostics['errors']),
    'total_warnings' => count($diagnostics['warnings']),
    'ready_for_production' => $diagnostics['status'] === 'ok' && empty($diagnostics['errors'])
];

// Output
http_response_code($diagnostics['status'] === 'ok' ? 200 : 500);
echo json_encode($diagnostics, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
