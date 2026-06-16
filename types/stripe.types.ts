// Stripe-related type definitions

// Payment Method Details
export interface PaymentMethodDetails {
  id: string;
  type: 'card' | 'us_bank_account' | string;
  card?: {
    brand: string; // 'visa', 'mastercard', 'amex', etc.
    last4: string;
    exp_month: number;
    exp_year: number;
    funding?: 'credit' | 'debit' | 'prepaid' | 'unknown';
  };
  billing_details?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: {
      city?: string | null;
      country?: string | null;
      line1?: string | null;
      line2?: string | null;
      postal_code?: string | null;
      state?: string | null;
    };
  };
}

// Setup Intent Response
export interface SetupIntentResponse {
  clientSecret: string;
  setupIntentId: string;
}

// DTO for updating payment method
export interface UpdatePaymentMethodDTO {
  paymentMethodId: string;
  customerId: string;
  subscriptionId?: string;
}

// Payment Method Display (for UI)
export interface PaymentMethodDisplay {
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  type: string;
}

// Card brand icons mapping
export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'amex'
  | 'discover'
  | 'diners'
  | 'jcb'
  | 'unionpay'
  | 'unknown';

// Subscription with Payment Method (extended)
export interface SubscriptionWithPaymentMethod {
  id: string;
  status: string;
  current_period_end: number;
  cancel_at_period_end: boolean;
  default_payment_method?: string | PaymentMethodDetails;
  plan: {
    id: string;
    amount: number;
    currency: string;
    interval: string;
    product: string;
  };
}
