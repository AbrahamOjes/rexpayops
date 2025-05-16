// Type definitions for browser globals
declare const window: Window & typeof globalThis;
declare const navigator: Navigator;

// Extend the Navigator interface to include custom properties
interface Navigator {
  javaEnabled: () => boolean;
  mimeTypes: {
    [key: string]: { type: string };
  };
  plugins: {
    [index: number]: {
      name: string;
      filename: string;
      description: string;
      version?: string;
    };
    length: number;
    item: (index: number) => any;
    namedItem: (name: string) => any;
    refresh: () => void;
  };
  language: string;
  languages?: readonly string[];
  userAgent: string;
  cookieEnabled: boolean;
}

// Extend the Window interface to include custom properties
interface Window {
  innerWidth: number;
  innerHeight: number;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
  };
  location: {
    href: string;
    protocol: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
    origin: string;
  };
  navigator: Navigator;
  // Add any other window properties used in the code
}
