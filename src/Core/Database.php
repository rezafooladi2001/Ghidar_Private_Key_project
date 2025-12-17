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

        if ($database === null || $username === null || $password === null) {
            throw new PDOException('Database configuration is incomplete');
        }

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
            } else {
                $options[PDO::MYSQL_ATTR_SSL_CA] = $sslCa;
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

