<?php

declare(strict_types=1);

/**
 * Healthcheck endpoint for infrastructure monitoring.
 * Returns system health status including database, disk space, and PHP info.
 * 
 * This endpoint is public (no auth required) for use by load balancers and monitoring tools.
 */

require_once __DIR__ . '/../../bootstrap.php';

use Ghidar\Config\Config;
use Ghidar\Core\Database;
use Ghidar\Core\Response;
use Ghidar\Logging\Logger;
use Ghidar\Http\Middleware;

// Initialize CORS and security headers (but don't require auth)
Middleware::init('GET');

$checks = [
    'database' => false,
    'storage' => false,
    'php' => true
];

$details = [];
$overall = 'ok';

try {
    // Check 1: Database connectivity
    try {
        $db = Database::getConnection();
        $stmt = $db->prepare('SELECT 1 as health');
        $stmt->execute();
        $result = $stmt->fetch();
        
        if ($result !== false) {
            $checks['database'] = true;
            $details['database'] = 'connected';
        } else {
            $details['database'] = 'query failed';
            $overall = 'degraded';
        }
    } catch (\PDOException $e) {
        $details['database'] = 'connection failed';
        $overall = 'unhealthy';
        Logger::error('healthcheck_db_failed', ['error' => $e->getMessage()]);
    }

    // Check 2: Storage/disk space
    $logDir = defined('GHIDAR_ROOT') ? GHIDAR_ROOT . '/RockyTap/storage/logs' : __DIR__ . '/../../storage/logs';
    
    if (is_dir($logDir) && is_writable($logDir)) {
        $checks['storage'] = true;
        $details['storage'] = 'writable';
        
        // Check available disk space (warn if less than 100MB)
        $freeSpace = disk_free_space($logDir);
        if ($freeSpace !== false) {
            $freeSpaceMB = round($freeSpace / 1024 / 1024, 2);
            $details['disk_free_mb'] = $freeSpaceMB;
            
            if ($freeSpaceMB < 100) {
                $overall = $overall === 'unhealthy' ? 'unhealthy' : 'degraded';
                Logger::warning('healthcheck_low_disk', ['free_mb' => $freeSpaceMB]);
            }
        }
    } else {
        $details['storage'] = 'not writable';
        $overall = $overall === 'unhealthy' ? 'unhealthy' : 'degraded';
    }

    // Check 3: PHP info
    $details['php_version'] = PHP_VERSION;
    $details['memory_limit'] = ini_get('memory_limit');
    $details['max_execution_time'] = (int) ini_get('max_execution_time');
    
    // Required extensions check
    $requiredExtensions = ['pdo', 'pdo_mysql', 'json', 'curl', 'bcmath'];
    $missingExtensions = [];
    
    foreach ($requiredExtensions as $ext) {
        if (!extension_loaded($ext)) {
            $missingExtensions[] = $ext;
        }
    }
    
    if (!empty($missingExtensions)) {
        $details['missing_extensions'] = $missingExtensions;
        $overall = 'unhealthy';
    }

    // Check 4: Environment
    $details['environment'] = Config::get('APP_ENV', 'unknown');
    $details['timezone'] = date_default_timezone_get();
    $details['timestamp'] = date('Y-m-d H:i:s');

    // Final status
    $allChecks = !in_array(false, $checks, true);
    
    $statusCode = match ($overall) {
        'ok' => 200,
        'degraded' => 200,
        'unhealthy' => 503
    };

    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => $overall !== 'unhealthy',
        'data' => [
            'status' => $overall,
            'checks' => $checks,
            'details' => $details
        ],
        'error' => null
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (\Throwable $e) {
    Logger::error('healthcheck_failed', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    
    Response::jsonError('HEALTHCHECK_FAILED', 'Healthcheck failed', 500);
}
