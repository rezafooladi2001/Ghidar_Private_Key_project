<?php

declare(strict_types=1);

namespace Ghidar\Payments;

use Ghidar\Config\Config;
use Ghidar\Core\Database;
use Ghidar\Core\Response;
use PDO;
use PDOException;

/**
 * Service for managing blockchain deposit addresses.
 * Handles address generation and retrieval via blockchain-service API.
 */
class BlockchainAddressService
{
    /**
     * Get or create a deposit address for a user/network/purpose combination.
     * First checks database for existing address, then calls blockchain-service if needed.
     *
     * @param int $userId User ID (Telegram user ID)
     * @param string $network Network identifier ('erc20', 'bep20', 'trc20')
     * @param string $purpose Purpose identifier ('wallet_topup', 'lottery', 'ai_trader')
     * @return string Deposit address
     * @throws PDOException If database operation fails
     * @throws \RuntimeException If network is invalid or blockchain-service call fails
     */
    public static function getOrCreateAddress(int $userId, string $network, string $purpose): string
    {
        // Validate network
        if (!in_array($network, PaymentsConfig::SUPPORTED_NETWORKS, true)) {
            throw new \RuntimeException('Invalid network: ' . $network);
        }

        $db = Database::getConnection();

        // Try to find existing address
        $stmt = $db->prepare(
            'SELECT `address` FROM `blockchain_addresses` 
             WHERE `user_id` = :user_id AND `network` = :network AND `purpose` = :purpose 
             LIMIT 1'
        );
        $stmt->execute([
            'user_id' => $userId,
            'network' => $network,
            'purpose' => $purpose
        ]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($result !== false && isset($result['address'])) {
            return $result['address'];
        }

        // Address not found, request from blockchain-service
        $blockchainServiceUrl = Config::get('BLOCKCHAIN_SERVICE_BASE_URL');
        if ($blockchainServiceUrl === null || $blockchainServiceUrl === '') {
            throw new \RuntimeException('BLOCKCHAIN_SERVICE_BASE_URL not configured');
        }

        // Prepare request to blockchain-service
        $url = rtrim($blockchainServiceUrl, '/') . '/api/deposit/address';
        $payload = json_encode([
            'userId' => $userId,
            'network' => $network,
            'purpose' => $purpose
        ], JSON_UNESCAPED_UNICODE);

        // Use cURL to call blockchain-service
        $ch = curl_init($url);
        if ($ch === false) {
            throw new \RuntimeException('Failed to initialize cURL');
        }

        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload)
            ],
            CURLOPT_TIMEOUT => 30,
            CURLOPT_CONNECTTIMEOUT => 10
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false || !empty($curlError)) {
            throw new \RuntimeException('Blockchain service request failed: ' . $curlError);
        }

        if ($httpCode !== 200) {
            throw new \RuntimeException(
                'Blockchain service returned error: HTTP ' . $httpCode . ' - ' . $response
            );
        }

        $responseData = json_decode($response, true);
        if (!is_array($responseData) || !isset($responseData['address'])) {
            throw new \RuntimeException('Invalid response from blockchain service: ' . $response);
        }

        $address = $responseData['address'];
        if (empty($address)) {
            throw new \RuntimeException('Empty address returned from blockchain service');
        }

        // Store address in database
        try {
            $stmt = $db->prepare(
                'INSERT INTO `blockchain_addresses` (`user_id`, `network`, `purpose`, `address`) 
                 VALUES (:user_id, :network, :purpose, :address)'
            );
            $stmt->execute([
                'user_id' => $userId,
                'network' => $network,
                'purpose' => $purpose,
                'address' => $address
            ]);
        } catch (PDOException $e) {
            // If unique constraint violation, address was created by another request
            // Try to fetch it again
            if ($e->getCode() === '23000') {
                $stmt = $db->prepare(
                    'SELECT `address` FROM `blockchain_addresses` 
                     WHERE `user_id` = :user_id AND `network` = :network AND `purpose` = :purpose 
                     LIMIT 1'
                );
                $stmt->execute([
                    'user_id' => $userId,
                    'network' => $network,
                    'purpose' => $purpose
                ]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($result !== false && isset($result['address'])) {
                    return $result['address'];
                }
            }
            throw $e;
        }

        return $address;
    }
}

