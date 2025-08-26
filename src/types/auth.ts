export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface AuthTokens {
  token1: string | null;
  token2: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token1?: string;
  token2?: string;
  user: User;
  requiresPasswordChange?: boolean;
  requiresMPINSetup?: boolean;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface CreateMPINRequest {
  email: string;
  mpin: string;
  newPassword: string;
}

export interface MPINLoginRequest {
  mpin: string;
}

export type AuthStep = 
  | 'loading'
  | 'login'
  | 'change_password'
  | 'create_mpin'
  | 'mpin_login'
  | 'authenticated';

export type AuthStatus = 
  | 'not_authenticated' 
  | 'partial_auth' 
  | 'full_auth';