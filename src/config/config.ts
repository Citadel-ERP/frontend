interface AppConfig {
  BACKEND_URL: string;
}

// You can also use different configs for different environments
const configs: Record<string, AppConfig> = {
  development: {
    BACKEND_URL: 'http://127.0.0.1:8000',

  },
  production: {
    BACKEND_URL: 'http://127.0.0.1:8000',
  },
};

// Determine environment - you can change this logic as needed
const environment = 'development';

export const config = configs[environment];
// Export individual values for convenience
export const BACKEND_URL = config.BACKEND_URL;