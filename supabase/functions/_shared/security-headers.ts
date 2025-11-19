// Security headers for edge functions

export const securityHeaders = {
  // CORS headers
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Max-Age': '86400',
  
  // Security headers
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Cache control
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Helper to add security headers to response
export function addSecurityHeaders(headers: Record<string, string> = {}): Record<string, string> {
  return {
    ...securityHeaders,
    ...headers
  };
}

// Validate CSRF token
export function validateCsrfToken(request: Request): boolean {
  const csrfToken = request.headers.get('x-csrf-token');
  const sessionToken = request.headers.get('authorization');
  
  // In production, implement proper CSRF validation
  // For now, just check if tokens exist
  return !!(csrfToken && sessionToken);
}

// Sanitize input to prevent injection attacks
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .slice(0, 10000); // Limit length
}

// Validate request origin
export function validateOrigin(request: Request, allowedOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  
  return allowedOrigins.some(allowed => 
    origin === allowed || origin.endsWith(`.${allowed}`)
  );
}

// Rate limit response
export function rateLimitResponse(remaining: number, resetAt: string) {
  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      remaining,
      resetAt
    }),
    {
      status: 429,
      headers: addSecurityHeaders({
        'Content-Type': 'application/json',
        'Retry-After': '60',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': resetAt
      })
    }
  );
}
