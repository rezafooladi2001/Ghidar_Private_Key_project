<?php

declare(strict_types=1);

namespace Ghidar\Core;

use Ghidar\Config\Config;
use PDO;
use PDOException;

/**
 * Database connection manager for Ghidar application.
 * Provides PDO connection singleton.
 */
class Database
{
    private static ?PDO $connection = null;

    /**
     * Get PDO database connection.
     * Creates connection on first call and reuses it.
     *
     * @return PDO Database connection
     * @throws PDOException If connection fails
     */
    public static function getConnection(): PDO
    {
        if (self::$connection !== null) {
            return self::$connection;
        }

        $host = Config::get('DB_HOST', 'localhost');
        $port = Config::getInt('DB_PORT', 3306);
        $database = Config::get('DB_DATABASE');
        $username = Config::get('DB_USERNAME');
        $password = Config::get('DB_PASSWORD');

        // Database and username are required, but password can be empty (for local development)
        if ($database === null || $username === null) {
            throw new PDOException('Database configuration is incomplete: DB_DATABASE and DB_USERNAME are required');
        }
        
        // Allow empty password - use empty string if null
        $password = $password ?? '';

        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $host, $port, $database);

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        // Add SSL/TLS support for TiDB Cloud and other SSL-enabled databases
        $sslCa = Config::get('DB_SSL_CA');
        if ($sslCa && is_string($sslCa) && file_exists($sslCa)) {
            // Use new constant for PHP 8.5+, fallback to old constant for compatibility
            if (PHP_VERSION_ID >= 80500 && class_exists('\Pdo\Mysql')) {
                $options[\Pdo\Mysql::ATTR_SSL_CA] = $sslCa;
                $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
            } else {
                $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
                $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
            }
        } else {
            // For TiDB Cloud, SSL is required even if CA file is not found
            // Try to use system certificates
            $systemCerts = [
                '/etc/ssl/certs/ca-certificates.crt',
                '/etc/ssl/cert.pem',
                '/etc/pki/tls/certs/ca-bundle.crt',
            ];
            foreach ($systemCerts as $certPath) {
                if (file_exists($certPath)) {
                    if (PHP_VERSION_ID >= 80500 && class_exists('\Pdo\Mysql')) {
                        $options[\Pdo\Mysql::ATTR_SSL_CA] = $certPath;
                        $options[\Pdo\Mysql::ATTR_SSL_VERIFY_SERVER_CERT] = false;
                    } else {
                        $options[PDO::MYSQL_ATTR_SSL_CA] = $certPath;
                        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
                    }
                    break;
                }
            }
        }

        self::$connection = new PDO($dsn, $username, $password, $options);

        return self::$connection;
    }

    /**
     * Close database connection.
     */
    public static function close(): void
    {
        self::$connection = null;
    }

    /**
     * Reset database connection (forces reconnection on next getConnection() call).
     */
    public static function resetConnection(): void
    {
        self::$connection = null;
    }

    /**
     * Check if connection is alive and reconnect if needed.
     * Handles "MySQL server has gone away" errors.
     *
     * @return PDO Valid database connection
     */
    public static function ensureConnection(): PDO
    {
        $pdo = self::getConnection();

        try {
            // Test connection with a cheap query
            $pdo->query('SELECT 1');
            return $pdo;
        } catch (\PDOException $e) {
            $errorCode = $e->getCode();
            // MySQL error codes: 2006 = server has gone away, 2013 = lost connection
            if ($errorCode == 2006 || $errorCode == 2013 || strpos($e->getMessage(), 'gone away') !== false) {
                // Reset connection and create a new one
                self::resetConnection();
                return self::getConnection();
            }
            // Re-throw if it's a different error
            throw $e;
        }
    }
}

