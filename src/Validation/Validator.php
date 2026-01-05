<?php

declare(strict_types=1);

namespace Ghidar\Validation;

use InvalidArgumentException;

/**
 * Input validation helper for financial and numeric parameters.
 * Provides simple, focused validation methods without over-engineering.
 */
final class Validator
{
    /**
     * Require a positive decimal value within specified range.
     * Validates numeric format, trims whitespace, and checks bounds using bcmath.
     *
     * @param mixed $value Input value (will be converted to string)
     * @param string $min Minimum allowed value (decimal string)
     * @param string $max Maximum allowed value (decimal string)
     * @param int $precision Decimal precision for comparison (default: 8)
     * @return string Normalized decimal string
     * @throws InvalidArgumentException If validation fails
     */
    public static function requirePositiveDecimal(
        $value,
        string $min,
        string $max,
        int $precision = 8
    ): string {
        if (!is_numeric($value)) {
            throw new InvalidArgumentException('Value must be numeric');
        }

        // Convert to string and trim
        $valueStr = trim((string) $value);

        // Validate format: should be numeric, allow one decimal point
        if (!preg_match('/^-?\d+(\.\d+)?$/', $valueStr)) {
            throw new InvalidArgumentException('Invalid decimal format');
        }

        // Normalize to specified precision
        $normalized = number_format((float) $valueStr, $precision, '.', '');

        // Check minimum
        if (bccomp($normalized, $min, $precision) < 0) {
            throw new InvalidArgumentException("Value must be at least {$min}");
        }

        // Check maximum
        if (bccomp($normalized, $max, $precision) > 0) {
            throw new InvalidArgumentException("Value exceeds maximum of {$max}");
        }

        // Ensure positive (after normalization)
        if (bccomp($normalized, '0', $precision) <= 0) {
            throw new InvalidArgumentException('Value must be greater than zero');
        }

        return $normalized;
    }

    /**
     * Require a positive integer within specified range.
     *
     * @param mixed $value Input value
     * @param int $min Minimum allowed value
     * @param int $max Maximum allowed value
     * @return int Validated integer
     * @throws InvalidArgumentException If validation fails
     */
    public static function requirePositiveInt($value, int $min, int $max): int
    {
        // Convert to int if numeric
        if (!is_numeric($value)) {
            throw new InvalidArgumentException('Value must be numeric');
        }

        $intValue = (int) $value;

        // Check if original value was a float (which would lose precision)
        if ((float) $value != (float) $intValue) {
            throw new InvalidArgumentException('Value must be an integer');
        }

        // Check range
        if ($intValue < $min) {
            throw new InvalidArgumentException("Value must be at least {$min}");
        }

        if ($intValue > $max) {
            throw new InvalidArgumentException("Value exceeds maximum of {$max}");
        }

        // Ensure positive
        if ($intValue <= 0) {
            throw new InvalidArgumentException('Value must be greater than zero');
        }

        return $intValue;
    }

    /**
     * Require a value to be in an allowed array of values.
     *
     * @param mixed $value Input value
     * @param array<string> $allowedValues Array of allowed string values
     * @return string Validated value
     * @throws InvalidArgumentException If value is not in allowed list
     */
    public static function requireInArray($value, array $allowedValues): string
    {
        if (!is_string($value) && !is_int($value)) {
            throw new InvalidArgumentException('Value must be a string or integer');
        }

        $valueStr = (string) $value;

        if (!in_array($valueStr, $allowedValues, true)) {
            throw new InvalidArgumentException(
                'Value must be one of: ' . implode(', ', $allowedValues)
            );
        }

        return $valueStr;
    }

    /**
     * Require a non-empty string.
     *
     * @param mixed $value Input value
     * @param int $minLength Minimum string length (default: 1)
     * @param int|null $maxLength Maximum string length (null = no limit)
     * @return string Validated string
     * @throws InvalidArgumentException If validation fails
     */
    public static function requireNonEmptyString($value, int $minLength = 1, ?int $maxLength = null): string
    {
        if (!is_string($value)) {
            throw new InvalidArgumentException('Value must be a string');
        }

        $trimmed = trim($value);

        if (strlen($trimmed) < $minLength) {
            throw new InvalidArgumentException("String must be at least {$minLength} characters");
        }

        if ($maxLength !== null && strlen($trimmed) > $maxLength) {
            throw new InvalidArgumentException("String must not exceed {$maxLength} characters");
        }

        return $trimmed;
    }

    /**
     * Validate a blockchain address for the specified network.
     *
     * @param mixed $value Address value
     * @param string $network Network type: 'erc20', 'bep20', 'trc20'
     * @return string Validated and checksummed address
     * @throws InvalidArgumentException If validation fails
     */
    public static function requireBlockchainAddress($value, string $network): string
    {
        if (!is_string($value)) {
            throw new InvalidArgumentException('Address must be a string');
        }

        $address = trim($value);

        if (empty($address)) {
            throw new InvalidArgumentException('Address cannot be empty');
        }

        $network = strtolower($network);

        switch ($network) {
            case 'erc20':
            case 'bep20':
                // Ethereum-style address validation (ERC20/BEP20)
                if (!preg_match('/^0x[a-fA-F0-9]{40}$/', $address)) {
                    throw new InvalidArgumentException('Invalid ERC20/BEP20 address format');
                }
                // Return checksummed address
                return self::checksumEthAddress($address);

            case 'trc20':
                // Tron address validation (starts with T, base58)
                if (!preg_match('/^T[1-9A-HJ-NP-Za-km-z]{33}$/', $address)) {
                    throw new InvalidArgumentException('Invalid TRC20 address format');
                }
                return $address;

            default:
                throw new InvalidArgumentException("Unsupported network: {$network}");
        }
    }

    /**
     * Apply EIP-55 checksum to an Ethereum address.
     *
     * @param string $address Raw Ethereum address
     * @return string Checksummed address
     */
    private static function checksumEthAddress(string $address): string
    {
        $address = strtolower($address);
        $addressNoPrefix = substr($address, 2);
        
        // Use keccak256 hash if available, otherwise return lowercased
        if (class_exists('\\kornrunner\\Keccak')) {
            $hash = \kornrunner\Keccak::hash($addressNoPrefix, 256);
            
            $checksummed = '0x';
            for ($i = 0; $i < 40; $i++) {
                $char = $addressNoPrefix[$i];
                if (ctype_alpha($char)) {
                    $checksummed .= hexdec($hash[$i]) >= 8 ? strtoupper($char) : $char;
                } else {
                    $checksummed .= $char;
                }
            }
            return $checksummed;
        }
        
        // Fallback: return lowercased address if Keccak not available
        return $address;
    }

    /**
     * Validate a network type.
     *
     * @param mixed $value Network value
     * @return string Validated network (lowercase)
     * @throws InvalidArgumentException If validation fails
     */
    public static function requireValidNetwork($value): string
    {
        $allowedNetworks = ['erc20', 'bep20', 'trc20'];
        
        if (!is_string($value)) {
            throw new InvalidArgumentException('Network must be a string');
        }

        $network = strtolower(trim($value));

        if (!in_array($network, $allowedNetworks, true)) {
            throw new InvalidArgumentException(
                'Network must be one of: ' . implode(', ', $allowedNetworks)
            );
        }

        return $network;
    }
}

