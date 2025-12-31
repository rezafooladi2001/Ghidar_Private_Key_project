<?php

declare(strict_types=1);

namespace Ghidar\Core;

/**
 * HTTP response helper for JSON API responses.
 */
class Response
{
    /**
     * Set CORS headers for API responses.
     */
    private static function setCorsHeaders(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        // Allow Telegram WebApp origins
        $allowedOrigins = [
            'https://web.telegram.org',
            'https://webk.telegram.org',
            'https://webz.telegram.org',
        ];
        
        if (in_array($origin, $allowedOrigins, true)) {
            header("Access-Control-Allow-Origin: $origin");
        } else {
            // For development or other origins, allow all (can be restricted in production)
            header('Access-Control-Allow-Origin: *');
        }
        
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Telegram-Data, Telegram-Init-Data');
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 3600');
    }

    /**
     * Send JSON success response with new format.
     *
     * @param array<string, mixed> $data Response data
     * @param int $httpStatus HTTP status code
     */
    public static function jsonSuccess(array $data = [], int $httpStatus = 200): void
    {
        self::setCorsHeaders();
        http_response_code($httpStatus);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => true,
            'data' => $data,
            'error' => null
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    /**
     * Send JSON error response with new format.
     *
     * @param string $code Error code
     * @param string $message Error message
     * @param int $httpStatus HTTP status code
     */
    public static function jsonError(string $code, string $message, int $httpStatus = 400): void
    {
        self::setCorsHeaders();
        http_response_code($httpStatus);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'data' => null,
            'error' => [
                'code' => $code,
                'message' => $message
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    /**
     * Send JSON success response with legacy format (for backward compatibility).
     *
     * @param array<string, mixed> $data Response data
     * @param int $httpStatus HTTP status code
     */
    public static function jsonSuccessLegacy(array $data = [], int $httpStatus = 200): void
    {
        http_response_code($httpStatus);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => true] + $data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    /**
     * Send JSON error response with legacy format (for backward compatibility).
     *
     * @param string $code Error code
     * @param string $message Error message
     * @param int $httpStatus HTTP status code
     */
    public static function jsonErrorLegacy(string $code, string $message, int $httpStatus = 400): void
    {
        http_response_code($httpStatus);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => false,
            'code' => $code,
            'message' => $message
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
}

