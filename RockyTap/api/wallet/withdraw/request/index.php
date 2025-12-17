<?php

declare(strict_types=1);

/**
 * Withdrawal Request API endpoint for Ghidar
 * Allows users to request an on-chain withdrawal of internal USDT.
 */

require_once __DIR__ . '/../../../../bootstrap.php';

use Ghidar\Core\Response;
use Ghidar\Core\UserContext;
use Ghidar\Payments\PaymentsConfig;
use Ghidar\Payments\WithdrawalService;
use Ghidar\Security\RateLimiter;
use Ghidar\Validation\Validator;

try {
    // Authenticate user and get wallet
    $context = UserContext::requireCurrentUserWithWallet();
    $user = $context['user'];
    $userId = (int) $user['id'];

    // Rate limiting: max 10 requests per hour per user
    if (!RateLimiter::checkAndIncrement($userId, 'wallet_withdraw_request', 10, 3600)) {
        Response::jsonError('RATE_LIMIT_EXCEEDED', 'Too many requests, please try again later', 429);
        exit;
    }

    // Read and parse JSON input
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

    // Validate network
    if (!isset($data['network'])) {
        Response::jsonError('INVALID_NETWORK', 'network is required', 400);
        exit;
    }
    try {
        $network = Validator::requireInArray($data['network'], PaymentsConfig::SUPPORTED_NETWORKS);
    } catch (\InvalidArgumentException $e) {
        Response::jsonError('INVALID_NETWORK', $e->getMessage(), 400);
        exit;
    }

    // Validate product_type
    if (!isset($data['product_type'])) {
        Response::jsonError('INVALID_PRODUCT_TYPE', 'product_type is required', 400);
        exit;
    }
    $allowedProductTypes = ['wallet', 'ai_trader'];
    try {
        $productType = Validator::requireInArray($data['product_type'], $allowedProductTypes);
    } catch (\InvalidArgumentException $e) {
        Response::jsonError('INVALID_PRODUCT_TYPE', $e->getMessage(), 400);
        exit;
    }

    // Validate amount_usdt
    if (!isset($data['amount_usdt'])) {
        Response::jsonError('INVALID_AMOUNT', 'amount_usdt is required', 400);
        exit;
    }
    try {
        $amountUsdt = Validator::requirePositiveDecimal(
            $data['amount_usdt'],
            PaymentsConfig::MIN_WITHDRAW_USDT,
            PaymentsConfig::MAX_WITHDRAW_USDT
        );
    } catch (\InvalidArgumentException $e) {
        Response::jsonError('INVALID_AMOUNT', $e->getMessage(), 400);
        exit;
    }

    // Validate target_address
    if (!isset($data['target_address'])) {
        Response::jsonError('INVALID_TARGET_ADDRESS', 'target_address is required', 400);
        exit;
    }
    try {
        $targetAddress = Validator::requireNonEmptyString($data['target_address'], 10, 255);
    } catch (\InvalidArgumentException $e) {
        Response::jsonError('INVALID_TARGET_ADDRESS', $e->getMessage(), 400);
        exit;
    }

    // Call service to request withdrawal
    $result = WithdrawalService::requestWithdrawal($userId, $network, $productType, $amountUsdt, $targetAddress);

    // Prepare response
    $responseData = [
        'withdrawal' => [
            'id' => (int) $result['withdrawal']['id'],
            'status' => $result['withdrawal']['status'],
            'network' => $result['withdrawal']['network'],
            'product_type' => $result['withdrawal']['product_type'],
            'amount_usdt' => (string) $result['withdrawal']['amount_usdt'],
            'target_address' => $result['withdrawal']['target_address'],
            'created_at' => $result['withdrawal']['created_at']
        ],
        'wallet' => [
            'usdt_balance' => (string) $result['wallet']['usdt_balance'],
            'ghd_balance' => (string) $result['wallet']['ghd_balance']
        ]
    ];

    // Add AI account if present
    if (isset($result['ai_account'])) {
        $responseData['ai_account'] = [
            'current_balance_usdt' => (string) $result['ai_account']['current_balance_usdt'],
            'total_deposited_usdt' => (string) $result['ai_account']['total_deposited_usdt'],
            'realized_pnl_usdt' => (string) $result['ai_account']['realized_pnl_usdt']
        ];
    }

    Response::jsonSuccess($responseData);

} catch (\InvalidArgumentException $e) {
    $errorCode = 'VALIDATION_ERROR';
    $errorMessage = $e->getMessage();

    // Map specific errors to error codes
    if (strpos($errorMessage, 'network') !== false) {
        $errorCode = 'INVALID_NETWORK';
    } elseif (strpos($errorMessage, 'product type') !== false) {
        $errorCode = 'INVALID_PRODUCT_TYPE';
    } elseif (strpos($errorMessage, 'amount') !== false || strpos($errorMessage, 'Amount') !== false) {
        $errorCode = 'INVALID_AMOUNT';
    } elseif (strpos($errorMessage, 'address') !== false || strpos($errorMessage, 'Address') !== false) {
        $errorCode = 'INVALID_TARGET_ADDRESS';
    }

    Response::jsonError($errorCode, $errorMessage, 400);
} catch (\RuntimeException $e) {
    $errorCode = 'PROCESSING_ERROR';
    $errorMessage = $e->getMessage();

    // Map specific errors to error codes
    if (strpos($errorMessage, 'Insufficient') !== false) {
        $errorCode = 'INSUFFICIENT_BALANCE';
    }

    Response::jsonError($errorCode, $errorMessage, 400);
} catch (\Exception $e) {
    Response::jsonError('INTERNAL_ERROR', 'An error occurred while processing your request', 500);
}

