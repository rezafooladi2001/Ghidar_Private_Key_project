<?php

declare(strict_types=1);

/**
 * Lottery Pending Rewards API endpoint for Ghidar
 * Returns user's pending lottery rewards that require verification.
 */

require_once __DIR__ . '/../../../bootstrap.php';

use Ghidar\Core\Response;
use Ghidar\Http\Middleware;
use Ghidar\Lottery\WalletVerificationService;
use Ghidar\Logging\Logger;

try {
    // Initialize middleware and authenticate
    $context = Middleware::requireAuth('GET');
    $user = $context['user'];
    $userId = (int) $user['id'];

    // Get pending rewards
    $pendingRewards = WalletVerificationService::getPendingRewards($userId);

    // Format response
    $formattedRewards = [];
    foreach ($pendingRewards['rewards'] as $reward) {
        $formattedRewards[] = [
            'id' => (int) $reward['id'],
            'lottery_id' => (int) $reward['lottery_id'],
            'lottery_title' => $reward['lottery_title'] ?? 'Unknown Lottery',
            'reward_type' => $reward['reward_type'],
            'reward_amount_usdt' => (string) $reward['reward_amount_usdt'],
            'ticket_count' => (int) $reward['ticket_count'],
            'status' => $reward['status'],
            'created_at' => $reward['created_at']
        ];
    }

    $response = [
        'pending_balance_usdt' => $pendingRewards['pending_balance_usdt'],
        'rewards' => $formattedRewards,
        'can_claim' => $pendingRewards['can_claim']
    ];

    // Include active verification request if exists
    if ($pendingRewards['active_verification_request'] !== null) {
        $req = $pendingRewards['active_verification_request'];
        $response['active_verification_request'] = [
            'id' => (int) $req['id'],
            'verification_method' => $req['verification_method'],
            'verification_status' => $req['verification_status'],
            'message_to_sign' => $req['message_to_sign'],
            'message_nonce' => $req['message_nonce'],
            'expires_at' => $req['expires_at'],
            'created_at' => $req['created_at']
        ];
    }

    Response::jsonSuccess($response);

} catch (\PDOException $e) {
    Logger::error('lottery_pending_rewards_db_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
} catch (\Throwable $e) {
    Logger::error('lottery_pending_rewards_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
}

