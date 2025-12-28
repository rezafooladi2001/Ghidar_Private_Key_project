<?php

declare(strict_types=1);

/**
 * Login API endpoint for Ghidar
 * Validates Telegram WebApp data and authenticates user.
 */

require_once __DIR__ . '/../../bootstrap.php';

use Ghidar\Auth\TelegramAuth;
use Ghidar\Core\Response;
use Ghidar\Referral\ReferralService;
use Ghidar\Security\RateLimiter;
use Ghidar\Logging\Logger;

// Only accept POST requests

// Handle OPTIONS preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Telegram-Data, Telegram-Init-Data");
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Max-Age: 3600");
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::jsonError('METHOD_NOT_ALLOWED', 'Only POST method is allowed', 405);
    exit;
}

try {
    // Extract initData from request headers or body
    $initData = TelegramAuth::extractInitDataFromRequest();
    
    if ($initData === null || empty(trim($initData))) {
        // Log for debugging
        $headers = getallheaders();
        $headerKeys = array_keys($headers ?: []);
        $hasTelegramDataHeader = isset($headers['Telegram-Data']) || isset($headers['telegram-data']);
        $telegramDataValue = $headers['Telegram-Data'] ?? $headers['telegram-data'] ?? null;
        error_log("DEBUG: login_attempt - has_initData: " . ($initData !== null ? 'true' : 'false') . 
                  ", header_exists: " . ($hasTelegramDataHeader ? 'true' : 'false') . 
                  ", header_value: " . ($telegramDataValue ? (strlen($telegramDataValue) > 0 ? 'non-empty' : 'empty') : 'null') . 
                  ", headers: " . json_encode($headerKeys));
        Response::jsonError('MISSING_AUTH', 'Telegram-Data header is required. Make sure you are opening the MiniApp from within Telegram.', 401);
        exit;
    }

    // Authenticate and get/create user
    $user = TelegramAuth::getOrCreateUserFromInitData($initData);
    $userId = (int) $user['id'];

    // Rate limiting: max 30 logins per minute per user
    if (!RateLimiter::checkAndIncrement($userId, 'login', 30, 60)) {
        Response::jsonError('RATE_LIMIT_EXCEEDED', 'Too many login attempts', 429);
        exit;
    }

    // Handle referral if present (from start parameter)
    $telegramData = TelegramAuth::parseInitData($initData);
    if (isset($telegramData['start_param']) && !empty($telegramData['start_param'])) {
        $startParam = $telegramData['start_param'];
        
        // Check if it's a referral code (format: ref_<userId>)
        if (preg_match('/^ref_(\d+)$/', $startParam, $matches)) {
            $referrerId = (int) $matches[1];
            
            try {
                ReferralService::attachReferrerIfEmpty($userId, $referrerId);
            } catch (\InvalidArgumentException $e) {
                // Log but don't fail login if referral attachment fails
                error_log("WARNING: referral_attach_failed - user_id: $userId, referrer_id: $referrerId, error: " . $e->getMessage());
            }
        }
    }

    // Log successful login
    $isNew = isset($user['joining_date']) && $user['joining_date'] >= time() - 60;
    error_log("EVENT: user_login - user_id: $userId, is_new: " . ($isNew ? 'true' : 'false'));

    // Start session and store user ID (for subsequent requests)
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    $_SESSION['user_id'] = $userId;
    $_SESSION['login_time'] = time();
    error_log("EVENT: session_started - user_id: $userId, session_id: " . session_id());

    // Return user data
    Response::jsonSuccess([
        'user' => [
            'id' => $userId,
            'username' => $user['username'] ?? null,
            'first_name' => $user['first_name'] ?? null,
            'last_name' => $user['last_name'] ?? null,
            'language_code' => $user['language_code'] ?? 'en',
            'is_premium' => (bool) ($user['is_premium'] ?? false),
        ]
    ]);

} catch (\RuntimeException $e) {
    $errorMessage = $e->getMessage();
    
    if (strpos($errorMessage, 'Invalid Telegram') !== false || strpos($errorMessage, 'Invalid user') !== false) {
        Response::jsonError('INVALID_AUTH', 'Invalid authentication data', 401);
    } elseif (strpos($errorMessage, 'banned') !== false) {
        Response::jsonError('USER_BANNED', 'User is banned', 403);
    } else {
        error_log("ERROR: login_failed - " . $errorMessage);
        Response::jsonError('AUTH_ERROR', 'Authentication failed', 401);
    }
} catch (\PDOException $e) {
    error_log("ERROR: login_db_error - " . $e->getMessage());
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
} catch (\Throwable $e) {
    error_log("ERROR: login_unexpected_error - " . $e->getMessage());
    Response::jsonError('INTERNAL_ERROR', 'An error occurred', 500);
}
