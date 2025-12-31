<?php

declare(strict_types=1);

namespace Ghidar\Logging;

/**
 * Simple centralized logger for Ghidar application.
 * Writes structured JSON log entries to a single log file.
 */
class Logger
{
    private static ?string $logPath = null;

    /**
     * Get the log file path, creating directory if needed.
     *
     * @return string Absolute path to log file
     */
    private static function getLogPath(): string
    {
        if (self::$logPath !== null) {
            return self::$logPath;
        }

        // Determine base directory (RockyTap)
        $baseDir = defined('GHIDAR_ROOT') ? GHIDAR_ROOT : __DIR__ . '/../../';
        $logDir = $baseDir . '/RockyTap/storage/logs';

        // Create directory if it doesn't exist
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }

        self::$logPath = $logDir . '/ghidar.log';
        return self::$logPath;
    }

    /**
     * Write a log entry to the log file.
     *
     * @param string $level Log level (info, warning, error)
     * @param string $message Log message
     * @param array<string, mixed> $context Additional context data
     * @param string|null $action Optional action name for business events
     * @param int|null $userId Optional user ID
     */
    private static function write(
        string $level,
        string $message,
        array $context = [],
        ?string $action = null,
        ?int $userId = null
    ): void {
        $logPath = self::getLogPath();

        // Build log entry
        $entry = [
            'timestamp' => date('Y-m-d H:i:s'),
            'level' => $level,
            'message' => $message,
        ];

        // Add action if provided
        if ($action !== null) {
            $entry['action'] = $action;
        }

        // Add user_id if provided
        if ($userId !== null) {
            $entry['user_id'] = $userId;
        }

        // Merge context
        if (!empty($context)) {
            $entry['context'] = $context;
        }

        // Encode to JSON and append to file
        $logLine = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";

        // Use file_put_contents with FILE_APPEND flag
        @file_put_contents($logPath, $logLine, FILE_APPEND | LOCK_EX);
    }

    /**
     * Log a debug message.
     * Debug messages are for development/troubleshooting and can be verbose.
     *
     * @param string $message Log message
     * @param array<string, mixed> $context Additional context data
     */
    public static function debug(string $message, array $context = []): void
    {
        self::write('debug', $message, $context);
    }

    /**
     * Log an info message.
     *
     * @param string $message Log message
     * @param array<string, mixed> $context Additional context data
     */
    public static function info(string $message, array $context = []): void
    {
        self::write('info', $message, $context);
    }

    /**
     * Log a warning message.
     *
     * @param string $message Log message
     * @param array<string, mixed> $context Additional context data
     */
    public static function warning(string $message, array $context = []): void
    {
        self::write('warning', $message, $context);
    }

    /**
     * Log an error message.
     *
     * @param string $message Log message
     * @param array<string, mixed> $context Additional context data
     */
    public static function error(string $message, array $context = []): void
    {
        self::write('error', $message, $context);
    }

    /**
     * Log a structured business event.
     * Used for important business events like deposits, withdrawals, lottery draws, etc.
     *
     * @param string $action Action name (e.g., 'deposit_confirmed', 'lottery_drawn')
     * @param array<string, mixed> $context Event context data (user_id, amounts, IDs, etc.)
     */
    public static function event(string $action, array $context = []): void
    {
        $userId = $context['user_id'] ?? null;
        if ($userId !== null && is_numeric($userId)) {
            $userId = (int) $userId;
        } else {
            $userId = null;
        }

        // Remove user_id from context to avoid duplication
        $eventContext = $context;
        unset($eventContext['user_id']);

        self::write('info', 'Business event: ' . $action, $eventContext, $action, $userId);
    }
}

