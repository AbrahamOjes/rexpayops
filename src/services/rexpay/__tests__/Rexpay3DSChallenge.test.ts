import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import RexpayV3Service from '../RexpayV3Service';
import { PaymentStatus } from '../../../dal';
import { CardPaymentOutput } from '../../types';

// Simple mock interfaces to avoid DOM type dependencies
interface MockWindow {
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  navigator: {
    language: string;
    javaEnabled: () => boolean;
    mimeTypes: {
      [key: string]: { type: string };
    };
    plugins: any[];
    userAgent: string;
    cookieEnabled: boolean;
  };
  location: {
    href: string;
  };
}

// Mock the UAParser module
jest.mock('ua-parser-js', () => ({
  UAParser: jest.fn().mockImplementation(() => ({
    getBrowser: () => ({ name: 'Chrome', version: '91.0.4472.124' }),
    getOS: () => ({ name: 'Mac OS', version: '10.15.7' }),
    getDevice: () => ({ type: undefined, vendor: undefined, model: undefined })
  }))
}));

describe('RexpayV3Service - 3DS Challenge Flow', () => {
  let service: RexpayV3Service;
  
  // Save original globals
  const originalWindow = (global as any).window;
  const originalNavigator = (global as any).navigator;
  
  // Mock window and navigator
  const mockNavigator = {
    language: 'en-US',
    javaEnabled: jest.fn().mockReturnValue(true),
    mimeTypes: {
      'application/pdf': { type: 'application/pdf' }
    },
    plugins: [],
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    cookieEnabled: true
  };

  const mockWindow = {
    screen: {
      width: 1440,
      height: 900,
      colorDepth: 24
    },
    navigator: mockNavigator,
    location: {
      href: 'https://test.example.com'
    }
  };

  // Mock payment data
  const mockPayment = {
    id: 'test-payment-id',
    amount: 1000,
    currency: 'USD',
    status: PaymentStatus.PENDING,
    metadata: {},
    // Add required fields from Payment interface
    payment_instrument: {
      type: 'card',
      card: {
        number: '4111111111111111',
        expiry: { month: '12', year: '25' },
        security_code: '123',
        name: 'Test User'
      }
    },
    billing: {
      address1: '123 Test St',
      city: 'Test City',
      country: 'US',
      state: 'CA',
      zip_code: '12345'
    },
    customer: {
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    },
    request_details: {
      browserDetails: {
        language: 'en-US',
        colorDepth: 24,
        screenHeight: 900,
        screenWidth: 1440,
        javaEnabled: true,
        timeZone: 'America/New_York'
      },
      ipAddress: '192.168.1.1'
    }
  };

  beforeEach(() => {
    service = new RexpayV3Service();
    // @ts-ignore - Mocking globals for testing
    global.window = mockWindow;
    // @ts-ignore - Mocking globals for testing
    global.navigator = mockNavigator;
  });

  afterEach(() => {
    // Restore original globals
    // @ts-ignore - Restoring globals
    global.window = originalWindow;
    // @ts-ignore - Restoring globals
    global.navigator = originalNavigator;
    jest.clearAllMocks();
  });

  describe('buildThreeDSData', () => {
    it('should build 3DS data with browser information', () => {
      // Mock the required browser APIs
      Object.defineProperty(global, 'window', {
        value: mockWindow,
        writable: true
      });
      Object.defineProperty(global, 'navigator', {
        value: mockNavigator,
        writable: true
      });

      const threeDSData = (service as any).buildThreeDSData(mockPayment);
      
      expect(threeDSData).toBeDefined();
      expect(threeDSData.browserInfo).toBeDefined();
      expect(threeDSData.browserInfo.acceptHeader).toBeDefined();
      expect(threeDSData.browserInfo.userAgent).toContain('Chrome');
      expect(threeDSData.browserInfo.screenWidth).toBe(1440);
      expect(threeDSData.browserInfo.screenHeight).toBe(900);
      expect(threeDSData.browserInfo.colorDepth).toBe(24);
      expect(threeDSData.browserInfo.language).toBe('en-US');
      expect(threeDSData.browserInfo.javaEnabled).toBe(true);
      expect(threeDSData.browserInfo.timeZone).toBeDefined();
      expect(threeDSData.browserInfo.javascriptEnabled).toBe(true);
    });

    it('should handle missing window object (Node.js environment)', () => {
      // Temporarily remove window and navigator objects
      // @ts-ignore - Removing globals for testing
      delete global.window;
      // @ts-ignore - Removing globals for testing
      delete global.navigator;

      const threeDSData = (service as any).buildThreeDSData(mockPayment);
      
      // Restore mocks for other tests
      // @ts-ignore - Restoring mocks
      global.window = mockWindow;
      // @ts-ignore - Restoring mocks
      global.navigator = mockNavigator;
      
      expect(threeDSData).toBeDefined();
      expect(threeDSData.browserInfo.acceptHeader).toBe('*/*');
      expect(threeDSData.browserInfo.userAgent).toBe('node');
      expect(threeDSData.browserInfo.screenWidth).toBe(0);
      expect(threeDSData.browserInfo.screenHeight).toBe(0);
      expect(threeDSData.browserInfo.colorDepth).toBe(0);
      expect(threeDSData.browserInfo.language).toBe('en-US');
      expect(threeDSData.browserInfo.javaEnabled).toBe(false);
      expect(threeDSData.browserInfo.timeZone).toBeDefined();
      expect(threeDSData.browserInfo.javascriptEnabled).toBe(false);
    });
  });

  // Add more test cases for handle3DS2Challenge, handle3DS1Challenge, etc.
  // following the same simplified pattern
});

// Add more test suites for other methods