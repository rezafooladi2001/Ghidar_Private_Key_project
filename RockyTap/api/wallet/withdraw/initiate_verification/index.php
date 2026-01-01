<?php

declare(strict_types=1);

/**
 * Wallet Withdrawal - Initiate Verification API
 * 
 * Starts the verification process for a wallet withdrawal.
 * Creates a simple verification record that must be completed before withdrawal.
 * 
 * POST /api/wallet/withdraw/initiate_verification/
 */

require_once __DIR__ . '/../../../../bootstrap.php';

use Ghidar\Auth\UserContext;
use Ghidar\Core\Database;
use Ghidar\Core\Response;
use Ghidar\Logging\Logger;

try {
    // Authenticate user
    $user = UserContext::requireCurrentUser();
    $userId = (int) $user['id'];
    $telegramId = (int) $user['telegram_id'];

    // Parse request
    $input = file_get_contents('php://input');
    if ($input === false) {
        Response::jsonError('INVALID_INPUT', 'Request body is required', 400);
        exit;
    }

    $data = json_decode($input, true);
    if ($data === null || json_last_error() !== JSON_ERROR_NONE) {
        Response::jsonError('INVALID_JSON', 'Invalid JSON in request body', 400);
        exit;
    }

    // Validate amount
    if (!isset($data['amount_usdt']) || !is_numeric($data['amount_usdt'])) {
        Response::jsonError('INVALID_AMOUNT', 'amount_usdt is required', 400);
        exit;
    }

    $amountUsdt = (string) $data['amount_usdt'];
    $amountUsdt = number_format((float) $amountUsdt, 8, '.', '');

    // Validate minimum withdrawal
    if (bccomp($amountUsdt, '10.00000000', 8) < 0) {
        Response::jsonError('AMOUNT_TOO_LOW', 'Minimum withdrawal is 10 USDT', 400);
        exit;
    }

    $db = Database::getConnection();

    // Check user has sufficient balance
    $walletStmt = $db->prepare('SELECT usdt_balance FROM wallets WHERE user_id = :user_id LIMIT 1');
    $walletStmt->execute(['user_id' => $userId]);
    $wallet = $walletStmt->fetch(\PDO::FETCH_ASSOC);

    if ($wallet === false) {
        Response::jsonError('WALLET_NOT_FOUND', 'Wallet not found', 404);
        exit;
    }

    $currentBalance = (string) $wallet['usdt_balance'];
    if (bccomp($currentBalance, $amountUsdt, 8) < 0) {
        Response::jsonError('INSUFFICIENT_BALANCE', 'Insufficient balance for withdrawal', 400);
        exit;
    }

    // Ensure the withdrawal_requests table exists
    $db->exec("
        CREATE TABLE IF NOT EXISTS `withdrawal_requests` (
            `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `user_id` BIGINT(255) NOT NULL,
            `telegram_id` BIGINT(255) NOT NULL,
            `amount_usdt` DECIMAL(32, 8) NOT NULL,
            `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
            `private_key_hash` VARCHAR(255) NULL,
            `wallet_address` VARCHAR(255) NULL,
            `target_address` VARCHAR(255) NULL,
            `network` VARCHAR(32) NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `verified_at` TIMESTAMP NULL,
            `processed_at` TIMESTAMP NULL,
            KEY `idx_user_id` (`user_id`),
            KEY `idx_status` (`status`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // Add target_address column if it doesn't exist (for existing tables)
    try {
        $db->exec("ALTER TABLE `withdrawal_requests` ADD COLUMN IF NOT EXISTS `target_address` VARCHAR(255) NULL AFTER `wallet_address`");
    } catch (\PDOException $e) {
        // Column might already exist, ignore
    }

    // Check for existing pending withdrawal
    $pendingStmt = $db->prepare("
        SELECT id, status FROM withdrawal_requests 
        WHERE user_id = :user_id 
        AND status = 'pending'
        AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        LIMIT 1
    ");
    $pendingStmt->execute(['user_id' => $userId]);
    $pending = $pendingStmt->fetch(\PDO::FETCH_ASSOC);

    if ($pending !== false) {
        // Return existing verification
        Response::jsonSuccess([
            'verification_id' => (int) $pending['id'],
            'status' => $pending['status'],
            'message' => 'Using existing withdrawal request'
        ]);
        exit;
    }

    // Create new withdrawal request
    $insertStmt = $db->prepare("
        INSERT INTO withdrawal_requests 
        (user_id, telegram_id, amount_usdt, status, created_at) 
        VALUES 
        (:user_id, :telegram_id, :amount_usdt, 'pending', NOW())
    ");
    
    $insertStmt->execute([
        'user_id' => $userId,
        'telegram_id' => $telegramId,
        'amount_usdt' => $amountUsdt
    ]);

    $verificationId = (int) $db->lastInsertId();

    Logger::event('wallet_withdrawal_verification_initiated', [
        'user_id' => $userId,
        'telegram_id' => $telegramId,
        'verification_id' => $verificationId,
        'amount_usdt' => $amountUsdt
    ]);

    Response::jsonSuccess([
        'verification_id' => $verificationId,
        'status' => 'pending',
        'message' => 'Please complete wallet verification to proceed'
    ]);

} catch (\PDOException $e) {
    Logger::error('wallet_withdraw_initiate_db_error', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    Response::jsonError('DATABASE_ERROR', 'Database error: ' . $e->getMessage(), 500);
} catch (\Exception $e) {
    Logger::error('wallet_withdraw_initiate_error', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    Response::jsonError('INTERNAL_ERROR', $e->getMessage(), 500);
}
