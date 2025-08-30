interface AppConfig {
  BACKEND_URL: string;
}

// You can also use different configs for different environments
const configs: Record<string, AppConfig> = {
  development: {
    BACKEND_URL: 'https://962xzp32-8000.inc1.devtunnels.ms',
  },
  production: {
    BACKEND_URL: 'https://your-production-url.com',
  },
};

// Determine environment - you can change this logic as needed
const environment = __DEV__ ? 'development' : 'production';

export const config = configs[environment];

// Export individual values for convenience
export const BACKEND_URL = config.BACKEND_URL;