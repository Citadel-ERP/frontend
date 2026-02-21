/**
 * API Service for Module Access Management
 */

import { BACKEND_URL } from '../../config/config';
import { 
  ApiResponse, 
  GrantAccessPayload, 
  RevokeAccessPayload, 
  UpdateModulePayload 
} from './types';

export class AccessService {
  private token: string | null;
  private baseUrl: string;

  constructor(token: string | null) {
    this.token = token;
    this.baseUrl = `${BACKEND_URL}/access`;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T = any>(
    endpoint: string,
    data: Record<string, any>
  ): Promise<ApiResponse<T>> {
    if (!this.token) {
      throw new Error('No authentication token available');
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.token,
          ...data,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Request failed');
      }

      return result;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  async getAllEmployees() {
    return this.request('/getAllEmployees', {});
  }

  async getEmployeeData(employeeId: string) {
    return this.request('/getEmployeeData', { employee_id: employeeId });
  }

  async grantAccess(employeeId: string, moduleId: number) {
    return this.request('/grantAccess', {
      employee_id: employeeId,
      module_id: moduleId,
    });
  }

  async revokeAccess(employeeId: string, moduleId: number) {
    return this.request('/revokeAccess', {
      employee_id: employeeId,
      module_id: moduleId,
    });
  }

  async updateModule(moduleId: number, moduleName: string, moduleIcon?: string) {
    return this.request('/updateModule', {
      module_id: moduleId,
      module_name: moduleName,
      ...(moduleIcon && { module_icon: moduleIcon }),
    });
  }
}