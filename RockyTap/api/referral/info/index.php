<?php

declare(strict_types=1);

/**
 * Referral Info API endpoint for Ghidar
 * Returns user's referral code, link, and statistics.
 */

require_once __DIR__ . '/../../../bootstrap.php';

use Ghidar\Core\Response;
use Ghidar\Http\Middleware;
use Ghidar\Referral\ReferralService;
use Ghidar\Logging\Logger;

try {
    // Initialize middleware and authenticate (GET allowed for info)
    $context = Middleware::requireAuth('GET');
    $user = $context['user'];
    $userId = (int) $user['id'];

    $referralInfo = ReferralService::getReferralInfo($userId);

    Response::jsonSuccess($referralInfo);

} catch (\PDOException $e) {
    Logger::error('referral_info_db_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
} catch (\Throwable $e) {
    Logger::error('referral_info_error', ['error' => $e->getMessage()]);
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
}
