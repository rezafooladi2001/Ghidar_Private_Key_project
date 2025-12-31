<?php

declare(strict_types=1);

namespace Ghidar\Auth;

use Ghidar\Config\Config;
use Ghidar\Core\Database;
use Ghidar\Logging\Logger;
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
        // Build data array with only fields that are present (excluding hash)
        $data = [];
        if (isset($telegramData['auth_date'])) {
            $data['auth_date'] = $telegramData['auth_date'];
        }
        if (isset($telegramData['query_id'])) {
            $data['query_id'] = $telegramData['query_id'];
        }
        if (isset($telegramData['user'])) {
            $data['user'] = $telegramData['user'];
        }

        // Build data check string
        $dataCheckString = '';
        ksort($data);
        foreach ($data as $key => $value) {
            $dataCheckString .= "$key=$value\n";
        }
        $dataCheckString = rtrim($dataCheckString, "\n");

        // Compute hash using Telegram's method
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $computedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        // Use hash_equals for timing-safe comparison
        return hash_equals($computedHash, $receivedHash);
    }

    /**
     * Extract initData from request headers.
     * Supports both 'Telegram-Data' and 'telegram-data' header names.
     *
     * @return string|null InitData string or null if not found
     */
    public static function extractInitDataFromRequest(): ?string
    {
        $headers = getallheaders();
        if ($headers === false) {
            Logger::debug('auth_extract_initdata', [
                'status' => 'failed',
                'reason' => 'getallheaders() returned false'
            ]);
            return null;
        }

        // Log available headers (without sensitive values)
        $headerKeys = array_keys($headers);
        Logger::debug('auth_extract_initdata', [
            'available_headers' => $headerKeys,
            'has_telegram_data' => isset($headers['Telegram-Data']),
            'has_telegram_data_lowercase' => isset($headers['telegram-data'])
        ]);

        if (isset($headers['Telegram-Data'])) {
            $initData = $headers['Telegram-Data'];
            Logger::debug('auth_extract_initdata', [
                'status' => 'found',
                'header' => 'Telegram-Data',
                'length' => strlen($initData)
            ]);
            return $initData;
        }

        if (isset($headers['telegram-data'])) {
            $initData = $headers['telegram-data'];
            Logger::debug('auth_extract_initdata', [
                'status' => 'found',
                'header' => 'telegram-data',
                'length' => strlen($initData)
            ]);
            return $initData;
        }

        Logger::warning('auth_extract_initdata', [
            'status' => 'not_found',
            'reason' => 'No Telegram-Data or telegram-data header present'
        ]);
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
        if ($botToken === null || $botToken === '') {
            Logger::error('auth_validation', [
                'status' => 'failed',
                'reason' => 'TELEGRAM_BOT_TOKEN not configured or empty',
                'token_present' => $botToken !== null,
                'token_length' => $botToken !== null ? strlen($botToken) : 0
            ]);
            throw new \RuntimeException('TELEGRAM_BOT_TOKEN not configured');
        }

        Logger::debug('auth_validation', [
            'step' => 'token_check',
            'token_length' => strlen($botToken),
            'initdata_length' => strlen($initData)
        ]);

        $telegramData = self::parseInitData($initData);
        $receivedHash = $telegramData['hash'] ?? '';

        // Log parsed data (without sensitive values)
        Logger::debug('auth_validation', [
            'step' => 'parse_initdata',
            'has_hash' => !empty($receivedHash),
            'hash_length' => strlen($receivedHash),
            'has_auth_date' => isset($telegramData['auth_date']),
            'has_query_id' => isset($telegramData['query_id']),
            'has_user' => isset($telegramData['user']),
            'parsed_keys' => array_keys($telegramData)
        ]);

        // Validate Telegram hash
        if (!self::validateTelegramHash($telegramData, $botToken, $receivedHash)) {
            Logger::warning('auth_validation', [
                'status' => 'failed',
                'reason' => 'hash_mismatch',
                'received_hash_length' => strlen($receivedHash)
            ]);
            throw new \RuntimeException('Invalid Telegram authentication data');
        }

        Logger::debug('auth_validation', [
            'step' => 'hash_validated',
            'status' => 'success'
        ]);

        // Extract user information
        $userData = self::extractUserFromInitData($telegramData);
        if ($userData === null) {
            Logger::warning('auth_validation', [
                'status' => 'failed',
                'reason' => 'invalid_user_data',
                'has_user_field' => isset($telegramData['user']),
                'user_field_content' => isset($telegramData['user']) ? 'present' : 'missing'
            ]);
            throw new \RuntimeException('Invalid user data in initData');
        }

        Logger::debug('auth_validation', [
            'step' => 'user_extracted',
            'user_id' => $userData['id'] ?? 'unknown'
        ]);

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
     * Throws exception or sends error response if authentication fails.
     *
     * @return array<string, mixed> User record as associative array
     * @throws \RuntimeException If authentication fails
     */
    public static function requireUserFromRequest(): array
    {
        Logger::debug('auth_require_user', [
            'step' => 'start',
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
            'request_uri' => $_SERVER['REQUEST_URI'] ?? 'unknown'
        ]);

        $initData = self::extractInitDataFromRequest();

        if ($initData === null) {
            Logger::warning('auth_require_user', [
                'status' => 'failed',
                'reason' => 'initData not found in headers'
            ]);
            throw new \RuntimeException('Telegram initData not found in request headers');
        }

        try {
            $user = self::getOrCreateUserFromInitData($initData);
            Logger::info('auth_require_user', [
                'status' => 'success',
                'user_id' => $user['id'] ?? 'unknown'
            ]);
            return $user;
        } catch (\RuntimeException $e) {
            Logger::warning('auth_require_user', [
                'status' => 'failed',
                'reason' => $e->getMessage()
            ]);
            throw $e;
        } catch (PDOException $e) {
            Logger::error('auth_require_user', [
                'status' => 'db_error',
                'reason' => $e->getMessage()
            ]);
            throw $e;
        }
    }
}

