import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import axios from 'axios';
import RexpayV3Service from '../RexpayV3Service';
// Import using relative paths for compatibility
import { PaymentStatus } from '../../../dal';
import { AUTHTYPE, CardPaymentInstrument } from '../../types';
import { logger } from '../../../utils/logger';
import { MetricsService } from '../../../utils/MetricsService';
import { encrypt, decrypt } from '../../../utils/encryption';

// Mock dependencies
jest.mock('axios');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/MetricsService');
jest.mock('../../../utils/encryption');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLogger = {
  child: jest.fn().mockReturnThis(),
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
const mockedMetrics = {
  recordSuccess: jest.fn(),
  recordError: jest.fn(),
  getMetrics: jest.fn(),
  reset: jest.fn(),
};

(logger.child as jest.Mock).mockReturnValue(mockedLogger);
(MetricsService as jest.Mock).mockImplementation(() => mockedMetrics);

// Mock environment variables for testing
process.env.REXPAY_API_URL = 'https://api.rexpay.test';
process.env.REXPAY_SECRET_KEY = 'test-secret-key';
process.env.REXPAY_ENCRYPTION_KEY = 'test-encryption-key';
process.env.REXPAY_ENCRYPTION_IV = 'test-encryption-iv';
process.env.SYSTEM_URL = 'https://test-system.com';

// Mock types for testing
interface Payment {
  reference: string;
  amount: number;
  currency: string;
  merchant?: { name: string };
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    id?: string;
    date_of_birth?: string;
  };
  billing: {
    address1: string;
    city: string;
    country: string;
    zip_code?: string;
    state?: string;
  };
  payment_instrument: {
    type: string;
    card: {
      number: string;
      security_code: string;
      expiry: {
        month: string | number;
        year: string | number;
      };
      encrypted?: string;
      name?: string;
      brand?: string;
    };
  };
  provider_reference?: string;
  request_details: {
    browserDetails: {
      language?: string;
      colorDepth?: number;
      screenHeight?: number;
      screenWidth?: number;
      javaEnabled?: boolean;
    };
    browser?: string;
    ipAddress?: string;
    callback_url?: string;
  };
  order_id?: string;
  refund_amount?: number;
};

// Mock config for testing
const config = {
  providers: {
    rexpay: {
      url: 'https://api.rexpay.com',
      secret_key: 'test-secret-key',
      encryption_key: 'test-encryption-key',
      encryption_iv: 'test-encryption-iv',
    },
  },
  system: {
    url: 'https://api.system.com',
  },
  env: 'test',
};

// Define mock response types
interface RexpayInitiatePaymentResponse {
  status: boolean;
  message: string;
  data: {
    transaction_id: string;
    session_id: string;
    status: string;
  };
}

interface RexpayChargeResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    transaction_id: string;
    redirect_url: string;
    redirect_auth_data?: {
      customizedHtml?: {
        '3ds2'?: {
          cReq?: string;
          acsUrl?: string;
        };
      };
    };
  };
}

interface RexpayGetPaymentResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    gateway_response?: string;
  };
}

interface RexpayGetSubaccountsResponse {
  status: boolean;
  message: string;
  data: Array<{
    uuid: string;
    active: boolean;
    currencies?: string[];
    metrics?: {
      successRate: number;
      totalTransactions: number;
      dailyVolume: number;
    };
    limits?: {
      max?: number;
    };
  }>;
}

describe('RexpayV3Service', () => {
  let service: RexpayV3Service;
  let mockPayment: Payment;

  beforeEach(() => {
    service = new RexpayV3Service();
    service.MID = 'test-mid';
    service.APIKEY = 'test-apikey';

    // Reset axios mocks
    mockedAxios.get.mockReset();
    mockedAxios.post.mockReset();

    // Setup mock payment data
    mockPayment = {
      reference: 'test-ref-123',
      amount: 1000, // $10.00
      currency: 'USD',
      description: 'Test payment',
      payment_instrument: {
        type: 'card',
        card: {
          number: '4111111111111111',
          security_code: '123',
          expiry: {
            month: '12',
            year: '25',
          },
          name: 'Test User',
        },
      } as CardPaymentInstrument,
      billing: {
        address1: '123 Test St',
        city: 'Test City',
        country: 'US',
        zip_code: '12345',
        state: 'CA',
      },
      customer: {
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        phone_number: '+1234567890',
      },
      request_details: {
        browserDetails: {
          language: 'en-US',
          colorDepth: 24,
          screenHeight: 900,
          screenWidth: 1440,
          javaEnabled: false,
        },
        browser: 'Chrome',
        ipAddress: '127.0.0.1',
      },
    } as Payment;
  });

  describe('initializePayment', () => {
    it('should successfully initialize a payment', async () => {
      // Mock successful subaccount response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Success',
          data: [{
            uuid: 'test-subaccount-id',
            name: 'Test Subaccount',
            active: true,
            currencies: ['USD'],
            metrics: { successRate: 0.95 },
          }],
        },
      });

      // Mock successful payment initialization
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Payment initialized',
          data: {
            transaction_id: 'test-transaction-id',
            status: 'PENDING',
            session_id: 'test-session-id',
          },
        },
      });

      const result = await service.initializePayment(mockPayment, AUTHTYPE.THREEDSTWO);

      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(result.provider_reference).toBe('test-transaction-id');
      expect(result.type).toBe(AUTHTYPE.THREEDSTWO);
      expect(result.provider_data!.sessionId).toBe('test-session-id');
    });

    it('should handle validation errors', async () => {
      // Modify payment to trigger validation error
      const invalidPayment = {
        ...mockPayment,
        payment_instrument: {
          ...mockPayment.payment_instrument,
          card: {
            ...mockPayment.payment_instrument.card,
            number: '4111111111111112', // Invalid card number
          },
        },
      } as Payment;

      await expect(service.initializePayment(invalidPayment, AUTHTYPE.THREEDSTWO))
        .rejects
        .toThrow('Invalid card number');
    });

    it('should retry on network errors', async () => {
      // Mock failed then successful subaccount response
      mockedAxios.get.mockImplementationOnce(() => {
        throw new Error('Network error');
      }).mockResolvedValueOnce({
        data: {
          status: true,
          data: {
            subaccounts: [{
              id: 'test-subaccount',
              success_rate: 0.95,
            }],
          },
        },
      });

      // Mock successful payment initialization
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Payment initialized',
          data: {
            transaction_id: 'test-transaction-id',
            status: 'PENDING',
          },
        },
      });

      const result = await service.initializePayment(mockPayment, AUTHTYPE.THREEDSTWO);

      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle currency fallback', async () => {
      // Set up payment with non-supported currency
      const nonSupportedCurrencyPayment = {
        ...mockPayment,
        currency: 'XYZ',
      };

      // Mock initial failure due to currency
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: {
            message: 'Currency not supported',
          },
        },
      });

      // Mock successful retry with USD
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Payment initialized',
          data: {
            transaction_id: 'test-transaction-id',
            status: 'PENDING',
          },
        },
      });

      const result = await service.initializePayment(nonSupportedCurrencyPayment, AUTHTYPE.THREEDSTWO);

      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('authorizePayment', () => {
    it('should successfully authorize a payment', async () => {
      // Encrypt card details
      const encryptedCard = encrypt(
        JSON.stringify(mockPayment.payment_instrument.card),
        config.providers.rexpay.encrption_key!,
        config.providers.rexpay.encryption_iv!
      );

      const paymentWithEncrypted = {
        ...mockPayment,
        payment_instrument: {
          ...mockPayment.payment_instrument,
          card: {
            ...mockPayment.payment_instrument.card,
            encrypted: encryptedCard,
          },
        },
        provider_reference: 'test-transaction-id',
      };

      // Mock successful charge response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Payment authorized',
          data: {
            reference: 'test-reference',
            status: 'SUCCESS',
            redirect_auth_data: {
              customizedHtml: {
                '3ds2': {
                  acsUrl: 'https://3ds.test.com',
                  cReq: 'test-creq',
                },
              },
            },
          },
        },
      });

      const result = await service.authorizePayment(paymentWithEncrypted);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.provider_reference).toBe('test-reference');
      expect(result.provider_data!.html!.token).toBe('test-creq');
      expect(result.provider_data!.html!.url).toBe('https://3ds.test.com');
    });

    it('should handle 3DS fallback', async () => {
      // Mock failed 3DS2 response
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            code: 'THREEDS_FAILED',
            message: '3DS2 authentication failed',
          },
        },
      });

      // Mock successful 3DS1 response
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Payment authorized',
          data: {
            reference: 'test-reference',
            status: 'SUCCESS',
            redirect_auth_data: {
              html: '<form>3DS1 Form</form>',
            },
          },
        },
      });

      const encryptedCard = encrypt(
        JSON.stringify(mockPayment.payment_instrument.card),
        config.providers.rexpay.encrption_key!,
        config.providers.rexpay.encryption_iv!
      );

      const paymentWithEncrypted = {
        ...mockPayment,
        payment_instrument: {
          ...mockPayment.payment_instrument,
          card: {
            ...mockPayment.payment_instrument.card,
            encrypted: encryptedCard,
          },
        },
        provider_reference: 'test-transaction-id',
      };

      const result = await service.authorizePayment(paymentWithEncrypted);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPayment', () => {
    it('should successfully retrieve payment status', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Success',
          data: {
            status: 'SUCCESS',
            gateway_response: JSON.stringify({
              response: {
                gatewayCode: 'APPROVED',
                gatewayRecommendation: 'PROCEED',
                acquirerMessage: 'Approved',
              },
            }),
          },
        },
      });

      const result = await service.getPayment(mockPayment);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(result.provider_data!.authentication_status).toBe('APPROVED');
      expect(result.provider_data!.recommendation).toBe('PROCEED');
    });

    it('should handle network errors with retry', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            status: true,
            message: 'Success',
            data: {
              status: 'SUCCESS',
              gateway_response: JSON.stringify({
                response: {
                  gatewayCode: 'APPROVED',
                },
              }),
            },
          },
        });

      const result = await service.getPayment(mockPayment);

      expect(result.status).toBe(PaymentStatus.SUCCESS);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('refundPayment', () => {
    it('should successfully process refund', async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          status: true,
          message: 'Refund initiated',
          data: {
            reference: 'test-refund-ref',
          },
        },
      });

      await expect(service.refundPayment(mockPayment)).resolves.not.toThrow();
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/v2/refund/initiate'),
        expect.objectContaining({
          reference: mockPayment.reference,
        }),
        expect.any(Object)
      );
    });

    it('should handle refund errors', async () => {
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Refund failed',
          },
        },
      });

      await expect(service.refundPayment(mockPayment))
        .rejects
        .toThrow('Failed to refund payment');
    });
  });

  describe('error handling', () => {
    it('should handle rate limiting', async () => {
      mockedAxios.post
        .mockRejectedValueOnce({
          response: {
            status: 429,
            data: {
              message: 'Too many requests',
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            status: true,
            message: 'Success',
            data: {
              transaction_id: 'test-transaction-id',
              status: 'PENDING',
            },
          },
        });

      const result = await service.initializePayment(mockPayment, AUTHTYPE.THREEDSTWO);

      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });
  });
});
