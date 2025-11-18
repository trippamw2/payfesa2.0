// Unified Paychangu Payment Gateway Service
// Handles all payment operations: collections, payouts, mobile money, bank transfers

export interface PaychanguConfig {
  secretKey: string;
  baseUrl: string;
}

export interface PaymentInitRequest {
  type: 'collection' | 'payout';
  method: 'mobile_money' | 'bank_transfer';
  amount: number;
  phoneNumber?: string;
  provider?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
  chargeId: string;
  currency?: string;
}

export interface PaymentResponse {
  success: boolean;
  transaction: {
    ref_id: string;
    trace_id: string;
    status: string;
    charge_id: string;
  };
  payment_account_details?: any;
  error?: string;
}

// Paychangu mobile money operator ref IDs for Malawi
const MOBILE_MONEY_OPERATORS: Record<string, string> = {
  'airtel': '20be6c20-adeb-4b5b-a7ba-0769820df4fb',
  'airtel money': '20be6c20-adeb-4b5b-a7ba-0769820df4fb',
  'tnm': '27494cb5-ba9e-437f-a114-4e7a7686bcca',
  'mpamba': '27494cb5-ba9e-437f-a114-4e7a7686bcca',
  'tnm mpamba': '27494cb5-ba9e-437f-a114-4e7a7686bcca',
};

// Paychangu bank UUIDs for disbursements
const BANK_UUIDS: Record<string, string> = {
  // Mobile money operators
  'tnm': '5e9946ae-76ed-43f5-ad59-63e09096006a',
  'tnm mpamba': '5e9946ae-76ed-43f5-ad59-63e09096006a',
  'mpamba': '5e9946ae-76ed-43f5-ad59-63e09096006a',
  'airtel': 'e8d5fca0-e5ac-4714-a518-484be9011326',
  'airtel money': 'e8d5fca0-e5ac-4714-a518-484be9011326',
  // Banks
  'national bank of malawi': '82310dd1-ec9b-4fe7-a32c-2f262ef08681',
  'ecobank malawi limited': '87e62436-0553-4fb5-a76d-f27d28420c5b',
  'fdh bank limited': 'b064172a-8a1b-4f7f-aad7-81b036c46c57',
  'standard bank limited': 'e7447c2c-c147-4907-b194-e087fe8d8585',
  'centenary bank': '236760c9-3045-4a01-990e-497b28d115bb',
  'first capital limited': '968ac588-3b1f-4d89-81ff-a3d43a599003',
  'cdh investment bank': 'c759d7b6-ae5c-4a95-814a-79171271897a',
  'nbs bank limited': '86007bf5-1b04-49ba-84c1-9758bbf5c996',
};

// Calculate 11% fee
export function calculateFee(amount: number): { feeAmount: number; netAmount: number } {
  const feeAmount = Math.round(amount * 0.11 * 100) / 100;
  const netAmount = Math.round((amount - feeAmount) * 100) / 100;
  return { feeAmount, netAmount };
}

// Normalize phone number to 9 digits (Malawi format)
export function normalizePhoneNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  const withoutCountryCode = digitsOnly.startsWith('265') ? digitsOnly.slice(3) : digitsOnly;
  return withoutCountryCode.slice(-9);
}

// Unified payment processing
export async function processPayment(
  config: PaychanguConfig,
  request: PaymentInitRequest
): Promise<PaymentResponse> {
  try {
    console.log('Processing payment:', { type: request.type, method: request.method, amount: request.amount });

    let apiUrl: string;
    let payload: any;

    if (request.type === 'collection') {
      // Collections (money in from users)
      if (request.method === 'mobile_money') {
        const mobileNumber = normalizePhoneNumber(request.phoneNumber || '');
        const operatorRefId = MOBILE_MONEY_OPERATORS[request.provider?.toLowerCase() || ''];

        if (!operatorRefId) {
          throw new Error(`Unsupported mobile money operator: ${request.provider}`);
        }

        if (!/^\d{9}$/.test(mobileNumber)) {
          throw new Error('Invalid mobile number. Must be 9 digits.');
        }

        apiUrl = `${config.baseUrl}/mobile-money/payments/initialize`;
        payload = {
          mobile: mobileNumber,
          mobile_money_operator_ref_id: operatorRefId,
          amount: request.amount.toString(),
          charge_id: request.chargeId,
        };
      } else {
        // Bank transfer collection
        apiUrl = `${config.baseUrl}/direct-charge/payments/initialize`;
        payload = {
          payment_method: 'mobile_bank_transfer',
          amount: request.amount.toString(),
          currency: request.currency || 'MWK',
          charge_id: request.chargeId,
          create_permanent_account: 'false',
        };
      }
    } else {
      // Payouts (money out to users)
      const phoneNumber = normalizePhoneNumber(request.phoneNumber || '');
      const bankUuid = BANK_UUIDS[request.provider?.toLowerCase() || ''] || 
                      BANK_UUIDS[request.bankName?.toLowerCase() || ''];

      if (!bankUuid) {
        throw new Error(`Unsupported bank/provider: ${request.provider || request.bankName}`);
      }

      if (request.method === 'mobile_money' && !/^\d{9}$/.test(phoneNumber)) {
        throw new Error('Invalid mobile number for payout');
      }

      apiUrl = `${config.baseUrl}/direct-charge/payouts/initialize`;
      payload = {
        amount: request.amount.toString(),
        currency: request.currency || 'MWK',
        charge_id: request.chargeId,
        bank_uuid: bankUuid,
        account_number: request.method === 'mobile_money' ? phoneNumber : request.accountNumber,
        account_name: request.accountName || 'Payfesa User',
      };
    }

    console.log('Calling Paychangu API:', { endpoint: apiUrl, chargeId: request.chargeId });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Paychangu response:', { status: data?.status, message: data?.message });

    if (!response.ok || data?.status !== 'success') {
      console.error('Paychangu API error:', data);
      return {
        success: false,
        transaction: {
          ref_id: '',
          trace_id: '',
          status: 'failed',
          charge_id: request.chargeId,
        },
        error: data?.message || 'Payment initialization failed',
      };
    }

    const transaction = data?.data?.transaction || {};
    const paymentAccountDetails = data?.data?.payment_account_details;

    return {
      success: true,
      transaction: {
        ref_id: transaction.ref_id || '',
        trace_id: transaction.trace_id || '',
        status: transaction.status || 'pending',
        charge_id: request.chargeId,
      },
      payment_account_details: paymentAccountDetails,
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    return {
      success: false,
      transaction: {
        ref_id: '',
        trace_id: '',
        status: 'failed',
        charge_id: request.chargeId,
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export const PaychanguService = {
  processPayment,
  calculateFee,
  normalizePhoneNumber,
};
