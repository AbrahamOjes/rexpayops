export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export interface Payment {
  reference: string;
  amount: number;
  currency: string;
  description?: string;
  payment_instrument: {
    type: string;
    card: {
      number: string;
      security_code: string;
      expiry: {
        month: string;
        year: string;
      };
      name?: string;
      encrypted?: string;
    };
  };
  billing: {
    address1: string;
    city: string;
    country: string;
    zip_code?: string;
    state?: string;
  };
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
  };
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
  provider_reference?: string;
  provider_data?: any;
  metadata?: Record<string, any>;
  refund_amount?: number;
}
