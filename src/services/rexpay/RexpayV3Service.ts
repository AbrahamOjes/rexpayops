import axios, { AxiosError, AxiosInstance } from 'axios';
import { 
  Payment as PaymentType,
  CardPaymentService as CardPaymentServiceInterface,
  CardPaymentOutput,
  PaymentStatus,
  RexpayError,
  RexpayV3InitiatePaymentPayload,
  CardData,
  BillingInformation,
  CustomerInformation,
  DeviceInformation,
  RexpayChargeResponse,
  RexpayGatewayResponse,
  RexpayGetPaymentResponse,
  RexpayGetSubaccountsResponse,
  SubaccountMetrics,
  SubaccountData,
  SubaccountSelectionConfig,
  SubaccountSelectionResult,
  AuthorizationData
} from './types';

// Extended Payment interface to include additional properties
interface ExtendedPayment extends PaymentType {
  reference?: string;
  card?: {
    number: string;
    expiryMonth: string;
    expiryYear: string;
    cvv: string;
  };
  billing: {
    firstName?: string;
    lastName?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

// Mock MetricsService implementation
class MetricsService {
  private static instance: MetricsService;

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  public increment(metric: string, tags?: Record<string, any>): void {}
  public timing(metric: string, value: number, tags?: Record<string, any>): void {}
  public gauge(metric: string, value: number, tags?: Record<string, any>): void {}
  public recordSuccess(operation: string, duration: number): void {}
  public recordError(operation: string, error: Error): void {}
}

// Default configuration for Rexpay service
interface RexpayConfig {
  providers: {
    rexpay: {
      url: string;
      secret_key: string;
      encryption_key: string;
      encryption_iv: string;
      threeds: {
        challengeWindowSize: string;
        challengeIndicator: string;
        authenticationIndicator: string;
      };
    };
  };
  system: {
    url: string;
  };
  env: string;
  subaccountSelection: {
    successRateWeight: number;
    recencyWeight: number;
    minSuccessRate: number;
    maxRetries: number;
    initialRetryDelay: number;
  };
}

const defaultConfig: RexpayConfig = {
  providers: {
    rexpay: {
      url: process.env.REXPAY_API_URL || 'https://api.rexpay.com',
      secret_key: process.env.REXPAY_SECRET_KEY || '',
      encryption_key: process.env.REXPAY_ENCRYPTION_KEY || '',
      encryption_iv: process.env.REXPAY_ENCRYPTION_IV || '',
      threeds: {
        challengeWindowSize: '05',
        challengeIndicator: '04',
        authenticationIndicator: '01',
      },
    },
  },
  system: {
    url: process.env.SYSTEM_URL || 'https://your-system.com',
  },
  env: process.env.NODE_ENV || 'development',
  subaccountSelection: {
    successRateWeight: 0.7,
    recencyWeight: 0.3,
    minSuccessRate: 0.8,
    maxRetries: 3,
    initialRetryDelay: 1000,
  },
};

// Custom error classes
export class CardValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CardValidationError';
    Object.setPrototypeOf(this, CardValidationError.prototype);
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class PaymentError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

export class InternalServerError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}

interface ThreeDSChallengeData {
  acsUrl: string;
  cReq: string;
  sessionData?: string;
}

interface ThreeDSBrowserInfo {
  acceptHeader: string;
  colorDepth: number;
  javaEnabled: boolean;
  javascriptEnabled: boolean;
  language: string;
  screenHeight: number;
  screenWidth: number;
  timeZoneOffset: string;
  userAgent: string;
}

interface ThreeDSDeviceRenderOptions {
  sdkInterface?: 'HTML' | 'Native' | 'Both';
  sdkUiType?: ('text' | 'single-select' | 'multi-select' | 'out-of-band' | 'html-other')[];
}

export class RexpayV3Service implements CardPaymentServiceInterface {
  private readonly logger: Console;
  private readonly metrics: MetricsService;
  private readonly config: RexpayConfig;
  private readonly httpClient: AxiosInstance;
  
  private subaccountMetrics = new Map<string, SubaccountMetrics>();
  private accountId: string = '';
  private startTime: number = 0;
  public readonly name = 'rexpay-v3';

  constructor(config: Partial<RexpayConfig> = {}) {
    this.logger = console;
    this.metrics = MetricsService.getInstance();
    this.config = { ...defaultConfig, ...config };
    this.httpClient = axios.create({
      baseURL: this.config.providers.rexpay.url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.providers.rexpay.secret_key}`,
      },
      timeout: 30000, // 30 seconds
    });
  }

  private buildCardResponse(payment: ExtendedPayment): { 
    name: string; 
    number: string; 
    brand: string; 
    expiry: { month: string; year: string } 
  } {
    if (!payment.card) {
      throw new Error('Invalid card payment instrument');
    }
    
    return {
      name: `${payment.billing.firstName || ''} ${payment.billing.lastName || ''}`.trim(),
      number: this.maskCardNumber(payment.card.number),
      brand: this.detectCardBrand(payment.card.number),
      expiry: {
        month: payment.card.expiryMonth,
        year: payment.card.expiryYear,
      },
    };
  }

  private maskCardNumber(number: string): string {
    const lastFour = number.slice(-4);
    return `•••• •••• •••• ${lastFour}`;
  }

  private detectCardBrand(number: string): string {
    // Simple card brand detection based on BIN
    if (/^4/.test(number)) return 'visa';
    if (/^5[1-5]/.test(number)) return 'mastercard';
    if (/^3[47]/.test(number)) return 'amex';
    if (/^(6011|65|64[4-9]|622)/.test(number)) return 'discover';
    return 'unknown';
  }

  private buildSuccessResponse(response: RexpayChargeResponse, payment: ExtendedPayment): CardPaymentOutput {
    const transactionId = response.data.reference || '';
    const result: CardPaymentOutput = {
      transactionId,
      status: response.data.status === 'success' ? 'SUCCESS' : 'PENDING',
      message: response.message || 'Payment processed successfully',
      gatewayRecommendation: 'PROCEED',
      gatewayCode: response.data.session_id || '',
      acquirerMessage: response.message
    };

    // Add 3DS data if available
    if (response.data.redirect_auth_data?.customizedHtml?.['3ds2']) {
      const threeDsData = response.data.redirect_auth_data.customizedHtml['3ds2'];
      Object.assign(result, {
        threeDSecure: {
          acsUrl: threeDsData.acsUrl,
          creq: threeDsData.cReq,
          sessionData: response.data.session_id
        }
      });
    }

    return result;
  }

  private async handleError(error: unknown): Promise<never> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: RexpayError }>;
      const errorMessage = axiosError.response?.data?.error?.message || 
                         (axiosError.response?.data as any)?.message || 
                         error.message;
      
      this.metrics.recordError('api_request', new Error(errorMessage));
      
      if (axiosError.response?.status === 400) {
        throw new ValidationError(errorMessage);
      } else if (axiosError.response?.status === 401) {
        throw new Error('Authentication failed. Please check your API credentials.');
      } else if (axiosError.response?.status === 403) {
        throw new Error('Insufficient permissions to perform this action.');
      } else if (axiosError.response?.status === 404) {
        throw new Error('The requested resource was not found.');
      } else if (axiosError.response?.status === 409) {
        throw new Error('A conflict occurred while processing your request.');
      } else if (axiosError.response?.status === 422) {
        throw new ValidationError('Validation failed: ' + errorMessage);
      } else if (axiosError.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (axiosError.response?.status >= 500) {
        throw new InternalServerError('An internal server error occurred.', error as Error);
      } else if (axiosError.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please try again.');
      } else if (axiosError.code === 'ENOTFOUND') {
        throw new Error('Unable to connect to the payment service. Please check your network connection.');
      }
    }
    
    this.metrics.recordError('unexpected_error', error as Error);
    throw new PaymentError('An unexpected error occurred', error as Error);
  }

  // Implement required methods from CardPaymentServiceInterface
  async initializePayment(payment: ExtendedPayment): Promise<CardPaymentOutput> {
    try {
      this.startTime = Date.now();
      
      // Validate payment data
      if (!payment.card) {
        throw new ValidationError('Card details are required');
      }

      // Build request payload
      const payload: RexpayV3InitiatePaymentPayload = {
        reference: payment.reference || `ref-${Date.now()}`,
        amount: payment.amount,
        currency: payment.currency,
        card_data: {
          pan: payment.card.number,
          cvv: payment.card.cvv,
          expiryMonth: payment.card.expiryMonth,
          expiryYear: payment.card.expiryYear
        },
        billing_information: {
          firstName: payment.billing.firstName,
          lastName: payment.billing.lastName,
          street: payment.billing.address1,
          city: payment.billing.city,
          state: payment.billing.state,
          country: payment.billing.country,
          postcodezip: payment.billing.postalCode
        },
        customer_information: {
          email: payment.email || '',
          firstName: payment.billing.firstName || '',
          lastName: payment.billing.lastName || '',
          mobilePhone: payment.phone || ''
        },
        device_information: this.collectDeviceInformation(),
        callback_url: `${this.config.system.url}/payment/callback`,
        three_ds_version: '3ds2'
      };

      // Make API request
      const response = await this.httpClient.post<RexpayChargeResponse>('/payments', payload);
      
      // Record success metrics
      const duration = Date.now() - this.startTime;
      this.metrics.recordSuccess('initialize_payment', duration);
      
      return this.buildSuccessResponse(response.data, payment);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async authorizePayment(payment: ExtendedPayment): Promise<CardPaymentOutput> {
    // Implementation for authorize payment
    throw new Error('Method not implemented.');
  }

  async retrievePayment(paymentId: string): Promise<CardPaymentOutput> {
    // Implementation for retrieve payment
    throw new Error('Method not implemented.');
  }

  async finalizePayment(paymentId: string): Promise<CardPaymentOutput> {
    // Implementation for finalize payment
    throw new Error('Method not implemented.');
  }

  async refundPayment(payment: ExtendedPayment): Promise<CardPaymentOutput> {
    // Implementation for refund payment
    throw new Error('Method not implemented.');
  }

  private collectDeviceInformation(): DeviceInformation {
    // Implementation to collect device information
    return {
      http_browser_language: navigator.language || 'en-US',
      http_browser_java_enabled: navigator.javaEnabled ? true : false,
      http_browser_javascript_enabled: true,
      http_browser_color_depth: '24',
      http_browser_screen_height: window.screen.height.toString(),
      http_browser_screen_width: window.screen.width.toString(),
      http_browser_time_difference: new Date().getTimezoneOffset().toString(),
      challenge_window_size: this.config.providers.rexpay.threeds.challengeWindowSize,
      sdk_interface: 'HTML',
      sdk_ui_type: ['text', 'single-select', 'multi-select'],
      http_accept: 'application/json',
      device_channel: 'browser',
      ip_address: '' // This should be set by the server
    };
  }

  // Helper method to normalize country codes
  private normalizeCountryCode(countryCode: string): string {
    const countryMap: Record<string, string> = {
      'US': 'USA',
      'GB': 'GBR',
      'NG': 'NGA',
      'KE': 'KEN',
      'GH': 'GHA',
      'ZA': 'ZAF'
    };
    
    return countryMap[countryCode.toUpperCase()] || countryCode;
  }

  // Method to update subaccount metrics
  private updateSubaccountMetrics(subaccountId: string, success: boolean): void {
    const now = Date.now();
    const metrics = this.subaccountMetrics.get(subaccountId) || {
      uuid: subaccountId,
      successRate: 1,
      lastUsed: now,
      totalTransactions: 0,
      successfulTransactions: 0
    };

    metrics.totalTransactions++;
    if (success) {
      metrics.successfulTransactions++;
    }
    metrics.successRate = metrics.successfulTransactions / metrics.totalTransactions;
    metrics.lastUsed = now;

    this.subaccountMetrics.set(subaccountId, metrics);
  }

  // Method to select the best subaccount based on metrics
  private selectBestSubaccount(): string | null {
    if (this.subaccountMetrics.size === 0) {
      return null;
    }

    let bestScore = -1;
    let bestSubaccount: string | null = null;
    const now = Date.now();

    for (const [id, metrics] of this.subaccountMetrics.entries()) {
      // Skip if success rate is below minimum threshold
      if (metrics.successRate < this.config.subaccountSelection.minSuccessRate) {
        continue;
      }

      // Calculate score based on success rate and recency
      const recency = 1 - Math.min(1, (now - metrics.lastUsed) / (30 * 24 * 60 * 60 * 1000)); // 30 days
      const score = (
        metrics.successRate * this.config.subaccountSelection.successRateWeight +
        recency * this.config.subaccountSelection.recencyWeight
      );

      if (score > bestScore) {
        bestScore = score;
        bestSubaccount = id;
      }
    }

    return bestSubaccount;
  }

  // Method to get all subaccount metrics (for monitoring/debugging)
  public getAllSubaccountMetrics(): SubaccountMetrics[] {
    return Array.from(this.subaccountMetrics.values());
  }

  // Method to manually adjust subaccount success rates (for testing or admin purposes)
  public adjustSubaccountMetrics(subaccountId: string, successRate: number): void {
    const metrics = this.subaccountMetrics.get(subaccountId);
    if (metrics) {
      metrics.successRate = Math.max(0, Math.min(1, successRate));
      this.subaccountMetrics.set(subaccountId, metrics);
    }
  }
}

export default RexpayV3Service;
