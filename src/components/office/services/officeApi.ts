import { BACKEND_URL } from '../../../config/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  CreateOfficePayload, 
  UpdateOfficePayload, 
  DeleteOfficePayload,
  Office,
  ApiResponse 
} from '../types/office.types';

const TOKEN_2_KEY = 'token_2';

export class OfficeApi {
  private static async getToken(): Promise<string | null> {
    return await AsyncStorage.getItem(TOKEN_2_KEY);
  }

  /**
   * Fetch all offices
   */
  static async getOffices(): Promise<Office[]> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${BACKEND_URL}/citadel_admin/getOffice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });

    const data: ApiResponse<Office[]> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch offices');
    }

    return data.offices || [];
  }

  /**
   * Create a new office
   */
  static async createOffice(payload: Omit<CreateOfficePayload, 'token'>): Promise<Office> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${BACKEND_URL}/citadel_admin/createOffice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, token }),
    });

    const data: ApiResponse<Office> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create office');
    }

    return data.office_data!;
  }

  /**
   * Update an existing office
   */
  static async updateOffice(payload: UpdateOfficePayload): Promise<Office> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${BACKEND_URL}/citadel_admin/updateOffice`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, token }),
    });

    const data: ApiResponse<Office> = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to update office');
    }

    return data.data!;
  }

  /**
   * Delete an office
   */
  static async deleteOffice(officeId: number): Promise<{ message: string }> {
    const token = await this.getToken();
    
    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${BACKEND_URL}/citadel_admin/deleteOffice`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        token, 
        office_id: officeId 
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Handle specific error cases
      if (data.message?.includes('user(s) are assigned')) {
        throw new EmployeeAssignmentError(data.message);
      }
      throw new Error(data.message || 'Failed to delete office');
    }

    return data;
  }
}

// Custom error class for employee assignment errors
export class EmployeeAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmployeeAssignmentError';
  }
}