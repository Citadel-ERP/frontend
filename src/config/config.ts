interface AppConfig {
  BACKEND_URL: string;
  BACKEND_URL_WEBSOCKET: string;
}

// You can also use different configs for different environments
const configs: Record<string, AppConfig> = {
  development: {
    BACKEND_URL: 'https://backend-staging.citadelnetinc.com',
    BACKEND_URL_WEBSOCKET: 'https://backend-staging.citadelnetinc.com',
  },
  production: {
    BACKEND_URL: 'https://backend-staging.citadelnetinc.com',
    BACKEND_URL_WEBSOCKET: 'https://backend-staging.citadelnetinc.com',
  },
};

// Determine environment - you can change this logic as needed
const environment = 'development';

export const config = configs[environment];
// Export individual values for convenience
export const BACKEND_URL = config.BACKEND_URL;
export const BACKEND_URL_WEBSOCKET = config.BACKEND_URL_WEBSOCKET;
