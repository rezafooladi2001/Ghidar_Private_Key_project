<?php

declare(strict_types=1);

/**
 * Deposit Status API endpoint for Ghidar
 * Returns the current status of a deposit
 */

require_once __DIR__ . '/../../../../bootstrap.php';

use Ghidar\Core\Response;
use Ghidar\Core\UserContext;
use Ghidar\Core\Database;
use PDO;

try {
    $context = UserContext::requireCurrentUser();
    $user = $context['user'];
    $userId = (int) $user['id'];
    $pdo = Database::getConnection();

    $depositId = isset($_GET['deposit_id']) ? (int) $_GET['deposit_id'] : 0;

    if ($depositId <= 0) {
        Response::jsonError('INVALID_REQUEST', 'Deposit ID is required', 400);
        exit;
    }

    // Get deposit status
    $stmt = $pdo->prepare("
        SELECT 
            id,
            network,
            product_type,
            status,
            address,
            expected_amount_usdt,
            actual_amount_usdt,
            tx_hash,
            created_at,
            confirmed_at
        FROM deposits
        WHERE id = :deposit_id AND user_id = :user_id
        LIMIT 1
    ");
    
    $stmt->execute([
        'deposit_id' => $depositId,
        'user_id' => $userId,
    ]);

    $deposit = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$deposit) {
        Response::jsonError('DEPOSIT_NOT_FOUND', 'Deposit not found', 404);
        exit;
    }

    // Calculate confirmations (mock for now - in production, query blockchain)
    $confirmations = null;
    if ($deposit['tx_hash'] && $deposit['status'] === 'pending') {
        // In production, query blockchain for actual confirmations
        // For now, return null
        $confirmations = 0;
    }

    Response::jsonSuccess([
        'deposit_id' => (int) $deposit['id'],
        'status' => $deposit['status'],
        'network' => $deposit['network'],
        'tx_hash' => $deposit['tx_hash'],
        'confirmations' => $confirmations,
        'actual_amount_usdt' => $deposit['actual_amount_usdt'] ? (string) $deposit['actual_amount_usdt'] : null,
    ]);

} catch (\RuntimeException $e) {
    Response::jsonError('AUTH_ERROR', $e->getMessage(), 401);
} catch (\Exception $e) {
    Response::jsonError('INTERNAL_ERROR', 'An error occurred while processing your request', 500);
}

