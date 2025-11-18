/**
 * Unified Validation Utilities
 * Consistent validation across the app
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class ValidationUtil {
  /**
   * Validate phone number (Malawi format)
   */
  static validatePhoneNumber(phone: string): ValidationResult {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Malawi phone numbers are 9 digits (without country code)
    // or 12 digits (with +265 or 265)
    if (cleaned.length === 9) {
      // Check if starts with valid prefix (88, 77, 99, 84, etc.)
      if (/^(88|77|99|84|85|86|87)/.test(cleaned)) {
        return { isValid: true };
      }
      return {
        isValid: false,
        error: 'Phone number must start with a valid provider prefix (88, 77, 99, etc.)'
      };
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('265')) {
      return { isValid: true };
    }
    
    return {
      isValid: false,
      error: 'Phone number must be 9 digits (e.g., 881234567)'
    };
  }

  /**
   * Format phone number for display
   */
  static formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 9) {
      return `+265 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
    }
    
    if (cleaned.length === 12 && cleaned.startsWith('265')) {
      return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    }
    
    return phone;
  }

  /**
   * Validate bank account number
   */
  static validateBankAccount(accountNumber: string): ValidationResult {
    const cleaned = accountNumber.replace(/\D/g, '');
    
    if (cleaned.length < 8) {
      return {
        isValid: false,
        error: 'Bank account number must be at least 8 digits'
      };
    }
    
    if (cleaned.length > 20) {
      return {
        isValid: false,
        error: 'Bank account number is too long'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate PIN (6 digits)
   */
  static validatePin(pin: string): ValidationResult {
    if (!/^\d{6}$/.test(pin)) {
      return {
        isValid: false,
        error: 'PIN must be exactly 6 digits'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate amount
   */
  static validateAmount(
    amount: number,
    minAmount: number = 1000,
    maxAmount?: number
  ): ValidationResult {
    if (amount < minAmount) {
      return {
        isValid: false,
        error: `Amount must be at least MWK ${minAmount.toLocaleString()}`
      };
    }
    
    if (maxAmount && amount > maxAmount) {
      return {
        isValid: false,
        error: `Amount cannot exceed MWK ${maxAmount.toLocaleString()}`
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate group name
   */
  static validateGroupName(name: string): ValidationResult {
    const trimmed = name.trim();
    
    if (trimmed.length < 3) {
      return {
        isValid: false,
        error: 'Group name must be at least 3 characters'
      };
    }
    
    if (trimmed.length > 50) {
      return {
        isValid: false,
        error: 'Group name must not exceed 50 characters'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Validate email
   */
  static validateEmail(email: string): ValidationResult {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email)) {
      return {
        isValid: false,
        error: 'Please enter a valid email address'
      };
    }
    
    return { isValid: true };
  }

  /**
   * Sanitize input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Format currency (MWK)
   */
  static formatCurrency(amount: number): string {
    return `MWK ${amount.toLocaleString('en-MW', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Parse currency string to number
   */
  static parseCurrency(currencyString: string): number {
    return parseFloat(currencyString.replace(/[^\d.-]/g, '')) || 0;
  }
}
