<?php

declare(strict_types=1);

/**
 * AI Trader Status API endpoint for Ghidar
 * Returns current AI Trader status and wallet overview for the authenticated user.
 */

require_once __DIR__ . '/../../../bootstrap.php';

use Ghidar\AITrader\AiTraderService;
use Ghidar\Core\Response;
use Ghidar\Core\UserContext;

try {
    // Authenticate user and get wallet
    $context = UserContext::requireCurrentUserWithWallet();
    $user = $context['user'];
    $wallet = $context['wallet'];
    $userId = (int) $user['id'];

    // Get AI Trader summary
    $aiTraderSummary = AiTraderService::getSummary($userId);

    // Prepare user data
    $userData = [
        'id' => $userId,
        'telegram_id' => $userId,
        'username' => $user['username'] ?? null,
    ];

    // Prepare response
    $responseData = [
        'user' => $userData,
        'wallet' => [
            'usdt_balance' => (string) $wallet['usdt_balance'],
            'ghd_balance' => (string) $wallet['ghd_balance']
        ],
        'ai_trader' => $aiTraderSummary
    ];

    Response::jsonSuccess($responseData);

} catch (\RuntimeException $e) {
    Response::jsonError('AUTH_ERROR', $e->getMessage(), 401);
} catch (\Exception $e) {
    Response::jsonError('INTERNAL_ERROR', 'An error occurred while processing your request', 500);
}

