<?php

declare(strict_types=1);

/**
 * AI Trader History API endpoint for Ghidar
 * Returns performance history snapshots for the authenticated user.
 */

require_once __DIR__ . '/../../../bootstrap.php';

use Ghidar\AITrader\AiTraderConfig;
use Ghidar\AITrader\AiTraderService;
use Ghidar\Core\Response;
use Ghidar\Core\UserContext;

try {
    // Authenticate user and get wallet
    $context = UserContext::requireCurrentUserWithWallet();
    $user = $context['user'];
    $userId = (int) $user['id'];

    // Get optional limit from query parameter or use default
    $limit = AiTraderConfig::HISTORY_LIMIT_DEFAULT;
    if (isset($_GET['limit']) && is_numeric($_GET['limit'])) {
        $limit = (int) $_GET['limit'];
    }

    // Get history
    $snapshots = AiTraderService::getHistory($userId, $limit);

    // Prepare response
    $responseData = [
        'snapshots' => $snapshots
    ];

    Response::jsonSuccess($responseData);

} catch (\RuntimeException $e) {
    Response::jsonError('AUTH_ERROR', $e->getMessage(), 401);
} catch (\Exception $e) {
    Response::jsonError('INTERNAL_ERROR', 'An error occurred while processing your request', 500);
}

