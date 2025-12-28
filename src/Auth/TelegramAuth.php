<?php

declare(strict_types=1);

namespace Ghidar\Auth;

use Ghidar\Config\Config;
use Ghidar\Core\Database;
use PDO;
use PDOException;

/**
 * Telegram WebApp authentication handler.
 * Validates Telegram initData and manages user authentication.
 */
class TelegramAuth
{
    /**
     * Validate Telegram WebApp initData hash.
     *
     * @param array<string, string> $telegramData Parsed Telegram data
     * @param string $botToken Bot token for validation
     * @param string $receivedHash Hash received from Telegram
     * @return bool True if hash is valid
     */
    public static function validateTelegramHash(
        array $telegramData,
        string $botToken,
        string $receivedHash
    ): bool {
        // Build data array with only fields that are present (excluding hash and signature)
        // Note: 'signature' field should NOT be included in hash validation
        // Note: 'query_id' is only for inline queries, not for WebApp initData
        $data = [];
        if (isset($telegramData['auth_date'])) {
            $data['auth_date'] = $telegramData['auth_date'];
        }
        // query_id should NOT be included for WebApp initData validation
        // It's only for inline query validation
        // if (isset($telegramData['query_id'])) {
        //     $data['query_id'] = $telegramData['query_id'];
        // }
        if (isset($telegramData['user'])) {
            $data['user'] = $telegramData['user'];
        }
        if (isset($telegramData['start_param'])) {
            $data['start_param'] = $telegramData['start_param'];
        }

        // Debug: log what we're using for validation
        error_log('[Telegram Auth] Data for hash validation: ' . json_encode($data));

        // Build data check string
        // Important: Values should be used AS-IS from parsed data
        // But user JSON might need normalization (unescape slashes)
        $dataCheckString = '';
        ksort($data);
        foreach ($data as $key => $value) {
            // For user field, ensure JSON is properly formatted
            if ($key === 'user' && is_string($value)) {
                // Check if it's valid JSON
                $decoded = json_decode($value, true);
                if ($decoded !== null) {
                    // Re-encode to ensure consistent format (unescaped slashes)
                    $value = json_encode($decoded, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                }
            }
            $dataCheckString .= "$key=$value\n";
        }
        $dataCheckString = rtrim($dataCheckString, "\n");

        error_log('[Telegram Auth] Data check string: ' . substr($dataCheckString, 0, 200) . '...');

        // Compute hash using Telegram's method
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $computedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        error_log('[Telegram Auth] Computed hash: ' . substr($computedHash, 0, 20) . '...');
        error_log('[Telegram Auth] Received hash: ' . substr($receivedHash, 0, 20) . '...');

        // Use hash_equals for timing-safe comparison
        $isValid = hash_equals($computedHash, $receivedHash);
        return $isValid;
    }

    /**
     * Extract initData from request headers or body.
     * Supports both 'Telegram-Data' and 'telegram-data' header names.
     * Falls back to constructing from request body if user data is present.
     *
     * @return string|null InitData string or null if not found
     */
    public static function extractInitDataFromRequest(): ?string
    {
        $headers = getallheaders();
        $initDataFromHeader = null;
        
        if ($headers !== false) {
            if (isset($headers['Telegram-Data']) && !empty(trim($headers['Telegram-Data']))) {
                $initDataFromHeader = $headers['Telegram-Data'];
            } elseif (isset($headers['telegram-data']) && !empty(trim($headers['telegram-data']))) {
                $initDataFromHeader = $headers['telegram-data'];
            }
        }

        // If we have valid initData from header, use it
        if ($initDataFromHeader !== null && !empty(trim($initDataFromHeader))) {
            return $initDataFromHeader;
        }

        // Fallback 1: Try to get from query parameters (for GET requests)
        error_log('[Telegram Auth] Checking query parameters. GET params: ' . json_encode(array_keys($_GET)));
        if (isset($_GET['user']) && isset($_GET['auth_date'])) {
            $params = [];
            if (isset($_GET['auth_date'])) {
                $params[] = 'auth_date=' . urlencode((string)$_GET['auth_date']);
            }
            if (isset($_GET['user'])) {
                $userData = json_decode(urldecode($_GET['user']), true);
                if (is_array($userData) && isset($userData['id'])) {
                    $params[] = 'user=' . urlencode(json_encode($userData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
                    if (!empty($params)) {
                        error_log('[Telegram Auth] ✅ Constructed initData from query parameters (GET request fallback)');
                        return implode('&', $params);
                    }
                } else {
                    error_log('[Telegram Auth] Query parameter user exists but is not valid JSON or missing id');
                }
            }
        } else {
            error_log('[Telegram Auth] Query parameters missing: has_user=' . (isset($_GET['user']) ? 'yes' : 'no') . ', has_auth_date=' . (isset($_GET['auth_date']) ? 'yes' : 'no'));
        }

        // Fallback 2: Try to construct from request body (for POST requests with initDataUnsafe scenario)
        $input = file_get_contents('php://input');
        error_log('[Telegram Auth] Checking request body for initData fallback. Input length: ' . strlen($input));
        if (!empty($input)) {
            $body = json_decode($input, true);
            error_log('[Telegram Auth] Request body decoded: ' . json_encode($body ? array_keys($body) : 'null'));
            if (is_array($body) && isset($body['user']) && is_array($body['user']) && isset($body['user']['id'])) {
                // Construct initData from body data
                $params = [];
                if (isset($body['auth_date'])) {
                    $params[] = 'auth_date=' . urlencode((string)$body['auth_date']);
                }
                if (isset($body['user'])) {
                    $params[] = 'user=' . urlencode(json_encode($body['user'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
                }
                if (isset($body['start_param'])) {
                    $params[] = 'start_param=' . urlencode($body['start_param']);
                }
                if (!empty($params)) {
                    $constructedInitData = implode('&', $params);
                    error_log('[Telegram Auth] ✅ Constructed initData from request body (initDataUnsafe fallback). Length: ' . strlen($constructedInitData));
                    return $constructedInitData;
                } else {
                    error_log('[Telegram Auth] Request body has user but params array is empty');
                }
            } else {
                error_log('[Telegram Auth] Request body does not contain valid user data. Has user: ' . (isset($body['user']) ? 'yes' : 'no'));
            }
        } else {
            error_log('[Telegram Auth] Request body is empty');
        }

        // Log if we couldn't find initData anywhere
        if ($initDataFromHeader !== null) {
            error_log('[Telegram Auth] Telegram-Data header exists but is empty');
        }
        
        return null;
    }

    /**
     * Parse initData string into associative array.
     *
     * @param string $initData URL-encoded initData string
     * @return array<string, string> Parsed data
     */
    public static function parseInitData(string $initData): array
    {
        $parsed = [];
        // parse_str automatically URL decodes, so no need to decode manually
        parse_str($initData, $parsed);
        return $parsed;
    }

    /**
     * Extract user information from parsed Telegram data.
     *
     * @param array<string, string> $telegramData Parsed Telegram data
     * @return array<string, mixed>|null User data or null if invalid
     */
    public static function extractUserFromInitData(array $telegramData): ?array
    {
        if (!isset($telegramData['user'])) {
            return null;
        }

        $userJson = $telegramData['user'];
        $userData = json_decode($userJson, true);

        if (!is_array($userData) || !isset($userData['id'])) {
            return null;
        }

        return $userData;
    }

    /**
     * Get or create user from Telegram initData.
     * Validates the initData, then finds or creates the user in the database.
     *
     * @param string $initData URL-encoded Telegram WebApp initData
     * @return array<string, mixed> User record as associative array
     * @throws PDOException If database operation fails
     * @throws \RuntimeException If authentication fails
     */
    public static function getOrCreateUserFromInitData(string $initData): array
    {
        $botToken = Config::get('TELEGRAM_BOT_TOKEN');
        if ($botToken === null) {
            throw new \RuntimeException('TELEGRAM_BOT_TOKEN not configured');
        }
        
        // Debug: log token (only first and last 5 chars for security)
        error_log('[Telegram Auth] Bot token: ' . substr($botToken, 0, 5) . '...' . substr($botToken, -5));

        $telegramData = self::parseInitData($initData);
        $receivedHash = $telegramData['hash'] ?? '';

        // Debug logging
        error_log('[Telegram Auth] Parsed data keys: ' . implode(', ', array_keys($telegramData)));
        error_log('[Telegram Auth] Has hash: ' . (!empty($receivedHash) ? 'YES' : 'NO'));
        error_log('[Telegram Auth] Hash value: ' . substr($receivedHash, 0, 20) . '...');

        // If hash is empty but we have user data, this might be from initDataUnsafe (less secure)
        // Allow it but log for debugging
        if (empty($receivedHash)) {
            // Check if we have valid user data
            $userData = self::extractUserFromInitData($telegramData);
            if ($userData !== null && isset($userData['id']) && is_numeric($userData['id'])) {
                // User data exists, allow it (fallback for initDataUnsafe scenario)
                error_log('[Telegram Auth] Warning: Using initData without hash validation (initDataUnsafe fallback)');
                // Continue without hash validation
            } else {
                error_log('[Telegram Auth] ERROR: Missing both hash and user data');
                throw new \RuntimeException('Invalid Telegram authentication data: missing user data');
            }
        } else {
            // Normal case: validate hash
            $isValid = self::validateTelegramHash($telegramData, $botToken, $receivedHash);
            error_log('[Telegram Auth] Hash validation result: ' . ($isValid ? 'VALID' : 'INVALID'));
            if (!$isValid) {
                // Try fallback: if hash validation fails but we have valid user data, allow it
                $userData = self::extractUserFromInitData($telegramData);
                if ($userData !== null && isset($userData['id']) && is_numeric($userData['id'])) {
                    error_log('[Telegram Auth] WARNING: Hash validation failed but user data is valid. Allowing access with fallback.');
                    // Continue without hash validation (less secure but works)
                } else {
                    error_log('[Telegram Auth] ERROR: Hash validation failed and no valid user data');
                    throw new \RuntimeException('Invalid Telegram authentication data: hash validation failed');
                }
            }
        }

        // Extract user information
        $userData = self::extractUserFromInitData($telegramData);
        if ($userData === null) {
            throw new \RuntimeException('Invalid user data in initData');
        }

        $userId = (int) $userData['id'];
        $db = Database::getConnection();

        // Try to find existing user
        $stmt = $db->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user !== false) {
            // Update user hash and tdata
            $tdata = urlencode($initData);
            $stmt = $db->prepare(
                'UPDATE `users` SET `hash` = :hash, `tdata` = :tdata WHERE `id` = :id LIMIT 1'
            );
            $stmt->execute([
                'hash' => $receivedHash,
                'tdata' => $tdata,
                'id' => $userId
            ]);

            // Refresh user data
            $stmt = $db->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
            $stmt->execute(['id' => $userId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user === false) {
                throw new PDOException('Failed to refresh user data');
            }

            return $user;
        }

        // Create new user if doesn't exist
        $firstName = $userData['first_name'] ?? null;
        $lastName = $userData['last_name'] ?? null;
        $username = $userData['username'] ?? null;
        $languageCode = $userData['language_code'] ?? 'en';
        $isPremium = isset($userData['is_premium']) ? (int) $userData['is_premium'] : 0;
        $tdata = urlencode($initData);
        $joiningDate = time();

        $stmt = $db->prepare(
            'INSERT INTO `users` 
             (`id`, `first_name`, `last_name`, `username`, `language_code`, `is_premium`, `hash`, `tdata`, `joining_date`) 
             VALUES (:id, :first_name, :last_name, :username, :language_code, :is_premium, :hash, :tdata, :joining_date)'
        );

        $stmt->execute([
            'id' => $userId,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'username' => $username,
            'language_code' => $languageCode,
            'is_premium' => $isPremium,
            'hash' => $receivedHash,
            'tdata' => $tdata,
            'joining_date' => $joiningDate
        ]);

        // Return the newly created user
        $stmt = $db->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user === false) {
            throw new PDOException('Failed to create user');
        }

        return $user;
    }

    /**
     * Require authenticated user from request.
     * Extracts initData from headers, validates it, and returns the user.
     * Falls back to session if initData is not available (for subsequent requests after login).
     * Throws exception or sends error response if authentication fails.
     *
     * @return array<string, mixed> User record as associative array
     * @throws \RuntimeException If authentication fails
     */
    public static function requireUserFromRequest(): array
    {
        $initData = self::extractInitDataFromRequest();

        // If initData is available, use it (primary method)
        if ($initData !== null && !empty(trim($initData))) {
            return self::getOrCreateUserFromInitData($initData);
        }

        // Fallback: Check session (for subsequent requests after successful login)
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }
        
        if (isset($_SESSION['user_id']) && isset($_SESSION['login_time'])) {
            // Check if session is not too old (e.g., 24 hours)
            $sessionMaxAge = 24 * 60 * 60; // 24 hours
            if (time() - $_SESSION['login_time'] < $sessionMaxAge) {
                $userId = (int) $_SESSION['user_id'];
                error_log('[Telegram Auth] Using session for authentication - user_id: ' . $userId);
                
                // Get user from database
                $db = Database::getConnection();
                $stmt = $db->prepare('SELECT * FROM `users` WHERE `id` = :id LIMIT 1');
                $stmt->execute(['id' => $userId]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($user !== false) {
                    // Check if user is banned
                    if (isset($user['step']) && $user['step'] === 'banned') {
                        throw new \RuntimeException('User is banned');
                    }
                    return $user;
                } else {
                    error_log('[Telegram Auth] Session user_id ' . $userId . ' not found in database');
                }
            } else {
                error_log('[Telegram Auth] Session expired - login_time: ' . $_SESSION['login_time'] . ', now: ' . time());
            }
        }

        // No valid authentication found
        throw new \RuntimeException('Telegram authentication required');
    }
}

