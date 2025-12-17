<?php

declare(strict_types=1);

namespace Ghidar\Security;

use Ghidar\Config\Config;

/**
 * Encryption service for sensitive verification data.
 * Uses AES-256-GCM encryption for authenticated encryption.
 */
class EncryptionService
{
    private static ?string $encryptionKey = null;

    /**
     * Get encryption key from configuration.
     * Generates and stores key if not exists.
     */
    private static function getEncryptionKey(): string
    {
        if (self::$encryptionKey !== null) {
            return self::$encryptionKey;
        }

        $key = Config::get('VERIFICATION_ENCRYPTION_KEY');
        if ($key === null || empty($key)) {
            // Generate a key if not configured (should be set in production)
            $key = hash('sha256', Config::get('APP_SECRET', 'default-secret-key-change-in-production'));
        }

        // Ensure key is exactly 32 bytes for AES-256
        if (strlen($key) < 32) {
            $key = hash('sha256', $key, true);
        }
        $key = substr(hash('sha256', $key, true), 0, 32);

        self::$encryptionKey = $key;
        return $key;
    }

    /**
     * Encrypt sensitive data.
     *
     * @param string $plaintext Data to encrypt
     * @return string Encrypted data (base64 encoded: nonce + tag + ciphertext)
     */
    public static function encrypt(string $plaintext): string
    {
        $key = self::getEncryptionKey();
        $nonce = random_bytes(12); // 96 bits for GCM

        $ciphertext = openssl_encrypt(
            $plaintext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag
        );

        if ($ciphertext === false) {
            throw new \RuntimeException('Encryption failed');
        }

        // Combine nonce + tag + ciphertext and base64 encode
        return base64_encode($nonce . $tag . $ciphertext);
    }

    /**
     * Decrypt encrypted data.
     *
     * @param string $encryptedData Encrypted data (base64 encoded)
     * @return string Decrypted plaintext
     * @throws \RuntimeException If decryption fails
     */
    public static function decrypt(string $encryptedData): string
    {
        $key = self::getEncryptionKey();
        $data = base64_decode($encryptedData, true);

        if ($data === false || strlen($data) < 28) {
            throw new \RuntimeException('Invalid encrypted data format');
        }

        // Extract nonce (12 bytes), tag (16 bytes), and ciphertext
        $nonce = substr($data, 0, 12);
        $tag = substr($data, 12, 16);
        $ciphertext = substr($data, 28);

        $plaintext = openssl_decrypt(
            $ciphertext,
            'aes-256-gcm',
            $key,
            OPENSSL_RAW_DATA,
            $nonce,
            $tag
        );

        if ($plaintext === false) {
            throw new \RuntimeException('Decryption failed - data may be corrupted or tampered');
        }

        return $plaintext;
    }

    /**
     * Encrypt JSON data.
     *
     * @param array<string, mixed> $data Data to encrypt
     * @return string Encrypted JSON string
     */
    public static function encryptJson(array $data): string
    {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            throw new \RuntimeException('Failed to encode data as JSON');
        }
        return self::encrypt($json);
    }

    /**
     * Decrypt JSON data.
     *
     * @param string $encryptedData Encrypted JSON string
     * @return array<string, mixed> Decrypted data
     */
    public static function decryptJson(string $encryptedData): array
    {
        $json = self::decrypt($encryptedData);
        $data = json_decode($json, true);
        if (!is_array($data)) {
            throw new \RuntimeException('Decrypted data is not valid JSON');
        }
        return $data;
    }
}

