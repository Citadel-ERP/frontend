// src/services/authServices.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = '127.0.0.1:8000';

export interface LoginResponse {
  message: string;
  first_login?: boolean;
  token?: string;
}

export interface CreateMPINResponse {
  message: string;
  token: string;
}

export interface ApiResponse {
  message: string;
}

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  EMAIL: 'user_email',
  FIRST_LOGIN: 'first_login',
  LAST_ACTIVITY: 'last_activity',
};

class AuthService {
  private static instance: AuthService;
  private token: string | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initializeAuth(): Promise<{
    token: string | null;
    email: string | null;
    firstLogin: boolean;
  }> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
      const email = await AsyncStorage.getItem(STORAGE_KEYS.EMAIL);
      const firstLogin = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_LOGIN);
      
      this.token = token;
      
      return {
        token,
        email,
        firstLogin: firstLogin === 'true',
      };
    } catch (error) {
      console.error('Error initializing auth:', error);
      return {
        token: null,
        email: null,
        firstLogin: false,
      };
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`http://${API_BASE_URL}/core/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok) {
        // Store user data
        await AsyncStorage.setItem(STORAGE_KEYS.EMAIL, email);
        await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LOGIN, (data.first_login || false).toString());
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
        
        return data;
      } else {
        throw new Error(data.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async loginWithMPIN(token: string, mpin: string): Promise<LoginResponse> {
    try {
      const response = await fetch(`http://${API_BASE_URL}/core/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, mpin }),
      });

      const data: LoginResponse = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, 'authenticated');
        await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
        this.token = 'authenticated';
        return data;
      } else {
        throw new Error(data.message || 'MPIN login failed');
      }
    } catch (error: any) {
      console.error('MPIN login error:', error);
      throw error;
    }
  }

  async resetPassword(oldPassword: string, newPassword: string, email: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`http://${API_BASE_URL}/core/resetPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          email: email,
        }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok) {
        // Update first login status
        await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LOGIN, 'false');
        return data;
      } else {
        throw new Error(data.message || 'Password reset failed');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async createMPIN(email: string, mpin: string, password: string): Promise<CreateMPINResponse> {
    try {
      const response = await fetch(`http://${API_BASE_URL}/core/createMpin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, mpin, password }),
      });

      const data: CreateMPINResponse = await response.json();

      if (response.ok) {
        // Store the token from create MPIN response
        await AsyncStorage.setItem(STORAGE_KEYS.TOKEN, data.token);
        this.token = data.token;
        return data;
      } else {
        throw new Error(data.message || 'MPIN creation failed');
      }
    } catch (error: any) {
      console.error('Create MPIN error:', error);
      throw error;
    }
  }

  async forgotPassword(email: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`http://${API_BASE_URL}/core/forgotPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.message || 'Forgot password request failed');
      }
    } catch (error: any) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  async resetPasswordWithOTP(email: string, otp: string, password: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`http://${API_BASE_URL}/core/resetPasswordOtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp, password }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.message || 'Password reset with OTP failed');
      }
    } catch (error: any) {
      console.error('Reset password with OTP error:', error);
      throw error;
    }
  }

  async forgotMPIN(email: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`http://${API_BASE_URL}/core/forgotMpin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: ApiResponse = await response.json();

      if (response.ok) {
        return data;
      } else {
        throw new Error(data.message || 'Forgot MPIN request failed');
      }
    } catch (error: any) {
      console.error('Forgot MPIN error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.TOKEN,
        STORAGE_KEYS.EMAIL,
        STORAGE_KEYS.FIRST_LOGIN,
        STORAGE_KEYS.LAST_ACTIVITY,
      ]);
      this.token = null;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  getToken(): string | null {
    return this.token;
  }

  async checkInactivity(): Promise<boolean> {
    try {
      const lastActivity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      if (!lastActivity) return true;

      const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity);
      return timeSinceLastActivity > INACTIVITY_TIMEOUT;
    } catch (error) {
      console.error('Error checking inactivity:', error);
      return true;
    }
  }

  async updateLastActivity(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }
}

export default AuthService.getInstance();