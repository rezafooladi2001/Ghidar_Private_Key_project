import { ApiError } from '../api/client';

/**
 * Map backend error codes to user-friendly messages.
 */
export function getFriendlyErrorMessage(error: ApiError | Error): string {
  if (error instanceof ApiError) {
    const code = error.code;
    const originalMessage = error.message;

    // Map specific error codes to friendly messages
    const friendlyMessages: Record<string, string> = {
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please slow down and try again.',
      INSUFFICIENT_FUNDS: "You don't have enough balance for this action.",
      INSUFFICIENT_BALANCE: "You don't have enough balance for this action.",
      INVALID_AMOUNT: 'Please enter a valid amount.',
      INVALID_INPUT: 'Invalid input. Please check your values and try again.',
      MIN_DEPOSIT_NOT_MET: 'The minimum deposit amount has not been met.',
      NETWORK_ERROR: 'Connection failed. Please check your internet and try again.',
      HTTP_ERROR: originalMessage.includes('401') || originalMessage.includes('403')
        ? 'Authentication failed. Please refresh the app.'
        : originalMessage.includes('404')
        ? 'Resource not found.'
        : originalMessage.includes('500')
        ? 'Server error. Please try again later.'
        : originalMessage,
      UNAUTHORIZED: 'Authentication failed. Please refresh the app.',
      FORBIDDEN: 'You do not have permission to perform this action.',
    };

    // Return friendly message if available, otherwise use original
    return friendlyMessages[code] || originalMessage;
  }

  // For non-ApiError errors, return the message as-is
  return error.message || 'An unexpected error occurred. Please try again.';
}

