<?php

declare(strict_types=1);

/**
 * Lottery Status API endpoint for Ghidar
 * Returns the current active lottery info and user's ticket count.
 */

require_once __DIR__ . '/../../../bootstrap.php';

use Ghidar\Core\Response;
use Ghidar\Http\Middleware;
use Ghidar\Lottery\LotteryService;
use Ghidar\Logging\Logger;

try {
    // Initialize middleware and authenticate (GET allowed for status)
    $context = Middleware::requireAuth('GET');
    $user = $context['user'];
    $wallet = $context['wallet'];
    $userId = (int) $user['id'];

    // Get active lottery and user status
    $userStatus = LotteryService::getUserStatusForActiveLottery($userId);

    if ($userStatus === null) {
        // No active lottery
        Response::jsonSuccess([
            'lottery' => null
        ]);
        exit;
    }

    // Prepare lottery data
    $lotteryData = [
        'id' => (int) $userStatus['lottery']['id'],
        'title' => $userStatus['lottery']['title'],
        'description' => $userStatus['lottery']['description'],
        'type' => $userStatus['lottery']['type'],
        'ticket_price_usdt' => $userStatus['ticket_price_usdt'],
        'prize_pool_usdt' => $userStatus['prize_pool_usdt'],
        'status' => $userStatus['lottery']['status'],
        'start_at' => $userStatus['lottery']['start_at'],
        'end_at' => $userStatus['lottery']['end_at']
    ];

    // Prepare user data
    $userData = [
        'id' => (int) $user['id'],
        'telegram_id' => (int) $user['id'],
        'username' => $user['username'] ?? null
    ];

    // Prepare wallet data
    $walletData = [
        'usdt_balance' => (string) $wallet['usdt_balance'],
        'ghd_balance' => (string) $wallet['ghd_balance']
    ];

    // Return unified response
    Response::jsonSuccess([
        'lottery' => $lotteryData,
        'user' => $userData,
        'wallet' => $walletData,
        'user_tickets_count' => $userStatus['user_tickets_count']
    ]);

} catch (\PDOException $e) {
    Logger::error('lottery_status_db_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
} catch (\Throwable $e) {
    Logger::error('lottery_status_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
}
