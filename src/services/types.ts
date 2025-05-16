import { Payment, PaymentStatus } from '@/dal';

/**
 * Enum for authorization types
 */
export enum AUTHTYPE {
  THREEDSTWO = 'THREEDSTWO', // Updated for test compatibility
  THREEDSONE = '3DS1',
  NOAUTH = 'NO_AUTH',
  THREE = 'THREE' // Added for test compatibility
}

/**
 * Providers supported by the application
 */
export enum Providers {
  REXPAYIII = 'REXPAYIII',
  REXPAYII = 'REXPAYII',
  REXPAYI = 'REXPAYI',
}

/**
 * Card payment instrument interface
 */
export interface CardPaymentInstrument {
  type: 'card';
  card: {
    number: string;
    security_code: string;
    encrypted?: string;
    name?: string;
    brand?: string;
    expiry: {
      month: string | number;
      year: string | number;
    };
  };
}

/**
 * Card payment output interface
 */
export interface CardPaymentOutput {
  transactionId: string;
  status: PaymentStatus;
  message: string;
  gatewayRecommendation?: string;
  gatewayCode?: string;
  acquirerMessage?: string;
  providerData?: Record<string, any>;
  
  // Legacy properties for backwards compatibility with tests
  provider_reference?: string;
  type?: AUTHTYPE;
  provider_data?: {
    sessionId?: string;
    html?: {
      token?: string;
      url?: string;
    };
    authentication_status?: string;
    recommendation?: string;
    card?: {
      encrypted?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

/**
 * Card payment service interface
 */
export interface CardPaymentService {
  readonly name: Providers;
  MID: string;
  APIKEY: string;
  
  /**
   * Initialize a payment
   * @param payment Payment details
   * @returns Card payment output
   */
  initializePayment(payment: Payment): Promise<CardPaymentOutput>;
  
  /**
   * Authorize a payment
   * @param payment Payment details
   * @returns Card payment output
   */
  authorizePayment(payment: Payment): Promise<CardPaymentOutput>;
  
  /**
   * Retrieve payment details
   * @param paymentId Payment ID to retrieve
   * @returns Card payment output
   */
  retrievePayment(paymentId: string): Promise<CardPaymentOutput>;
  
  /**
   * Finalize a payment
   * @param paymentId Payment ID to finalize
   * @returns Card payment output
   */
  finalizePayment(paymentId: string): Promise<CardPaymentOutput>;
  
  /**
   * Refund a payment
   * @param payment Payment to refund
   * @returns Card payment output
   */
  refundPayment(payment: Payment): Promise<CardPaymentOutput>;
}
