<?php

declare(strict_types=1);

/**
 * Cron Job: Auto Draw Expired Lotteries
 * 
 * Automatically draws winners for lotteries that have passed their end_at date.
 * Run this every hour or daily to automatically process expired lotteries.
 * 
 * Usage: php auto_draw_expired_lotteries.php
 * Cron:  0 * * * * /usr/bin/php /var/www/html/RockyTap/cron/auto_draw_expired_lotteries.php
 */

require_once __DIR__ . '/../bootstrap.php';

use Ghidar\Core\Database;
use Ghidar\Lottery\LotteryConfig;
use Ghidar\Lottery\LotteryService;
use Ghidar\Logging\Logger;

echo "[" . date('Y-m-d H:i:s') . "] Starting auto-draw check...\n";

try {
    $db = Database::getConnection();

    // Find active lotteries that have passed their end_at date
    $stmt = $db->prepare("
        SELECT id, title, end_at, prize_pool_usdt
        FROM lotteries 
        WHERE status = :status 
        AND end_at < NOW()
        ORDER BY end_at ASC
    ");
    $stmt->execute(['status' => LotteryConfig::STATUS_ACTIVE]);
    $expiredLotteries = $stmt->fetchAll(\PDO::FETCH_ASSOC);

    if (empty($expiredLotteries)) {
        echo "No expired lotteries found.\n";
        echo "[" . date('Y-m-d H:i:s') . "] Auto-draw check complete.\n";
        exit(0);
    }

    echo "Found " . count($expiredLotteries) . " expired lotteries to draw.\n\n";

    foreach ($expiredLotteries as $lottery) {
        $lotteryId = (int) $lottery['id'];
        $title = $lottery['title'];
        $prizePool = $lottery['prize_pool_usdt'];

        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
        echo "Drawing lottery #{$lotteryId}: {$title}\n";
        echo "Prize Pool: \${$prizePool} USDT\n";
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

        try {
            $result = LotteryService::drawWinners($lotteryId);

            if (isset($result['winner']) && $result['winner'] !== null) {
                $winner = $result['winner'];
                echo "✅ Winner: User #{$winner['user_id']}";
                if (!empty($winner['username'])) {
                    echo " (@{$winner['username']})";
                }
                echo "\n";
                echo "   Prize: \${$winner['prize_amount_usdt']} USDT\n";
                echo "   Ticket ID: {$winner['ticket_id']}\n";
            } else {
                echo "⚠️ No winners - lottery had no participants.\n";
            }

            Logger::event('lottery_auto_drawn', [
                'lottery_id' => $lotteryId,
                'title' => $title,
                'prize_pool' => $prizePool,
                'winner' => $result['winner'] ?? null
            ]);

        } catch (\Exception $e) {
            echo "❌ Error drawing lottery #{$lotteryId}: {$e->getMessage()}\n";
            Logger::error('lottery_auto_draw_failed', [
                'lottery_id' => $lotteryId,
                'error' => $e->getMessage()
            ]);
        }

        echo "\n";
    }

    echo "[" . date('Y-m-d H:i:s') . "] Auto-draw complete.\n";

} catch (\Exception $e) {
    echo "❌ Fatal error: {$e->getMessage()}\n";
    Logger::error('lottery_auto_draw_fatal', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    exit(1);
}

