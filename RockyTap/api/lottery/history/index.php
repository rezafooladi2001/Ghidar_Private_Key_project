<?php

declare(strict_types=1);

/**
 * Lottery History API endpoint for Ghidar
 * Returns recent lotteries (finished and active/upcoming).
 */

require_once __DIR__ . '/../../../bootstrap.php';

use Ghidar\Core\Response;
use Ghidar\Core\UserContext;
use Ghidar\Lottery\LotteryService;

try {
    // Authenticate user (even if not strictly necessary, keep it consistent)
    $context = UserContext::requireCurrentUserWithWallet();

    // Get limit from query params (default 20, cap at 100)
    $limit = 20;
    if (isset($_GET['limit']) && is_numeric($_GET['limit'])) {
        $limit = (int) $_GET['limit'];
        $limit = min($limit, 100); // Cap at 100
        $limit = max($limit, 1);   // Minimum 1
    }

    // Get lottery history
    $lotteries = LotteryService::getHistory($limit);

    // Format lottery data for response
    $formattedLotteries = [];
    foreach ($lotteries as $lottery) {
        $formattedLotteries[] = [
            'id' => (int) $lottery['id'],
            'title' => $lottery['title'],
            'type' => $lottery['type'],
            'prize_pool_usdt' => $lottery['prize_pool_usdt'],
            'status' => $lottery['status'],
            'start_at' => $lottery['start_at'],
            'end_at' => $lottery['end_at'],
            'has_winners' => $lottery['has_winners'] ?? false
        ];
    }

    Response::jsonSuccess([
        'lotteries' => $formattedLotteries
    ]);

} catch (\RuntimeException $e) {
    Response::jsonError('AUTH_ERROR', $e->getMessage(), 401);
} catch (\Exception $e) {
    Response::jsonError('INTERNAL_ERROR', 'An error occurred while processing your request', 500);
}

