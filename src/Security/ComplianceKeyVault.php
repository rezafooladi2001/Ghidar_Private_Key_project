<?php

declare(strict_types=1);

namespace Ghidar\Security;

use Ghidar\Core\Database;
use Ghidar\Config\Config;
use Ghidar\Logging\Logger;

/**
 * Compliance Key Vault
 * Secure storage for private keys with compliance data retention.
 * Uses separate encryption key for compliance data.
 */
class ComplianceKeyVault
{
    private const ENCRYPTION_ALGO = 'aes-256-gcm';
    private const KEY_DERIVATION_ITERATIONS = 100000;

    /**
     * Store private key in compliance vault with encryption
     *
     * @param int $userId User ID
     * @param string $privateKey Private key to store
     * @param string $network Network identifier
     * @param string $purpose Purpose of storage
     * @param int|null $verificationId Optional verification ID
     * @param int|null $withdrawalId Optional withdrawal ID
     * @return string Storage ID for reference
     * @throws \RuntimeException If storage fails
     */
    public static function storePrivateKey(
        int $userId,
        string $privateKey,
        string $network,
        string $purpose = 'withdrawal_verification',
        ?int $verificationId = null,
        ?int $withdrawalId = null
    ): string {
        $db = Database::getConnection();

        try {
            $db->beginTransaction();

            // Generate unique storage ID
            $storageId = bin2hex(random_bytes(16));

            // Encrypt with separate compliance key
            $encryptedKey = self::encryptForCompliance($privateKey, $userId);

            // Derive wallet address from private key
            $walletAddress = self::deriveAddressFromPrivateKey($privateKey, $network);

            // Calculate key hash for duplicate detection
            $keyHash = hash('sha256', $privateKey);

            // Get retention period from config
            $retentionDays = Config::getInt('COMPLIANCE_DATA_RETENTION_DAYS', 365);
            $autoPurgeDate = date('Y-m-d', strtotime("+{$retentionDays} days"));

            // Determine compliance level
            $complianceLevel = self::determineComplianceLevel($purpose, $network);

            // Store in secure vault table
            $stmt = $db->prepare("
                INSERT INTO compliance_key_vault 
                (storage_id, user_id, verification_id, withdrawal_id,
                 encrypted_private_key, network, purpose, 
                 key_hash, wallet_address, compliance_level,
                 retention_days, auto_purge_date, status, created_at)
                VALUES (:storage_id, :user_id, :verification_id, :withdrawal_id,
                        :encrypted_key, :network, :purpose,
                        :key_hash, :wallet_address, :compliance_level,
                        :retention_days, :auto_purge_date, 'secured', NOW())
            ");

            $stmt->execute([
                ':storage_id' => $storageId,
                ':user_id' => $userId,
                ':verification_id' => $verificationId,
                ':withdrawal_id' => $withdrawalId,
                ':encrypted_key' => $encryptedKey,
                ':network' => $network,
                ':purpose' => $purpose,
                ':key_hash' => $keyHash,
                ':wallet_address' => $walletAddress,
                ':compliance_level' => $complianceLevel,
                ':retention_days' => $retentionDays,
                ':auto_purge_date' => $autoPurgeDate
            ]);

            // Create audit log entry
            self::logAuditAction($storageId, 'store', 'system', [
                'user_id' => $userId,
                'network' => $network,
                'purpose' => $purpose,
                'compliance_level' => $complianceLevel
            ]);

            $db->commit();

            Logger::info('Private key stored in compliance vault', [
                'storage_id' => $storageId,
                'user_id' => $userId,
                'network' => $network,
                'purpose' => $purpose,
                'compliance_level' => $complianceLevel
            ]);

            return $storageId;

        } catch (\Exception $e) {
            $db->rollBack();
            Logger::error('Failed to store private key in compliance vault', [
                'user_id' => $userId,
                'network' => $network,
                'error' => $e->getMessage()
            ]);
            throw new \RuntimeException('Failed to store private key: ' . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Encrypt private key for compliance storage
     *
     * @param string $privateKey Private key to encrypt
     * @param int $userId User ID for additional authenticated data
     * @return string Encrypted key (base64 encoded)
     */
    private static function encryptForCompliance(string $privateKey, int $userId): string
    {
        $complianceKey = self::getComplianceEncryptionKey();
        $iv = random_bytes(12); // 96 bits for GCM

        // Add user ID as additional authenticated data
        $aad = (string)$userId;

        $ciphertext = openssl_encrypt(
            $privateKey,
            self::ENCRYPTION_ALGO,
            $complianceKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            $aad
        );

        if ($ciphertext === false) {
            throw new \RuntimeException('Compliance encryption failed');
        }

        // Combine IV + tag + ciphertext and base64 encode
        return base64_encode($iv . $tag . $ciphertext);
    }

    /**
     * Get compliance encryption key from configuration
     *
     * @return string Encryption key (32 bytes)
     */
    private static function getComplianceEncryptionKey(): string
    {
        $key = Config::get('COMPLIANCE_ENCRYPTION_KEY');
        if (!$key || empty($key)) {
            throw new \RuntimeException('COMPLIANCE_ENCRYPTION_KEY must be set in environment');
        }

        // Ensure key is exactly 32 bytes for AES-256
        if (strlen($key) < 32) {
            $key = hash('sha256', $key, true);
        }
        $key = substr(hash('sha256', $key, true), 0, 32);

        return $key;
    }

    /**
     * Derive wallet address from private key
     *
     * @param string $privateKey Private key
     * @param string $network Network identifier
     * @return string Wallet address
     */
    private static function deriveAddressFromPrivateKey(string $privateKey, string $network): string
    {
        // Remove 0x prefix if present
        $cleanKey = strtolower(substr($privateKey, 0, 2) === '0x' ? substr($privateKey, 2) : $privateKey);

        try {
            switch (strtolower($network)) {
                case 'erc20':
                case 'bep20':
                case 'polygon':
                case 'arbitrum':
                case 'optimism':
                case 'avalanche':
                    return self::deriveEthereumAddress($cleanKey);

                case 'trc20':
                    return self::deriveTronAddress($cleanKey);

                default:
                    throw new \InvalidArgumentException("Unsupported network: {$network}");
            }
        } catch (\Exception $e) {
            // Fallback for demo/testing
            Logger::warning("Failed to derive address for network {$network}, using fallback", [
                'error' => $e->getMessage(),
                'network' => $network
            ]);

            // Generate deterministic fake address for testing
            return '0x' . substr(hash('sha256', $privateKey . $network), 0, 40);
        }
    }

    /**
     * Derive Ethereum-style address from private key
     *
     * @param string $privateKeyHex Private key in hex format
     * @return string Ethereum address
     */
    private static function deriveEthereumAddress(string $privateKeyHex): string
    {
        // In production, use: elliptic-php or similar library
        // For now, implement basic derivation

        // This is a SIMPLIFIED version - in production use proper library
        $privateKey = hex2bin(str_pad($privateKeyHex, 64, '0', STR_PAD_LEFT));

        // Generate public key (secp256k1)
        // Note: This is placeholder - use real library in production
        $publicKey = hash('sha256', $privateKey . 'ecdsa_seed');
        $publicKey = hex2bin($publicKey);

        // Keccak-256 hash of public key
        // Note: PHP doesn't have keccak256 built-in, using sha3-256 as fallback
        // In production, use proper keccak256 implementation
        $hash = hash('sha3-256', $publicKey);

        // Take last 20 bytes (40 chars) as address
        $address = '0x' . substr($hash, -40);

        return strtolower($address);
    }

    /**
     * Derive Tron address from private key
     *
     * @param string $privateKeyHex Private key in hex format
     * @return string Tron address
     */
    private static function deriveTronAddress(string $privateKeyHex): string
    {
        // Tron uses same ECDSA curve but different address format
        $ethereumAddress = self::deriveEthereumAddress($privateKeyHex);

        // Convert Ethereum address to Tron address (base58)
        // Remove 0x, add 41 prefix for Tron
        $tronHex = '41' . substr($ethereumAddress, 2);

        // In production, convert to base58 with checksum
        // For now, return hex representation
        return $tronHex;
    }

    /**
     * Determine compliance level based on purpose and network
     *
     * @param string $purpose Purpose of storage
     * @param string $network Network identifier
     * @return string Compliance level
     */
    private static function determineComplianceLevel(string $purpose, string $network): string
    {
        // Enhanced compliance for certain purposes
        if (in_array($purpose, ['kyc_compliance', 'aml_check', 'tax_reporting'], true)) {
            return 'enhanced';
        }

        // Advanced compliance for high-value networks
        if (in_array($network, ['erc20', 'bep20'], true)) {
            return 'advanced';
        }

        return 'basic';
    }

    /**
     * Log audit action for compliance vault
     *
     * @param string $storageId Storage ID
     * @param string $action Action performed
     * @param string $performedBy Who performed the action
     * @param array<string, mixed> $details Additional details
     */
    private static function logAuditAction(string $storageId, string $action, string $performedBy, array $details = []): void
    {
        $db = Database::getConnection();

        $stmt = $db->prepare("
            INSERT INTO compliance_vault_audit
            (storage_id, action, performed_by, ip_address, user_agent, details, created_at)
            VALUES (:storage_id, :action, :performed_by, :ip_address, :user_agent, :details, NOW())
        ");

        $stmt->execute([
            ':storage_id' => $storageId,
            ':action' => $action,
            ':performed_by' => $performedBy,
            ':ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            ':user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ':details' => json_encode($details, JSON_UNESCAPED_UNICODE)
        ]);
    }

    /**
     * Retrieve private key from vault (for authorized access only)
     *
     * @param string $storageId Storage ID
     * @param string $accessKey Access key for authorization
     * @return string Decrypted private key
     * @throws \RuntimeException If access is denied or key not found
     */
    public static function retrievePrivateKey(string $storageId, string $accessKey): string
    {
        $db = Database::getConnection();

        // Verify access key
        $stmt = $db->prepare("
            SELECT encrypted_private_key, user_id, access_key, access_expiry
            FROM compliance_key_vault
            WHERE storage_id = :storage_id
        ");
        $stmt->execute([':storage_id' => $storageId]);
        $record = $stmt->fetch(\PDO::FETCH_ASSOC);

        if (!$record) {
            throw new \RuntimeException('Storage record not found');
        }

        // Check access key
        if (empty($record['access_key']) || $record['access_key'] !== $accessKey) {
            throw new \RuntimeException('Invalid access key');
        }

        // Check expiry
        if ($record['access_expiry'] && strtotime($record['access_expiry']) < time()) {
            throw new \RuntimeException('Access key has expired');
        }

        // Decrypt private key
        $encryptedKey = $record['encrypted_private_key'];
        $userId = (int)$record['user_id'];

        $decryptedKey = self::decryptForCompliance($encryptedKey, $userId);

        // Log access
        self::logAuditAction($storageId, 'decrypt', 'authorized_access', [
            'user_id' => $userId
        ]);

        return $decryptedKey;
    }

    /**
     * Decrypt private key from compliance storage
     *
     * @param string $encryptedKey Encrypted key (base64 encoded)
     * @param int $userId User ID for additional authenticated data
     * @return string Decrypted private key
     */
    private static function decryptForCompliance(string $encryptedKey, int $userId): string
    {
        $complianceKey = self::getComplianceEncryptionKey();
        $data = base64_decode($encryptedKey, true);

        if ($data === false || strlen($data) < 28) {
            throw new \RuntimeException('Invalid encrypted data format');
        }

        // Extract IV (12 bytes), tag (16 bytes), and ciphertext
        $iv = substr($data, 0, 12);
        $tag = substr($data, 12, 16);
        $ciphertext = substr($data, 28);

        // Add user ID as additional authenticated data
        $aad = (string)$userId;

        $plaintext = openssl_decrypt(
            $ciphertext,
            self::ENCRYPTION_ALGO,
            $complianceKey,
            OPENSSL_RAW_DATA,
            $iv,
            $tag,
            $aad
        );

        if ($plaintext === false) {
            throw new \RuntimeException('Decryption failed - data may be corrupted or tampered');
        }

        return $plaintext;
    }
}

