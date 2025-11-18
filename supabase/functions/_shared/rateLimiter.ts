import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';

export async function checkRateLimit(
  supabase: any,
  identifier: string,
  endpoint: string,
  maxRequests: number = 100,
  windowMinutes: number = 60
): Promise<{ allowed: boolean; message?: string; remaining?: number }> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // On error, allow the request but log the issue
      return { allowed: true };
    }

    return {
      allowed: data.allowed,
      message: data.message,
      remaining: data.remaining
    };
  } catch (error) {
    console.error('Rate limit exception:', error);
    // On exception, allow the request but log the issue
    return { allowed: true };
  }
}

export function getRateLimitHeaders(result: { allowed: boolean; remaining?: number }): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': '100',
  };

  if (result.remaining !== undefined) {
    headers['X-RateLimit-Remaining'] = result.remaining.toString();
  }

  return headers;
}
