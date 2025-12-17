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
}

