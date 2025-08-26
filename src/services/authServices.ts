import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://your-api-domain.com/api'; 

export interface LoginResponse {
  token1?: string;
  token2?: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  requiresPasswordChange?: boolean;
  requiresMPINSetup?: boolean;
}

export interface AuthTokens {
  token1: string | null;
  token2: string | null;
}

class AuthService {
  private static instance: AuthService;
  private tokens: AuthTokens = { token1: null, token2: null };

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initializeTokens(): Promise<AuthTokens> {
    try {
      const token1 = await AsyncStorage.getItem('token1');
      const token2 = await AsyncStorage.getItem('token2');
      
      this.tokens = { token1, token2 };
      return this.tokens;
    } catch (error) {
      console.error('Error loading tokens:', error);
      return { token1: null, token2: null };
    }
  }


  getTokens(): AuthTokens {
    return this.tokens;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }

      const data: LoginResponse = await response.json();

      if (data.token1) {
        await AsyncStorage.setItem('token1', data.token1);
        this.tokens.token1 = data.token1;
      }

      if (data.token2) {
        await AsyncStorage.setItem('token2', data.token2);
        this.tokens.token2 = data.token2;
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async loginWithMPIN(mpin: string): Promise<LoginResponse> {
    try {
      if (!this.tokens.token1 || !this.tokens.token2) {
        throw new Error('Required tokens not found');
      }

      const response = await fetch(`${API_BASE_URL}/auth/mpin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tokens.token1}`,
          'X-Token2': this.tokens.token2,
        },
        body: JSON.stringify({ mpin }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'MPIN login failed');
      }

      const data: LoginResponse = await response.json();
      return data;
    } catch (error) {
      console.error('MPIN login error:', error);
      throw error;
    }
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      if (!this.tokens.token1) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.tokens.token1}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Password change failed');
      }

      const data = await response.json();

      if (data.token2) {
        await AsyncStorage.setItem('token2', data.token2);
        this.tokens.token2 = data.token2;
      }
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  async createMPIN(email: string, mpin: string, newPassword: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/create-mpin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, mpin, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'MPIN creation failed');
      }

      const data = await response.json();

      if (data.token1) {
        await AsyncStorage.setItem('token1', data.token1);
        this.tokens.token1 = data.token1;
      }

      if (data.token2) {
        await AsyncStorage.setItem('token2', data.token2);
        this.tokens.token2 = data.token2;
      }
    } catch (error) {
      console.error('Create MPIN error:', error);
      throw error;
    }
  }


  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Forgot password request failed');
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.tokens.token1) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.tokens.token1}`,
          },
        }).catch(error => {
          console.warn('Logout API call failed:', error);
        });
      }

      await AsyncStorage.multiRemove(['token1', 'token2']);
      this.tokens = { token1: null, token2: null };
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  getAuthStatus(): 'not_authenticated' | 'partial_auth' | 'full_auth' {
    if (!this.tokens.token1) {
      return 'not_authenticated';
    }
    
    if (!this.tokens.token2) {
      return 'partial_auth';
    }
    
    return 'full_auth';
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/validate-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
}

export default AuthService.getInstance();