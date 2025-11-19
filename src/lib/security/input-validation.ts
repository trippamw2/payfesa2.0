import { z } from 'zod';

// Phone number validation for Malawi format
export const phoneNumberSchema = z.string()
  .trim()
  .regex(/^(\+265|0)?[1-9]\d{8}$/, 'Invalid Malawi phone number')
  .transform(val => {
    // Normalize to +265 format
    if (val.startsWith('0')) return '+265' + val.slice(1);
    if (!val.startsWith('+')) return '+265' + val;
    return val;
  });

// User registration schema
export const registrationSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  phoneNumber: phoneNumberSchema,
  pin: z.string()
    .length(4, 'PIN must be exactly 4 digits')
    .regex(/^\d{4}$/, 'PIN must contain only numbers'),
  language: z.enum(['en', 'ny']).default('en')
});

// Contribution schema
export const contributionSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
  amount: z.number()
    .positive('Amount must be positive')
    .max(10000000, 'Amount too large')
    .multipleOf(0.01, 'Invalid amount precision'),
  paymentMethod: z.enum(['mobile_money', 'bank_transfer']),
  phoneNumber: phoneNumberSchema.optional(),
  pin: z.string().length(4, 'PIN must be 4 digits')
});

// Message schema
export const messageSchema = z.object({
  groupId: z.string().uuid('Invalid group ID'),
  message: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long'),
  messageType: z.enum(['user', 'system']).default('user')
});

// Group creation schema
export const groupCreationSchema = z.object({
  name: z.string()
    .trim()
    .min(3, 'Group name must be at least 3 characters')
    .max(100, 'Group name too long'),
  description: z.string()
    .trim()
    .max(500, 'Description too long')
    .optional(),
  amount: z.number()
    .positive('Amount must be positive')
    .max(1000000, 'Amount too large'),
  frequency: z.enum(['weekly', 'monthly']),
  maxMembers: z.number()
    .int('Must be a whole number')
    .min(2, 'Minimum 2 members')
    .max(50, 'Maximum 50 members')
});

// Transaction dispute schema
export const disputeSchema = z.object({
  transactionId: z.string().uuid('Invalid transaction ID'),
  disputeType: z.enum(['payment_not_received', 'wrong_amount', 'duplicate_charge', 'unauthorized', 'other']),
  reason: z.string()
    .trim()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason too long'),
  amount: z.number().positive('Amount must be positive'),
  evidence: z.any().optional()
});

// Sanitize HTML to prevent XSS
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Sanitize URL parameters
export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

// Rate limit checker for client-side
export class ClientRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000 // 1 minute
  ) {}
  
  canMakeRequest(key: string): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(t => now - t < this.windowMs);
    
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    
    return true;
  }
  
  reset(key: string): void {
    this.requests.delete(key);
  }
}

// CSRF token management
export const csrfTokenManager = {
  generate(): string {
    const token = crypto.randomUUID();
    sessionStorage.setItem('csrf_token', token);
    return token;
  },
  
  get(): string | null {
    return sessionStorage.getItem('csrf_token');
  },
  
  validate(token: string): boolean {
    const stored = this.get();
    return stored !== null && stored === token;
  },
  
  clear(): void {
    sessionStorage.removeItem('csrf_token');
  }
};
