/**
 * useApiCall Hook
 * Hook for managing API call state with error handling and retry
 */

import { useState, useCallback } from 'react';
import { withErrorHandling, RetryOptions } from '@/lib/api-utils';

interface UseApiCallOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  retry?: RetryOptions;
  showToast?: boolean;
}

export function useApiCall<T>(
  apiFunction: () => Promise<T>,
  options: UseApiCallOptions<T> = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await withErrorHandling(apiFunction, {
        retry: options.retry,
        showToast: options.showToast,
      });

      if (result !== null) {
        setData(result);
        options.onSuccess?.(result);
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      options.onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [apiFunction, options]);

  const reset = useCallback(() => {
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
}
