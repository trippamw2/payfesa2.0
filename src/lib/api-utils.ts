/**
 * API Utilities
 * Retry logic and error handling for API calls
 */

import { toast } from 'sonner';

interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export type { RetryOptions };

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;
        onRetry?.(attempt + 1, lastError);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
}

/**
 * Handle API errors with user-friendly messages
 */
export function handleApiError(error: unknown, context?: string): string {
  console.error(`API Error${context ? ` (${context})` : ''}:`, error);

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }

    // Supabase errors
    if (error.message.includes('JWT')) {
      return 'Session expired. Please login again.';
    }

    if (error.message.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }

    // Generic error
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Show error toast with retry option
 */
export function showErrorToast(
  message: string,
  onRetry?: () => void
) {
  if (onRetry) {
    toast.error(message, {
      action: {
        label: 'Retry',
        onClick: onRetry,
      },
    });
  } else {
    toast.error(message);
  }
}

/**
 * Wrapper for API calls with automatic error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  options: {
    context?: string;
    retry?: RetryOptions;
    showToast?: boolean;
  } = {}
): Promise<T | null> {
  const { context, retry, showToast = true } = options;

  try {
    if (retry) {
      return await retryWithBackoff(fn, {
        ...retry,
        onRetry: (attempt, error) => {
          console.log(`Retry attempt ${attempt} after error:`, error.message);
          retry.onRetry?.(attempt, error);
        },
      });
    }
    return await fn();
  } catch (error) {
    const message = handleApiError(error, context);
    
    if (showToast) {
      showErrorToast(message);
    }

    return null;
  }
}
