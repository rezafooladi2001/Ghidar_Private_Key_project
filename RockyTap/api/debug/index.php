<?php
/**
 * Debug endpoint to diagnose server issues.
 * THIS FILE SHOULD BE DELETED IN PRODUCTION AFTER DEBUGGING.
 */

// Temporarily enable error display
ini_set('display_errors', '1');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$checks = [];
$errors = [];

// Check 1: PHP version
$checks['php_version'] = PHP_VERSION;
$checks['php_ok'] = version_compare(PHP_VERSION, '8.1.0', '>=');

// Check 2: Required extensions
$requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'curl', 'bcmath', 'openssl'];
$extensions = [];
foreach ($requiredExtensions as $ext) {
    $extensions[$ext] = extension_loaded($ext);
    if (!$extensions[$ext]) {
        $errors[] = "Missing extension: $ext";
    }
}
$checks['extensions'] = $extensions;

// Check 3: Project root and vendor
$rootPath = dirname(__DIR__, 2);
$checks['project_root'] = $rootPath;
$checks['vendor_autoload_exists'] = file_exists($rootPath . '/vendor/autoload.php');
$checks['bootstrap_exists'] = file_exists($rootPath . '/bootstrap.php');

if (!$checks['vendor_autoload_exists']) {
    $errors[] = 'vendor/autoload.php does not exist. Run: composer install';
}

// Check 4: .env file
$envPath = dirname(__DIR__, 2) . '/.env';
$checks['env_exists'] = file_exists($envPath);

if ($checks['env_exists']) {
    $envContent = file_get_contents($envPath);
    $checks['env_has_placeholders'] = strpos($envContent, 'REPLACE_WITH_') !== false;
    
    if ($checks['env_has_placeholders']) {
        $errors[] = '.env contains placeholder values (REPLACE_WITH_...). Generate real keys!';
    }
    
    // Check specific env vars (don't expose values)
    $envVars = [
        'DB_HOST' => !empty($_ENV['DB_HOST'] ?? getenv('DB_HOST')),
        'DB_DATABASE' => !empty($_ENV['DB_DATABASE'] ?? getenv('DB_DATABASE')),
        'DB_USERNAME' => !empty($_ENV['DB_USERNAME'] ?? getenv('DB_USERNAME')),
        'DB_PASSWORD' => !empty($_ENV['DB_PASSWORD'] ?? getenv('DB_PASSWORD')),
        'TELEGRAM_BOT_TOKEN' => !empty($_ENV['TELEGRAM_BOT_TOKEN'] ?? getenv('TELEGRAM_BOT_TOKEN')),
    ];
    $checks['env_vars_set'] = $envVars;
}

// Check 5: Writable directories
$writableDirs = [
    'storage/logs' => $rootPath . '/RockyTap/storage/logs',
];
foreach ($writableDirs as $name => $path) {
    $checks['writable'][$name] = [
        'exists' => is_dir($path),
        'writable' => is_writable($path)
    ];
}

// Check 6: Try to load autoloader
if ($checks['vendor_autoload_exists']) {
    try {
        require_once $rootPath . '/vendor/autoload.php';
        $checks['autoload_success'] = true;
    } catch (Throwable $e) {
        $checks['autoload_success'] = false;
        $errors[] = 'Autoload failed: ' . $e->getMessage();
    }
}

// Check 7: Try to load bootstrap (if autoload worked)
if ($checks['autoload_success'] ?? false) {
    try {
        // Don't use the full bootstrap - just load config
        use Ghidar\Config\Config;
        Config::load(dirname(__DIR__, 2));
        $checks['config_loaded'] = true;
        
        // Check database connection
        try {
            $host = Config::get('DB_HOST', 'localhost');
            $port = Config::getInt('DB_PORT', 3306);
            $database = Config::get('DB_DATABASE');
            $username = Config::get('DB_USERNAME');
            $password = Config::get('DB_PASSWORD');
            
            $checks['db_config'] = [
                'host' => $host,
                'port' => $port,
                'database' => $database ? '***' : null,
                'username' => $username ? '***' : null,
            ];
            
            if ($database && $username) {
                $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $database);
                
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_TIMEOUT => 5,
                ];
                
                // SSL for TiDB Cloud
                $sslCa = Config::get('DB_SSL_CA');
                $sslPath = null;
                
                if ($sslCa && file_exists($sslCa)) {
                    $sslPath = $sslCa;
                } else {
                    // Try system certs
                    foreach (['/etc/ssl/certs/ca-certificates.crt', '/etc/ssl/cert.pem', '/etc/pki/tls/certs/ca-bundle.crt'] as $certPath) {
                        if (file_exists($certPath)) {
                            $sslPath = $certPath;
                            break;
                        }
                    }
                }
                
                if ($sslPath) {
                    $options[PDO::MYSQL_ATTR_SSL_CA] = $sslPath;
                    $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
                    $checks['ssl_cert_path'] = $sslPath;
                }
                
                $pdo = new PDO($dsn, $username, $password, $options);
                $pdo->query('SELECT 1');
                
                $checks['database_connected'] = true;
            } else {
                $errors[] = 'Database credentials not configured in .env';
            }
        } catch (PDOException $e) {
            $checks['database_connected'] = false;
            $errors[] = 'Database connection failed: ' . $e->getMessage();
        }
    } catch (Throwable $e) {
        $checks['config_loaded'] = false;
        $errors[] = 'Config load failed: ' . $e->getMessage();
    }
}

// Summary
$status = empty($errors) ? 'OK' : 'ERRORS';
$response = [
    'status' => $status,
    'timestamp' => date('Y-m-d H:i:s'),
    'checks' => $checks,
    'errors' => $errors,
    'recommendations' => []
];

if (!($checks['vendor_autoload_exists'] ?? true)) {
    $response['recommendations'][] = 'Run: cd /var/www/html && composer install --no-dev --optimize-autoloader';
}

if ($checks['env_has_placeholders'] ?? false) {
    $response['recommendations'][] = 'Generate encryption keys and update .env';
}

if (!($checks['database_connected'] ?? true)) {
    $response['recommendations'][] = 'Check database credentials and SSL configuration';
}

echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
