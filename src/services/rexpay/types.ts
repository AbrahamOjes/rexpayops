import { PaymentStatus } from '@/dal';

export interface RexpayError {
  status: boolean;
  message: string;
  data: {
    code: string;
    message: string;
  };
}

export interface CardPaymentService {
  name: string;
  initializePayment(payment: Payment): Promise<CardPaymentOutput>;
  authorizePayment(payment: Payment): Promise<CardPaymentOutput>;
  retrievePayment(paymentId: string): Promise<CardPaymentOutput>;
  finalizePayment(paymentId: string): Promise<CardPaymentOutput>;
  refundPayment(payment: Payment): Promise<CardPaymentOutput>;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  billing: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
  card?: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
}

export interface CardPaymentOutput {
  transactionId: string;
  status: string;
  message: string;
  gatewayRecommendation?: string;
  gatewayCode?: string;
  acquirerMessage?: string;
}

export interface AuthorizationData {
  authorizationCode: string;
  avsResult: string;
  cvvResult: string;
  riskScore: number;
}

export interface RexpayGatewayResponse {
  response: {
    transactionId: string;
    status: string;
    message: string;
    gatewayRecommendation?: string;
    gatewayCode?: string;
    acquirerMessage?: string;
  };
  metadata?: Record<string, any>;
}

export interface RexpayGetPaymentResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    gateway_response: string;
  };
}

export interface SubaccountMetrics {
  successRate: number;
  volume24h: number;
  avgResponseTime: number;
}

export interface SubaccountLimits {
  min?: number;
  max?: number;
  daily?: number;
  monthly?: number;
}

export interface SubaccountData {
  uuid: string;
  name: string;
  active: boolean;
  currencies: string[];
  limits?: SubaccountLimits;
  metrics?: SubaccountMetrics;
}

export interface RexpayGetSubaccountsResponse {
  status: boolean;
  message: string;
  data: SubaccountData[];
}

export interface RexpayInitiatePaymentResponse {
  status: boolean;
  message: string;
  data: {
    transaction_id: string;
    status: string;
    session_id?: string;
  };
}

export interface RexpayChargeResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    redirect_url?: string;
    redirect_auth_data?: {
      html?: string;
      customizedHtml?: {
        '3ds2'?: {
          acsUrl: string;
          cReq: string;
        };
      };
    };
  };
}

export interface CardData {
  pan: string;
  cvv: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface BillingInformation {
  postcodezip?: string;
  street: string;
  city: string;
  country: string;
  stateProvince?: string;
}

export interface CustomerInformation {
  email: string;
  firstName: string;
  lastName: string;
  mobilePhone?: string;
}

export interface DeviceInformation {
  http_browser_language: string;
  http_browser_java_enabled: boolean;
  http_browser_javascript_enabled: boolean;
  http_browser_color_depth: string;
  http_browser_screen_height: string;
  http_browser_screen_width: string;
  http_browser_time_difference: string;
  challenge_window_size: string;
  sdk_interface: string;
  sdk_ui_type: string[];
  http_accept: string;
  device_channel: string;
  ip_address: string;
}

export interface RexpayV3InitiatePaymentPayload {
  reference: string;
  amount: number;
  narration: string;
  currency: string;
  card_data: CardData;
  callback_url: string;
  metadata: {
    reason: string;
    [key: string]: any;
  };
  billing_information: BillingInformation;
  device_information: DeviceInformation;
  customer_information: CustomerInformation;
  subaccount_id: string;
  three_ds_version: '3ds1' | '3ds2';
}

export class CardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardValidationError';
  }
}
