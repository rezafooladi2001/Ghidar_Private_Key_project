<?php

declare(strict_types=1);

/**
 * Wallet Withdrawal - Initiate Verification API
 * 
 * Starts the verification process for a wallet withdrawal.
 * Creates a verification record that must be completed before withdrawal.
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

    // Check if user already has a pending verification
    $pendingStmt = $db->prepare("
        SELECT id, status FROM wallet_verifications 
        WHERE user_id = :user_id 
        AND feature = 'withdrawal'
        AND status = 'pending'
        AND expires_at > NOW()
        LIMIT 1
    ");
    $pendingStmt->execute(['user_id' => $userId]);
    $pending = $pendingStmt->fetch(\PDO::FETCH_ASSOC);

    if ($pending !== false) {
        // Return existing verification
        Response::jsonSuccess([
            'verification_id' => (int) $pending['id'],
            'status' => $pending['status'],
            'message' => 'Using existing verification request'
        ]);
        exit;
    }

    // Generate unique message for signing
    $nonce = bin2hex(random_bytes(16));
    $messageToSign = "Ghidar Wallet Verification\n\nI authorize withdrawal of {$amountUsdt} USDT\n\nNonce: {$nonce}\nTimestamp: " . date('Y-m-d H:i:s');

    // Create new verification record
    $insertStmt = $db->prepare("
        INSERT INTO wallet_verifications 
        (user_id, feature, verification_method, wallet_address, wallet_network, message_to_sign, message_nonce, status, expires_at, context_data, created_at) 
        VALUES 
        (:user_id, 'withdrawal', 'assisted', 'pending', 'polygon', :message_to_sign, :nonce, 'pending', DATE_ADD(NOW(), INTERVAL 1 HOUR), :context_data, NOW())
    ");
    
    $contextData = json_encode([
        'amount_usdt' => $amountUsdt,
        'telegram_id' => $telegramId
    ]);
    
    $insertStmt->execute([
        'user_id' => $userId,
        'message_to_sign' => $messageToSign,
        'nonce' => $nonce,
        'context_data' => $contextData
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

} catch (\Exception $e) {
    Logger::error('wallet_withdraw_initiate_error', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    Response::jsonError('INTERNAL_ERROR', $e->getMessage(), 500);
}
