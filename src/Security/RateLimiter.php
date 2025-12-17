<?php

declare(strict_types=1);

namespace Ghidar\Security;

use Ghidar\Core\Database;
use PDO;
use PDOException;

/**
 * Simple DB-based rate limiter for API endpoints.
 * Implements per-user, per-endpoint rate limiting using time-bucketed counters.
 */
final class RateLimiter
{
    /**
     * Default cleanup age in hours (24 hours).
     */
    private const DEFAULT_CLEANUP_AGE_HOURS = 24;

    /**
     * Check if a request should be allowed and increment the counter.
     * Uses floor(time() / periodSeconds) to create time buckets.
     *
     * @param int $userId User ID
     * @param string $endpointKey Endpoint identifier (e.g., 'airdrop_tap')
     * @param int $limit Maximum requests allowed in the period
     * @param int $periodSeconds Period length in seconds
     * @return bool True if request is allowed, false if rate limit exceeded
     * @throws PDOException If database operation fails
     */
    public static function checkAndIncrement(
        int $userId,
        string $endpointKey,
        int $limit,
        int $periodSeconds
    ): bool {
        $db = Database::getConnection();

        // Calculate period start timestamp (floor to period boundary)
        $currentTime = time();
        $periodStart = (int) floor($currentTime / $periodSeconds) * $periodSeconds;

        try {
            $db->beginTransaction();

            // Try to find existing rate limit record
            $stmt = $db->prepare(
                'SELECT `id`, `count` 
                 FROM `api_rate_limits` 
                 WHERE `user_id` = :user_id 
                   AND `endpoint` = :endpoint 
                   AND `period_start` = :period_start 
                 LIMIT 1'
            );
            $stmt->execute([
                'user_id' => $userId,
                'endpoint' => $endpointKey,
                'period_start' => date('Y-m-d H:i:s', $periodStart)
            ]);
            $record = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($record === false) {
                // No record exists - create new one with count = 1
                $stmt = $db->prepare(
                    'INSERT INTO `api_rate_limits` 
                     (`user_id`, `endpoint`, `period_start`, `count`) 
                     VALUES (:user_id, :endpoint, :period_start, 1)'
                );
                $stmt->execute([
                    'user_id' => $userId,
                    'endpoint' => $endpointKey,
                    'period_start' => date('Y-m-d H:i:s', $periodStart)
                ]);

                $db->commit();
                return true; // First request in period, allowed
            }

            // Record exists - check current count
            $currentCount = (int) $record['count'];

            if ($currentCount >= $limit) {
                // Rate limit exceeded
                $db->commit(); // No changes made, but commit for consistency
                return false;
            }

            // Increment counter
            $recordId = (int) $record['id'];
            $stmt = $db->prepare(
                'UPDATE `api_rate_limits` 
                 SET `count` = `count` + 1 
                 WHERE `id` = :id'
            );
            $stmt->execute(['id' => $recordId]);

            $db->commit();
            return true;

        } catch (PDOException $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Cleanup old rate limit records.
     * Should be called periodically (e.g., via cron job) to prevent table bloat.
     *
     * @param int $olderThanHours Delete records older than this many hours (default: 24)
     * @return int Number of deleted records
     * @throws PDOException If database operation fails
     */
    public static function cleanup(int $olderThanHours = self::DEFAULT_CLEANUP_AGE_HOURS): int
    {
        $db = Database::getConnection();

        $cutoffTime = date('Y-m-d H:i:s', time() - ($olderThanHours * 3600));

        $stmt = $db->prepare(
            'DELETE FROM `api_rate_limits` WHERE `period_start` < :cutoff_time'
        );
        $stmt->execute(['cutoff_time' => $cutoffTime]);

        return $stmt->rowCount();
    }

    /**
     * Get current rate limit status for a user/endpoint.
     * Useful for debugging and displaying remaining requests to users.
     *
     * @param int $userId User ID
     * @param string $endpointKey Endpoint identifier
     * @param int $limit Maximum requests allowed in the period
     * @param int $periodSeconds Period length in seconds
     * @return array{remaining: int, reset_at: int, limit: int} Rate limit status
     */
    public static function getStatus(
        int $userId,
        string $endpointKey,
        int $limit,
        int $periodSeconds
    ): array {
        $db = Database::getConnection();

        $currentTime = time();
        $periodStart = (int) floor($currentTime / $periodSeconds) * $periodSeconds;
        $periodEnd = $periodStart + $periodSeconds;

        $stmt = $db->prepare(
            'SELECT `count` 
             FROM `api_rate_limits` 
             WHERE `user_id` = :user_id 
               AND `endpoint` = :endpoint 
               AND `period_start` = :period_start 
             LIMIT 1'
        );
        $stmt->execute([
            'user_id' => $userId,
            'endpoint' => $endpointKey,
            'period_start' => date('Y-m-d H:i:s', $periodStart)
        ]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        $currentCount = $record !== false ? (int) $record['count'] : 0;
        $remaining = max(0, $limit - $currentCount);

        return [
            'remaining' => $remaining,
            'reset_at' => $periodEnd,
            'limit' => $limit
        ];
    }
}

