interface AppConfig {
  BACKEND_URL: string;
  BACKEND_URL_WEBSOCKET: string;
}

// You can also use different configs for different environments
const configs: Record<string, AppConfig> = {
  development: {
    BACKEND_URL: 'https://backend-staging.citadelnetinc.com',
    BACKEND_URL_WEBSOCKET: 'https://backend-staging.citadelnetinc.com',

    // BACKEND_URL: 'https://962xzp32-8000.inc1.devtunnels.ms',
    // BACKEND_URL_WEBSOCKET: 'https://962xzp32-8000.inc1.devtunnels.ms',
  },
  production: {
    BACKEND_URL: 'https://backend.citadelnetinc.com',
    BACKEND_URL_WEBSOCKET: 'https://backend-websocket.citadelnetinc.com',

    // BACKEND_URL: 'https://962xzp32-8000.inc1.devtunnels.ms',
    // BACKEND_URL_WEBSOCKET: 'https://962xzp32-8001.inc1.devtunnels.ms',

    // BACKEND_URL: 'https://89vlj2ck-8000.inc1.devtunnels.ms',
    // BACKEND_URL_WEBSOCKET: 'https://89vlj2ck-8001.inc1.devtunnels.ms',

  },  
  
};

// Determine environment - you can change this logic as needed
const environment = 'production'; // development

export const config = configs[environment];
// Export individual values for convenience
export const BACKEND_URL = config.BACKEND_URL;
export const BACKEND_URL_WEBSOCKET = config.BACKEND_URL_WEBSOCKET;
