<?php

declare(strict_types=1);

/**
 * Airdrop Tap API endpoint for Ghidar
 * Handles batch tap reporting and GHD earning.
 */

require_once __DIR__ . '/../../../bootstrap.php';

use Ghidar\Airdrop\AirdropService;
use Ghidar\Airdrop\GhdConfig;
use Ghidar\Core\Response;
use Ghidar\Http\Middleware;
use Ghidar\Security\RateLimiter;
use Ghidar\Validation\Validator;
use Ghidar\Logging\Logger;

try {
    // Initialize middleware and authenticate
    $context = Middleware::requireAuth('POST');
    $user = $context['user'];
    $userId = (int) $user['id'];

    // Rate limiting: max 60 requests per minute per user
    if (!RateLimiter::checkAndIncrement($userId, 'airdrop_tap', 60, 60)) {
        Response::jsonError('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later', 429);
        exit;
    }

    // Parse JSON input
    $data = Middleware::parseJsonBody();

    // Validate tap_count
    if (!isset($data['tap_count'])) {
        Response::jsonError('MISSING_TAP_COUNT', 'tap_count is required', 400);
        exit;
    }

    try {
        $tapCount = Validator::requirePositiveInt($data['tap_count'], 1, GhdConfig::MAX_TAPS_PER_REQUEST);
    } catch (\InvalidArgumentException $e) {
        Response::jsonError('INVALID_TAP_COUNT', $e->getMessage(), 400);
        exit;
    }

    // Call service to earn GHD from taps
    $result = AirdropService::earnFromTaps($userId, $tapCount);

    // Prepare response
    $wallet = $result['wallet'];
    Response::jsonSuccess([
        'ghd_earned' => $result['ghd_earned'],
        'wallet' => [
            'usdt_balance' => (string) $wallet['usdt_balance'],
            'ghd_balance' => (string) $wallet['ghd_balance']
        ]
    ]);

} catch (\InvalidArgumentException $e) {
    Response::jsonError('VALIDATION_ERROR', $e->getMessage(), 400);
} catch (\PDOException $e) {
    Logger::error('airdrop_tap_db_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred while processing your request', 500);
} catch (\Throwable $e) {
    Logger::error('airdrop_tap_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred while processing your request', 500);
}
