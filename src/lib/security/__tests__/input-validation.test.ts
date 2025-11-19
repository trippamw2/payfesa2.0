import { describe, it, expect } from 'vitest';
import {
  phoneNumberSchema,
  registrationSchema,
  contributionSchema,
  sanitizeHtml,
  sanitizeUrl,
  ClientRateLimiter,
  csrfTokenManager
} from '../input-validation';

describe('Phone Number Validation', () => {
  it('should validate and normalize Malawi phone numbers', () => {
    expect(phoneNumberSchema.parse('+265991234567')).toBe('+265991234567');
    expect(phoneNumberSchema.parse('0991234567')).toBe('+265991234567');
    expect(phoneNumberSchema.parse('991234567')).toBe('+265991234567');
  });

  it('should reject invalid phone numbers', () => {
    expect(() => phoneNumberSchema.parse('123')).toThrow();
    expect(() => phoneNumberSchema.parse('invalid')).toThrow();
  });
});

describe('Registration Schema', () => {
  it('should validate correct registration data', () => {
    const data = {
      name: 'John Doe',
      phoneNumber: '0991234567',
      pin: '1234',
      language: 'en' as const
    };
    
    const result = registrationSchema.parse(data);
    expect(result.name).toBe('John Doe');
    expect(result.phoneNumber).toBe('+265991234567');
  });

  it('should reject invalid names', () => {
    expect(() => registrationSchema.parse({
      name: 'A',
      phoneNumber: '0991234567',
      pin: '1234'
    })).toThrow();
  });

  it('should reject invalid PINs', () => {
    expect(() => registrationSchema.parse({
      name: 'John Doe',
      phoneNumber: '0991234567',
      pin: '123'
    })).toThrow();
  });
});

describe('Contribution Schema', () => {
  it('should validate contribution data', () => {
    const data = {
      groupId: '123e4567-e89b-12d3-a456-426614174000',
      amount: 5000,
      paymentMethod: 'mobile_money' as const,
      pin: '1234'
    };
    
    expect(() => contributionSchema.parse(data)).not.toThrow();
  });

  it('should reject negative amounts', () => {
    expect(() => contributionSchema.parse({
      groupId: '123e4567-e89b-12d3-a456-426614174000',
      amount: -100,
      paymentMethod: 'mobile_money',
      pin: '1234'
    })).toThrow();
  });
});

describe('HTML Sanitization', () => {
  it('should sanitize HTML tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('should handle normal text', () => {
    expect(sanitizeHtml('Hello World')).toBe('Hello World');
  });
});

describe('URL Sanitization', () => {
  it('should allow valid HTTP URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
  });

  it('should reject javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('');
  });

  it('should reject invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBe('');
  });
});

describe('Client Rate Limiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new ClientRateLimiter(3, 1000);
    
    expect(limiter.canMakeRequest('test')).toBe(true);
    expect(limiter.canMakeRequest('test')).toBe(true);
    expect(limiter.canMakeRequest('test')).toBe(true);
  });

  it('should block requests over limit', () => {
    const limiter = new ClientRateLimiter(2, 1000);
    
    limiter.canMakeRequest('test');
    limiter.canMakeRequest('test');
    expect(limiter.canMakeRequest('test')).toBe(false);
  });

  it('should reset limits', () => {
    const limiter = new ClientRateLimiter(1, 1000);
    
    limiter.canMakeRequest('test');
    limiter.reset('test');
    expect(limiter.canMakeRequest('test')).toBe(true);
  });
});

describe('CSRF Token Manager', () => {
  it('should generate and validate tokens', () => {
    const token = csrfTokenManager.generate();
    expect(csrfTokenManager.validate(token)).toBe(true);
  });

  it('should reject invalid tokens', () => {
    csrfTokenManager.generate();
    expect(csrfTokenManager.validate('invalid')).toBe(false);
  });

  it('should clear tokens', () => {
    csrfTokenManager.generate();
    csrfTokenManager.clear();
    expect(csrfTokenManager.get()).toBe(null);
  });
});
