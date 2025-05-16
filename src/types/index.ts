export enum AUTHTYPE {
  THREE = 'THREE',
  TWO = 'TWO',
}

export enum Providers {
  REXPAYIII = 'REXPAYIII',
}

export interface CardPaymentInstrument {
  type: 'card';
  card: {
    number: string;
    security_code: string;
    expiry: {
      month: string;
      year: string;
    };
    name?: string;
    encrypted?: string;
    brand?: string;
  };
}

export interface CardPaymentOutput {
  type: AUTHTYPE;
  status: string;
  provider_reference: string;
  provider_data: {
    html: {
      token?: string;
      url?: string;
      redirect_url?: string;
      is_redirect?: boolean;
    };
    sessionId: string;
    message: string;
    card: {
      name: string;
      number: string;
      brand: string;
      expiry: {
        month: string;
        year: string;
      };
      encrypted?: string;
    };
  };
}

export interface CardPaymentService {
  name: string;
  MID: string;
  APIKEY: string;
  initializePayment(payment: any, authType: AUTHTYPE): Promise<CardPaymentOutput>;
  authorizePayment(payment: any): Promise<CardPaymentOutput>;
  getPayment(payment: any): Promise<any>;
  finalizePayment(payment: any): Promise<CardPaymentOutput>;
  refundPayment(payment: any): Promise<void>;
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

export interface BillingInformation {
  postcodezip?: string;
  street: string;
  city: string;
  country: string;
  stateProvince?: string;
}
