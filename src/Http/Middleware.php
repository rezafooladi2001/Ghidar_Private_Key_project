<?php

declare(strict_types=1);

namespace Ghidar\Http;

use Ghidar\Config\Config;
use Ghidar\Core\Response;

/**
 * HTTP Middleware for security headers, CORS, and request validation.
 * Call Middleware::init() at the beginning of each API endpoint.
 */
final class Middleware
{
    private static bool $initialized = false;

    /**
     * Initialize middleware - sets security headers and handles CORS.
     * Should be called at the beginning of each API endpoint.
     *
     * @param string $allowedMethod Allowed HTTP method (GET, POST, etc.)
     * @return bool True if request should continue, false if it was handled (OPTIONS)
     */
    public static function init(string $allowedMethod = 'POST'): bool
    {
        if (self::$initialized) {
            return true;
        }

        self::$initialized = true;

        // Set security headers
        self::setSecurityHeaders();

        // Handle CORS
        self::handleCors();

        // Handle preflight OPTIONS request
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        // Validate request method
        if ($_SERVER['REQUEST_METHOD'] !== $allowedMethod) {
            Response::jsonError('METHOD_NOT_ALLOWED', "Only {$allowedMethod} method is allowed", 405);
            exit;
        }

        return true;
    }

    /**
     * Set security-related HTTP headers.
     */
    private static function setSecurityHeaders(): void
    {
        // Prevent MIME type sniffing
        header('X-Content-Type-Options: nosniff');

        // Note: X-Frame-Options and frame-ancestors are NOT set here
        // because API JSON responses don't need clickjacking protection
        // and these headers can interfere with Telegram Mini App iframe context

        // XSS Protection (legacy, but still useful for older browsers)
        header('X-XSS-Protection: 1; mode=block');

        // Referrer Policy
        header('Referrer-Policy: strict-origin-when-cross-origin');

        // Cache control for API responses
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
    }

    /**
     * Handle CORS headers for cross-origin requests.
     */
    private static function handleCors(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        // Telegram WebApp origins that should always be allowed
        $telegramOrigins = [
            'https://web.telegram.org',
            'https://webk.telegram.org',
            'https://webz.telegram.org',
        ];

        // Always set these headers
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE, PATCH');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept, Origin, X-Requested-With, Telegram-Data, telegram-data, Telegram-Init-Data, X-PAYMENTS-CALLBACK-TOKEN');
        header('Access-Control-Max-Age: 86400'); // Cache preflight for 24 hours

        if (!empty($origin)) {
            // For requests with an Origin header, echo it back
            // This is needed for CORS to work properly
            header("Access-Control-Allow-Origin: $origin");
            header('Access-Control-Allow-Credentials: true');
        } else {
            // No Origin header (same-origin or direct access)
            // Still allow for safety
            header('Access-Control-Allow-Origin: *');
        }
    }

    /**
     * Get allowed CORS origins from configuration.
     *
     * @return array<string> List of allowed origins
     */
    private static function getAllowedOrigins(): array
    {
        $originsString = Config::get('CORS_ALLOWED_ORIGINS', '*');
        
        if ($originsString === '*') {
            return ['*'];
        }

        return array_filter(array_map('trim', explode(',', $originsString)));
    }

    /**
     * Require authentication and return user context.
     * Combines auth check with method validation.
     *
     * @param string $allowedMethod Allowed HTTP method
     * @return array{user: array, wallet: array} User context with user and wallet
     */
    public static function requireAuth(string $allowedMethod = 'POST'): array
    {
        self::init($allowedMethod);

        try {
            return \Ghidar\Core\UserContext::requireCurrentUserWithWallet();
        } catch (\RuntimeException $e) {
            $errorMessage = $e->getMessage();

            if (strpos($errorMessage, 'banned') !== false) {
                Response::jsonError('USER_BANNED', 'User is banned', 403);
            } elseif (strpos($errorMessage, 'Invalid') !== false || strpos($errorMessage, 'not found') !== false) {
                Response::jsonError('UNAUTHORIZED', 'Invalid authentication', 401);
            } else {
                Response::jsonError('AUTH_ERROR', 'Authentication failed', 401);
            }
            exit;
        }
    }

    /**
     * Parse JSON request body.
     *
     * @return array<string, mixed> Parsed JSON data
     */
    public static function parseJsonBody(): array
    {
        $input = file_get_contents('php://input');

        if ($input === false || $input === '') {
            Response::jsonError('INVALID_INPUT', 'Request body is required', 400);
            exit;
        }

        $data = json_decode($input, true);

        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            Response::jsonError('INVALID_JSON', 'Invalid JSON in request body', 400);
            exit;
        }

        return is_array($data) ? $data : [];
    }
}

